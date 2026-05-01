import { defineConfig } from 'astro/config';

// Project pages base path. Keep '/' for the attached custom domain.
const SITE = process.env.SITE_URL || 'https://startup.genisisiq.com';
const BASE = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  output: 'static',
  build: {
    format: 'directory',
  },
  markdown: {
    syntaxHighlight: false,
  },
});
