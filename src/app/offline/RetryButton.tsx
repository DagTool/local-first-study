'use client'

/**
 * Nút "Thử lại" — client component riêng để trang offline/page.tsx vẫn là Server Component
 */
export function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      style={{
        padding: '0.75rem 2rem',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: '#fff',
        border: 'none',
        borderRadius: '0.75rem',
        fontSize: '1rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'opacity 0.2s',
      }}
      onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
      onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
    >
      Thử lại kết nối
    </button>
  )
}
