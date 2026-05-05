#!/usr/bin/env node
// Scan every URL appearing in `reports/*/evidence.yaml`, identify hosts not
// already covered by `references/host-strategies.json` (using fetch.mjs's
// 3-layer lookup: exact / www-aliased / registrable-domain), probe each
// missing host with the same strategy ladder used by probe-strategies.mjs,
// and merge the winners into the on-disk host-strategies map.
//
// This complements probe-strategies.mjs (which probes a curated, hand-picked
// URL_SET on --refresh). Evidence-derived URLs are ephemeral — they grow
// every time a new report is generated — so they are kept OUT of URL_SET.
//
// Usage:
//   node .agents/skills/fetch-url/scripts/probe-evidence-hosts.mjs
//   node .agents/skills/fetch-url/scripts/probe-evidence-hosts.mjs --concurrency 12
//   node .agents/skills/fetch-url/scripts/probe-evidence-hosts.mjs --dry-run

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argv } from 'node:process';

import {
  fetchUrl,
  looksLikeBotChallenge,
  readerUrl,
  registrableDomain,
  waybackUrl,
} from './fetch.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = resolve(__dirname, '..', '..', '..', '..', 'reports');
const OUT_PATH = resolve(__dirname, '..', 'references', 'host-strategies.json');

const STRATEGIES = [
  { name: 'bingbot',         kind: 'origin',  profile: 'bingbot' },
  { name: 'desktop-chrome',  kind: 'origin',  profile: 'desktop-chrome' },
  { name: 'desktop-firefox', kind: 'origin',  profile: 'desktop-firefox' },
  { name: 'desktop-safari',  kind: 'origin',  profile: 'desktop-safari' },
  { name: 'mobile-safari',   kind: 'origin',  profile: 'mobile-safari' },
  { name: 'googlebot',       kind: 'origin',  profile: 'googlebot' },
  { name: 'reader',          kind: 'reader' },
  { name: 'wayback',         kind: 'wayback' },
];

const MIN_BYTES = 500;
const PROBE_TIMEOUT_MS = 8_000;
const DEFAULT_CONCURRENCY = 6;

function parseArgs(args) {
  const opts = { concurrency: DEFAULT_CONCURRENCY, dryRun: false };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--concurrency') {
      const n = Number(args[++i]);
      if (Number.isFinite(n) && n >= 1) opts.concurrency = Math.floor(n);
    }
  }
  return opts;
}

// Mirror fetch.mjs's 3-layer host-map lookup (exact / www-aliased / eTLD+1).
function isCovered(host, map) {
  if (Object.prototype.hasOwnProperty.call(map, host)) return true;
  const aliased = host.startsWith('www.') ? host.slice(4) : `www.${host}`;
  if (Object.prototype.hasOwnProperty.call(map, aliased)) return true;
  const reg = registrableDomain(host);
  if (reg && Object.prototype.hasOwnProperty.call(map, reg)) return true;
  return false;
}

function loadExisting() {
  if (!existsSync(OUT_PATH)) return {};
  try { return JSON.parse(readFileSync(OUT_PATH, 'utf8')); } catch { return {}; }
}

// Walk `reports/*/evidence.yaml` and return Map<host, sample-url> with the
// first URL seen for each host. Same regex strategy as the inline scanner —
// not a YAML parser, just a tolerant URL extractor that copes with the YAML
// quoting / list / inline-mapping variants the reports actually use.
function scanEvidenceHosts() {
  const byHost = new Map();
  if (!existsSync(REPORTS_DIR)) return byHost;
  const urlRe = /https?:\/\/[^\s")\]]+/g;
  for (const entry of readdirSync(REPORTS_DIR)) {
    if (!/^\d{14}-/.test(entry)) continue;
    const p = join(REPORTS_DIR, entry, 'evidence.yaml');
    if (!existsSync(p)) continue;
    const text = readFileSync(p, 'utf8');
    let m;
    while ((m = urlRe.exec(text))) {
      const cleaned = m[0].replace(/[",;.)]+$/, '');
      try {
        const u = new URL(cleaned);
        const host = u.host.toLowerCase();
        if (!byHost.has(host)) byHost.set(host, cleaned);
      } catch { /* ignore */ }
    }
  }
  return byHost;
}

// Same probe ladder as probe-strategies.mjs: walk strategies in cost order,
// return the first one that returns 200 + non-bot-challenge + >=500 bytes.
async function probe(url) {
  for (const s of STRATEGIES) {
    const target = s.kind === 'reader' ? readerUrl(url)
      : s.kind === 'wayback' ? waybackUrl(url)
        : url;
    const profile = s.profile ?? 'desktop-chrome';
    let result;
    try {
      result = await fetchUrl(target, { profile, throttleMs: 250, timeoutMs: PROBE_TIMEOUT_MS });
    } catch {
      continue;
    }
    const ok = result.status === 200
      && !looksLikeBotChallenge(result)
      && result.contentLength >= MIN_BYTES;
    if (ok) {
      return {
        strategy: s.name,
        kind: s.kind,
        status: result.status,
        bytes: result.contentLength,
        finalUrl: result.finalUrl,
      };
    }
  }
  return null;
}

async function main() {
  const opts = parseArgs(argv.slice(2));
  const map = loadExisting();
  const evidenceHosts = scanEvidenceHosts();

  const todo = [];
  for (const [host, url] of evidenceHosts) {
    if (!isCovered(host, map)) todo.push([host, url]);
  }

  console.log(`Scanned ${evidenceHosts.size} unique hosts across reports/*/evidence.yaml`);
  console.log(`${evidenceHosts.size - todo.length} already covered by host-strategies.json`);
  console.log(`${todo.length} hosts need probing`);

  if (opts.dryRun) {
    console.log('\n--dry-run: hosts that would be probed:');
    for (const [host, url] of todo) console.log(`  ${host}\t${url}`);
    return;
  }

  if (todo.length === 0) {
    console.log('\nNothing to do.');
    return;
  }

  const concurrency = Math.min(opts.concurrency, todo.length);
  console.log(`\nProbing ${todo.length} hosts with concurrency=${concurrency} (per-attempt timeout ${PROBE_TIMEOUT_MS / 1000}s)...\n`);

  let completed = 0;
  let added = 0;
  let failed = 0;
  const startedAt = Date.now();
  const queue = todo.slice();
  const today = new Date().toISOString().split('T')[0];

  async function worker() {
    while (queue.length) {
      const [host, url] = queue.shift();
      const result = await probe(url);
      completed += 1;
      const tag = `[${String(completed).padStart(3, ' ')}/${todo.length}]`;
      if (result) {
        map[host] = {
          strategy: result.strategy,
          kind: result.kind,
          status: result.status,
          bytes: result.bytes,
          sample_url: url,
          tested_at: today,
        };
        added += 1;
        console.log(`${tag} ${host} -> ${result.strategy} (${result.status}, ${result.bytes} bytes)`);
      } else {
        map[host] = {
          strategy: null,
          kind: null,
          status: null,
          bytes: null,
          sample_url: url,
          tested_at: today,
          note: 'all strategies failed or were blocked',
        };
        failed += 1;
        console.log(`${tag} ${host} -> FAILED (no working strategy)`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(OUT_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\nWrote ${Object.keys(sorted).length} hosts to ${OUT_PATH} (${added} succeeded, ${failed} failed, ${elapsedSec}s elapsed)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
