import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';

function usage() {
  console.error('Usage: check-part-leaf-counts.mjs <partsDir>');
  console.error('   or: CACHE=.translate-cache/<runId> check-part-leaf-counts.mjs');
}

function countLeaves(node) {
  if (node == null) return 0;
  if (typeof node === 'string') return 1;
  if (Array.isArray(node)) return node.reduce((sum, item) => sum + countLeaves(item), 0);
  if (typeof node === 'object') return Object.values(node).reduce((sum, item) => sum + countLeaves(item), 0);
  return 0;
}

function loadYaml(path) {
  return yaml.load(readFileSync(path, 'utf8')) ?? {};
}

const partsDir = process.argv[2]
  ? resolve(process.argv[2])
  : process.env.CACHE
    ? resolve(process.env.CACHE, 'parts')
    : null;

if (!partsDir) {
  usage();
  process.exit(2);
}

const manifestPath = join(partsDir, 'manifest.json');
if (!existsSync(manifestPath)) {
  console.error(`[check-part-leaf-counts] manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const parts = Array.isArray(manifest.parts) ? manifest.parts : [];
const failures = [];
let totalLeaves = 0;

for (const part of parts) {
  const partPath = join(partsDir, part.file ?? '');
  if (!part.file || !existsSync(partPath)) {
    failures.push(`${part.file ?? '(missing file name)'}: part file missing`);
    continue;
  }
  const expected = part.leaves;
  const actual = countLeaves(loadYaml(partPath));
  totalLeaves += actual;
  if (actual !== expected) failures.push(`${part.file}: expected ${expected}, got ${actual}`);
}

if (failures.length) {
  console.error('[check-part-leaf-counts] split part leaf-count mismatch:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`[check-part-leaf-counts] ✓ ${parts.length} part(s), ${totalLeaves} string leaf/leaves verified.`);