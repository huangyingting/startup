import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const reports = await getCollection('reports');
  const base = String(context.site ?? 'https://startup.genisisiq.com').replace(/\/$/, '');
  const englishUrls = ['/', '/archive/', '/sectors/', '/top-rated/', '/search/', ...reports.map((entry) => `/${entry.data.folderSlug}/`)];
  const chineseUrls = ['/zh/', '/zh/archive/', '/zh/sectors/', '/zh/top-rated/', '/zh/search/', ...reports.map((entry) => `/zh/${entry.data.folderSlug}/`)];
  const urls = [...englishUrls, ...chineseUrls];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${base}${url}</loc></url>`).join('')}</urlset>`, { headers: { 'content-type': 'application/xml' } });
}
