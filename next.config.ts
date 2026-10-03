import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  // Nguồn SW TypeScript của chúng ta
  swSrc: 'src/sw.ts',
  // Output: public/sw.js (được serve bởi Next.js)
  swDest: 'public/sw.js',
  // Disable trong dev — chỉ build SW trong production
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  // Khai báo turbopack rỗng để Next.js 16 không báo lỗi xung đột
  // Serwist dùng webpack plugin nên build production phải dùng --webpack
  turbopack: {},
  async headers() {
    return [
      // Security headers cho tất cả routes
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.googleusercontent.com https://example.com; connect-src 'self' https://accounts.google.com https://www.googleapis.com https://oauth2.googleapis.com; frame-src https://accounts.google.com;",
          },
        ],
      },
      // Service Worker: không được cache bởi browser
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ]
  },
}

export default withSerwist(nextConfig)
