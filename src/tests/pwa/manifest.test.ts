/**
 * Unit test — Giai đoạn 1: PWA Manifest Schema
 *
 * TDD: Viết test TRƯỚC. Sẽ FAIL cho đến khi `app/manifest.ts` được tạo
 * với đủ các trường bắt buộc theo chuẩn PWA Installability Criteria.
 *
 * Tham chiếu:
 * - https://web.dev/add-manifest/
 * - Chrome installability criteria
 */
import { describe, it, expect } from 'vitest'
import type { MetadataRoute } from 'next'

type Manifest = MetadataRoute.Manifest

async function loadManifest(): Promise<Manifest> {
  const mod = await import('@/app/manifest')
  // Next.js manifest route: default export là function trả về Manifest
  const exported = mod.default
  return typeof exported === 'function' ? exported() : (exported as Manifest)
}

describe('PWA Manifest Schema', () => {
  it('có trường name không rỗng', async () => {
    const manifest = await loadManifest()
    expect(manifest.name).toBeTruthy()
    expect(typeof manifest.name).toBe('string')
    expect((manifest.name as string).length).toBeGreaterThan(0)
  })

  it('có trường short_name không rỗng (≤ 12 ký tự để hiển thị đẹp)', async () => {
    const manifest = await loadManifest()
    expect(manifest.short_name).toBeTruthy()
    expect(typeof manifest.short_name).toBe('string')
    expect((manifest.short_name as string).length).toBeLessThanOrEqual(12)
  })

  it('có start_url là "/"', async () => {
    const manifest = await loadManifest()
    expect(manifest.start_url).toBe('/')
  })

  it('có display là "standalone" (bắt buộc để cài lên màn hình chính)', async () => {
    const manifest = await loadManifest()
    expect(manifest.display).toBe('standalone')
  })

  it('có theme_color hợp lệ (hex color)', async () => {
    const manifest = await loadManifest()
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('có background_color hợp lệ (hex color)', async () => {
    const manifest = await loadManifest()
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('có ít nhất 2 icons (192x192 và 512x512) — bắt buộc cho installability', async () => {
    const manifest = await loadManifest()
    expect(manifest.icons).toBeDefined()
    expect(Array.isArray(manifest.icons)).toBe(true)
    expect((manifest.icons as Manifest['icons'])!.length).toBeGreaterThanOrEqual(2)

    const icons = manifest.icons as NonNullable<Manifest['icons']>
    const sizes = icons.map((icon) => icon.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
  })

  it('tất cả icons có src, sizes và type hợp lệ', async () => {
    const manifest = await loadManifest()
    const icons = manifest.icons as NonNullable<Manifest['icons']>
    for (const icon of icons) {
      expect(icon.src).toBeTruthy()
      expect(icon.sizes).toBeTruthy()
      expect(icon.type).toMatch(/^image\//)
    }
  })

  it('có icon maskable (purpose: "maskable") cho Android adaptive icons', async () => {
    const manifest = await loadManifest()
    const icons = manifest.icons as NonNullable<Manifest['icons']>
    const maskableIcon = icons.find((icon) => String(icon.purpose ?? '').includes('maskable'))
    expect(maskableIcon).toBeDefined()
  })

  it('có description', async () => {
    const manifest = await loadManifest()
    expect(manifest.description).toBeTruthy()
  })

  it('có lang là "vi" (tiếng Việt)', async () => {
    const manifest = await loadManifest()
    expect(manifest.lang).toBe('vi')
  })
})
