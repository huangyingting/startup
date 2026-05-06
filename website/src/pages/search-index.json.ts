import { getCollection } from 'astro:content';
import { buildSearchDocuments } from '../lib/search';
import { currentReports } from '../lib/reports';

export async function GET() {
  const reports = currentReports(await getCollection('reports'));
  return new Response(JSON.stringify(buildSearchDocuments(reports, import.meta.env.BASE_URL)), {
    headers: { 'content-type': 'application/json' },
  });
}
