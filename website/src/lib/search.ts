import type { CollectionEntry } from 'astro:content';

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

export function buildSearchDocuments(entries: CollectionEntry<'reports'>[], base: string): SearchDocument[] {
  return entries.map((entry) => {
    const title = entry.data.company.name;
    const stage = entry.data.company.stage ?? '';
    const sector = entry.data.company.sector ?? '';
    const headline = entry.data.headline;
    return {
      id: entry.id,
      href: `${base}${entry.data.folderSlug}/`,
      title,
      headline,
      sector,
      stage,
      tags: [],
      rating: entry.data.overallScore,
      date: entry.data.runDate,
      runTimestamp: entry.data.runTimestamp,
      // Search index now only matches against the company name to keep results predictable.
      searchText: title.toLowerCase(),
    };
  });
}
