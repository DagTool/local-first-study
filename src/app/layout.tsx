import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'StudyFlow — Quản lý Ghi chú & Học tập',
  description:
    'PWA local-first để quản lý ghi chú cá nhân và theo dõi tiến trình học tập, tích hợp Google Drive.',
  // manifest sẽ được thêm ở Giai đoạn 6 (PWA) khi có file /public/manifest.json
}

// themeColor phải export qua viewport (metadata.themeColor deprecated từ Next.js 14)
export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
