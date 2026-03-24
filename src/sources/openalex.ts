import type { SourceResult } from "../types.js";
import { fetchJSON } from "./common.js";
import { tokenSimilarity, extractFirstSurname } from "../matching.js";

export async function queryOpenAlex(title: string, bibFirstAuthor = ""): Promise<SourceResult | null> {
  const params = new URLSearchParams({ search: title, per_page: "5", mailto: "bibguard@example.com" });
  const data = await fetchJSON(`https://api.openalex.org/works?${params}`, "openalex");
  if (!data?.results?.length) return null;

  const bibSurname = bibFirstAuthor ? extractFirstSurname(bibFirstAuthor) : "";
  let best: any = null, bestScore = 0;
  let bestAuthors: string[] = [];

  for (const work of data.results) {
    const wTitle = work.title ?? "";
    let score = tokenSimilarity(title, wTitle);
    if (score < 0.6) continue;
    const authors = (work.authorships ?? []).map((a: any) => a.author?.display_name ?? "").filter(Boolean);
    if (bibSurname && authors.length) {
      const apiSurname = authors[0].split(/\s+/).pop()?.toLowerCase() ?? "";
      if (apiSurname === bibSurname) score += 0.3;
    }
    if (score > bestScore) { bestScore = score; best = work; bestAuthors = authors; }
  }
  if (!best || bestScore < 0.6) return null;

  let doi = best.doi ?? "";
  if (doi.startsWith("https://doi.org/")) doi = doi.slice(16);

  return {
    source: "openalex", title: best.title ?? "", authors: bestAuthors,
    year: best.publication_year ? String(best.publication_year) : null,
    venue: best.primary_location?.source?.display_name ?? "",
    doi, isRetracted: best.is_retracted ?? false,
    citationCount: best.cited_by_count,
  };
}
