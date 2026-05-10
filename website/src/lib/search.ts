import type { CollectionEntry } from 'astro:content';
import type { Locale } from './locale';
import { localePath } from './locale';

export interface SearchDocument {
  href: string;
  title: string;
  sector: string;
  rating: number;
  date: string;
  searchText: string;
}

export function buildSearchDocuments(entries: CollectionEntry<'reports'>[], base: string, locale: Locale = 'en'): SearchDocument[] {
  return entries.map((entry) => {
    const title = entry.data.company.name;
    const sector = entry.data.company.sector ?? '';
    const href = locale === 'zh'
      ? localePath(base, 'zh', entry.data.folderSlug)
      : `${base}${entry.data.folderSlug}/`;
    return {
      href,
      title,
      sector,
      rating: entry.data.overallScore,
      date: entry.data.runDate,
      // Search index now only matches against the company name to keep results predictable.
      searchText: title.toLowerCase(),
    };
  });
}
