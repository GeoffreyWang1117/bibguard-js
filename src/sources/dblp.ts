import type { SourceResult } from "../types.js";
import { fetchJSON } from "./common.js";
import { tokenSimilarity, extractFirstSurname } from "../matching.js";

export async function queryDblp(title: string, bibFirstAuthor = ""): Promise<SourceResult | null> {
  const params = new URLSearchParams({ q: title, format: "json", h: "10" });
  const data = await fetchJSON(`https://dblp.org/search/publ/api?${params}`, "dblp");
  const hits = data?.result?.hits?.hit;
  if (!hits?.length) return null;

  const bibSurname = bibFirstAuthor ? extractFirstSurname(bibFirstAuthor) : "";
  let best: any = null, bestScore = 0, bestAuthors: string[] = [];

  for (const hit of hits) {
    const info = hit.info ?? {};
    const hitTitle = (info.title ?? "").replace(/\.$/, "");
    let score = tokenSimilarity(title, hitTitle);
    if (score < 0.6) continue;

    let authorsData = info.authors?.author ?? [];
    if (!Array.isArray(authorsData)) authorsData = [authorsData];
    const authors = authorsData.map((a: any) => {
      const name = typeof a === "string" ? a : a.text ?? "";
      return name.replace(/\s+\d{4}$/, "").trim();
    });

    if (bibSurname && authors.length) {
      const apiSurname = authors[0].split(/\s+/).pop()?.toLowerCase() ?? "";
      if (apiSurname === bibSurname) score += 0.3;
    }
    if (score > bestScore) { bestScore = score; best = info; bestAuthors = authors; }
  }
  if (!best || bestScore < 0.6) return null;

  let venue = best.venue ?? "";
  if (Array.isArray(venue)) venue = venue[0] ?? "";

  return {
    source: "dblp", title: (best.title ?? "").replace(/\.$/, ""), authors: bestAuthors,
    year: best.year ?? null, venue, doi: best.doi ?? "",
  };
}
