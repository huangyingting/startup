import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { loadCardOverlayZh } from '../../content/reports-loader';
import { currentReports, sortNewest } from '../../lib/reports';

export async function GET(context: APIContext) {
  const reports = sortNewest(currentReports(await getCollection('reports')));
  return rss({
    title: '初创公司尽调',
    description: '由 AI 生成的非上市初创公司尽调报告，每条结论均链接到公开来源。',
    site: context.site ?? 'https://startup.genisisiq.com',
    items: reports.map((entry) => {
      const overlay = loadCardOverlayZh(entry.id);
      return {
        title: entry.data.company.name,
        description: overlay?.headline ?? entry.data.headline,
        pubDate: new Date(entry.data.runDate),
        link: `/zh/${entry.data.folderSlug}/`,
      };
    }),
  });
}