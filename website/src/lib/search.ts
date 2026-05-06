import type { CollectionEntry } from 'astro:content';

export interface SearchDocument {
  href: string;
  title: string;
  sector: string;
  rating: number;
  date: string;
  searchText: string;
}

export function buildSearchDocuments(entries: CollectionEntry<'reports'>[], base: string): SearchDocument[] {
  return entries.map((entry) => {
    const title = entry.data.company.name;
    const sector = entry.data.company.sector ?? '';
    return {
      href: `${base}${entry.data.folderSlug}/`,
      title,
      sector,
      rating: entry.data.overallScore,
      date: entry.data.runDate,
      // Search index now only matches against the company name to keep results predictable.
      searchText: title.toLowerCase(),
    };
  });
}
