import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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

function collectStringLeaves(node, path = [], out = []) {
  if (typeof node === 'string') {
    if (node.trim()) out.push({ path, value: node });
    return out;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) collectStringLeaves(node[i], [...path, i], out);
    return out;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) collectStringLeaves(value, [...path, key], out);
  }
  return out;
}

function pathText(path) {
  return path.length ? path.join('/') : '(root)';
}

function excerpt(value) {
  const text = JSON.stringify(String(value).replace(/\s+/g, ' '));
  return text.length <= 140 ? text : `${text.slice(0, 137)}...`;
}

function describePathDelta(partFile, expectedLeaves, actualLeaves) {
  const expectedPaths = expectedLeaves.map((leaf) => pathText(leaf.path));
  const actualPaths = actualLeaves.map((leaf) => pathText(leaf.path));
  const expectedSet = new Set(expectedPaths);
  const actualSet = new Set(actualPaths);
  const extra = actualLeaves.filter((leaf) => !expectedSet.has(pathText(leaf.path)));
  const missing = expectedLeaves.filter((leaf) => !actualSet.has(pathText(leaf.path)));
  const messages = [];

  const maxShared = Math.min(expectedPaths.length, actualPaths.length);
  const divergentIndex = expectedPaths.findIndex((expectedPath, index) => actualPaths[index] !== expectedPath);
  if (divergentIndex !== -1 && divergentIndex < maxShared) {
    messages.push(`${partFile}: first path mismatch at leaf ${divergentIndex + 1}: expected ${expectedPaths[divergentIndex]}, got ${actualPaths[divergentIndex]}`);
  }
  if (missing.length) {
    const sample = missing.slice(0, 5).map((leaf) => pathText(leaf.path)).join(', ');
    messages.push(`${partFile}: missing path(s): ${sample}${missing.length > 5 ? ` (+${missing.length - 5} more)` : ''}`);
  }
  if (extra.length) {
    const sample = extra
      .slice(0, 5)
      .map((leaf) => `${pathText(leaf.path)} => ${excerpt(leaf.value)}`)
      .join('; ');
    messages.push(`${partFile}: extra path(s): ${sample}${extra.length > 5 ? ` (+${extra.length - 5} more)` : ''}`);
  }
  return messages;
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
const sourceBundlePath = manifest.sourceBundle ? resolve(dirname(manifestPath), manifest.sourceBundle) : null;
let sourceLeaves = null;

if (!sourceBundlePath || !existsSync(sourceBundlePath)) {
  failures.push(`source bundle not found for path comparison: ${sourceBundlePath ?? '(missing manifest.sourceBundle)'}`);
} else {
  sourceLeaves = collectStringLeaves(loadYaml(sourceBundlePath));
  if (typeof manifest.totalLeaves === 'number' && sourceLeaves.length !== manifest.totalLeaves) {
    failures.push(`source bundle leaf count mismatch: manifest=${manifest.totalLeaves}, source=${sourceLeaves.length}`);
  }
}

let totalLeaves = 0;
let expectedOffset = 0;

for (const part of parts) {
  const partPath = join(partsDir, part.file ?? '');
  if (!part.file || !existsSync(partPath)) {
    failures.push(`${part.file ?? '(missing file name)'}: part file missing`);
    continue;
  }
  const expected = part.leaves;
  const actualLeaves = collectStringLeaves(loadYaml(partPath));
  const actual = actualLeaves.length;
  totalLeaves += actual;
  if (actual !== expected) failures.push(`${part.file}: expected ${expected}, got ${actual}`);
  if (sourceLeaves) {
    const expectedLeaves = sourceLeaves.slice(expectedOffset, expectedOffset + expected);
    failures.push(...describePathDelta(part.file, expectedLeaves, actualLeaves));
  }
  expectedOffset += expected;
}

if (failures.length) {
  console.error('[check-part-leaf-counts] split part leaf-count mismatch:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`[check-part-leaf-counts] ✓ ${parts.length} part(s), ${totalLeaves} string leaf/leaves verified.`);