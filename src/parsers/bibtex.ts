/**
 * Minimal BibTeX parser — zero dependencies.
 * Handles standard @type{key, field = {value}} and field = "value" formats.
 */

import type { BibEntry } from "../types.js";

const ARXIV_RE = /arXiv[:\s]*(\d{4}\.\d{4,5}(?:v\d+)?)/i;
const ARXIV_OLD_RE = /arXiv[:\s]*([a-z-]+\/\d{7}(?:v\d+)?)/i;
const EPRINT_RE = /^\d{4}\.\d{4,5}/;

function stripLatex(s: string): string {
  if (!s) return "";
  s = s.replace(/\\text\w+\{([^}]*)\}/g, "$1");
  s = s.replace(/\\[`'^~"=.vc]\{(\w)\}/g, "$1");
  s = s.replace(/\\[`'^~"=.vc](\w)/g, "$1");
  s = s.replace(/\\(\W)/g, "$1");
  s = s.replace(/\\[a-zA-Z]+\s*/g, "");
  s = s.replace(/[{}$]/g, "");
  return s.replace(/\s+/g, " ").trim();
}

function extractArxivId(entry: Record<string, string>): string | null {
  for (const field of ["journal", "eprint", "url", "note", "archiveprefix"]) {
    const val = entry[field] ?? "";
    for (const re of [ARXIV_RE, ARXIV_OLD_RE]) {
      const m = val.match(re);
      if (m) return m[1];
    }
  }
  const eprint = (entry.eprint ?? "").trim();
  if (EPRINT_RE.test(eprint)) return eprint;
  return null;
}

export function parseBib(text: string): BibEntry[] {
  const entries: BibEntry[] = [];
  // Match @type{key, ... }
  const entryRe = /@(\w+)\s*\{([^,]*),/g;
  let match: RegExpExecArray | null;

  while ((match = entryRe.exec(text)) !== null) {
    const type = match[1].toLowerCase();
    if (type === "string" || type === "preamble" || type === "comment") continue;

    const key = match[2].trim();
    const startIdx = match.index + match[0].length;

    // Find matching closing brace
    let depth = 1;
    let i = startIdx;
    while (i < text.length && depth > 0) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      i++;
    }
    const body = text.slice(startIdx, i - 1);

    // Parse fields
    const fields: Record<string, string> = {};
    const fieldRe = /(\w+)\s*=\s*(?:\{((?:[^{}]|\{[^{}]*\})*)\}|"([^"]*)"|\s*(\d+)\s*)/g;
    let fm: RegExpExecArray | null;
    while ((fm = fieldRe.exec(body)) !== null) {
      const fname = fm[1].toLowerCase();
      const fval = (fm[2] ?? fm[3] ?? fm[4] ?? "").trim();
      fields[fname] = fval;
    }

    entries.push({
      key,
      type,
      title: stripLatex(fields.title ?? ""),
      author: fields.author ?? "",
      year: fields.year ?? "",
      doi: fields.doi ?? "",
      arxivId: extractArxivId(fields),
      venue: fields.booktitle || fields.journal || "",
      journal: fields.journal ?? "",
      booktitle: fields.booktitle ?? "",
      volume: fields.volume ?? "",
      pages: fields.pages ?? "",
      url: fields.url ?? "",
      raw: fields,
    });
  }

  return entries;
}
