import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@petdate/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      // prompt — autoUpdate+skipWaiting was full-reloading open tabs (e.g. /chats)
      // whenever a new deploy raced the service worker.
      registerType: 'prompt',
      workbox: {
        skipWaiting: false,
        clientsClaim: false,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff2}'],
      },
      includeAssets: [
        'favicon.ico',
        'favicon.png',
        'favicon.svg',
        'apple-touch-icon.png',
        'logo.svg',
        'logotype.svg',
        'robots.txt',
        'sitemap.xml',
        'llms.txt',
        'llms-full.txt',
        'brand/**/*',
        'pets/**/*',
      ],
      manifest: {
        name: 'پت‌دیت | PetDate',
        // iOS/Android home-screen label — English; keep Persian in page UI titles only.
        short_name: 'petdate',
        description:
          'پت‌دیت (PetDate) پلتفرم فارسی پیدا کردن همبازی برای پت، پت‌شاپ، پذیرش پت و مشاوره دامپزشک.',
        theme_color: '#5c4d91',
        background_color: '#f4f4f7',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'fa',
        dir: 'rtl',
        start_url: '/',
        id: '/',
        scope: '/',
        categories: ['lifestyle', 'social'],
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5180,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    port: 4173,
    host: true,
    allowedHosts: true,
  },
});
