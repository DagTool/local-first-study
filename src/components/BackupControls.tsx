/**
 * BackupControls — UI Component cho tính năng Sao lưu & Khôi phục (Backup/Restore)
 *
 * Cho phép người dùng:
 * 1. Xuất (Export) toàn bộ dữ liệu người dùng ra file JSON để lưu trữ cục bộ.
 * 2. Nhập (Import) file JSON để khôi phục toàn bộ dữ liệu vào tài khoản.
 *
 * Tuân thủ WCAG 2.1 AA: Có đầy đủ aria-label, tương phản cao, điều hướng bàn phím.
 */

'use client'

import React, { useState, useRef } from 'react'
import { useAuthStore } from '@/lib/auth/authStore'
import { getNamespacedDB } from '@/lib/db/namespaceDB'
import { exportBackup, importBackup } from '@/lib/sync/backup'

export function BackupControls() {
  const { state } = useAuthStore()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState<boolean>(true)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const userKey = state.userKey || 'guest'

  const handleExport = async () => {
    try {
      setIsProcessing(true)
      setStatusMessage(null)
      const db = getNamespacedDB(userKey)
      const jsonString = await exportBackup(db, userKey)

      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `studyflow-backup-${userKey.replace(/[^a-zA-Z0-9]/g, '_')}-${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setIsSuccess(true)
      setStatusMessage('Xuất file sao lưu JSON thành công!')
    } catch (err) {
      setIsSuccess(false)
      setStatusMessage(`Lỗi xuất sao lưu: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsProcessing(true)
      setStatusMessage(null)
      const text = await file.text()
      const db = getNamespacedDB(userKey)
      const result = await importBackup(db, text)

      if (result.success) {
        setIsSuccess(true)
        setStatusMessage(
          'Khôi phục dữ liệu từ file sao lưu thành công! Hãy tải lại hoặc xem các trang dữ liệu.',
        )
      } else {
        setIsSuccess(false)
        setStatusMessage(result.message)
      }
    } catch (err) {
      setIsSuccess(false)
      setStatusMessage(`Lỗi đọc file: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div
      data-testid="backup-controls-section"
      style={{
        marginTop: '2rem',
        padding: '1.25rem',
        borderRadius: '8px',
        border: '1px solid #374151',
        backgroundColor: '#1f2937',
        color: '#f9fafb',
      }}
    >
      <h2
        style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem', color: '#f3f4f6' }}
      >
        💾 Sao lưu &amp; Khôi phục Dữ liệu Cục bộ
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: '1rem' }}>
        Xuất toàn bộ ghi chú, học kỳ, môn học và điểm số ra tệp JSON hoặc khôi phục từ tệp có sẵn.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          data-testid="export-backup-btn"
          aria-label="Xuất toàn bộ dữ liệu ra tệp JSON sao lưu"
          onClick={handleExport}
          disabled={isProcessing}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1d4ed8',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            opacity: isProcessing ? 0.7 : 1,
          }}
        >
          {isProcessing ? 'Đang xử lý...' : '📥 Xuất sao lưu (JSON)'}
        </button>

        <input
          ref={fileInputRef}
          data-testid="import-backup-input"
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="backup-file-picker"
        />

        <button
          data-testid="import-backup-btn"
          aria-label="Chọn tệp JSON để khôi phục dữ liệu"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          style={{
            padding: '8px 16px',
            backgroundColor: '#047857',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            opacity: isProcessing ? 0.7 : 1,
          }}
        >
          {isProcessing ? 'Đang xử lý...' : '📤 Khôi phục sao lưu (JSON)'}
        </button>
      </div>

      {statusMessage && (
        <div
          data-testid="backup-status-message"
          role="status"
          aria-live="polite"
          style={{
            marginTop: '0.75rem',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.875rem',
            backgroundColor: isSuccess ? '#064e3b' : '#7f1d1d',
            color: isSuccess ? '#a7f3d0' : '#fecaca',
            border: `1px solid ${isSuccess ? '#059669' : '#dc2626'}`,
          }}
        >
          {statusMessage}
        </div>
      )}
    </div>
  )
}
