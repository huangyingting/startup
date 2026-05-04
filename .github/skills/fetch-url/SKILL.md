---
name: fetch-url
description: "Use when: fetching raw HTML or readable text from a URL/link/page, saving a body to disk, extracting a page title, or inspecting official website pages. Keywords: fetch URL, fetch link, HTTP GET, scrape HTML, html to text, plain text, strip tags, page title, sitemap, robots.txt."
argument-hint: "<url> [--out <file>] [--text-only]"
---

# Fetch URL

Fetch the raw HTML or readable text of a single URL. Wraps `./scripts/fetch.mjs` and replaces native `web_fetch`-style tools.

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

The script writes successful responses to `./.fetch-cache/<sha256>.json` (relative to the current working directory) and reuses them on subsequent calls when they are younger than `--cache-ttl-hours` (default 7 days). This avoids repeat bandwidth and rate-limit hits when the same URL is fetched more than once.

- Cache key is the canonicalized URL (sorted query params, lowercase host, no fragment) plus a source suffix (`:origin`, `:reader`, `:wayback`); origin, reader, and snapshot fetches never collide.
- Failed responses (non-2xx) and bot-challenge bodies are not cached. Reader and Wayback fallbacks cache under their own keys so retries can reuse the best successful retrieval path directly.
- Set `FETCH_URL_CACHE_DIR=/path/to/cache` to point all calls at a shared cache directory.
- Use `--refresh-cache` to force a re-fetch when you suspect the page changed; use `--no-cache` for ad-hoc checks where you want network truth every time.

## Bot-protected sites

Sites behind DataDome, Cloudflare, PerimeterX, etc. block direct HTTP fetches with a 401/403/429/451/503 or a JS challenge page even when the User-Agent looks legitimate. The script handles this automatically:

- The first attempt uses the requested profile with browser-like headers and a small default throttle.
- If the response is a known bot-challenge status or body marker, it retries the other browser profiles (`desktop-chrome`, `desktop-firefox`, `desktop-safari`, `mobile-safari`) — each one using its own TLS/JA3 fingerprint via `curl-impersonate` — unless `--no-retry-profiles` is set.
- If origin attempts still look blocked, it tries `r.jina.ai` reader text view and prints `Source: reader (r.jina.ai text view)` on success.
- If reader fallback is disabled or still blocked, it retries through `https://web.archive.org/web/<currentYear>/<url>` and prints `Source: wayback (web.archive.org snapshot)`.
- The Wayback toolbar (`<div id="wm-ipp-base">` etc.) is stripped before `--text-only` output so the readable text is just the archived page.
- Use `--via-reader` or `--via-wayback` to skip the origin attempt and go straight to a fallback path; use `--no-reader` or `--no-wayback` when you only want the raw origin/challenge behavior.

## Use for

- Single-URL HTML or readable-text retrieval.
- Page-title extraction, reachability checks, and grep-friendly text dumps.
- Local diagnostic snapshots via `--text-only --out <path>` when repeated extraction or grep would be useful.

## Do not use for

- Multi-page crawling, JavaScript-rendered login flows, or interactive pages; use browser tooling instead.
- Broad source discovery; use search first, then fetch direct URLs for review.

## Completion check

- Confirm status, final URL, content type, bytes, elapsed time, and title in the printed summary.
- For non-2xx responses, record the failure rather than inventing page content.
