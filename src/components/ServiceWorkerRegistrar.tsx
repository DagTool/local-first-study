'use client'

import { useEffect } from 'react'

/**
 * ServiceWorkerRegistrar
 * Client component đăng ký Service Worker sau khi app mount.
 * Chỉ hoạt động trong production (SW bị disable trong dev bởi Serwist config).
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })

        // Kiểm tra update khi có phiên bản mới
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Có version mới — có thể notify user ở đây
                console.info('[SW] New version available. Refresh to update.')
              }
            })
          }
        })
      } catch (error) {
        console.error('[SW] Registration failed:', error)
      }
    }

    // Đăng ký sau khi window load để không block LCP
    if (document.readyState === 'complete') {
      registerSW()
    } else {
      window.addEventListener('load', registerSW)
      return () => window.removeEventListener('load', registerSW)
    }
  }, [])

  // Component này không render UI
  return null
}
