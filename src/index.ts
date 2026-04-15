/**
 * bibguard — Detect hallucinated and broken citations in academic papers.
 *
 * Works in both Node.js (>=18) and modern browsers (fetch API required).
 *
 * @example
 * ```ts
 * import { parseBib, verifyAll } from "bibguard";
 * const entries = parseBib(bibText);
 * const results = await verifyAll(entries);
 * ```
 *
 * @packageDocumentation
 */

export { parseBib } from "./parsers/bibtex.js";
export { verifyEntry, verifyAll } from "./core.js";
export type { ProgressCallback } from "./core.js";
export type { BibEntry, VerificationResult, Check, SourceResult, ReportSummary, InjectionFinding, ScanResult } from "./types.js";
export { tokenSimilarity, matchTitle, matchAuthors, matchYear, matchVenue } from "./matching.js";
