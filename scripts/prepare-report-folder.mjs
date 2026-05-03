#!/usr/bin/env node
// Create a fresh report folder under reports/<timestamp>-<slug>/.
// Adds a numeric suffix when the slug already exists.
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { reportsDir, slugify } from './text-utils.mjs';

const [timestamp, ...nameParts] = process.argv.slice(2);
if (!/^\d{14}$/.test(timestamp ?? '')) {
  console.error('Usage: node scripts/prepare-report-folder.mjs <YYYYMMDDHHmmss> <company name>');
  process.exit(1);
}

const base = `${timestamp}-${slugify(nameParts.join(' ') || 'startup')}`;
let path = join(reportsDir, base);
for (let suffix = 2; existsSync(path); suffix += 1) {
  path = join(reportsDir, `${base}-${suffix}`);
}
mkdirSync(path, { recursive: true });
console.log(path);
