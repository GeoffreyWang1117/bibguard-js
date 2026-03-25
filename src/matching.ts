/** Field comparison utilities — title, author, year, venue matching. */

function tokenize(s: string): Set<string> {
  return new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []));
}

export function tokenSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection++;
  const union = new Set([...ta, ...tb]).size;
  return intersection / union;
}

export function extractFirstSurname(authorStr: string): string {
  const parts = authorStr.split(/\s+and\s+/i);
  const first = parts[0]?.trim() ?? "";
  if (!first) return "";
  if (first.includes(",")) {
    const surname = first.split(",")[0].trim().split(/\s+/);
    return surname[surname.length - 1].toLowerCase();
  }
  const words = first.split(/\s+/);
  return words[words.length - 1].toLowerCase();
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type MatchResult = { status: "OK" | "WARN" | "FAIL"; detail: string };

export function matchTitle(bibTitle: string, apiTitle: string): MatchResult {
  const score = tokenSimilarity(bibTitle, apiTitle);
  if (score >= 0.85) return { status: "OK", detail: `title match (${score.toFixed(2)})` };
  if (score >= 0.7) return { status: "WARN", detail: `title partial match (${score.toFixed(2)}): '${apiTitle}'` };
  return { status: "FAIL", detail: `title mismatch (${score.toFixed(2)}): bib='${bibTitle}' vs api='${apiTitle}'` };
}

export function matchAuthors(bibAuthor: string, apiAuthors: string[]): MatchResult {
  if (!apiAuthors.length) return { status: "WARN", detail: "no authors from API" };
  const bibSurname = stripAccents(extractFirstSurname(bibAuthor));
  const apiFirst = apiAuthors[0];
  const apiWords = apiFirst.split(/\s+/);
  const apiSurname = stripAccents(apiWords[apiWords.length - 1] ?? "");
  if (!bibSurname || !apiSurname) return { status: "WARN", detail: "could not extract surnames" };

  const surnameOk = bibSurname === apiSurname;
  const bibCount = bibAuthor.split(/\s+and\s+/i).length;
  const hasOthers = /others/i.test(bibAuthor);
  const countOk = hasOthers || Math.abs(bibCount - apiAuthors.length) <= 2;

  if (surnameOk && countOk)
    return { status: "OK", detail: `first author '${bibSurname}' matches, count bib=${bibCount} api=${apiAuthors.length}` };
  if (surnameOk)
    return { status: "WARN", detail: `first author matches but count differs: bib=${bibCount} api=${apiAuthors.length}` };
  return { status: "FAIL", detail: `first author mismatch: bib='${bibSurname}' api='${apiSurname}'` };
}

export function matchYear(bibYear: string, apiYear: string | null): MatchResult {
  if (!apiYear) return { status: "WARN", detail: "no year from API" };
  const by = parseInt(bibYear), ay = parseInt(apiYear);
  if (isNaN(by) || isNaN(ay)) return { status: "WARN", detail: `unparseable years: bib=${bibYear} api=${apiYear}` };
  const diff = Math.abs(by - ay);
  if (diff === 0) return { status: "OK", detail: `year exact match (${by})` };
  if (diff <= 1) return { status: "WARN", detail: `year off by 1: bib=${by} api=${ay}` };
  if (diff <= 2) return { status: "WARN", detail: `year off by 2: bib=${by} api=${ay} (preprint vs published?)` };
  return { status: "FAIL", detail: `year mismatch: bib=${by} api=${ay}` };
}

export function matchVenue(bibVenue: string, apiVenue: string): MatchResult {
  if (!apiVenue) return { status: "WARN", detail: "no venue from API" };
  if (!bibVenue) return { status: "WARN", detail: "no venue in bib" };
  const bv = bibVenue.toLowerCase(), av = apiVenue.toLowerCase();
  if ((/arxiv|corr/.test(bv)) && (/arxiv|corr/.test(av)))
    return { status: "OK", detail: "venue match (both arXiv/CoRR)" };
  const score = tokenSimilarity(bv, av);
  if (score >= 0.5) return { status: "OK", detail: `venue match (${score.toFixed(2)})` };
  if (bv.includes(av) || av.includes(bv)) return { status: "OK", detail: "venue match (substring)" };
  return { status: "WARN", detail: `venue unclear: bib='${bibVenue.slice(0, 50)}' api='${apiVenue.slice(0, 50)}'` };
}
