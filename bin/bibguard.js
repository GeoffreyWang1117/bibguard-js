#!/usr/bin/env node

/**
 * bibguard CLI — Node.js entry point.
 * Usage: npx bibguard paper.bib [--json] [--out report.json]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { parseBib, verifyAll } from "../dist/index.js";

const args = process.argv.slice(2);
const bibPath = args.find((a) => !a.startsWith("-"));
const jsonMode = args.includes("--json");
const outIdx = args.indexOf("--out");
const outPath = outIdx >= 0 ? args[outIdx + 1] : null;

if (!bibPath) {
  console.error("Usage: bibguard <file.bib> [--json] [--out report.json]");
  process.exit(2);
}

const bibText = readFileSync(bibPath, "utf-8");
const entries = parseBib(bibText);
const total = entries.length;

console.log(`\n  bibguard v0.3.0 (TypeScript)`);
console.log(`  ${bibPath} — ${total} entries\n`);

const t0 = Date.now();

const results = await verifyAll(entries, (i, n, key, status) => {
  const pad = String(n).length;
  const icon = { OK: "\u2705", WARN: "\u26A0\uFE0F ", FAIL: "\u274C" }[status];
  console.log(`  [${String(i).padStart(pad)}/${n}] ${key.padEnd(40)} ${icon}`);
});

const elapsed = Date.now() - t0;
const ok = results.filter((r) => r.overall === "OK").length;
const warn = results.filter((r) => r.overall === "WARN").length;
const fail = results.filter((r) => r.overall === "FAIL").length;

console.log(`\n  ${"─".repeat(50)}`);
console.log(`  \u2705 ${ok}  \u26A0\uFE0F  ${warn}  \u274C ${fail}  (${total} entries in ${(elapsed / 1000).toFixed(1)}s)`);

if (fail > 0) {
  console.log(`\n  FAIL entries:`);
  for (const r of results) {
    if (r.overall !== "FAIL") continue;
    const critical = r.checks.find((c) => c.status === "FAIL");
    console.log(`    \u274C ${r.key} — ${critical?.field ?? "unknown"}`);
  }
}
console.log(`  ${"─".repeat(50)}`);

if (jsonMode || outPath) {
  const report = JSON.stringify({
    version: "0.2.0", file: bibPath,
    summary: { total, ok, warn, fail, elapsedMs: elapsed },
    results,
  }, null, 2);

  if (outPath) {
    writeFileSync(outPath, report, "utf-8");
    console.log(`\n  Report saved to ${outPath}`);
  } else {
    console.log(`\n${report}`);
  }
}

process.exit(fail > 0 ? 1 : 0);
