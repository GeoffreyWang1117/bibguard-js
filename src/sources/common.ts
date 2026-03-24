/** Shared utilities for API sources. */

const HEADERS = { "User-Agent": "bibguard/0.2.0 (https://github.com/GeoffreyWang1117/bibguard)" };

const lastCall: Record<string, number> = {};
const RATE_LIMITS: Record<string, number> = {
  arxiv: 3000, crossref: 1000, dblp: 1000, s2: 1000, openalex: 500,
};

export async function rateLimit(source: string): Promise<void> {
  const now = Date.now();
  const delay = RATE_LIMITS[source] ?? 1000;
  const last = lastCall[source] ?? 0;
  const wait = delay - (now - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall[source] = Date.now();
}

export async function fetchJSON(url: string, source: string): Promise<any | null> {
  await rateLimit(source);
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchText(url: string, source: string): Promise<string | null> {
  await rateLimit(source);
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
