/**
 * SyncStatus — UI component hiển thị trạng thái đồng bộ
 *
 * Hiển thị:
 * - Nút "Sync" để trigger manual sync
 * - Badge trạng thái: idle / syncing / synced / error
 * - Thời gian sync cuối cùng
 *
 * Dùng data-testid để Playwright E2E test có thể select.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/auth/authStore'
import { getNamespacedDB } from '@/lib/db/namespaceDB'
import { SyncEngine } from '@/lib/sync/syncEngine'
import type { SyncResult } from '@/lib/sync/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

// ─── Component ────────────────────────────────────────────────────────────────

export function SyncStatus() {
  const { state } = useAuthStore()
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  const handleSync = useCallback(async () => {
    if (!state.userKey || !state.accessToken) return
    if (status === 'syncing') return

    setStatus('syncing')

    try {
      const db = getNamespacedDB(state.userKey)
      const engine = new SyncEngine(db, state.userKey, () => state.accessToken)
      const result = await engine.syncWithRetry(3)

      setLastResult(result)
      setStatus(result.success ? 'synced' : 'error')
      if (result.success) setLastSyncedAt(new Date())
    } catch {
      setStatus('error')
    }
  }, [state.userKey, state.accessToken, status])

  // Auto-trigger sync khi có mạng lại
  useEffect(() => {
    const onOnline = () => {
      if (state.userKey && state.accessToken) {
        void handleSync()
      }
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('app-online', onOnline) // Testing seam cho Playwright E2E
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('app-online', onOnline)
    }
  }, [handleSync, state.userKey, state.accessToken])

  // Không render nếu chưa đăng nhập hoặc không có access token
  if (!state.userKey || !state.accessToken) {
    return null
  }

  return (
    <div
      data-testid="sync-status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.1)',
        fontSize: '14px',
      }}
    >
      {/* Status Badge */}
      <span
        data-testid="sync-badge"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          color: statusColor(status),
        }}
      >
        {statusIcon(status)}
        {statusLabel(status)}
      </span>

      {/* Last synced time */}
      {lastSyncedAt && status !== 'syncing' && (
        <span data-testid="sync-last-time" style={{ opacity: 0.7, fontSize: '12px' }}>
          {formatTime(lastSyncedAt)}
        </span>
      )}

      {/* Error message */}
      {status === 'error' && lastResult?.error && (
        <span data-testid="sync-error" style={{ color: '#ef4444', fontSize: '12px' }}>
          {lastResult.error.slice(0, 40)}
        </span>
      )}

      {/* Manual sync button */}
      <button
        data-testid="sync-button"
        onClick={() => void handleSync()}
        disabled={status === 'syncing'}
        style={{
          padding: '4px 10px',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.3)',
          background: 'transparent',
          color: 'inherit',
          cursor: status === 'syncing' ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          opacity: status === 'syncing' ? 0.5 : 1,
        }}
      >
        {status === 'syncing' ? 'Đang sync...' : 'Sync ngay'}
      </button>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(s: SyncStatus): string {
  switch (s) {
    case 'syncing':
      return '#f59e0b'
    case 'synced':
      return '#10b981'
    case 'error':
      return '#ef4444'
    default:
      return '#9ca3af'
  }
}

function statusIcon(s: SyncStatus): string {
  switch (s) {
    case 'syncing':
      return '↻'
    case 'synced':
      return '✓'
    case 'error':
      return '✗'
    default:
      return '○'
  }
}

function statusLabel(s: SyncStatus): string {
  switch (s) {
    case 'syncing':
      return 'Đang sync'
    case 'synced':
      return 'Đã sync'
    case 'error':
      return 'Lỗi sync'
    default:
      return 'Chưa sync'
  }
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}
