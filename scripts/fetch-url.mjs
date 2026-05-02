#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { argv, exit } from 'node:process';

const DEFAULT_URL = 'https://openai.com';
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BLOCK_TAGS = 'p|div|section|article|header|footer|nav|aside|main|ul|ol|li|tr|td|th|h[1-6]|blockquote|pre|figure|figcaption|table';
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®', trade: '™', hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };

function parseArgs(args) {
  const out = { url: DEFAULT_URL, file: null, textOnly: false, userAgent: DEFAULT_USER_AGENT, help: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg === '--text-only' || arg === '-t') out.textOnly = true;
    else if (arg === '--out' || arg === '-o') out.file = args[++i];
    else if (arg === '--user-agent') out.userAgent = args[++i] ?? out.userAgent;
    else out.url = arg;
  }
  return out;
}

function help() {
  console.log(`Usage: node scripts/fetch-url.mjs [url] [--text-only] [--out <file>] [--user-agent <ua>]\n\nDefault URL: ${DEFAULT_URL}`);
}

export async function fetchUrl(url, { timeoutMs = DEFAULT_TIMEOUT_MS, userAgent = DEFAULT_USER_AGENT } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': userAgent, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' },
    });
    const body = await response.text();
    return { url, finalUrl: response.url, status: response.status, ok: response.ok, contentType: response.headers.get('content-type'), contentLength: body.length, elapsedMs: Date.now() - started, body };
  } finally {
    clearTimeout(timer);
  }
}

export const fetchWebpage = fetchUrl;

export function extractTitle(html) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() ?? null;
}

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

export function htmlToText(html) {
  return decodeEntities(String(html ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|template|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(new RegExp(`<\\/?(${BLOCK_TAGS})(?:\\s[^>]*)?>`, 'gi'), '\n')
    .replace(/<[^>]+>/g, ''))
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function main() {
  const opts = parseArgs(argv.slice(2));
  if (opts.help) return help();
  try { new URL(opts.url); } catch { console.error(`Invalid URL: ${opts.url}`); exit(2); }

  let result;
  try { result = await fetchUrl(opts.url, { userAgent: opts.userAgent }); }
  catch (err) { console.error(`Fetch failed: ${err.message}`); exit(1); }

  const output = opts.textOnly ? htmlToText(result.body) : result.body;
  console.log(`Status:        ${result.status} ${result.ok ? 'OK' : 'FAIL'}`);
  console.log(`Final URL:     ${result.finalUrl}`);
  console.log(`Content-Type:  ${result.contentType ?? '(none)'}`);
  console.log(`Bytes:         ${result.contentLength}`);
  console.log(`Elapsed:       ${result.elapsedMs} ms`);
  console.log(`<title>:       ${extractTitle(result.body) ?? '(not found)'}`);
  if (opts.textOnly) console.log(`Text bytes:    ${output.length}`);

  if (opts.file) {
    await writeFile(opts.file, output, 'utf8');
    console.log(`Wrote ${opts.textOnly ? 'text' : 'body'} to ${opts.file}`);
  } else {
    const limit = opts.textOnly ? 1000 : 500;
    const preview = opts.textOnly ? output.slice(0, limit) : output.slice(0, limit).replace(/\s+/g, ' ').trim();
    console.log(opts.textOnly ? `Text:\n${preview}${output.length > limit ? '\n…' : ''}` : `Preview:       ${preview}${output.length > limit ? '…' : ''}`);
  }
  if (!result.ok) exit(1);
}

if (import.meta.url === `file://${argv[1]}`) main().catch((err) => { console.error(err); exit(1); });
