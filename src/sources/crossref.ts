import type { SourceResult } from "../types.js";
import { fetchJSON } from "./common.js";

export async function queryCrossref(doi: string): Promise<SourceResult | null> {
  const data = await fetchJSON(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, "crossref");
  if (!data?.message) return null;
  const msg = data.message;
  const title = msg.title?.[0] ?? "";
  const authors = (msg.author ?? []).map((a: any) => `${a.given ?? ""} ${a.family ?? ""}`.trim()).filter(Boolean);
  let year: string | null = null;
  for (const f of ["published-print", "published-online", "created"]) {
    const parts = msg[f]?.["date-parts"]?.[0];
    if (parts?.[0]) { year = String(parts[0]); break; }
  }
  const venue = msg["container-title"]?.[0] ?? "";
  const isRetracted = (msg["update-to"] ?? []).some((u: any) => u.type === "retracted-article");
  return { source: "crossref", title, authors, year, venue, doi, isRetracted };
}
