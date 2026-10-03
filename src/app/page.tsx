'use client'

import { AuthButtons, BackupControls } from '@/components'
import { SyncStatus } from '@/components/SyncStatus'

export default function HomePage() {
  return (
    <main style={{ padding: '2rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <h1>StudyFlow</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SyncStatus />
          <AuthButtons />
        </div>
      </div>
      <p>Quản lý ghi chú &amp; theo dõi học tập cá nhân</p>
      <nav
        aria-label="Điều hướng chính"
        style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}
      >
        <a
          href="/notes"
          aria-label="Đi đến trang Quản lý Ghi chú"
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          📝 Quản lý Ghi chú
        </a>
        <a
          href="/gpa"
          aria-label="Đi đến trang Quản lý GPA và Tiến độ học tập"
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          📊 Quản lý GPA &amp; Tiến độ
        </a>
      </nav>
      <BackupControls />
    </main>
  )
}
