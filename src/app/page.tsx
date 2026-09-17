'use client'

import { AuthButtons } from '@/components'

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
        <AuthButtons />
      </div>
      <p>Quản lý ghi chú &amp; theo dõi học tập cá nhân</p>
    </main>
  )
}
