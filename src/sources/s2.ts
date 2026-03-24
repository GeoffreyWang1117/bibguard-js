import type { SourceResult } from "../types.js";
import { fetchJSON } from "./common.js";
import { tokenSimilarity, extractFirstSurname } from "../matching.js";

export async function queryS2(title: string, bibFirstAuthor = ""): Promise<SourceResult | null> {
  const params = new URLSearchParams({
    query: title, limit: "10",
    fields: "title,authors,year,venue,citationCount,externalIds",
  });
  const data = await fetchJSON(`https://api.semanticscholar.org/graph/v1/paper/search?${params}`, "s2");
  if (!data?.data?.length) return null;

  const bibSurname = bibFirstAuthor ? extractFirstSurname(bibFirstAuthor) : "";
  let best: any = null, bestScore = 0;

  for (const p of data.data) {
    let score = tokenSimilarity(title, p.title ?? "");
    if (score < 0.6) continue;
    const pAuthors = (p.authors ?? []).map((a: any) => a.name ?? "");
    if (bibSurname && pAuthors.length) {
      const apiSurname = pAuthors[0].split(/\s+/).pop()?.toLowerCase() ?? "";
      if (apiSurname === bibSurname) score += 0.3;
    }
    if (score > bestScore) { bestScore = score; best = p; }
  }
  if (!best || bestScore < 0.6) return null;

  const authors = (best.authors ?? []).map((a: any) => a.name ?? "");
  const extIds = best.externalIds ?? {};

  return {
    source: "s2", title: best.title ?? "", authors,
    year: best.year ? String(best.year) : null,
    venue: best.venue ?? "", doi: extIds.DOI ?? "",
    citationCount: best.citationCount,
  };
}
