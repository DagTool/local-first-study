import type { MetadataRoute } from 'next'

/**
 * PWA Web App Manifest
 * Next.js App Router tự động serve file này tại /manifest.webmanifest
 * Tham chiếu: https://web.dev/add-manifest/
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StudyFlow — Quản lý Ghi chú & Học tập',
    short_name: 'StudyFlow',
    description:
      'PWA local-first để quản lý ghi chú cá nhân và theo dõi tiến trình học tập, tích hợp Google Drive.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0f0f23',
    theme_color: '#6366f1',
    lang: 'vi',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Ghi chú mới',
        short_name: 'Ghi chú',
        url: '/notes/new',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Tiến trình học tập',
        short_name: 'Học tập',
        url: '/progress',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  }
}
