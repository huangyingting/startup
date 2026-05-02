import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const reportsDir = join(repoRoot, 'reports');

export function readYaml(path) {
  return yaml.load(readFileSync(path, 'utf8')) ?? {};
}

export function writeYaml(path, value) {
  writeFileSync(path, yaml.dump(value, { lineWidth: 120, noRefs: true, sortKeys: false }), 'utf8');
}

export function listDirs(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((name) => !name.startsWith('.') && !name.startsWith('_'))
    .filter((name) => {
      try { return statSync(join(path, name)).isDirectory(); }
      catch { return false; }
    });
}

export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'startup';
}

export function normalizeCompanyName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\b(inc\.?|llc|ltd\.?|corp\.?|corporation|company|co\.?|limited)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeDomain(value) {
  try {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

export function canonicalSourceUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (lower.startsWith('utm_') || ['fbclid', 'gclid', 'mc_cid', 'mc_eid'].includes(lower)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    url.pathname = url.pathname.replace(/\/$/, '') || '/';
    return url.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return raw.replace(/#.*$/, '').replace(/\?.*utm_[^#]*/i, '').replace(/\/$/, '').toLowerCase();
  }
}

export function asDateString(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  return typeof value === 'string' ? value : '';
}

export function compactText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}
