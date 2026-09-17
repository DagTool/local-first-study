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

import { createContext, useCallback, useContext, useReducer, useRef, type ReactNode } from 'react'
import { decodeGoogleIdToken, deriveUserKey } from './authUtils'

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'auth_id_token'

// ─── State & Action types ─────────────────────────────────────────────────────

export interface AuthState {
  userKey: string | null
  email: string | null
  name: string | null
  picture: string | null
  idToken: string | null
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
      }
    }
  | { type: 'SIGN_OUT' }

const initialState: AuthState = {
  userKey: null,
  email: null,
  name: null,
  picture: null,
  idToken: null,
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
   */
  signIn: (idToken: string) => void
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

  const signIn = useCallback((idToken: string) => {
    const { email, name, picture } = decodeGoogleIdToken(idToken)
    const userKey = deriveUserKey(email)

    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_KEY, idToken)
    }

    dispatch({
      type: 'SIGN_IN',
      payload: { userKey, email, name, picture, idToken },
    })
  }, [])

  const signOut = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LS_KEY)
    }
    dispatch({ type: 'SIGN_OUT' })
  }, [])

  const restoreSession = useCallback(() => {
    if (restoredRef.current) return
    restoredRef.current = true

    if (typeof window === 'undefined') return

    const stored = localStorage.getItem(LS_KEY)
    if (!stored) return

    try {
      const { email, name, picture } = decodeGoogleIdToken(stored)
      const userKey = deriveUserKey(email)
      dispatch({
        type: 'SIGN_IN',
        payload: { userKey, email, name, picture, idToken: stored },
      })
    } catch {
      // Token is stale / malformed — clear it so the user is prompted to sign in again.
      localStorage.removeItem(LS_KEY)
    }
  }, [])

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
