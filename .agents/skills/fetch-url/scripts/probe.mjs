#!/usr/bin/env node
// Scan URLs appearing in `reports/*/evidence.yaml`, identify hosts not already
// covered by `references/host-strategies.json` (using fetch.mjs's 3-layer
// lookup: exact / www-aliased / registrable-domain), probe each missing host,
// and merge the winners into the on-disk host-strategies map.
//
// Use --hosts for targeted re-tests and --refresh to re-probe known hosts
// instead of only filling gaps.
//
// Usage:
//   node .agents/skills/fetch-url/scripts/probe.mjs
//   node .agents/skills/fetch-url/scripts/probe.mjs --concurrency 12
//   node .agents/skills/fetch-url/scripts/probe.mjs --dry-run
//   node .agents/skills/fetch-url/scripts/probe.mjs --refresh --hosts www.reuters.com,www.wsj.com

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argv, exit } from 'node:process';

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

function readOptionValue(args, index, flag) {
  const value = args[index + 1];
  if (value === undefined || value.startsWith('--')) {
    return { error: `Missing value for ${flag}.`, value: null };
  }
  return { error: null, value };
}

function parseNumberOption(value, flag, { min = -Infinity, integer = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || (integer && !Number.isInteger(number))) {
    return { error: `Invalid ${flag}: ${value}.`, value: null };
  }
  return { error: null, value: number };
}

function printUsageError(error) {
  console.error(error);
  console.error('Run with --help to see supported options.');
}

function parseArgs(args) {
  const opts = { concurrency: DEFAULT_CONCURRENCY, dryRun: false, refresh: false, hosts: [], help: false, error: null };
  const readValue = (flag, index) => {
    const parsed = readOptionValue(args, index, flag);
    if (parsed.error) opts.error = parsed.error;
    return parsed.value;
  };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--refresh') opts.refresh = true;
    else if (a === '--hosts') {
      const value = readValue(a, i);
      if (opts.error) break;
      opts.hosts = value.split(',').map(normalizeHostInput).filter(Boolean);
      i += 1;
    }
    else if (a === '--concurrency') {
      const value = readValue(a, i);
      if (opts.error) break;
      const parsed = parseNumberOption(value, a, { min: 1, integer: true });
      if (parsed.error) { opts.error = parsed.error; break; }
      opts.concurrency = parsed.value;
      i += 1;
    }
    else {
      opts.error = `Unknown option: ${a}.`;
      break;
    }
  }
  opts.hosts = [...new Set(opts.hosts)];
  return opts;
}

function help() {
  console.log(`Usage: node .agents/skills/fetch-url/scripts/probe.mjs [--dry-run] [--refresh] [--hosts host1,host2] [--concurrency N]

Scans reports/*/evidence.yaml for source hosts, probes any hosts missing from references/host-strategies.json, and writes the cheapest working strategy back to the map.

Options:
  --dry-run          Print the hosts that would be probed without network calls.
  --refresh          Re-probe known hosts instead of only filling gaps.
  --hosts <list>     Probe a comma-separated list of hosts or URLs.
  --concurrency <n>  Number of hosts to probe in parallel (default ${DEFAULT_CONCURRENCY}).
  --help, -h         Show this help.

This is the only host-strategy probe implementation module.`);
}

function normalizeHostInput(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return url.host.toLowerCase();
  } catch {
    return null;
  }
}

function hostLookupKeys(host) {
  const keys = [host];
  const aliased = host.startsWith('www.') ? host.slice(4) : `www.${host}`;
  if (aliased !== host) keys.push(aliased);
  const reg = registrableDomain(host);
  if (reg && !keys.includes(reg)) keys.push(reg);
  return keys;
}

// Mirror fetch.mjs's 3-layer host-map lookup (exact / www-aliased / eTLD+1).
function isCovered(host, map) {
  return hostLookupKeys(host).some((key) => Object.prototype.hasOwnProperty.call(map, key));
}

function sampleUrlForHost(host, evidenceHosts, map) {
  for (const key of hostLookupKeys(host)) {
    if (evidenceHosts.has(key)) return evidenceHosts.get(key);
    if (map[key]?.sample_url) return map[key].sample_url;
  }
  return `https://${host}/`;
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

// Walk strategies in cost order,
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

export async function main(args = argv.slice(2)) {
  const opts = parseArgs(args);
  if (opts.help) {
    help();
    return;
  }
  if (opts.error) {
    printUsageError(opts.error);
    exit(2);
  }
  const map = loadExisting();
  const evidenceHosts = scanEvidenceHosts();

  const targetHosts = new Map();
  if (opts.hosts.length > 0) {
    for (const host of opts.hosts) targetHosts.set(host, sampleUrlForHost(host, evidenceHosts, map));
  } else if (opts.refresh) {
    for (const [host, url] of evidenceHosts) targetHosts.set(host, url);
    for (const [host, entry] of Object.entries(map)) {
      if (entry?.sample_url) targetHosts.set(host, entry.sample_url);
    }
  } else {
    for (const [host, url] of evidenceHosts) {
      if (!isCovered(host, map)) targetHosts.set(host, url);
    }
  }

  const todo = [...targetHosts.entries()];

  console.log(`Scanned ${evidenceHosts.size} unique hosts across reports/*/evidence.yaml`);
  if (opts.hosts.length > 0) {
    console.log(`Selected ${todo.length} requested host(s) for probing`);
  } else if (opts.refresh) {
    console.log(`Selected ${todo.length} evidence/map host(s) for refresh`);
  } else {
    console.log(`${evidenceHosts.size - todo.length} already covered by host-strategies.json`);
    console.log(`${todo.length} hosts need probing`);
  }

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

if (argv[1] && fileURLToPath(import.meta.url) === resolve(argv[1])) {
  main().catch((err) => {
    console.error(err);
    exit(1);
  });
}
