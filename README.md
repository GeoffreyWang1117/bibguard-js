# bibguard

[![npm version](https://img.shields.io/npm/v/bibguard)](https://www.npmjs.com/package/bibguard)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

**Detect hallucinated and broken citations in academic papers.**

TypeScript implementation — works in Node.js (>=18) and modern browsers. Zero dependencies.

```bash
npx bibguard paper.bib
```

## Install

```bash
# CLI (no install needed)
npx bibguard paper.bib

# As a library
npm install bibguard
```

## CLI Usage

```bash
npx bibguard references.bib
npx bibguard references.bib --json --out report.json
```

## Library Usage

```typescript
import { parseBib, verifyAll } from "bibguard";

// Parse .bib text
const entries = parseBib(bibFileContent);

// Verify all entries (with progress callback)
const results = await verifyAll(entries, (i, total, key, status) => {
  console.log(`[${i}/${total}] ${key}: ${status}`);
});

// Check results
for (const r of results) {
  if (r.overall === "FAIL") {
    console.log(`${r.key}: ${r.checks.filter(c => c.status === "FAIL").map(c => c.field).join(", ")}`);
  }
}
```

### Browser Usage

All 5 API sources support CORS — bibguard works directly in the browser without a proxy:

```html
<script type="module">
  import { parseBib, verifyEntry } from "https://esm.sh/bibguard";

  const bib = `@article{test, title={Attention Is All You Need}, author={Vaswani}, year={2017}}`;
  const entries = parseBib(bib);
  const result = await verifyEntry(entries[0]);
  console.log(result.overall, result.sourcesHit);
</script>
```

This makes it possible to build:
- **Browser extensions** for reviewing papers
- **Overleaf plugins** for real-time citation checking
- **Zotero/Mendeley integrations**
- **VS Code extensions** for .bib file validation

## API Sources

| Source | Lookup | CORS | Coverage |
|--------|--------|------|----------|
| arXiv | ID resolution | Yes | CS, Physics, Math |
| Crossref | DOI resolution | Yes | 150M+ records |
| DBLP | Title search | Yes | CS papers |
| Semantic Scholar | Title search | Yes | 200M+ papers |
| OpenAlex | Title search | Yes | 250M+ works |

All queries respect rate limits. No API keys required.

## Features

- **Phantom ID detection**: DOI/arXiv that looks valid but doesn't resolve
- **Kill-shot logic**: Phantom IDs can never be overridden by search results
- **Author guard**: Stricter matching when phantom IDs are detected
- **Auto-fix suggestions**: Missing DOIs collected from API results
- **Zero dependencies**: Only uses `fetch` (built into Node 18+ and browsers)

## Also available in Python

```bash
pip install bibguard
```

See [bibguard (Python)](https://github.com/GeoffreyWang1117/bibguard) for the full Python version with TeX cross-audit, duplicate detection, Markdown reports, and `.bib` auto-fix.

## Related

- [IntegriRef](https://github.com/GeoffreyWang1117/IntegriRef) — Full L0-L4 verification stack (semantic NLI, citation graph, Bayesian risk)

## License

Apache License 2.0

<details>
<summary><strong>中文说明</strong></summary>

# bibguard (TypeScript 版)

TypeScript 实现的学术引用验证工具。支持 Node.js 和浏览器环境，零依赖。

```bash
npx bibguard paper.bib
```

所有 5 个 API 源均支持 CORS，可直接在浏览器中运行——适合构建审稿人插件、Overleaf 扩展、Zotero 集成等。

Python 版请使用 `pip install bibguard`。

</details>
