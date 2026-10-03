/**
 * Integration Tests — AuthStore (AuthProvider + useAuthStore)
 *
 * Dùng React Testing Library + jsdom (không cần MSW vì GIS không gọi HTTP —
 * nó là JS SDK inject qua script tag; mock bằng cách cung cấp fake id_token
 * được tạo từ base64url encode payload hợp lệ).
 *
 * Covers:
 * - signIn: decode token → set state đúng (userKey, email, name, picture)
 * - signIn: persist token vào localStorage
 * - signOut: clear state + xóa localStorage
 * - restoreSession: rehydrate từ localStorage khi app boot
 * - userKey được normalize đúng (lowercase + trim)
 * - signIn với email khác nhau → userKey khác nhau
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AuthProvider, useAuthStore } from '@/lib/auth/authStore'

// ── Helpers ────────────────────────────────────────────────────────────────────

function base64url(obj: unknown): string {
  const json = JSON.stringify(obj)
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function makeFakeJwt(payload: Record<string, unknown>): string {
  const header = base64url({ alg: 'RS256', typ: 'JWT' })
  const body = base64url(payload)
  return `${header}.${body}.fake_signature`
}

const ALICE_TOKEN = makeFakeJwt({
  sub: 'google-alice-001',
  email: 'alice@example.com',
  name: 'Alice Nguyen',
  picture: 'https://example.com/alice.jpg',
  iss: 'https://accounts.google.com',
  aud: 'test-client-id',
  iat: 1700000000,
  exp: 9999999999,
})

const BOB_TOKEN = makeFakeJwt({
  sub: 'google-bob-001',
  email: 'bob@example.com',
  name: 'Bob Tran',
  picture: 'https://example.com/bob.jpg',
  iss: 'https://accounts.google.com',
  aud: 'test-client-id',
  iat: 1700000000,
  exp: 9999999999,
})

// Token với email viết hoa + khoảng trắng (cần normalize)
const ALICE_MESSY_TOKEN = makeFakeJwt({
  sub: 'google-alice-002',
  email: '  ALICE@EXAMPLE.COM  ',
  name: 'Alice Nguyen',
  picture: 'https://example.com/alice.jpg',
  iss: 'https://accounts.google.com',
  aud: 'test-client-id',
  iat: 1700000000,
  exp: 9999999999,
})

// ── Wrapper helper ─────────────────────────────────────────────────────────────

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AuthStore — signIn', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('signIn: sets userKey, email, name, picture từ token', () => {
    const { result } = renderHook(() => useAuthStore(), { wrapper })

    act(() => {
      result.current.signIn(ALICE_TOKEN)
    })

    expect(result.current.state.email).toBe('alice@example.com')
    expect(result.current.state.name).toBe('Alice Nguyen')
    expect(result.current.state.picture).toBe('https://example.com/alice.jpg')
    expect(result.current.state.userKey).toBe('alice@example.com')
    expect(result.current.state.idToken).toBe(ALICE_TOKEN)
  })

  it('signIn: userKey được normalize (lowercase + trim) từ email trong token', () => {
    const { result } = renderHook(() => useAuthStore(), { wrapper })

    act(() => {
      result.current.signIn(ALICE_MESSY_TOKEN)
    })

    // userKey phải là đã normalize, không phải raw email
    expect(result.current.state.userKey).toBe('alice@example.com')
    expect(result.current.state.email).toBe('  ALICE@EXAMPLE.COM  ')
  })

  it('signIn: lưu idToken vào localStorage', () => {
    const { result } = renderHook(() => useAuthStore(), { wrapper })

    act(() => {
      result.current.signIn(ALICE_TOKEN)
    })

    expect(localStorage.getItem('auth_id_token')).toBe(ALICE_TOKEN)
  })

  it('signIn với token không hợp lệ → ném lỗi, state không thay đổi', () => {
    const { result } = renderHook(() => useAuthStore(), { wrapper })

    expect(() => {
      act(() => {
        result.current.signIn('not-a-jwt')
      })
    }).toThrow()

    expect(result.current.state.userKey).toBeNull()
  })
})

describe('AuthStore — signOut', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('signOut: xóa toàn bộ state về null', () => {
    const { result } = renderHook(() => useAuthStore(), { wrapper })

    act(() => {
      result.current.signIn(ALICE_TOKEN)
    })
    act(() => {
      result.current.signOut()
    })

    expect(result.current.state.userKey).toBeNull()
    expect(result.current.state.email).toBeNull()
    expect(result.current.state.name).toBeNull()
    expect(result.current.state.picture).toBeNull()
    expect(result.current.state.idToken).toBeNull()
  })

  it('signOut: xóa idToken khỏi localStorage', () => {
    const { result } = renderHook(() => useAuthStore(), { wrapper })

    act(() => {
      result.current.signIn(ALICE_TOKEN)
    })
    expect(localStorage.getItem('auth_id_token')).toBe(ALICE_TOKEN)

    act(() => {
      result.current.signOut()
    })
    expect(localStorage.getItem('auth_id_token')).toBeNull()
  })
})

describe('AuthStore — restoreSession', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('restoreSession: rehydrate từ localStorage khi có token hợp lệ', () => {
    localStorage.setItem('auth_id_token', ALICE_TOKEN)

    const { result } = renderHook(() => useAuthStore(), { wrapper })

    act(() => {
      result.current.restoreSession()
    })

    expect(result.current.state.userKey).toBe('alice@example.com')
    expect(result.current.state.email).toBe('alice@example.com')
  })

  it('restoreSession: no-op khi localStorage rỗng', () => {
    const { result } = renderHook(() => useAuthStore(), { wrapper })

    act(() => {
      result.current.restoreSession()
    })

    expect(result.current.state.userKey).toBeNull()
  })

  it('restoreSession: xóa token rác khi token không hợp lệ', () => {
    localStorage.setItem('auth_id_token', 'malformed-token')

    const { result } = renderHook(() => useAuthStore(), { wrapper })

    act(() => {
      result.current.restoreSession()
    })

    expect(result.current.state.userKey).toBeNull()
    expect(localStorage.getItem('auth_id_token')).toBeNull()
  })

  it('restoreSession: idempotent — gọi nhiều lần không re-decode', () => {
    localStorage.setItem('auth_id_token', ALICE_TOKEN)

    const { result } = renderHook(() => useAuthStore(), { wrapper })

    act(() => {
      result.current.restoreSession()
      result.current.restoreSession() // gọi lần 2
      result.current.restoreSession() // gọi lần 3
    })

    // State vẫn đúng, không bị reset
    expect(result.current.state.userKey).toBe('alice@example.com')
  })
})

describe('AuthStore — User Switch (A → B isolation)', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('sign-in Alice rồi sign-out rồi sign-in Bob → state là của Bob, không còn Alice', () => {
    const { result } = renderHook(() => useAuthStore(), { wrapper })

    // Alice đăng nhập
    act(() => {
      result.current.signIn(ALICE_TOKEN)
    })
    expect(result.current.state.userKey).toBe('alice@example.com')

    // Alice đăng xuất
    act(() => {
      result.current.signOut()
    })
    expect(result.current.state.userKey).toBeNull()

    // Bob đăng nhập
    act(() => {
      result.current.signIn(BOB_TOKEN)
    })
    expect(result.current.state.userKey).toBe('bob@example.com')
    expect(result.current.state.email).toBe('bob@example.com')
    expect(result.current.state.name).toBe('Bob Tran')

    // Không còn thông tin Alice
    expect(result.current.state.email).not.toContain('alice')
    expect(result.current.state.name).not.toBe('Alice Nguyen')
  })

  it('userKey của Alice và Bob khác nhau → DB namespace khác nhau', () => {
    const { result } = renderHook(() => useAuthStore(), { wrapper })

    act(() => {
      result.current.signIn(ALICE_TOKEN)
    })
    const aliceKey = result.current.state.userKey

    act(() => {
      result.current.signOut()
      result.current.signIn(BOB_TOKEN)
    })
    const bobKey = result.current.state.userKey

    expect(aliceKey).not.toBe(bobKey)
    expect(aliceKey).toBe('alice@example.com')
    expect(bobKey).toBe('bob@example.com')
  })

  it('localStorage chỉ chứa token của user đang đăng nhập', () => {
    const { result } = renderHook(() => useAuthStore(), { wrapper })

    act(() => {
      result.current.signIn(ALICE_TOKEN)
    })
    expect(localStorage.getItem('auth_id_token')).toBe(ALICE_TOKEN)

    act(() => {
      result.current.signOut()
      result.current.signIn(BOB_TOKEN)
    })

    // Chỉ còn token của Bob, không còn của Alice
    const stored = localStorage.getItem('auth_id_token')
    expect(stored).toBe(BOB_TOKEN)
    expect(stored).not.toBe(ALICE_TOKEN)
  })
})

describe('AuthStore — useAuthStore outside Provider', () => {
  it('ném lỗi khi dùng ngoài AuthProvider', () => {
    // Suppress React error boundary noise
    const consoleError = console.error
    console.error = () => {}

    expect(() => {
      renderHook(() => useAuthStore())
    }).toThrow('useAuthStore must be used within <AuthProvider>')

    console.error = consoleError
  })
})

// ── Render smoke test ──────────────────────────────────────────────────────────

describe('AuthProvider — render', () => {
  it('render children không bị crash', () => {
    expect(() => {
      render(
        <AuthProvider>
          <div data-testid="child">child</div>
        </AuthProvider>,
      )
    }).not.toThrow()
  })
})
