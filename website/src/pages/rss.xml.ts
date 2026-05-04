import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { sortNewest } from '../lib/reports';

export async function GET(context) {
  const reports = sortNewest(await getCollection('reports'));
  return rss({
    title: 'Startup Research',
    description: 'Evidence-backed startup company reports.',
    site: context.site ?? 'https://startup.genisisiq.com',
    items: reports.map((entry) => ({
      title: entry.data.company.name,
      description: entry.data.headline,
      pubDate: new Date(entry.data.runDate),
      link: `/${entry.data.folderSlug}/`,
    })),
  });
}
