#!/usr/bin/env node
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from './text-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const reportsDir = join(repoRoot, 'reports');
const [timestamp, ...nameParts] = process.argv.slice(2);
const companyName = nameParts.join(' ');

if (!timestamp || !/^\d{14}$/.test(timestamp)) {
  console.error('Usage: node scripts/prepare-report-folder.mjs <YYYYMMDDHHmmss> <company name>');
  process.exit(1);
}

const baseSlug = slugify(companyName || 'startup');
let folderName = `${timestamp}-${baseSlug}`;
let folderPath = join(reportsDir, folderName);
let suffix = 2;
while (existsSync(folderPath)) {
  folderName = `${timestamp}-${baseSlug}-${suffix}`;
  folderPath = join(reportsDir, folderName);
  suffix += 1;
}

mkdirSync(folderPath, { recursive: true });
console.log(folderPath);
