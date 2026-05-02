---
name: fetch-url
description: "Use when: fetching raw HTML or readable text from a URL/link/page, saving a body to disk, extracting a page title, or inspecting official website pages. Keywords: fetch URL, fetch link, HTTP GET, scrape HTML, html to text, plain text, strip tags, page title, sitemap, robots.txt."
argument-hint: "<url> [--out <file>] [--text-only]"
---

# Fetch URL

Use this skill for direct URL/link/page reads in this repository. It wraps `scripts/fetch-url.mjs` and replaces native `web_fetch`-style tools.

## Run

```sh
node scripts/fetch-url.mjs <url>
```

Options:

- `--text-only` / `-t`: strip HTML/script/style into readable text.
- `--out <path>` / `-o <path>`: save raw HTML or cleaned text to a diagnostic file.
- `--help`: print CLI usage.

## Use for

- Homepage, sitemap, robots.txt, docs, pricing, blog/news, changelog, trust/security, status, customer, partner, or press pages.
- One-off URL reachability checks, page-title extraction, and grep-friendly text dumps.
- Diagnostic local text snapshots for research packs. Save with `--text-only --out <diagnostic-path>` when repeated extraction or grep will speed up analysis.

## Official-surface checklist

For startup diligence runs, review official pages in this order when available:

1. homepage and canonical redirects;
2. `robots.txt` and sitemap URLs;
3. about/company, leadership, careers, newsroom/blog, and press pages;
4. product, solutions, pricing, packaging, customer, partner, and case-study pages;
5. docs/API/developer portals, changelog/release notes, integrations, status, trust/security, privacy, DPA, subprocessors, terms, and compliance pages.

Retain the original reviewed URL in `localEvidence.sources[]`; do not cite the local snapshot path.

## Do not use for

- Multi-page crawling, JavaScript-rendered login flows, or interactive pages; use browser tooling when needed.
- Broad source discovery; use search first, then fetch direct URLs for review.

## Completion check

- Confirm status, final URL, content type, bytes, elapsed time, and title.
- If saved with `--out`, treat the file as diagnostic only; never as a report artifact or source of truth.
- For non-2xx responses, record the failure and try a better URL/source rather than inventing page content.
