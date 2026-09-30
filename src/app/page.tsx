'use client'

import { AuthButtons } from '@/components'
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
    </main>
  )
}
