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
      // Soft-launch / utility pages excluded from sitemap.
      // Remove '/sugar-tree-vista' and '/communities' here when Sugar Tree goes live.
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/invest') &&
        !page.includes('/sugar-tree-vista') &&
        !page.includes('/communities') &&
        !page.includes('/land-payment-calculator'),
    }),
  ],
});
