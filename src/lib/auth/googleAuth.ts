/**
 * Google Identity Services (GIS) integration module.
 *
 * Responsibilities:
 *  - Load the GIS script dynamically (once only)
 *  - Initialize google.accounts.id with the provided client ID
 *  - Expose a promise-based promptGoogleSignIn() that resolves with the id_token
 *  - Expose revokeGoogleToken() for sign-out
 *
 * NOTE: Signature verification of the id_token MUST happen server-side.
 *       This module is intentionally client-only.
 */

// ---------------------------------------------------------------------------
// Global type augmentation for google.accounts.id
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfig) => void
          prompt: (momentListener?: (notification: PromptMomentNotification) => void) => void
          revoke: (hint: string, done: (response: RevokeTokenResponse) => void) => void
          renderButton: (parent: HTMLElement, options: object) => void
          disableAutoSelect: () => void
        }
      }
    }
  }
}

interface GoogleIdConfig {
  client_id: string
  callback: (response: CredentialResponse) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
}

export interface CredentialResponse {
  credential: string
  select_by?: string
  client_id?: string
}

interface PromptMomentNotification {
  isDisplayMoment: () => boolean
  isDisplayed: () => boolean
  isNotDisplayed: () => boolean
  getNotDisplayedReason: () => string
  isSkippedMoment: () => boolean
  getSkippedReason: () => string
  isDismissedMoment: () => boolean
  getDismissedReason: () => string
  getMomentType: () => string
}

interface RevokeTokenResponse {
  successful: boolean
  error?: string
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client'
const GIS_SCRIPT_ID = 'google-gis-script'

/** The client ID passed to initGoogleAuth — stored so promptGoogleSignIn
 *  can re-initialize the callback without requiring it as a parameter. */
let _clientId = ''

/** Whether initGoogleAuth has successfully completed. */
let _initialized = false

/** Singleton promise for the GIS script load so we never append it twice. */
let _scriptLoadPromise: Promise<void> | null = null

/** The currently pending sign-in resolve/reject pair, if any. */
let _pendingCredentialCallback: ((response: CredentialResponse) => void) | null = null

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function loadGisScript(): Promise<void> {
  if (_scriptLoadPromise) {
    return _scriptLoadPromise
  }

  // Script already present in DOM (e.g., injected by _document.tsx)
  if (typeof document !== 'undefined' && document.getElementById(GIS_SCRIPT_ID)) {
    _scriptLoadPromise = Promise.resolve()
    return _scriptLoadPromise
  }

  _scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.id = GIS_SCRIPT_ID
    script.src = GIS_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error('Failed to load Google Identity Services script from ' + GIS_SCRIPT_URL))
    document.head.appendChild(script)
  })

  return _scriptLoadPromise
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Loads the GIS script and initializes google.accounts.id.
 * Guards against double-initialization — safe to call multiple times.
 *
 * Must be called (and awaited) before promptGoogleSignIn or revokeGoogleToken.
 */
export async function initGoogleAuth(clientId: string): Promise<void> {
  if (_initialized) {
    return
  }

  if (!clientId) {
    throw new Error('initGoogleAuth: clientId must be a non-empty string')
  }

  await loadGisScript()

  if (!window.google?.accounts?.id) {
    throw new Error(
      'google.accounts.id is not available after script load — ' +
        'the GIS script may be blocked by an ad blocker or network policy',
    )
  }

  _clientId = clientId

  // Initialize with the stable module-level callback dispatcher.
  // promptGoogleSignIn registers the per-call resolve/reject via
  // _pendingCredentialCallback, so we never need to re-initialize.
  window.google.accounts.id.initialize({
    client_id: _clientId,
    callback: (response: CredentialResponse) => {
      if (_pendingCredentialCallback) {
        _pendingCredentialCallback(response)
        _pendingCredentialCallback = null
      }
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  })

  _initialized = true
}

/**
 * Triggers the One Tap / popup sign-in flow.
 * Resolves with the raw `id_token` string from the CredentialResponse.
 * Rejects if the prompt cannot be shown or the user dismisses it.
 *
 * Requires initGoogleAuth() to have been called first.
 */
export function promptGoogleSignIn(): Promise<string> {
  if (!_initialized || !window.google?.accounts?.id) {
    return Promise.reject(
      new Error(
        'GIS is not initialized — call initGoogleAuth(clientId) before promptGoogleSignIn()',
      ),
    )
  }

  return new Promise<string>((resolve, reject) => {
    // Register this call's resolver as the pending callback.
    _pendingCredentialCallback = (response: CredentialResponse) => {
      if (response.credential) {
        resolve(response.credential)
      } else {
        reject(new Error('Google sign-in succeeded but returned no credential'))
      }
    }

    window.google!.accounts.id.prompt((notification: PromptMomentNotification) => {
      if (notification.isNotDisplayed()) {
        _pendingCredentialCallback = null
        reject(
          new Error(
            `Google sign-in prompt could not be displayed: ` + notification.getNotDisplayedReason(),
          ),
        )
      } else if (notification.isSkippedMoment()) {
        _pendingCredentialCallback = null
        reject(new Error(`Google sign-in prompt was skipped: ` + notification.getSkippedReason()))
      } else if (notification.isDismissedMoment()) {
        _pendingCredentialCallback = null
        reject(
          new Error(`Google sign-in prompt was dismissed: ` + notification.getDismissedReason()),
        )
      }
      // isDisplayed() means the prompt is showing — we wait for the callback.
    })
  })
}

/**
 * Revokes the Google OAuth token for the given email / hint.
 * Call this during sign-out so Google invalidates the session server-side.
 *
 * Requires initGoogleAuth() to have been called first.
 */
export function revokeGoogleToken(email: string): Promise<void> {
  if (!_initialized || !window.google?.accounts?.id) {
    return Promise.reject(
      new Error(
        'GIS is not initialized — call initGoogleAuth(clientId) before revokeGoogleToken()',
      ),
    )
  }

  if (!email) {
    return Promise.reject(new Error('revokeGoogleToken: email must be non-empty'))
  }

  return new Promise<void>((resolve, reject) => {
    window.google!.accounts.id.revoke(email, (response: RevokeTokenResponse) => {
      if (response.successful) {
        resolve()
      } else {
        reject(
          new Error(
            `Failed to revoke Google token for ${email}: ` + (response.error ?? 'unknown error'),
          ),
        )
      }
    })
  })
}

// ---------------------------------------------------------------------------
// Test utilities
// ---------------------------------------------------------------------------

/**
 * Resets all module-level state.
 * FOR TESTS ONLY — do not import or call in production code.
 */
export function _resetGoogleAuthForTesting(): void {
  _clientId = ''
  _initialized = false
  _scriptLoadPromise = null
  _pendingCredentialCallback = null

  // Remove injected script tag if present
  if (typeof document !== 'undefined') {
    const el = document.getElementById(GIS_SCRIPT_ID)
    if (el) el.remove()
  }
}
