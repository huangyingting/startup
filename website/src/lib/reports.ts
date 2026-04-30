import type { CollectionEntry } from 'astro:content';

export function sortNewest(entries: CollectionEntry<'reports'>[]): CollectionEntry<'reports'>[] {
  return [...entries].sort((a, b) => b.data.runTimestamp.localeCompare(a.data.runTimestamp));
}

export function sortTopRated(entries: CollectionEntry<'reports'>[]): CollectionEntry<'reports'>[] {
  return [...entries].sort((a, b) => b.data.overallScore - a.data.overallScore || b.data.runTimestamp.localeCompare(a.data.runTimestamp));
}

export function tagSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'tag';
}

export function formatMoneyK(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}M`;
  return `${sign}$${abs.toFixed(0)}K`;
}
