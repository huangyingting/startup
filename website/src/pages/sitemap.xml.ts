import { getCollection } from 'astro:content';

export async function GET() {
  const reports = await getCollection('reports');
  const base = 'https://example.com';
  const urls = ['/', '/archive/', '/sectors/', '/top-rated/', '/search/', '/zh/', '/zh/archive/', '/zh/sectors/', '/zh/top-rated/', '/zh/search/', ...reports.flatMap((entry) => [`/${entry.data.folderSlug}/`, `/zh/${entry.data.folderSlug}/`])];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${base}${url}</loc></url>`).join('')}</urlset>`, { headers: { 'content-type': 'application/xml' } });
}
