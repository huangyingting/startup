---
name: fetch-url
description: "Use when: fetching raw HTML or readable text from a URL/link/page, extracting text from a PDF (10-K, S-1, prospectus, investor deck, white paper, court filing, regulatory report), saving a body to disk, extracting a page title, or inspecting official website pages. Keywords: fetch URL, fetch link, HTTP GET, scrape HTML, html to text, plain text, strip tags, page title, sitemap, PDF, pdf to text, parse PDF, extract PDF text, 10-K, S-1, prospectus, SEC filing."
argument-hint: "<url> [--text-only] [--out <file>] [--max-chars N]"
---

# Fetch URL

Fetch a single URL as raw HTML/readable text, or extract text from a PDF. This skill is for agent-facing source inspection; use `./scripts/fetch.mjs` directly.

## Run

```sh
node .agents/skills/fetch-url/scripts/fetch.mjs <url>
node .agents/skills/fetch-url/scripts/fetch.mjs <url> --text-only
node .agents/skills/fetch-url/scripts/fetch.mjs <url> --text-only --out page.txt
node .agents/skills/fetch-url/scripts/fetch.mjs <url> --json
```

## Fetch options

- Output: `--text-only` / `-t` strips HTML/script/style into readable text; for PDFs, emits page-prefixed text with `--- Page N ---` markers. `--out <path>` / `-o <path>` saves HTML/text or raw PDF bytes. `--json` returns structured status/source/cache/title/PDF/body output. `--max-chars <n>` caps text output.
- Identity: `--user-agent <ua>`, `--profile <name>` (`bingbot` default; also `googlebot`, `desktop-chrome`, `desktop-firefox`, `desktop-safari`, `mobile-safari`), `--no-retry-profiles`.
- Fallbacks: `--via-reader`, `--no-reader`, `--via-wayback`, `--no-wayback`, `--no-host-map`, `--ignore-host-map-failures`.
- Runtime/cache: `--throttle-ms <n>` (default `750`), `--no-throttle`, `--cache-dir <path>`, `--cache-ttl-hours <n>` (default `168`), `--no-cache`, `--refresh-cache`, `--help`.

## Optional install: curl-impersonate

`curl-impersonate` gives browser profiles real TLS/JA3 fingerprints for protected sites such as Reuters, WSJ, FT, and Bloomberg. Without it, browser profiles fall back to plain `fetch()`; `bingbot` / `googlebot`, reader, Wayback, host map, and cache still work.

Linux x86_64 target setup:

```sh
INSTALL_DIR="$HOME/.local/share/curl-impersonate"
TARBALL="curl-impersonate-v1.5.6.x86_64-linux-gnu.tar.gz"
URL="https://github.com/lexiforest/curl-impersonate/releases/download/v1.5.6/$TARBALL"
SHA256="b60344f63b9ed8806f0e9f7fd357d9f6c9a82aca279ed1e9e257d544885dcbde"

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
curl -sSL -o "$TARBALL" "$URL"
echo "$SHA256  $TARBALL" | sha256sum -c -
tar -xzf "$TARBALL"
./curl_chrome120 -s -o /dev/null -w '%{http_code}\n' https://example.com   # expect 200
```

Wrapper lookup: `$CURL_IMPERSONATE_DIR/<wrapper>` (default `~/.local/share/curl-impersonate/`), then `$PATH`. Use `CURL_IMPERSONATE_DIR=/path/to/dir` for custom installs. Other architectures have matching release tarballs.

## Retrieval behavior

- Cache is ON by default at `./.fetch-cache/` or `$FETCH_URL_CACHE_DIR`; successful non-bot-challenge responses are reused while younger than `--cache-ttl-hours`. Use `--refresh-cache` to bypass reads but write fresh data, or `--no-cache` for network truth.
- Host strategy map (`references/host-strategies.json`) picks the cheapest known working first attempt. Lookup order is exact host → `www.` alias swap → explicit registrable domain. If the chosen strategy fails, the normal fallback chain still runs; known failures (`strategy: null`) exit code `4` unless `--ignore-host-map-failures` is passed.
- Bot-protection signals include 401/403/429/451/503 and body markers such as DataDome, Cloudflare, PerimeterX, JS/cookie/captcha prompts, Incapsula/Imperva.
- Default fallback chain: requested profile → other browser profiles unless `--no-retry-profiles` → `r.jina.ai` reader unless disabled → Wayback (`web.archive.org`) unless disabled. `--via-reader` / `--via-wayback` force a fallback path; Wayback toolbar HTML is stripped before `--text-only` output.

## PDFs

PDFs are detected by `%PDF-` magic bytes, not URL extension or Content-Type. HTML error pages at `.pdf` URLs stay on the HTML path; no-extension real PDFs such as SEC EDGAR are parsed correctly. Host map, curl-impersonate, cache, reader, and Wayback still apply.

- `node .agents/skills/fetch-url/scripts/fetch.mjs <pdf-url>`: metadata plus short preview; raw bytes are not dumped.
- `node .agents/skills/fetch-url/scripts/fetch.mjs <pdf-url> --text-only`: full extracted text with `--- Page N ---` markers.
- `node .agents/skills/fetch-url/scripts/fetch.mjs <pdf-url> --text-only --max-chars 50000`: cap text for context safety.
- `node .agents/skills/fetch-url/scripts/fetch.mjs <pdf-url> --out report.pdf`: save raw PDF bytes.
- `node .agents/skills/fetch-url/scripts/fetch.mjs <pdf-url> --text-only --out report.txt`: save extracted text.

Scanned PDFs without a text layer return empty/whitespace text; v1 does not OCR.

## Use for / do not use for

Use for single-URL HTML/text retrieval, PDF extraction, page-title/reachability checks, grep-friendly dumps, and local diagnostic snapshots. Do not use for cache administration, host-map maintenance, multi-page crawling, JavaScript-rendered login/interactive pages, or broad source discovery. Search first, then fetch direct URLs.

## Completion check

Confirm status, final URL, content type, bytes, elapsed time, source/cache state, and title/PDF metadata. For non-2xx responses, record the failure rather than inventing page content.
