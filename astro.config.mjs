import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://alot.land',
  integrations: [
    react(),
    tailwind(),
    sitemap({
      filter: (page) => !page.includes('/admin') && !page.includes('/dashboard'),
    }),
  ],
});
