import type { SourceResult } from "../types.js";
import { fetchText } from "./common.js";

export async function queryArxiv(arxivId: string): Promise<SourceResult | null> {
  const text = await fetchText(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`, "arxiv");
  if (!text) return null;

  const titles = [...text.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/g)].map((m) => m[1].replace(/\s+/g, " ").trim());
  if (titles.length < 2) return null;
  const title = titles[1];
  if (title.toLowerCase().startsWith("error")) return null;

  const authors = [...text.matchAll(/<name>(.*?)<\/name>/g)].map((m) => m[1]);
  const pubMatch = text.match(/<published>(.*?)<\/published>/);
  const year = pubMatch ? pubMatch[1].slice(0, 4) : null;

  return { source: "arxiv", title, authors, year, venue: "", doi: "" };
}
