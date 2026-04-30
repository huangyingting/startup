import { getCollection } from 'astro:content';
import { buildSearchDocuments } from '../../lib/search';

export async function GET() {
  const reports = await getCollection('reports');
  return new Response(JSON.stringify(buildSearchDocuments(reports, 'zh', import.meta.env.BASE_URL)), {
    headers: { 'content-type': 'application/json' },
  });
}
