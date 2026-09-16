/**
 * Service Worker — StudyFlow PWA
 * Được build bởi Serwist từ src/sw.ts → public/sw.js
 *
 * Chiến lược cache:
 * - App shell (HTML navigation): NetworkFirst với fallback về /offline
 * - Static assets (JS/CSS/_next/static): CacheFirst
 * - Images: StaleWhileRevalidate
 */
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

// Inject precache manifest từ Serwist build process
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis & WorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  // Fallback về trang /offline khi navigation request thất bại
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }) {
          return request.destination === 'document'
        },
      },
    ],
  },
})

serwist.addEventListeners()
