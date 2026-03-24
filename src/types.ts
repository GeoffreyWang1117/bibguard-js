/** A parsed BibTeX entry. */
export interface BibEntry {
  key: string;
  type: string;
  title: string;
  author: string;
  year: string;
  doi: string;
  arxivId: string | null;
  venue: string;
  journal: string;
  booktitle: string;
  volume: string;
  pages: string;
  url: string;
  raw: Record<string, string>;
}

/** A single field-level check result. */
export interface Check {
  field: string;
  status: "OK" | "WARN" | "FAIL";
  detail: string;
  source: string;
}

/** Verification result for a single entry. */
export interface VerificationResult {
  key: string;
  title: string;
  overall: "OK" | "WARN" | "FAIL";
  sourcesTried: string[];
  sourcesHit: string[];
  checks: Check[];
  suggestedFixes: Record<string, string>;
}

/** API source response (normalized). */
export interface SourceResult {
  source: string;
  title: string;
  authors: string[];
  year: string | null;
  venue: string;
  doi: string;
  isRetracted?: boolean;
  citationCount?: number;
}

/** Overall report summary. */
export interface ReportSummary {
  total: number;
  ok: number;
  warn: number;
  fail: number;
  elapsedMs: number;
}
