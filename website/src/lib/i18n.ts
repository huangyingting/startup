const strings = {
  en: {
    title: 'Startup Diligence',
    deck: 'AI-generated diligence reports for private startups, with every claim backed by a public source.',
    reports: 'Reports',
    search: 'Search',
    archive: 'All reports',
    sectors: 'Sectors',
    topRated: 'Top rated',
    latest: 'Latest',
    noReports: 'No reports yet.',
    confidence: 'confidence',
    market: 'Market',
    financials: 'Financials',
    risks: 'Top risks',
  },
} as const;

export function t(key: keyof typeof strings.en): string {
  return strings.en[key];
}
