#!/usr/bin/env node
// Fetch a URL with optional readable-text extraction. Used by the fetch-url skill.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { argv, env, exit } from 'node:process';

const DEFAULT_URL = 'https://openai.com';
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const DEFAULT_CACHE_DIR = env.FETCH_URL_CACHE_DIR
  ? resolve(env.FETCH_URL_CACHE_DIR)
  : resolve(process.cwd(), '.fetch-cache');
const DEFAULT_CACHE_TTL_HOURS = 24 * 7;

const BLOCK_TAGS = 'p|div|section|article|header|footer|nav|aside|main|ul|ol|li|tr|td|th|h[1-6]|blockquote|pre|figure|figcaption|table';
const BLOCK_TAG_RE = new RegExp(`<\\/?(${BLOCK_TAGS})(?:\\s[^>]*)?>`, 'gi');

const ENTITY_MAP = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  copy: '©', reg: '®', trade: '™', hellip: '…',
  mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
};

function parseArgs(args) {
  const opts = {
    url: DEFAULT_URL,
    file: null,
    textOnly: false,
    userAgent: DEFAULT_USER_AGENT,
    viaWayback: false,
    noWayback: false,
    help: false,
    cacheDir: DEFAULT_CACHE_DIR,
    cacheTtlHours: DEFAULT_CACHE_TTL_HOURS,
    noCache: false,
    refreshCache: false,
  };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--text-only' || arg === '-t') opts.textOnly = true;
    else if (arg === '--out' || arg === '-o') opts.file = args[++i];
    else if (arg === '--user-agent') opts.userAgent = args[++i] ?? opts.userAgent;
    else if (arg === '--via-wayback') opts.viaWayback = true;
    else if (arg === '--no-wayback') opts.noWayback = true;
    else if (arg === '--cache-dir') opts.cacheDir = resolve(args[++i] ?? opts.cacheDir);
    else if (arg === '--cache-ttl-hours') opts.cacheTtlHours = Number(args[++i] ?? opts.cacheTtlHours);
    else if (arg === '--no-cache') opts.noCache = true;
    else if (arg === '--refresh-cache') opts.refreshCache = true;
    else opts.url = arg;
  }
  return opts;
}

function help() {
  console.log(`Usage: node .github/skills/fetch-url/scripts/fetch.mjs [url] [--text-only] [--out <file>] [--user-agent <ua>] [--via-wayback | --no-wayback] [--cache-dir <path>] [--cache-ttl-hours <n>] [--no-cache] [--refresh-cache]

Default URL: ${DEFAULT_URL}

Caching: enabled by default at ${DEFAULT_CACHE_DIR} (override with --cache-dir or FETCH_URL_CACHE_DIR env). Cached responses younger than ${DEFAULT_CACHE_TTL_HOURS}h are reused. Use --refresh-cache to bypass the read but still write, --no-cache to disable read+write entirely.

Wayback fallback: bot-protected sites (DataDome/Cloudflare challenge, 401/403/451/503) automatically retry through web.archive.org. Use --via-wayback to force, --no-wayback to disable.`);
}

export async function fetchUrl(url, { timeoutMs = DEFAULT_TIMEOUT_MS, userAgent = DEFAULT_USER_AGENT } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const body = await response.text();
    return {
      url,
      finalUrl: response.url,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      contentLength: body.length,
      elapsedMs: Date.now() - started,
      body,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function extractTitle(html) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() ?? null;
}

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITY_MAP[name.toLowerCase()] ?? match);
}

export function htmlToText(html) {
  const stripped = String(html ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|template|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(BLOCK_TAG_RE, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(stripped)
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Wayback Machine fallback for bot-protected sites. The /web/<year>/<url>
// form 302s to the closest snapshot, so callers do not need to know the
// snapshot timestamp ahead of time.
export function waybackUrl(url, year = new Date().getUTCFullYear()) {
  return `https://web.archive.org/web/${year}/${url}`;
}

// ---------------------------------------------------------------------------
// On-disk cache (default ON). Avoids repeat bandwidth and rate-limit hits
// when the same URL is fetched across chapters in a startup-research run.
// Cache key is a SHA-256 of the canonicalized URL plus a `:wayback` suffix
// when the wayback path was forced, so origin and snapshot fetches do not
// collide.
// ---------------------------------------------------------------------------
export function canonicalCacheKey(url, viaWayback = false) {
  let canonical = url;
  try {
    const u = new URL(url);
    u.hash = '';
    if (u.searchParams && [...u.searchParams.keys()].length > 0) {
      const params = [...u.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
      u.search = '';
      for (const [k, v] of params) u.searchParams.append(k, v);
    }
    u.hostname = u.hostname.toLowerCase();
    canonical = u.toString();
  } catch {
    canonical = String(url);
  }
  const suffix = viaWayback ? ':wayback' : '';
  return createHash('sha256').update(canonical + suffix).digest('hex').slice(0, 32);
}

function cachePath(dir, url, viaWayback) {
  return join(dir, `${canonicalCacheKey(url, viaWayback)}.json`);
}

function readCache(dir, url, viaWayback, ttlHours) {
  const path = cachePath(dir, url, viaWayback);
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    if (!raw?.fetchedAt) return null;
    const ageMs = Date.now() - new Date(raw.fetchedAt).valueOf();
    if (!Number.isFinite(ageMs) || ageMs < 0) return null;
    if (ttlHours > 0 && ageMs > ttlHours * 3_600_000) return null;
    return { ...raw, _cachePath: path, _ageMs: ageMs };
  } catch {
    return null;
  }
}

function writeCache(dir, url, viaWayback, result) {
  try {
    mkdirSync(dir, { recursive: true });
    const payload = {
      requestedUrl: url,
      finalUrl: result.finalUrl,
      status: result.status,
      ok: result.ok,
      contentType: result.contentType,
      contentLength: result.contentLength,
      elapsedMs: result.elapsedMs,
      body: result.body,
      viaWayback,
      fetchedAt: new Date().toISOString(),
    };
    writeFileSync(cachePath(dir, url, viaWayback), JSON.stringify(payload), 'utf8');
  } catch (err) {
    console.error(`[fetch-url] cache write failed: ${err.message}`);
  }
}

const BOT_CHALLENGE_STATUSES = new Set([401, 403, 451, 503]);
const BOT_CHALLENGE_MARKERS = [
  'datadome',
  'please enable js',
  'cf-browser-verification',
  'just a moment...',
  'access denied',
  'attention required! | cloudflare',
];

export function looksLikeBotChallenge(result) {
  if (!result) return false;
  if (BOT_CHALLENGE_STATUSES.has(result.status)) return true;
  const body = String(result.body ?? '').slice(0, 4000).toLowerCase();
  return BOT_CHALLENGE_MARKERS.some((marker) => body.includes(marker));
}

// The Wayback toolbar injects <div id="wm-ipp-base">...</div> and a
// SCRIPT_PATH redirect block. Strip them so --text-only output is just the
// archived page content.
export function stripWaybackToolbar(html) {
  return String(html ?? '')
    .replace(/<!--\s*BEGIN WAYBACK TOOLBAR INSERT[\s\S]*?END WAYBACK TOOLBAR INSERT\s*-->/gi, '')
    .replace(/<div[^>]*id=["']wm-ipp(?:-base|-print)?["'][\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi, '')
    .replace(/<script[^>]*src=["'][^"']*\/static\/_wb_\/[\s\S]*?<\/script>/gi, '')
    .replace(/<link[^>]*\/static\/_wb_\/[^>]*>/gi, '');
}

async function main() {
  const opts = parseArgs(argv.slice(2));
  if (opts.help) {
    help();
    return;
  }
  try {
    new URL(opts.url);
  } catch {
    console.error(`Invalid URL: ${opts.url}`);
    exit(2);
  }

  let result;
  let viaWayback = false;
  let cacheHit = false;
  let cacheAgeMinutes = null;
  const useCacheRead = !opts.noCache && !opts.refreshCache;
  const useCacheWrite = !opts.noCache;
  const targetUrl = opts.viaWayback ? waybackUrl(opts.url) : opts.url;

  if (useCacheRead) {
    const cached = readCache(opts.cacheDir, opts.url, opts.viaWayback, opts.cacheTtlHours);
    if (cached) {
      result = {
        url: cached.requestedUrl,
        finalUrl: cached.finalUrl,
        status: cached.status,
        ok: cached.ok,
        contentType: cached.contentType,
        contentLength: cached.contentLength,
        elapsedMs: cached.elapsedMs,
        body: cached.body,
      };
      viaWayback = cached.viaWayback;
      cacheHit = true;
      cacheAgeMinutes = Math.round(cached._ageMs / 60_000);
    }
  }

  if (!cacheHit) {
    try {
      result = await fetchUrl(targetUrl, { userAgent: opts.userAgent });
      viaWayback = opts.viaWayback;
    } catch (err) {
      console.error(`Fetch failed: ${err.message}`);
      exit(1);
    }

    if (!opts.viaWayback && !opts.noWayback && looksLikeBotChallenge(result)) {
      console.error(`[fetch-url] origin returned ${result.status} or bot-challenge body; retrying via Wayback Machine.`);
      try {
        const fallback = await fetchUrl(waybackUrl(opts.url), { userAgent: opts.userAgent });
        if (fallback.ok && !looksLikeBotChallenge(fallback)) {
          result = fallback;
          viaWayback = true;
        } else {
          console.error(`[fetch-url] Wayback fallback also blocked (status ${fallback.status}); keeping origin response.`);
        }
      } catch (err) {
        console.error(`[fetch-url] Wayback fallback failed: ${err.message}; keeping origin response.`);
      }
    }

    if (viaWayback) result = { ...result, body: stripWaybackToolbar(result.body), contentLength: stripWaybackToolbar(result.body).length };

    if (useCacheWrite && result.ok) {
      writeCache(opts.cacheDir, opts.url, viaWayback, result);
    }
  }

  const output = opts.textOnly ? htmlToText(result.body) : result.body;
  console.log(`Status:        ${result.status} ${result.ok ? 'OK' : 'FAIL'}`);
  console.log(`Final URL:     ${result.finalUrl}`);
  if (cacheHit) console.log(`Source:        cache (age ${cacheAgeMinutes}m, ttl ${opts.cacheTtlHours}h${viaWayback ? ', via wayback' : ''})`);
  else if (viaWayback) console.log(`Source:        wayback (web.archive.org snapshot)`);
  console.log(`Content-Type:  ${result.contentType ?? '(none)'}`);
  console.log(`Bytes:         ${result.contentLength}`);
  console.log(`Elapsed:       ${result.elapsedMs} ms${cacheHit ? ' (original)' : ''}`);
  console.log(`<title>:       ${extractTitle(result.body) ?? '(not found)'}`);
  if (opts.textOnly) console.log(`Text bytes:    ${output.length}`);

  if (opts.file) {
    await writeFile(opts.file, output, 'utf8');
    console.log(`Wrote ${opts.textOnly ? 'text' : 'body'} to ${opts.file}`);
  } else {
    const limit = opts.textOnly ? 1000 : 500;
    const preview = opts.textOnly
      ? output.slice(0, limit)
      : output.slice(0, limit).replace(/\s+/g, ' ').trim();
    if (opts.textOnly) console.log(`Text:\n${preview}${output.length > limit ? '\n…' : ''}`);
    else console.log(`Preview:       ${preview}${output.length > limit ? '…' : ''}`);
  }
  if (!result.ok) exit(1);
}

if (import.meta.url === `file://${argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    exit(1);
  });
}
