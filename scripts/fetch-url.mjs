#!/usr/bin/env node
// Fetch a URL and print basic metadata + a content preview.
// Usage: node scripts/fetch-url.mjs [url] [--out <file>] [--text-only]

import { writeFile } from "node:fs/promises";
import { argv, exit } from "node:process";

const DEFAULT_URL = "https://openai.com";
const DEFAULT_TIMEOUT_MS = 15000;
// Some sites (e.g. openai.com) return 403 to non-browser UAs, so default to a
// realistic desktop Chrome string. Override with --user-agent if needed.
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function parseArgs(args) {
  const result = { url: DEFAULT_URL, out: null, textOnly: false };
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--out" || arg === "-o") {
      result.out = args[i + 1];
      i += 1;
    } else if (arg === "--text-only" || arg === "-t") {
      result.textOnly = true;
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else {
      positional.push(arg);
    }
  }
  if (positional.length > 0) result.url = positional[0];
  return result;
}

function printHelp() {
  console.log(`Usage: node scripts/fetch-url.mjs [url] [--out <file>] [--text-only]

Arguments:
  url             URL to fetch (default: ${DEFAULT_URL})

Options:
  --out, -o       Write the response body to the given file path
  --text-only, -t Strip HTML tags and emit readable plain text instead of raw HTML
  --help, -h      Show this help message`);
}

export async function fetchUrl(url, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const body = await response.text();
    return {
      url,
      finalUrl: response.url,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get("content-type"),
      contentLength: body.length,
      elapsedMs: Date.now() - startedAt,
      body,
    };
  } finally {
    clearTimeout(timer);
  }
}

export const fetchWebpage = fetchUrl;

export function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  return match[1].replace(/\s+/g, " ").trim();
}

const HTML_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "\u00a9",
  reg: "\u00ae",
  trade: "\u2122",
  hellip: "\u2026",
  mdash: "\u2014",
  ndash: "\u2013",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201c",
  rdquo: "\u201d",
};

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&([a-zA-Z]+);/g, (match, name) => {
      const lower = name.toLowerCase();
      return Object.prototype.hasOwnProperty.call(HTML_ENTITIES, lower)
        ? HTML_ENTITIES[lower]
        : match;
    });
}

// Convert HTML to readable plain text. Best-effort, no DOM dependency:
// drops <script>/<style>/<noscript>, turns block-level tags into newlines,
// converts <br> to newline, decodes common entities, and collapses whitespace.
export function htmlToText(html) {
  if (typeof html !== "string" || html.length === 0) return "";
  let text = html;
  text = text.replace(/<!--[\s\S]*?-->/g, "");
  text = text.replace(
    /<(script|style|noscript|template|svg)\b[^>]*>[\s\S]*?<\/\1>/gi,
    "",
  );
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/(p|div|section|article|header|footer|nav|aside|main|ul|ol|li|tr|td|th|h[1-6]|blockquote|pre|figure|figcaption|table)\s*>/gi, "\n");
  text = text.replace(/<(p|div|section|article|header|footer|nav|aside|main|ul|ol|li|tr|td|th|h[1-6]|blockquote|pre|figure|figcaption|table)\b[^>]*>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");
  text = decodeEntities(text);
  text = text.replace(/[ \t\f\v]+/g, " ");
  text = text.replace(/ *\n */g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

async function main() {
  const opts = parseArgs(argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  try {
    new URL(opts.url);
  } catch {
    console.error(`Invalid URL: ${opts.url}`);
    exit(2);
  }

  console.log(`Fetching ${opts.url} ...`);
  let result;
  try {
    result = await fetchUrl(opts.url);
  } catch (err) {
    console.error(`Fetch failed: ${err.message}`);
    exit(1);
  }

  const title = extractTitle(result.body);
  const output = opts.textOnly ? htmlToText(result.body) : result.body;
  console.log(`Status:        ${result.status} ${result.ok ? "OK" : "FAIL"}`);
  console.log(`Final URL:     ${result.finalUrl}`);
  console.log(`Content-Type:  ${result.contentType ?? "(none)"}`);
  console.log(`Bytes:         ${result.contentLength}`);
  console.log(`Elapsed:       ${result.elapsedMs} ms`);
  console.log(`<title>:       ${title ?? "(not found)"}`);
  if (opts.textOnly) {
    console.log(`Text bytes:    ${output.length}`);
  }

  if (opts.out) {
    await writeFile(opts.out, output, "utf8");
    console.log(`Wrote ${opts.textOnly ? "text" : "body"} to ${opts.out}`);
  } else {
    const preview = opts.textOnly
      ? output.slice(0, 1000)
      : output.slice(0, 500).replace(/\s+/g, " ").trim();
    const truncated = output.length > (opts.textOnly ? 1000 : 500);
    const label = opts.textOnly ? "Text:" : "Preview:      ";
    if (opts.textOnly) {
      console.log(`${label}`);
      console.log(preview + (truncated ? "\n…" : ""));
    } else {
      console.log(`${label} ${preview}${truncated ? "…" : ""}`);
    }
  }

  if (!result.ok) exit(1);
}

const isDirectRun = import.meta.url === `file://${argv[1]}`;
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    exit(1);
  });
}
