// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://onigirisensei.app',
  integrations: [sitemap()],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 4321,
  },
});
