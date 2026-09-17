/**
 * Unit Tests — authUtils
 * deriveUserKey + decodeGoogleIdToken
 */
import { describe, it, expect } from 'vitest'
import { deriveUserKey, decodeGoogleIdToken } from './authUtils'

// ---------------------------------------------------------------------------
// Helpers — craft a fake JWT with a known payload (no real signature needed,
// jwt-decode only reads the base64url-encoded second segment)
// ---------------------------------------------------------------------------

function base64url(obj: unknown): string {
  const json = JSON.stringify(obj)
  // btoa operates on binary; encode to base64 then make it URL-safe
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

const VALID_PAYLOAD = {
  sub: '1234567890',
  email: 'alice@example.com',
  name: 'Alice Nguyen',
  picture: 'https://example.com/alice.jpg',
  iss: 'https://accounts.google.com',
  aud: 'test-client-id',
  iat: 1700000000,
  exp: 9999999999, // far future — won't expire in tests
}

// ---------------------------------------------------------------------------
// deriveUserKey
// ---------------------------------------------------------------------------

describe('deriveUserKey', () => {
  it('trả về chữ thường khi đầu vào đã là chữ thường', () => {
    expect(deriveUserKey('alice@example.com')).toBe('alice@example.com')
  })

  it('chuyển chữ hoa thành chữ thường', () => {
    expect(deriveUserKey('ALICE@EXAMPLE.COM')).toBe('alice@example.com')
  })

  it('chuyển chữ hoa lẫn lộn thành chữ thường', () => {
    expect(deriveUserKey('Alice@Example.Com')).toBe('alice@example.com')
  })

  it('cắt bỏ khoảng trắng đầu chuỗi', () => {
    expect(deriveUserKey('   alice@example.com')).toBe('alice@example.com')
  })

  it('cắt bỏ khoảng trắng cuối chuỗi', () => {
    expect(deriveUserKey('alice@example.com   ')).toBe('alice@example.com')
  })

  it('cắt bỏ khoảng trắng cả hai đầu', () => {
    expect(deriveUserKey('  alice@example.com  ')).toBe('alice@example.com')
  })

  it('kết hợp: trim + lowercase', () => {
    expect(deriveUserKey('  BOB@DOMAIN.ORG  ')).toBe('bob@domain.org')
  })

  it('chuỗi rỗng trả về chuỗi rỗng', () => {
    expect(deriveUserKey('')).toBe('')
  })

  it('chỉ toàn khoảng trắng trả về chuỗi rỗng', () => {
    expect(deriveUserKey('   ')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// decodeGoogleIdToken
// ---------------------------------------------------------------------------

describe('decodeGoogleIdToken', () => {
  it('giải mã token hợp lệ và trả về email, name, picture', () => {
    const token = makeFakeJwt(VALID_PAYLOAD)
    const result = decodeGoogleIdToken(token)
    expect(result).toEqual({
      email: 'alice@example.com',
      name: 'Alice Nguyen',
      picture: 'https://example.com/alice.jpg',
    })
  })

  it('chỉ trả về ba trường email, name, picture — không leak thêm trường khác', () => {
    const token = makeFakeJwt(VALID_PAYLOAD)
    const result = decodeGoogleIdToken(token)
    expect(Object.keys(result).sort()).toEqual(['email', 'name', 'picture'])
  })

  it('ném lỗi khi token không phải JWT (chuỗi tùy tiện)', () => {
    expect(() => decodeGoogleIdToken('not-a-jwt')).toThrow()
  })

  it('ném lỗi khi token có cấu trúc JWT nhưng thiếu trường email', () => {
    const { email: _e, ...noEmail } = VALID_PAYLOAD
    const token = makeFakeJwt(noEmail)
    expect(() => decodeGoogleIdToken(token)).toThrow(/missing required fields/i)
  })

  it('ném lỗi khi token thiếu trường name', () => {
    const { name: _n, ...noName } = VALID_PAYLOAD
    const token = makeFakeJwt(noName)
    expect(() => decodeGoogleIdToken(token)).toThrow(/missing required fields/i)
  })

  it('ném lỗi khi token thiếu trường picture', () => {
    const { picture: _p, ...noPicture } = VALID_PAYLOAD
    const token = makeFakeJwt(noPicture)
    expect(() => decodeGoogleIdToken(token)).toThrow(/missing required fields/i)
  })

  it('ném lỗi mô tả khi token bị cắt ngắn / malformed', () => {
    expect(() => decodeGoogleIdToken('aaa.bbb')).toThrow()
  })

  it('ném lỗi khi chuỗi rỗng', () => {
    expect(() => decodeGoogleIdToken('')).toThrow()
  })
})
