/**
 * Core verification engine — 5-source cascade with phantom-ID detection.
 */

import type { BibEntry, Check, SourceResult, VerificationResult } from "./types.js";
import { matchTitle, matchAuthors, matchYear, matchVenue, tokenSimilarity, extractFirstSurname } from "./matching.js";
import { queryArxiv } from "./sources/arxiv.js";
import { queryCrossref } from "./sources/crossref.js";
import { queryDblp } from "./sources/dblp.js";
import { queryS2 } from "./sources/s2.js";
import { queryOpenAlex } from "./sources/openalex.js";

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function validateApiMatch(entry: BibEntry, data: SourceResult, requireAuthor: boolean): boolean {
  if (!data.authors.length) return true;
  const bibSurname = stripAccents(extractFirstSurname(entry.author));
  const apiSurname = stripAccents(data.authors[0].split(/\s+/).pop() ?? "");
  const authorMatch = bibSurname === apiSurname;
  if (requireAuthor && !authorMatch) return false;
  if (!authorMatch) {
    if (data.year) {
      try { if (Math.abs(parseInt(entry.year) - parseInt(data.year)) >= 2) return false; } catch {}
    }
    if (tokenSimilarity(entry.title, data.title) < 0.85) return false;
  }
  return true;
}

function checkSource(result: VerificationResult, entry: BibEntry, data: SourceResult, checkVenue = true): void {
  result.sourcesHit.push(data.source);
  const checks: [string, ReturnType<typeof matchTitle>][] = [
    ["title", matchTitle(entry.title, data.title)],
    ["authors", matchAuthors(entry.author, data.authors)],
    ["year", matchYear(entry.year, data.year)],
  ];
  if (checkVenue && data.venue) checks.push(["venue", matchVenue(entry.venue, data.venue)]);

  for (const [field, { status, detail }] of checks) {
    result.checks.push({ field, status, detail, source: data.source });
    if (status === "FAIL" && result.overall !== "FAIL") result.overall = "FAIL";
    else if (status === "WARN" && result.overall === "OK") result.overall = "WARN";
  }
}

export type ProgressCallback = (i: number, total: number, key: string, status: string) => void;

export async function verifyEntry(entry: BibEntry): Promise<VerificationResult> {
  const result: VerificationResult = {
    key: entry.key, title: entry.title, overall: "OK",
    sourcesTried: [], sourcesHit: [], checks: [], suggestedFixes: {},
  };

  // Source 1: arXiv
  if (entry.arxivId) {
    result.sourcesTried.push("arxiv");
    const data = await queryArxiv(entry.arxivId);
    if (data) checkSource(result, entry, data, false);
  }

  // Source 2: Crossref
  if (entry.doi) {
    result.sourcesTried.push("crossref");
    const data = await queryCrossref(entry.doi);
    if (data) {
      checkSource(result, entry, data);
      if (data.isRetracted) result.checks.push({ field: "retraction", status: "FAIL", detail: "RETRACTED PAPER!", source: "crossref" });
    }
  }

  // Phantom ID detection
  let hasPhantomDoi = false;
  if (entry.doi && /^10\.\d{4,}\//.test(entry.doi) && !result.sourcesHit.includes("crossref")) {
    hasPhantomDoi = true;
    result.checks.push({ field: "phantom_doi", status: "FAIL", detail: `DOI '${entry.doi}' has valid format but doesn't resolve -- likely hallucinated`, source: "crossref" });
  }
  let hasPhantomArxiv = false;
  if (entry.arxivId && /^\d{4}\.\d{4,5}/.test(entry.arxivId) && !result.sourcesHit.includes("arxiv")) {
    hasPhantomArxiv = true;
    result.checks.push({ field: "phantom_arxiv", status: "FAIL", detail: `arXiv ID '${entry.arxivId}' has valid format but doesn't exist -- likely hallucinated`, source: "arxiv" });
  }
  const hasPhantomId = hasPhantomDoi || hasPhantomArxiv;

  // Source 3: DBLP
  result.sourcesTried.push("dblp");
  let data = await queryDblp(entry.title, entry.author);
  if (data && !validateApiMatch(entry, data, hasPhantomId)) data = null;
  if (data) {
    checkSource(result, entry, data);
    if (data.doi && !entry.doi) result.suggestedFixes.doi = data.doi;
  }

  // Source 4: Semantic Scholar
  result.sourcesTried.push("s2");
  data = await queryS2(entry.title, entry.author);
  if (data && !validateApiMatch(entry, data, hasPhantomId)) data = null;
  if (data) {
    checkSource(result, entry, data);
    if (data.doi && !entry.doi && !result.suggestedFixes.doi) result.suggestedFixes.doi = data.doi;
    if (data.citationCount != null) result.checks.push({ field: "citations", status: "OK", detail: `citation count: ${data.citationCount}`, source: "s2" });
  }

  // Source 5: OpenAlex (fallback)
  if (!result.sourcesHit.length) {
    result.sourcesTried.push("openalex");
    data = await queryOpenAlex(entry.title, entry.author);
    if (data && !validateApiMatch(entry, data, hasPhantomId)) data = null;
    if (data) {
      checkSource(result, entry, data);
      if (data.doi && !entry.doi && !result.suggestedFixes.doi) result.suggestedFixes.doi = data.doi;
      if (data.isRetracted) result.checks.push({ field: "retraction", status: "FAIL", detail: "RETRACTED PAPER!", source: "openalex" });
    }
  }

  // No match
  if (!result.sourcesHit.length) {
    result.checks.push({ field: "verification", status: "FAIL", detail: `NO API MATCH (tried: ${result.sourcesTried.join(", ")})`, source: "" });
    result.overall = "FAIL";
  }

  // Source-aware post-processing
  const confirmedSources = new Set<string>();
  for (const src of result.sourcesHit) {
    const srcChecks = result.checks.filter((c) => c.source === src);
    const titleOk = srcChecks.some((c) => c.field === "title" && c.status === "OK");
    const authorOk = srcChecks.some((c) => c.field === "authors" && (c.status === "OK" || c.status === "WARN"));
    if (titleOk && authorOk) confirmedSources.add(src);
  }

  if (confirmedSources.size > 0) {
    result.overall = "OK";
    for (const c of result.checks) {
      if (!confirmedSources.has(c.source)) continue;
      if (c.status === "FAIL") { result.overall = "FAIL"; break; }
      if (c.status === "WARN" && result.overall === "OK") result.overall = "WARN";
    }
  } else {
    result.overall = "OK";
    for (const c of result.checks) {
      if (c.status === "FAIL") { result.overall = "FAIL"; break; }
      if (c.status === "WARN" && result.overall === "OK") result.overall = "WARN";
    }
  }

  // Kill-shot
  if (hasPhantomId && result.overall === "OK") {
    result.overall = "WARN";
    result.checks.push({ field: "hallucination_risk", status: "WARN", detail: "Search found similar paper but identifier doesn't resolve -- verify manually", source: "bibguard" });
  }

  return result;
}

/** Verify all entries in a parsed .bib. */
export async function verifyAll(entries: BibEntry[], onProgress?: ProgressCallback): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  for (let i = 0; i < entries.length; i++) {
    const r = await verifyEntry(entries[i]);
    results.push(r);
    onProgress?.(i + 1, entries.length, entries[i].key, r.overall);
  }
  return results;
}
