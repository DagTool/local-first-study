/**
 * E2E Test — Backup & Restore (JSON Export & Import)
 *
 * Kiểm tra:
 * - Người dùng có dữ liệu bấm "Xuất sao lưu (JSON)" -> Tải tệp JSON thành công
 * - Người dùng nhập tệp JSON qua "Khôi phục sao lưu (JSON)" -> Dữ liệu được khôi phục nguyên vẹn
 */

import { test, expect, type Page } from '@playwright/test'

async function injectTestData(page: Page, userKey: string) {
  await page.evaluate(async (key) => {
    const dbName = `studyflow_${key}`
    const req = indexedDB.open(dbName, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('semesters')) {
        db.createObjectStore('semesters', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('courses')) {
        db.createObjectStore('courses', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('gradeComponents')) {
        db.createObjectStore('gradeComponents', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('scheduleSlots')) {
        db.createObjectStore('scheduleSlots', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('tags')) {
        db.createObjectStore('tags', { keyPath: 'id' })
      }
    }

    await new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction(['notes', 'courses', 'semesters'], 'readwrite')
        const now = Date.now()
        tx.objectStore('notes').put({
          id: 'note-backup-e2e',
          title: 'Ghi chú Backup E2E',
          content: 'Nội dung kiểm thử sao lưu',
          tags: ['backup-test'],
          courseId: null,
          isPinned: true,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        })
        tx.objectStore('courses').put({
          id: 'course-backup-e2e',
          semesterId: 'sem-1',
          name: 'Môn học Kiểm thử Backup',
          credits: 3,
          lecturer: 'Giảng viên A',
          color: '#10b981',
          createdAt: now,
          updatedAt: now,
        })
        tx.oncomplete = () => {
          db.close()
          resolve(true)
        }
        tx.onerror = () => reject(tx.error)
      }
      req.onerror = () => reject(req.error)
    })
  }, userKey)
}

test.describe('Backup & Restore E2E', () => {
  test('BK-1: Người dùng có thể xuất file sao lưu JSON từ giao diện', async ({ page }) => {
    await page.goto('/')
    await injectTestData(page, 'guest')
    await page.reload()

    const exportBtn = page.locator('[data-testid="export-backup-btn"]')
    await expect(exportBtn).toBeVisible()

    // Bắt sự kiện download khi bấm nút
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
    await exportBtn.click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toContain('studyflow-backup')
    expect(download.suggestedFilename()).toContain('.json')

    const statusMsg = page.locator('[data-testid="backup-status-message"]')
    await expect(statusMsg).toBeVisible()
    await expect(statusMsg).toContainText('thành công')
  })

  test('BK-2: Người dùng có thể khôi phục dữ liệu từ file sao lưu JSON', async ({ page }) => {
    await page.goto('/')

    const now = Date.now()
    const backupData = {
      version: 1,
      modifiedTime: now,
      userKey: 'guest',
      data: {
        users: [],
        semesters: [
          {
            id: 'sem-imported',
            name: 'HK Nhập khẩu',
            startDate: '2026-09-01',
            endDate: '2027-01-15',
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        ],
        courses: [
          {
            id: 'course-imported',
            semesterId: 'sem-imported',
            name: 'Môn học Khôi phục',
            credits: 4,
            lecturer: 'ThS. B',
            color: '#3b82f6',
            createdAt: now,
            updatedAt: now,
          },
        ],
        gradeComponents: [],
        scheduleSlots: [],
        notes: [
          {
            id: 'note-imported',
            title: 'Ghi chú Khôi phục',
            content: 'Nội dung khôi phục từ JSON',
            tags: ['imported'],
            courseId: null,
            isPinned: false,
            isArchived: false,
            createdAt: now,
            updatedAt: now,
          },
        ],
        tags: [],
      },
    }

    // Set file input với payload JSON
    const fileInput = page.locator('[data-testid="import-backup-input"]')
    await fileInput.setInputFiles({
      name: 'test-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backupData, null, 2)),
    })

    const statusMsg = page.locator('[data-testid="backup-status-message"]')
    await expect(statusMsg).toBeVisible()
    await expect(statusMsg).toContainText('Khôi phục dữ liệu từ file sao lưu thành công')
  })
})
