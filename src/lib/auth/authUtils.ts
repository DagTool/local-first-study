import { jwtDecode } from 'jwt-decode'

interface GoogleIdTokenPayload {
  email: string
  name: string
  picture: string
  sub: string
  iat: number
  exp: number
  iss: string
  aud: string
}

/**
 * Decodes a Google ID token (JWT) on the client side.
 * Does NOT verify the signature — verification must happen server-side.
 * Returns the core identity fields from the token payload.
 * Throws a descriptive Error if the token is malformed or missing required fields.
 */
export function decodeGoogleIdToken(idToken: string): {
  email: string
  name: string
  picture: string
} {
  let payload: GoogleIdTokenPayload
  try {
    payload = jwtDecode<GoogleIdTokenPayload>(idToken)
  } catch (err) {
    throw new Error(
      `Failed to decode Google ID token: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  if (!payload.email || !payload.name || !payload.picture) {
    throw new Error('Google ID token is missing required fields (email, name, or picture)')
  }

  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  }
}

/**
 * Derives a stable, canonical user key from an email address.
 * Lowercases and trims whitespace so that the same logical identity
 * always maps to the same key regardless of input formatting.
 */
export function deriveUserKey(email: string): string {
  return email.trim().toLowerCase()
}
