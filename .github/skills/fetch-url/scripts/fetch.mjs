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
const DEFAULT_PROFILE = 'bingbot';
const DEFAULT_THROTTLE_MS = 750;

const SEARCH_ENGINE_PROFILES = {
  googlebot: {
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    impersonate: 'chrome110', // Googlebot uses a Chrome-based renderer
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },
  bingbot: {
    userAgent: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    impersonate: 'edge110', // Bingbot uses an Edge-based renderer
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },
};

const BROWSER_PROFILES = {
  'desktop-chrome': {
    userAgent: DEFAULT_USER_AGENT,
    impersonate: 'chrome120',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1',
    },
  },
  'desktop-firefox': {
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
    impersonate: 'firefox120',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Upgrade-Insecure-Requests': '1',
    },
  },
  'desktop-safari': {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    impersonate: 'safari17_2',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },
  'mobile-safari': {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    impersonate: 'safari17_2',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },
};

const ALL_PROFILES = { ...BROWSER_PROFILES, ...SEARCH_ENGINE_PROFILES };
const PROFILE_ORDER = Object.keys(BROWSER_PROFILES);
const ALL_PROFILE_NAMES = Object.keys(ALL_PROFILES);

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
    viaReader: false,
    noReader: false,
    profile: DEFAULT_PROFILE,
    retryProfiles: true,
    userAgentOverride: false,
    throttleMs: DEFAULT_THROTTLE_MS,
    checkRobots: false,
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
    else if (arg === '--user-agent') {
      opts.userAgent = args[++i] ?? opts.userAgent;
      opts.userAgentOverride = true;
    }
    else if (arg === '--profile') opts.profile = args[++i] ?? opts.profile;
    else if (arg === '--no-retry-profiles') opts.retryProfiles = false;
    else if (arg === '--via-wayback') opts.viaWayback = true;
    else if (arg === '--no-wayback') opts.noWayback = true;
    else if (arg === '--via-reader') opts.viaReader = true;
    else if (arg === '--no-reader') opts.noReader = true;
    else if (arg === '--throttle-ms') opts.throttleMs = Number(args[++i] ?? opts.throttleMs);
    else if (arg === '--no-throttle') opts.throttleMs = 0;
    else if (arg === '--check-robots') opts.checkRobots = true;
    else if (arg === '--cache-dir') opts.cacheDir = resolve(args[++i] ?? opts.cacheDir);
    else if (arg === '--cache-ttl-hours') opts.cacheTtlHours = Number(args[++i] ?? opts.cacheTtlHours);
    else if (arg === '--no-cache') opts.noCache = true;
    else if (arg === '--refresh-cache') opts.refreshCache = true;
    else opts.url = arg;
  }
  return opts;
}

function help() {
  console.log(`Usage: node .github/skills/fetch-url/scripts/fetch.mjs [url] [--text-only] [--out <file>] [--user-agent <ua>] [--profile <name>] [--via-reader | --no-reader] [--via-wayback | --no-wayback] [--cache-dir <path>] [--cache-ttl-hours <n>] [--no-cache] [--refresh-cache]

Default URL: ${DEFAULT_URL}

Profiles: ${ALL_PROFILE_NAMES.join(', ')}. Browser profiles use curl-impersonate for TLS/JA3 fingerprinting. Search engine profiles use standard fetch.

Fallbacks: origin fetch uses browser-like headers and, by default, retries other ordinary browser profiles on bot-challenge responses. If still blocked, it tries r.jina.ai reader text, then Wayback Machine snapshots. Use --no-retry-profiles, --no-reader, or --no-wayback to narrow the chain. Use --via-reader or --via-wayback to force a fallback path.

Robots: --check-robots fetches /robots.txt and exits before fetching the target if User-agent: * disallows the URL path.

Throttling: network attempts wait ${DEFAULT_THROTTLE_MS}ms by default to avoid hammering a host. Use --throttle-ms <n> or --no-throttle.

Caching: enabled by default at ${DEFAULT_CACHE_DIR} (override with --cache-dir or FETCH_URL_CACHE_DIR env). Cached responses younger than ${DEFAULT_CACHE_TTL_HOURS}h are reused. Use --refresh-cache to bypass the read but still write, --no-cache to disable read+write entirely.

Wayback fallback: bot-protected sites (DataDome/Cloudflare challenge, 401/403/451/503) automatically retry through web.archive.org. Use --via-wayback to force, --no-wayback to disable.`);
}

function wait(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return Promise.resolve();
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function buildHeaders(profileName, userAgentOverride = null) {
  const profile = ALL_PROFILES[profileName] ?? ALL_PROFILES[DEFAULT_PROFILE];
  return {
    ...profile.headers,
    'User-Agent': userAgentOverride ?? profile.userAgent,
  };
}

function profileSequence(opts) {
  // When the caller forces a custom UA we keep the requested profile (so its
  // TLS/JA3 fingerprint via curl-impersonate is preserved) and only swap the
  // headers in.
  if (opts.userAgentOverride) {
    return [{
      name: 'custom',
      profile: opts.profile,
      headers: buildHeaders(opts.profile, opts.userAgent),
    }];
  }
  const first = ALL_PROFILES[opts.profile] ? opts.profile : DEFAULT_PROFILE;
  const names = opts.retryProfiles
    ? [first, ...PROFILE_ORDER.filter((name) => name !== first)]
    : [first];
  // Each retry uses its profile end-to-end so both headers AND JA3 fingerprint
  // change. Letting fetchUrl build headers from `profile` keeps that in sync.
  return names.map((name) => ({ name, profile: name, headers: null }));
}

export async function fetchUrl(url, { timeoutMs = DEFAULT_TIMEOUT_MS, userAgent = null, profile = DEFAULT_PROFILE, headers = null, throttleMs = 0 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  const profileData = ALL_PROFILES[profile] ?? ALL_PROFILES[DEFAULT_PROFILE];

  try {
    await wait(throttleMs);

    // Use curl-impersonate for browser profiles, standard fetch for bots
    if (profileData.impersonate && !SEARCH_ENGINE_PROFILES[profile]) {
      const { spawn } = await import('node:child_process');
      return new Promise((resolvePromise, rejectPromise) => {
        const requestHeaders = headers ?? buildHeaders(profile, userAgent);
        const headerArgs = Object.entries(requestHeaders).flatMap(([key, value]) => ['-H', `${key}: ${value}`]);
        // Sentinel that curl appends after the body via -w; lets us recover the
        // final URL after redirects without parsing every header block.
        const META_SEPARATOR = '__CURL_IMPERSONATE_META_5e8f1a__';
        const args = [
          profileData.impersonate,
          '-s', '-L', '-D', '-',
          '--compressed',
          '--connect-timeout', String(Math.round(timeoutMs / 1000)),
          '-w', `\n${META_SEPARATOR}\n%{url_effective}`,
          ...headerArgs,
          url,
        ];

        const child = spawn('curl-impersonate', args);
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.stderr.on('data', (chunk) => { stderr += chunk; });

        // Wire the AbortController (driven by the outer timeoutMs timer) to
        // actually kill the curl subprocess; --connect-timeout alone only
        // covers TCP handshake, so a slow body would otherwise hang forever.
        const onAbort = () => { try { child.kill('SIGKILL'); } catch { /* noop */ } };
        controller.signal.addEventListener('abort', onAbort, { once: true });

        child.on('close', (code) => {
          controller.signal.removeEventListener('abort', onAbort);
          if (code !== 0) {
            return rejectPromise(new Error(`curl-impersonate exited with code ${code}: ${stderr}`));
          }

          // Recover the post-redirect final URL from the -w sentinel.
          let payload = stdout;
          let finalUrl = url;
          const metaMarker = `\n${META_SEPARATOR}\n`;
          const metaIdx = stdout.lastIndexOf(metaMarker);
          if (metaIdx >= 0) {
            payload = stdout.slice(0, metaIdx);
            finalUrl = stdout.slice(metaIdx + metaMarker.length).trim() || url;
          }

          // With -L curl emits one header block per hop separated by \r\n\r\n.
          // The actual response body follows the LAST `HTTP/...` block; earlier
          // blocks are 30x redirect responses that must NOT be glued into the body.
          const blocks = payload.split('\r\n\r\n');
          let lastHttpIdx = -1;
          for (let i = 0; i < blocks.length; i += 1) {
            if (/^HTTP\/\d/.test(blocks[i])) lastHttpIdx = i;
          }
          const headerBlock = lastHttpIdx >= 0 ? blocks[lastHttpIdx] : '';
          const body = lastHttpIdx >= 0
            ? blocks.slice(lastHttpIdx + 1).join('\r\n\r\n')
            : payload;

          const headerLines = headerBlock.split('\r\n');
          const statusLine = headerLines.find(l => l.startsWith('HTTP/'));
          const status = statusLine ? Number(statusLine.split(' ')[1]) : 500;
          const contentTypeLine = headerLines.find(l => l.toLowerCase().startsWith('content-type:'));
          const contentType = contentTypeLine ? contentTypeLine.split(':')[1].trim() : null;

          resolvePromise({
            url,
            finalUrl,
            status,
            ok: status >= 200 && status < 300,
            contentType,
            contentLength: Buffer.byteLength(body, 'utf8'),
            elapsedMs: Date.now() - started,
            profile,
            body,
          });
        });

        child.on('error', (err) => {
          controller.signal.removeEventListener('abort', onAbort);
          rejectPromise(new Error(`Failed to start curl-impersonate. Is it installed and in your PATH? Error: ${err.message}`));
        });
      });
    }

    // Fallback to standard fetch for search engine bots or if no impersonation is defined
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: headers ?? buildHeaders(profile, userAgent),
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
      profile,
      body,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function extractTitle(html) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim()
    ?? html.match(/^Title:\s*(.+)$/im)?.[1]?.replace(/\s+/g, ' ').trim()
    ?? null;
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

export function readerUrl(url) {
  return `https://r.jina.ai/http://${url}`;
}

function robotsTxtUrl(url) {
  const u = new URL(url);
  return `${u.protocol}//${u.host}/robots.txt`;
}

export function robotsAllows(robotsText, url) {
  const targetPath = new URL(url).pathname || '/';
  const lines = String(robotsText ?? '').split(/\r?\n/);
  let applies = false;
  let sawGroup = false;
  const disallows = [];
  const allows = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) continue;
    const [rawKey, ...rawValue] = line.split(':');
    const key = rawKey.trim().toLowerCase();
    const value = rawValue.join(':').trim();
    if (key === 'user-agent') {
      if (sawGroup && applies) break;
      sawGroup = true;
      applies = value === '*';
    } else if (applies && key === 'disallow') {
      if (value) disallows.push(value);
    } else if (applies && key === 'allow') {
      if (value) allows.push(value);
    }
  }

  const longestAllow = allows.filter((rule) => targetPath.startsWith(rule)).sort((a, b) => b.length - a.length)[0] ?? '';
  const longestDisallow = disallows.filter((rule) => targetPath.startsWith(rule)).sort((a, b) => b.length - a.length)[0] ?? '';
  if (!longestDisallow) return true;
  return longestAllow.length >= longestDisallow.length;
}

async function assertRobotsAllows(url, opts) {
  const robotsUrl = robotsTxtUrl(url);
  // robotsAllows() only parses the `User-agent: *` group, so fetch robots.txt
  // with a stable browser UA (not opts.profile, which may be a search-engine
  // bot or a custom UA whose specific rules we are NOT consulting). This keeps
  // the rule we evaluate consistent with the rule we fetch under.
  const robotsProfile = ALL_PROFILES['desktop-chrome'] ? 'desktop-chrome' : DEFAULT_PROFILE;
  try {
    const result = await fetchUrl(robotsUrl, {
      profile: robotsProfile,
      throttleMs: opts.throttleMs,
    });
    if (result.status === 404) return;
    if (result.ok && !robotsAllows(result.body, url)) {
      console.error(`[fetch-url] robots.txt disallows this path for User-agent: * (${robotsUrl}).`);
      exit(3);
    }
  } catch (err) {
    console.error(`[fetch-url] robots.txt check failed (${err.message}); continuing because --check-robots is advisory when robots.txt is unreachable.`);
  }
}

// ---------------------------------------------------------------------------
// On-disk cache (default ON). Avoids repeat bandwidth and rate-limit hits
// when the same URL is fetched across chapters in a startup-research run.
// Cache key is a SHA-256 of the canonicalized URL plus a source variant
// suffix (`:origin`, `:reader`, `:wayback`) so fallback fetches never collide.
// ---------------------------------------------------------------------------
function cacheVariantName(variant = 'origin') {
  if (variant === true) return 'wayback';
  if (variant === false || variant == null) return 'origin';
  return String(variant);
}

export function canonicalCacheKey(url, variant = 'origin') {
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
  const suffix = `:${cacheVariantName(variant)}`;
  return createHash('sha256').update(canonical + suffix).digest('hex').slice(0, 32);
}

function cachePath(dir, url, variant) {
  return join(dir, `${canonicalCacheKey(url, variant)}.json`);
}

function readCache(dir, url, variant, ttlHours) {
  const path = cachePath(dir, url, variant);
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

function writeCache(dir, url, variant, result) {
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
      profile: result.profile,
      body: result.body,
      source: cacheVariantName(variant),
      viaWayback: cacheVariantName(variant) === 'wayback',
      fetchedAt: new Date().toISOString(),
    };
    writeFileSync(cachePath(dir, url, variant), JSON.stringify(payload), 'utf8');
  } catch (err) {
    console.error(`[fetch-url] cache write failed: ${err.message}`);
  }
}

const BOT_CHALLENGE_STATUSES = new Set([401, 403, 429, 451, 503]);
const BOT_CHALLENGE_MARKERS = [
  'datadome',
  'please enable js',
  'cf-browser-verification',
  'just a moment...',
  'access denied',
  'attention required! | cloudflare',
  'checking your browser before accessing',
  'enable cookies',
  'bot detection',
  'captcha',
  'perimeterx',
  'px-captcha',
  'incapsula',
  'imperva',
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
  if (!ALL_PROFILES[opts.profile]) {
    console.error(`Unknown profile: ${opts.profile}. Expected one of: ${ALL_PROFILE_NAMES.join(', ')}`);
    exit(2);
  }
  if (opts.viaReader && opts.viaWayback) {
    console.error('Choose only one forced fallback: --via-reader or --via-wayback.');
    exit(2);
  }
  if (!Number.isFinite(opts.cacheTtlHours) || opts.cacheTtlHours < 0) {
    console.error(`Invalid --cache-ttl-hours: ${opts.cacheTtlHours}`);
    exit(2);
  }
  if (!Number.isFinite(opts.throttleMs) || opts.throttleMs < 0) {
    console.error(`Invalid --throttle-ms: ${opts.throttleMs}`);
    exit(2);
  }

  if (opts.checkRobots) await assertRobotsAllows(opts.url, opts);

  let result;
  let source = opts.viaReader ? 'reader' : opts.viaWayback ? 'wayback' : 'origin';
  let cacheHit = false;
  let cacheAgeMinutes = null;
  const useCacheRead = !opts.noCache && !opts.refreshCache;
  const useCacheWrite = !opts.noCache;
  const targetUrl = opts.viaReader ? readerUrl(opts.url) : opts.viaWayback ? waybackUrl(opts.url) : opts.url;

  if (useCacheRead) {
    const cached = readCache(opts.cacheDir, opts.url, source, opts.cacheTtlHours);
    if (cached) {
      result = {
        url: cached.requestedUrl,
        finalUrl: cached.finalUrl,
        status: cached.status,
        ok: cached.ok,
        contentType: cached.contentType,
        contentLength: cached.contentLength,
        elapsedMs: cached.elapsedMs,
        profile: cached.profile,
        body: cached.body,
      };
      source = cached.source ?? (cached.viaWayback ? 'wayback' : 'origin');
      cacheHit = true;
      cacheAgeMinutes = Math.round(cached._ageMs / 60_000);
    }
  }

  if (!cacheHit) {
    try {
      if (opts.viaReader || opts.viaWayback) {
        result = await fetchUrl(targetUrl, {
          profile: opts.profile,
          userAgent: opts.userAgentOverride ? opts.userAgent : null,
          throttleMs: opts.throttleMs,
        });
      } else {
        for (const profileAttempt of profileSequence(opts)) {
          // Pass profile + headers from the attempt so both UA AND JA3
          // fingerprint actually rotate between retries (previously only the
          // headers rotated while curl-impersonate kept the original profile).
          result = await fetchUrl(opts.url, {
            profile: profileAttempt.profile,
            headers: profileAttempt.headers,
            throttleMs: opts.throttleMs,
          });
          result = { ...result, profile: profileAttempt.name };
          if (!looksLikeBotChallenge(result)) break;
          console.error(`[fetch-url] origin via ${profileAttempt.name} returned ${result.status} or bot-challenge body.`);
        }
      }
    } catch (err) {
      console.error(`Fetch failed: ${err.message}`);
      exit(1);
    }

    if (!opts.viaReader && !opts.viaWayback && !opts.noReader && looksLikeBotChallenge(result)) {
      console.error('[fetch-url] origin still looks blocked; retrying via r.jina.ai reader text.');
      try {
        const cachedReader = useCacheRead ? readCache(opts.cacheDir, opts.url, 'reader', opts.cacheTtlHours) : null;
        const fallback = cachedReader
          ? { ...cachedReader, url: opts.url, body: cachedReader.body }
          : await fetchUrl(readerUrl(opts.url), {
              profile: opts.profile,
              userAgent: opts.userAgentOverride ? opts.userAgent : null,
              throttleMs: opts.throttleMs,
            });
        if (fallback.ok && !looksLikeBotChallenge(fallback)) {
          result = fallback;
          source = 'reader';
          cacheHit = Boolean(cachedReader);
          cacheAgeMinutes = cachedReader ? Math.round(cachedReader._ageMs / 60_000) : null;
        } else {
          console.error(`[fetch-url] Reader fallback also blocked or failed (status ${fallback.status}); trying archive if enabled.`);
        }
      } catch (err) {
        console.error(`[fetch-url] Reader fallback failed: ${err.message}; trying archive if enabled.`);
      }
    }

    if (!opts.viaWayback && !opts.noWayback && looksLikeBotChallenge(result)) {
      console.error('[fetch-url] retrying via Wayback Machine.');
      try {
        const cachedWayback = useCacheRead ? readCache(opts.cacheDir, opts.url, 'wayback', opts.cacheTtlHours) : null;
        const fallback = cachedWayback
          ? { ...cachedWayback, url: opts.url, body: cachedWayback.body }
          : await fetchUrl(waybackUrl(opts.url), {
              profile: opts.profile,
              userAgent: opts.userAgentOverride ? opts.userAgent : null,
              throttleMs: opts.throttleMs,
            });
        if (fallback.ok && !looksLikeBotChallenge(fallback)) {
          result = fallback;
          source = 'wayback';
          cacheHit = Boolean(cachedWayback);
          cacheAgeMinutes = cachedWayback ? Math.round(cachedWayback._ageMs / 60_000) : null;
        } else {
          console.error(`[fetch-url] Wayback fallback also blocked (status ${fallback.status}); keeping previous response.`);
        }
      } catch (err) {
        console.error(`[fetch-url] Wayback fallback failed: ${err.message}; keeping previous response.`);
      }
    }

    if (source === 'wayback') {
      const stripped = stripWaybackToolbar(result.body);
      result = { ...result, body: stripped, contentLength: stripped.length };
    }

    if (useCacheWrite && !cacheHit && result.ok && !looksLikeBotChallenge(result)) {
      writeCache(opts.cacheDir, opts.url, source, result);
    }
  }

  const output = opts.textOnly ? htmlToText(result.body) : result.body;
  console.log(`Status:        ${result.status} ${result.ok ? 'OK' : 'FAIL'}`);
  console.log(`Final URL:     ${result.finalUrl}`);
  if (cacheHit) console.log(`Source:        cache (age ${cacheAgeMinutes}m, ttl ${opts.cacheTtlHours}h, ${source})`);
  else if (source === 'reader') console.log('Source:        reader (r.jina.ai text view)');
  else if (source === 'wayback') console.log('Source:        wayback (web.archive.org snapshot)');
  else console.log('Source:        origin');
  console.log(`Content-Type:  ${result.contentType ?? '(none)'}`);
  console.log(`Profile:       ${result.profile ?? (opts.userAgentOverride ? 'custom' : opts.profile)}`);
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
