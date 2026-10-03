/**
 * Auth store — React context + useReducer with localStorage persistence.
 *
 * Exposes:
 *   AuthProvider  — wrap the app root with this
 *   useAuthStore  — hook to read state + call actions from any component
 *
 * State shape
 *   userKey   | canonical email key (trimmed, lowercased)
 *   email     | raw email from token
 *   name      | display name from token
 *   picture   | avatar URL from token
 *   idToken   | raw Google ID token (also kept in localStorage)
 *
 * Actions
 *   signIn(idToken)     — decode token, derive key, persist to localStorage
 *   signOut()           — clear state + localStorage
 *   restoreSession()    — rehydrate from localStorage on app boot
 */

'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import { decodeGoogleIdToken, deriveUserKey } from './authUtils'

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'auth_id_token'
const LS_ACCESS_KEY = 'auth_access_token'

// ─── State & Action types ─────────────────────────────────────────────────────

export interface AuthState {
  userKey: string | null
  email: string | null
  name: string | null
  picture: string | null
  idToken: string | null
  /** Google OAuth 2.0 access token — dùng cho Drive API (scope: drive.appdata) */
  accessToken: string | null
}

type AuthAction =
  | {
      type: 'SIGN_IN'
      payload: {
        userKey: string
        email: string
        name: string
        picture: string
        idToken: string
        accessToken: string | null
      }
    }
  | { type: 'SIGN_OUT' }

const initialState: AuthState = {
  userKey: null,
  email: null,
  name: null,
  picture: null,
  idToken: null,
  accessToken: null,
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SIGN_IN':
      return {
        userKey: action.payload.userKey,
        email: action.payload.email,
        name: action.payload.name,
        picture: action.payload.picture,
        idToken: action.payload.idToken,
        accessToken: action.payload.accessToken,
      }
    case 'SIGN_OUT':
      return initialState
    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  state: AuthState
  /**
   * Decode a Google ID token, set auth state, and persist the token to
   * localStorage. Throws if the token is malformed or missing required fields.
   * @param idToken    - Google ID token (JWT)
   * @param accessToken - Google OAuth 2.0 access token (for Drive API). Optional.
   */
  signIn: (idToken: string, accessToken?: string | null) => void
  /**
   * Clear auth state and remove the persisted token from localStorage.
   */
  signOut: () => void
  /**
   * Read the persisted token from localStorage and rehydrate state.
   * Call once on app boot (AuthProvider does this automatically).
   * Safe to call if nothing is stored — it is a no-op in that case.
   */
  restoreSession: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Track whether restoreSession has already run so callers can call it safely
  // multiple times without double-decoding.
  const restoredRef = useRef(false)

  const signIn = useCallback((idToken: string, accessToken: string | null = null) => {
    const { email, name, picture } = decodeGoogleIdToken(idToken)
    const userKey = deriveUserKey(email)

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(LS_KEY, idToken)
      localStorage.setItem(LS_KEY, idToken)
      if (accessToken) {
        // Chỉ lưu accessToken vào sessionStorage (ưu tiên memory/session, tránh localStorage cho token nhạy cảm)
        sessionStorage.setItem(LS_ACCESS_KEY, accessToken)
        localStorage.removeItem(LS_ACCESS_KEY)
      }
    }

    dispatch({
      type: 'SIGN_IN',
      payload: { userKey, email, name, picture, idToken, accessToken },
    })
  }, [])

  const signOut = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(LS_KEY)
      sessionStorage.removeItem(LS_ACCESS_KEY)
      localStorage.removeItem(LS_KEY)
      localStorage.removeItem(LS_ACCESS_KEY)
    }
    dispatch({ type: 'SIGN_OUT' })
  }, [])

  const restoreSession = useCallback(() => {
    if (restoredRef.current) return
    restoredRef.current = true

    if (typeof window === 'undefined') return

    // Kiểm tra sessionStorage trước (ưu tiên memory/session an toàn), sau đó fallback localStorage
    const stored = sessionStorage.getItem(LS_KEY) ?? localStorage.getItem(LS_KEY)
    if (!stored) return

    try {
      const { email, name, picture } = decodeGoogleIdToken(stored)
      const userKey = deriveUserKey(email)

      // accessToken: đọc từ sessionStorage trước; nếu có ở localStorage thì di chuyển sang sessionStorage rồi xóa ngay
      let accessToken = sessionStorage.getItem(LS_ACCESS_KEY)
      if (!accessToken && localStorage.getItem(LS_ACCESS_KEY)) {
        accessToken = localStorage.getItem(LS_ACCESS_KEY)
        if (accessToken) {
          sessionStorage.setItem(LS_ACCESS_KEY, accessToken)
        }
        localStorage.removeItem(LS_ACCESS_KEY)
      }

      dispatch({
        type: 'SIGN_IN',
        payload: { userKey, email, name, picture, idToken: stored, accessToken },
      })
    } catch {
      // Token is stale / malformed — clear it so the user is prompted to sign in again.
      sessionStorage.removeItem(LS_KEY)
      sessionStorage.removeItem(LS_ACCESS_KEY)
      localStorage.removeItem(LS_KEY)
      localStorage.removeItem(LS_ACCESS_KEY)
    }
  }, [])

  // Auto-restore session từ localStorage khi AuthProvider mount lần đầu.
  // Đây là hành vi đúng cho PWA: user reload trang → vẫn còn logged-in.
  // useEffect chỉ chạy phía client (browser) — không chạy trong SSR.
  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  return (
    <AuthContext.Provider value={{ state, signIn, signOut, restoreSession }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the auth context value. Must be used inside <AuthProvider>.
 */
export function useAuthStore(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuthStore must be used within <AuthProvider>')
  }
  return ctx
}
