import type { Metadata } from 'next'
import { RetryButton } from './RetryButton'

export const metadata: Metadata = {
  title: 'Không có kết nối — StudyFlow',
  description: 'Ứng dụng đang offline. Vui lòng kiểm tra kết nối mạng.',
}

/**
 * Trang fallback khi người dùng offline và app shell chưa được cache.
 * Service Worker sẽ redirect đến trang này khi navigation request thất bại.
 * Trang này được Serwist precache nên luôn sẵn sàng offline.
 */
export default function OfflinePage() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%)',
        color: '#e2e8f0',
        fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
      }}
    >
      {/* Icon offline */}
      <div
        style={{ fontSize: '4rem', marginBottom: '1.5rem' }}
        role="img"
        aria-label="Biểu tượng không có kết nối"
      >
        📡
      </div>

      <h1
        data-testid="offline-title"
        style={{
          fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
          fontWeight: 700,
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Bạn đang offline
      </h1>

      <p
        style={{
          fontSize: '1.1rem',
          color: '#94a3b8',
          maxWidth: '400px',
          lineHeight: 1.6,
          marginBottom: '2rem',
        }}
      >
        StudyFlow cần kết nối mạng để tải trang này. Dữ liệu đã lưu của bạn vẫn an toàn trên thiết
        bị.
      </p>

      {/* Client component để handle onClick */}
      <RetryButton />

      <p
        style={{
          marginTop: '3rem',
          fontSize: '0.875rem',
          color: '#475569',
        }}
      >
        💡 Ghi chú đã soạn trước đó vẫn xem được khi offline
      </p>
    </main>
  )
}
