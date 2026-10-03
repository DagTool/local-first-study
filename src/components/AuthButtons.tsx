'use client'

import { useAuthStore } from '@/lib/auth/authStore'
import { initGoogleAuth, promptGoogleSignIn, revokeGoogleToken } from '@/lib/auth/googleAuth'
import { useEffect, useState } from 'react'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'test-client-id'

export function AuthButtons() {
  const { state, signIn, signOut } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize GIS on mount
  useEffect(() => {
    initGoogleAuth(GOOGLE_CLIENT_ID).catch((err) => {
      console.error('Failed to init Google Auth:', err)
      setError('Không thể khởi tạo xác thực Google')
    })
  }, [])

  const handleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const idToken = await promptGoogleSignIn()
      signIn(idToken)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi'
      setError(message)
      console.error('Sign-in failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (state.email) {
        await revokeGoogleToken(state.email)
      }
      signOut()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi'
      setError(message)
      console.error('Sign-out failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      {error && <div style={{ color: 'red', fontSize: '0.875rem' }}>⚠️ {error}</div>}

      {state.userKey ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {state.picture && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.picture}
                alt="Avatar"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                }}
              />
            )}
            <div style={{ fontSize: '0.875rem' }}>
              <div data-testid="user-name" style={{ fontWeight: 600 }}>
                {state.name}
              </div>
              <div data-testid="user-email" style={{ color: '#666', fontSize: '0.75rem' }}>
                {state.email}
              </div>
            </div>
          </div>
          <button
            data-testid="sign-out-button"
            aria-label="Đăng xuất khỏi hệ thống"
            onClick={handleSignOut}
            disabled={isLoading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#b91c1c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              fontWeight: 600,
            }}
          >
            {isLoading ? 'Đang xử lý...' : 'Đăng xuất'}
          </button>
        </>
      ) : (
        <button
          data-testid="sign-in-button"
          aria-label="Đăng nhập bằng tài khoản Google"
          onClick={handleSignIn}
          disabled={isLoading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#1d4ed8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            fontWeight: 600,
          }}
        >
          {isLoading ? 'Đang xử lý...' : 'Đăng nhập với Google'}
        </button>
      )}
    </div>
  )
}
