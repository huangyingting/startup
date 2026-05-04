---
name: fetch-url
description: "Use when: fetching raw HTML or readable text from a URL/link/page, saving a body to disk, extracting a page title, or inspecting official website pages. Keywords: fetch URL, fetch link, HTTP GET, scrape HTML, html to text, plain text, strip tags, page title, sitemap, robots.txt."
argument-hint: "<url> [--out <file>] [--text-only]"
---

# Fetch URL

Use this skill for direct URL/link/page reads in this repository. It wraps `./scripts/fetch.mjs` and replaces native `web_fetch`-style tools.

## Run

```sh
node .github/skills/fetch-url/scripts/fetch.mjs <url>
```

Options:

- `--text-only` / `-t`: strip HTML/script/style into readable text.
- `--out <path>` / `-o <path>`: save raw HTML or cleaned text to a diagnostic file.
- `--user-agent <ua>`: override the default desktop Chrome UA.
- `--via-wayback`: rewrite the URL through `web.archive.org` before fetching (force snapshot).
- `--no-wayback`: disable the automatic Wayback retry.
- `--cache-dir <path>`: override the on-disk cache directory (default `./.fetch-cache/` or `$FETCH_URL_CACHE_DIR`).
- `--cache-ttl-hours <n>`: how long cached responses stay valid (default `168` = 7 days).
- `--no-cache`: disable cache reads and writes for this call.
- `--refresh-cache`: bypass the cache read but still write the new response.
- `--help`: print CLI usage.

## Caching (default ON)

The script writes successful responses to `./.fetch-cache/<sha256>.json` (relative to the current working directory) and reuses them on subsequent calls when they are younger than `--cache-ttl-hours` (default 7 days). This keeps repeat fetches across chapters in a startup-research run free and avoids tripping rate limiters.

- Cache key is the canonicalized URL (sorted query params, lowercase host, no fragment) plus a `:wayback` suffix when the wayback path was forced; origin and snapshot fetches never collide.
- Failed responses (non-2xx) are not cached. The Wayback fallback caches under the wayback key so retries find the snapshot directly.
- Set `FETCH_URL_CACHE_DIR=/path/to/cache` to point all calls at a shared cache (e.g. one per report run).
- Use `--refresh-cache` to force a re-fetch when you suspect the page changed; use `--no-cache` for ad-hoc checks where you want network truth every time.

## Bot-protected sites (Reuters, etc.)

Some publishers (Reuters, WSJ, FT, many news/social sites behind DataDome or Cloudflare) block direct HTTP fetches with a 401/403/451/503 or a JS challenge page even when the User-Agent looks legitimate. The script handles this automatically:

- If the origin response is a known bot-challenge status or body marker, it retries through `https://web.archive.org/web/<currentYear>/<url>` and prints `Source: wayback (web.archive.org snapshot)`.
- The Wayback toolbar (`<div id="wm-ipp-base">` etc.) is stripped before `--text-only` output so the readable text is just the archived page.
- Use `--via-wayback` to skip the origin attempt and go straight to the snapshot, or `--no-wayback` to disable the fallback when you only want the raw bot-challenge body.
- Cite the original publisher URL in `localEvidence.sources[]`; treat the archived snapshot as a retrieval mechanism, not the canonical source.

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
