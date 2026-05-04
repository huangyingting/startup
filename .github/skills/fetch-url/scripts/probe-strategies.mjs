#!/usr/bin/env node
// Probe a curated URL set with each fetch strategy and emit the per-host
// strategy that wins (cheapest -> most expensive). Output is consumed by
// fetch.mjs as a fast-path map; entries also serve as documentation.
//
// Usage:
//   node .github/skills/fetch-url/scripts/probe-strategies.mjs            # full run
//   node .github/skills/fetch-url/scripts/probe-strategies.mjs --hosts reuters.com,sec.gov
//   node .github/skills/fetch-url/scripts/probe-strategies.mjs --refresh  # re-test even known hosts

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argv } from 'node:process';

import {
  fetchUrl,
  looksLikeBotChallenge,
  readerUrl,
  waybackUrl,
  stripWaybackToolbar,
} from './fetch.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '..', 'references', 'host-strategies.json');

// Strategy order: cheapest first. `bingbot` and `googlebot` are plain fetch()
// (no curl-impersonate spawn cost). Browser profiles spawn a wrapper. Reader
// and Wayback are last because they round-trip through a third party.
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

// Representative URL set covering the categories used by startup-research and
// general-purpose fetch-url usage. One URL per host is enough; the resulting
// strategy is keyed by host. Pick a representative path (homepage or a page
// that is known to be commonly fetched) — sites can vary protection by path.
const URL_SET = [
  // ============================================================
  // AI / ML — model providers, infra, vector DBs, hardware
  // ============================================================
  'https://openai.com',
  'https://www.anthropic.com',
  'https://mistral.ai',
  'https://www.perplexity.ai',
  'https://cohere.com',
  'https://huggingface.co',
  'https://replicate.com',
  'https://groq.com',
  'https://www.together.ai',
  'https://fireworks.ai',
  'https://runwayml.com',
  'https://elevenlabs.io',
  'https://www.midjourney.com',
  'https://stability.ai',
  'https://character.ai',
  'https://inflection.ai',
  'https://www.adept.ai',
  'https://scale.com',
  'https://labelbox.com',
  'https://wandb.ai',
  'https://www.langchain.com',
  'https://pinecone.io',
  'https://www.trychroma.com',
  'https://weaviate.io',
  'https://qdrant.tech',
  'https://milvus.io',
  'https://www.modular.com',
  'https://lambdalabs.com',
  'https://www.coreweave.com',
  'https://crusoe.ai',
  'https://www.nvidia.com',
  'https://www.amd.com',
  'https://www.intel.com',
  'https://deepmind.google',
  'https://x.ai',
  'https://www.deepseek.com',
  'https://ai.meta.com',

  // ============================================================
  // SaaS / collab / productivity
  // ============================================================
  'https://stripe.com',
  'https://www.notion.so',
  'https://linear.app',
  'https://vercel.com',
  'https://slack.com',
  'https://www.atlassian.com',
  'https://asana.com',
  'https://monday.com',
  'https://clickup.com',
  'https://airtable.com',
  'https://coda.io',
  'https://www.figma.com',
  'https://www.canva.com',
  'https://miro.com',
  'https://www.dropbox.com',
  'https://www.box.com',
  'https://zoom.us',
  'https://calendly.com',
  'https://www.intercom.com',
  'https://www.zendesk.com',
  'https://www.salesforce.com',
  'https://www.hubspot.com',
  'https://www.zoho.com',
  'https://www.workday.com',
  'https://www.servicenow.com',
  'https://www.shopify.com',
  'https://www.squarespace.com',
  'https://www.wix.com',
  'https://webflow.com',

  // ============================================================
  // Dev tools / data infra / observability / CDN / hosting
  // ============================================================
  'https://www.databricks.com',
  'https://www.docker.com',
  'https://kubernetes.io',
  'https://www.terraform.io',
  'https://www.hashicorp.com',
  'https://www.snowflake.com',
  'https://www.mongodb.com',
  'https://redis.io',
  'https://www.elastic.co',
  'https://www.confluent.io',
  'https://supabase.com',
  'https://planetscale.com',
  'https://neon.tech',
  'https://www.cockroachlabs.com',
  'https://www.timescale.com',
  'https://www.datadoghq.com',
  'https://newrelic.com',
  'https://www.splunk.com',
  'https://sentry.io',
  'https://www.pagerduty.com',
  'https://www.cloudflare.com',
  'https://www.fastly.com',
  'https://www.akamai.com',
  'https://www.netlify.com',
  'https://railway.app',
  'https://render.com',

  // ============================================================
  // Fintech / payments / crypto
  // ============================================================
  'https://plaid.com',
  'https://www.adyen.com',
  'https://www.brex.com',
  'https://ramp.com',
  'https://mercury.com',
  'https://wise.com',
  'https://www.coinbase.com',
  'https://www.binance.com',
  'https://www.kraken.com',
  'https://robinhood.com',
  'https://www.paypal.com',
  'https://squareup.com',
  'https://www.affirm.com',
  'https://www.klarna.com',
  'https://www.chime.com',

  // ============================================================
  // Health / biotech
  // ============================================================
  'https://www.tempus.com',
  'https://www.flatiron.com',
  'https://www.veeva.com',
  'https://www.modernatx.com',
  'https://www.recursionpharma.com',
  'https://www.10xgenomics.com',
  'https://www.illumina.com',
  'https://www.hioscar.com',
  'https://www.hims.com',
  'https://ro.co',

  // ============================================================
  // Climate / energy / hardware / aerospace
  // ============================================================
  'https://www.tesla.com',
  'https://www.spacex.com',
  'https://neuralink.com',
  'https://boomsupersonic.com',
  'https://cfs.energy',
  'https://www.terrapower.com',
  'https://oklo.com',
  'https://formenergy.com',
  'https://www.helionenergy.com',
  'https://x-energy.com',

  // ============================================================
  // News / publishers — often DataDome / Cloudflare protected
  // ============================================================
  'https://www.reuters.com/',
  'https://www.wsj.com/',
  'https://www.ft.com/',
  'https://www.bloomberg.com/',
  'https://www.nytimes.com/',
  'https://techcrunch.com/',
  'https://www.theinformation.com/',
  'https://www.theverge.com/',
  'https://arstechnica.com/',
  'https://www.economist.com/',
  'https://www.cnbc.com/',
  'https://www.cnn.com/',
  'https://www.bbc.com/',
  'https://www.theguardian.com/',
  'https://www.washingtonpost.com/',
  'https://abcnews.go.com/',
  'https://www.npr.org/',
  'https://www.axios.com/',
  'https://www.politico.com/',
  'https://www.businessinsider.com/',
  'https://fortune.com/',
  'https://www.forbes.com/',
  'https://www.barrons.com/',
  'https://www.marketwatch.com/',
  'https://www.cnet.com/',
  'https://www.wired.com/',
  'https://www.engadget.com/',
  'https://www.fastcompany.com/',

  // ============================================================
  // News — Asia / India / Middle East
  // ============================================================
  'https://www.scmp.com/',
  'https://www.straitstimes.com/',
  'https://asia.nikkei.com/',
  'https://www.japantimes.co.jp/',
  'https://www.thehindu.com/',
  'https://economictimes.indiatimes.com/',
  'https://www.livemint.com/',
  'https://www.business-standard.com/',
  'https://www.aljazeera.com/',
  'https://www.hindustantimes.com/',

  // ============================================================
  // Tech press
  // ============================================================
  'https://thenextweb.com/',
  'https://sifted.eu/',
  'https://www.theregister.com/',
  'https://www.zdnet.com/',
  'https://venturebeat.com/',
  'https://restofworld.org/',
  'https://www.theatlantic.com/',

  // ============================================================
  // Industry analysts / market intelligence
  // ============================================================
  'https://www.gartner.com/',
  'https://www.mckinsey.com/',
  'https://hbr.org/',
  'https://www.forrester.com/',
  'https://www.idc.com/',
  'https://www.statista.com/',
  'https://www.emarketer.com/',
  'https://www.similarweb.com/',
  'https://www.semrush.com/',
  'https://www.bcg.com/',
  'https://www.bain.com/',

  // ============================================================
  // SEC / regulatory / government (US)
  // ============================================================
  'https://www.sec.gov/',
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001318605&type=10-K&dateb=&owner=include&count=40',
  'https://efts.sec.gov/LATEST/search-index?q=%22artificial+intelligence%22&forms=10-K',
  'https://www.federalregister.gov/',
  'https://www.ftc.gov/',
  'https://www.justice.gov/',
  'https://www.cfpb.gov/',
  'https://www.federalreserve.gov/',
  'https://home.treasury.gov/',
  'https://www.fcc.gov/',
  'https://www.fda.gov/',
  'https://www.epa.gov/',
  'https://www.dol.gov/',
  'https://www.bls.gov/',
  'https://www.census.gov/',

  // ============================================================
  // Regulatory / government (UK / EU / other)
  // ============================================================
  'https://www.gov.uk/',
  'https://ec.europa.eu/',
  'https://www.fca.org.uk/',
  'https://www.bankofengland.co.uk/',
  'https://www.esma.europa.eu/',
  'https://www.bafin.de/',
  'https://www.canada.ca/',
  'https://www.gov.au/',

  // ============================================================
  // International / standards bodies
  // ============================================================
  'https://www.imf.org/',
  'https://www.worldbank.org/',
  'https://www.oecd.org/',
  'https://unctad.org/',
  'https://www.wto.org/',
  'https://www.iso.org/',
  'https://www.ietf.org/',
  'https://www.w3.org/',
  'https://www.nist.gov/',
  'https://csrc.nist.gov/',

  // ============================================================
  // Patents / IP
  // ============================================================
  'https://patents.google.com/',
  'https://www.uspto.gov/',
  'https://www.epo.org/',
  'https://www.wipo.int/',
  'https://worldwide.espacenet.com/',

  // ============================================================
  // Funding / investor data
  // ============================================================
  'https://www.crunchbase.com/',
  'https://pitchbook.com/',
  'https://dealroom.co/',
  'https://www.cbinsights.com/',
  'https://tracxn.com/',
  'https://www.preqin.com/',
  'https://wellfound.com/',
  'https://www.signalnfx.com/',
  'https://openvc.app/',

  // ============================================================
  // Open source foundations
  // ============================================================
  'https://www.apache.org/',
  'https://www.linuxfoundation.org/',
  'https://www.cncf.io/',
  'https://opencollective.com/',
  'https://www.python.org/',
  'https://www.rust-lang.org/',
  'https://www.mozilla.org/',
  'https://www.kernel.org/',

  // ============================================================
  // Code hosting / package registries
  // ============================================================
  'https://github.com/',
  'https://gitlab.com/',
  'https://bitbucket.org/',
  'https://www.npmjs.com/',
  'https://pypi.org/',
  'https://crates.io/',
  'https://rubygems.org/',
  'https://packagist.org/',
  'https://hub.docker.com/',
  'https://registry.terraform.io/',

  // ============================================================
  // Reviews / job listings / company data
  // ============================================================
  'https://www.g2.com/',
  'https://www.capterra.com/',
  'https://www.trustpilot.com/',
  'https://www.glassdoor.com/',
  'https://www.indeed.com/',
  'https://www.builtin.com/',
  'https://www.themuse.com/',
  'https://www.producthunt.com/',
  'https://www.peerspot.com/',
  'https://www.softwareadvice.com/',
  'https://www.getapp.com/',
  'https://www.owler.com/',

  // ============================================================
  // Social / community / Q&A
  // ============================================================
  'https://news.ycombinator.com/',
  'https://www.reddit.com/',
  'https://x.com/',
  'https://www.linkedin.com/',
  'https://stackoverflow.com/',
  'https://dev.to/',
  'https://medium.com/',
  'https://substack.com/',
  'https://discord.com/',
  'https://www.quora.com/',
  'https://www.tiktok.com/',

  // ============================================================
  // Cloud providers
  // ============================================================
  'https://aws.amazon.com/',
  'https://cloud.google.com/',
  'https://azure.microsoft.com/en-us/',

  // ============================================================
  // Stock / financial
  // ============================================================
  'https://finance.yahoo.com/',
  'https://www.investing.com/',
  'https://www.morningstar.com/',
  'https://seekingalpha.com/',
  'https://www.tradingview.com/',
  'https://www.nasdaq.com/',
  'https://www.nyse.com/',
  'https://simplywall.st/',
  'https://www.ycharts.com/',

  // ============================================================
  // Academic / research / patents
  // ============================================================
  'https://arxiv.org/',
  'https://scholar.google.com/',
  'https://openreview.net/',
  'https://neurips.cc/',
  'https://www.ted.com/',
  'https://www.ces.tech/',

  // ============================================================
  // Reference / archive
  // ============================================================
  'https://www.wikipedia.org/',
  'https://en.wikipedia.org/',
  'https://www.britannica.com/',
  'https://web.archive.org/',
  'https://www.imdb.com/',

  // ============================================================
  // Search engines (sanity)
  // ============================================================
  'https://www.google.com/',
  'https://www.bing.com/',
  'https://duckduckgo.com/',
];

const MIN_BYTES = 500; // tiny bodies usually mean redirect/empty/challenge stub
const PROBE_TIMEOUT_MS = 8_000; // per-attempt cap; production fetches use 15s
const DEFAULT_CONCURRENCY = 6;

function parseArgs(args) {
  const opts = { hosts: null, refresh: false, concurrency: DEFAULT_CONCURRENCY };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--refresh') opts.refresh = true;
    else if (a === '--hosts') opts.hosts = (args[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--concurrency') {
      const n = Number(args[++i]);
      if (Number.isFinite(n) && n >= 1) opts.concurrency = Math.floor(n);
    }
  }
  return opts;
}

async function probe(url) {
  for (const s of STRATEGIES) {
    const target = s.kind === 'reader' ? readerUrl(url)
      : s.kind === 'wayback' ? waybackUrl(url)
        : url;
    const profile = s.profile ?? 'desktop-chrome';
    let result;
    try {
      result = await fetchUrl(target, { profile, throttleMs: 250, timeoutMs: PROBE_TIMEOUT_MS });
    } catch (err) {
      // network / spawn failure for this strategy; try next
      continue;
    }
    let body = result.body;
    if (s.kind === 'wayback') body = stripWaybackToolbar(body);
    // Require status === 200; some bot walls (Akamai notably) return 202 with
    // an interim/challenge body which `result.ok` would otherwise accept.
    const ok = result.status === 200
      && !looksLikeBotChallenge({ ...result, body })
      && Buffer.byteLength(body, 'utf8') >= MIN_BYTES;
    if (ok) {
      return {
        strategy: s.name,
        kind: s.kind,
        status: result.status,
        bytes: Buffer.byteLength(body, 'utf8'),
        finalUrl: result.finalUrl,
      };
    }
  }
  return null;
}

function loadExisting() {
  if (!existsSync(OUT_PATH)) return {};
  try { return JSON.parse(readFileSync(OUT_PATH, 'utf8')); } catch { return {}; }
}

async function main() {
  const opts = parseArgs(argv.slice(2));
  const existing = loadExisting();
  const map = { ...existing };

  // Deduplicate by host; first URL for each host wins.
  const byHost = new Map();
  for (const u of URL_SET) {
    const host = new URL(u).host;
    if (opts.hosts && !opts.hosts.includes(host)) continue;
    if (!byHost.has(host)) byHost.set(host, u);
  }

  // Decide what to probe vs skip up-front so the progress prefix is accurate.
  // Treat *any* existing entry (including known-failures, strategy:null) as
  // "already probed" — forcing a re-probe requires --refresh.
  const todo = [];
  for (const [host, url] of byHost) {
    if (!opts.refresh && Object.prototype.hasOwnProperty.call(existing, host)) {
      const strat = existing[host]?.strategy ?? 'null';
      console.log(`[skip] ${host} -> ${strat} (use --refresh to retest)`);
      continue;
    }
    todo.push([host, url]);
  }

  const total = todo.length;
  if (total === 0) {
    console.log('\nNothing to probe.');
  } else {
    const concurrency = Math.min(opts.concurrency, total);
    console.log(`\nProbing ${total} hosts with concurrency=${concurrency} (per-attempt timeout ${PROBE_TIMEOUT_MS / 1000}s)...\n`);
  }

  let probed = 0;
  let failed = 0;
  let completed = 0;
  const startedAt = Date.now();
  const queue = todo.slice();
  const today = new Date().toISOString().split('T')[0];

  async function worker() {
    while (queue.length) {
      const [host, url] = queue.shift();
      const result = await probe(url);
      completed += 1;
      probed += 1;
      const tag = `[${String(completed).padStart(3, ' ')}/${total}]`;
      if (result) {
        map[host] = {
          strategy: result.strategy,
          kind: result.kind,
          status: result.status,
          bytes: result.bytes,
          sample_url: url,
          tested_at: today,
        };
        console.log(`${tag} ${host} -> ${result.strategy} (${result.status}, ${result.bytes} bytes)`);
      } else {
        failed += 1;
        map[host] = {
          strategy: null,
          kind: null,
          status: null,
          bytes: null,
          sample_url: url,
          tested_at: today,
          note: 'all strategies failed or were blocked',
        };
        console.log(`${tag} ${host} -> FAILED (no working strategy)`);
      }
    }
  }

  const concurrency = Math.max(1, Math.min(opts.concurrency, total || 1));
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  // Stable key order on disk for git-friendly diffs.
  const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(OUT_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\nWrote ${Object.keys(sorted).length} hosts to ${OUT_PATH} (probed ${probed} this run in ${elapsedSec}s, ${failed} failed)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
