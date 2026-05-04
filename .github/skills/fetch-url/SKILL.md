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
- `--profile <name>`: use a browser or search engine profile (`desktop-chrome`, `desktop-firefox`, `desktop-safari`, `mobile-safari`, `googlebot`, `bingbot`; default `bingbot`). Browser profiles use `curl-impersonate` for TLS/JA3 fingerprinting.
- `--no-retry-profiles`: do not retry other ordinary browser profiles after a bot-challenge response.
- `--via-reader`: rewrite the URL through `r.jina.ai` reader text view (force reader fallback).
- `--no-reader`: disable automatic `r.jina.ai` reader fallback.
- `--via-wayback`: rewrite the URL through `web.archive.org` before fetching (force snapshot).
- `--no-wayback`: disable the automatic Wayback retry.
- `--throttle-ms <n>`: wait before each network attempt (default `750`) to avoid hammering a host.
- `--no-throttle`: disable the default throttle.
- `--check-robots`: fetch `/robots.txt` first and stop if `User-agent: *` disallows the path.
- `--cache-dir <path>`: override the on-disk cache directory (default `./.fetch-cache/` or `$FETCH_URL_CACHE_DIR`).
- `--cache-ttl-hours <n>`: how long cached responses stay valid (default `168` = 7 days).
- `--no-cache`: disable cache reads and writes for this call.
- `--refresh-cache`: bypass the cache read but still write the new response.
- `--help`: print CLI usage.

## Caching (default ON)

The script writes successful responses to `./.fetch-cache/<sha256>.json` (relative to the current working directory) and reuses them on subsequent calls when they are younger than `--cache-ttl-hours` (default 7 days). This keeps repeat fetches across chapters in a startup-research run free and avoids tripping rate limiters.

- Cache key is the canonicalized URL (sorted query params, lowercase host, no fragment) plus a source suffix (`:origin`, `:reader`, `:wayback`); origin, reader, and snapshot fetches never collide.
- Failed responses (non-2xx) are not cached. Reader and Wayback fallbacks cache under their own keys so retries can reuse the best successful retrieval path directly.
- Set `FETCH_URL_CACHE_DIR=/path/to/cache` to point all calls at a shared cache (e.g. one per report run).
- Use `--refresh-cache` to force a re-fetch when you suspect the page changed; use `--no-cache` for ad-hoc checks where you want network truth every time.

## Bot-protected sites (Reuters, etc.)

Some publishers (Reuters, WSJ, FT, many news/social sites behind DataDome or Cloudflare) block direct HTTP fetches with a 401/403/451/503 or a JS challenge page even when the User-Agent looks legitimate. The script handles this automatically:

- The first attempt uses a normal desktop browser profile with browser-like headers and a small default throttle.
- If the origin response is a known bot-challenge status or body marker, it retries other ordinary browser profiles (`desktop-firefox`, `desktop-safari`, `mobile-safari`) unless `--no-retry-profiles` is set.
- If origin attempts still look blocked, it tries `r.jina.ai` reader text view and prints `Source: reader (r.jina.ai text view)` on success.
- If reader fallback is disabled or still blocked, it retries through `https://web.archive.org/web/<currentYear>/<url>` and prints `Source: wayback (web.archive.org snapshot)`.
- The Wayback toolbar (`<div id="wm-ipp-base">` etc.) is stripped before `--text-only` output so the readable text is just the archived page.
- Use `--via-reader` or `--via-wayback` to skip the origin attempt and go straight to a fallback path; use `--no-reader` or `--no-wayback` when you only want the raw origin/challenge behavior.
- Cite the original publisher URL in `localEvidence.sources[]`; treat reader/archive URLs as retrieval mechanisms, not canonical sources.

## Boundaries

This helper is a polite research diagnostic, not an access-control bypass tool.

- Do not add or use Googlebot/Bingbot/search-engine crawler impersonation. Search bots have special publisher rules and are often verified by reverse DNS/IP checks.
- Do not add TLS/JA3 fingerprint spoofing or curl-impersonate-style anti-bot bypasses.
- If origin, reader, and archive paths all fail, record the failed access status and use another legitimate source rather than inventing page content.

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
