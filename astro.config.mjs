import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import remarkBreaks from 'remark-breaks';

export default defineConfig({
  site: 'https://alot.land',
  // Treat a single line break in Markdown (one Enter in the CMS) as a real line
  // break on the page, matching what editors see in the Decap preview.
  markdown: {
    remarkPlugins: [remarkBreaks],
  },
  integrations: [
    tailwind(),
    sitemap({
      // Utility/private pages excluded from sitemap.
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/invest') &&
        !page.includes('/land-payment-calculator'),
    }),
  ],
});
