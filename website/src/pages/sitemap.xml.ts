import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const reports = await getCollection('reports');
  const base = String(context.site ?? 'https://startup.genisisiq.com').replace(/\/$/, '');
  const urls = ['/', '/archive/', '/sectors/', '/top-rated/', '/search/', ...reports.map((entry) => `/${entry.data.folderSlug}/`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${base}${url}</loc></url>`).join('')}</urlset>`, { headers: { 'content-type': 'application/xml' } });
}
