import type { CollectionEntry } from 'astro:content';

export function isCurrentReport(entry: CollectionEntry<'reports'>): boolean {
  return entry.data.revision?.status !== 'superseded';
}

export function currentReports(entries: CollectionEntry<'reports'>[]): CollectionEntry<'reports'>[] {
  return entries.filter(isCurrentReport);
}

export function sortNewest(entries: CollectionEntry<'reports'>[]): CollectionEntry<'reports'>[] {
  return [...entries].sort((a, b) => b.data.runTimestamp.localeCompare(a.data.runTimestamp) || b.data.runId.localeCompare(a.data.runId));
}

export function sortTopRated(entries: CollectionEntry<'reports'>[]): CollectionEntry<'reports'>[] {
  return [...entries].sort((a, b) => b.data.overallScore - a.data.overallScore || b.data.runTimestamp.localeCompare(a.data.runTimestamp) || b.data.runId.localeCompare(a.data.runId));
}

export function tagSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'tag';
}
