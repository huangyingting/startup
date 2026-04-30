import type { CollectionEntry } from 'astro:content';
import { loadLocalizedIndex } from '../content/reports-loader';
import type { Lang } from './i18n';

export interface SearchDocument {
  id: string;
  href: string;
  title: string;
  headline: string;
  sector: string;
  stage: string;
  tags: string[];
  rating: number;
  date: string;
  runTimestamp: string;
  searchText: string;
}

function localized(entry: CollectionEntry<'reports'>, lang: Lang, field: 'headline'): string {
  const doc = loadLocalizedIndex(entry.id, lang);
  const value = doc?.[field];
  return typeof value === 'string' && value.length ? value : entry.data[field];
}

export function buildSearchDocuments(entries: CollectionEntry<'reports'>[], lang: Lang, base: string): SearchDocument[] {
  const prefix = lang === 'zh' ? `${base}zh/` : base;
  return entries.map((entry) => {
    const title = entry.data.company.name;
    const stage = entry.data.company.stage ?? '';
    const sector = entry.data.company.sector ?? '';
    const headline = localized(entry, lang, 'headline');
    const tags = [entry.data.recommendation, entry.data.confidence, ...entry.data.topStrengths, ...entry.data.topRisks];
    const parts = [title, headline, entry.data.company.website, sector, stage, ...tags];
    return {
      id: entry.id,
      href: `${prefix}${entry.data.folderSlug}/`,
      title,
      headline,
      sector,
      stage,
      tags,
      rating: entry.data.overallScore,
      date: entry.data.runDate,
      runTimestamp: entry.data.runTimestamp,
      searchText: parts.join(' ').toLowerCase(),
    };
  });
}
