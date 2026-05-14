import { canonicalSourceUrl } from './.agents/skills/startup-research/scripts/utils.mjs';
import { readFileSync, readdirSync } from 'fs';
import yaml from 'js-yaml';

const reportDir = 'reports/20260514180906-equipmentshare';
const files = readdirSync(reportDir)
  .filter(f => /^0[1-6]-/.test(f) && f.endsWith('.yaml'))
  .map(f => `${reportDir}/${f}`);

const earlierUrls = new Set();
for (const f of files) {
  const doc = yaml.load(readFileSync(f, 'utf8'));
  for (const s of doc?.localEvidence?.sources ?? []) {
    const c = canonicalSourceUrl(s?.url);
    if (c) earlierUrls.add(c);
  }
}

const current = yaml.load(readFileSync(`${reportDir}/07-risks.yaml`, 'utf8'));
let netNew = 0;
for (const s of current?.localEvidence?.sources ?? []) {
  const c = canonicalSourceUrl(s?.url);
  const isNew = c && !earlierUrls.has(c);
  console.log(s.id, isNew ? 'NET-NEW' : 'REUSED', c?.substring(0, 80));
  if (isNew) netNew++;
}
console.log('Total net-new:', netNew);
