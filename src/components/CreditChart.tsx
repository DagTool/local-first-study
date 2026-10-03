'use client'

/**
 * CreditChart — Biểu đồ tín chỉ tích lũy dùng Chart.js
 *
 * Hiển thị 2 đường:
 *   - Tổng TC đăng ký tích lũy (màu xám)
 *   - TC tích lũy (pass) (màu xanh)
 *
 * data-testid="credit-chart" + data-chart-type="line" để E2E assert DOM.
 */

import { useEffect, useRef } from 'react'
import type { CreditSummaryItem } from '@/lib/gpa/gpaCalculator'

interface CreditChartProps {
  data: CreditSummaryItem[]
  labels: string[] // tên học kỳ tương ứng
}

export function CreditChart({ data, labels }: CreditChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null)

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    // Dynamic import Chart.js để tránh SSR error
    const loadChart = async () => {
      const { Chart, registerables } = await import('chart.js')
      Chart.register(...registerables)

      // Destroy chart cũ nếu có
      if (chartRef.current) {
        chartRef.current.destroy()
      }

      const ctx = canvasRef.current
      if (!ctx) return

      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'TC đăng ký tích lũy',
              data: data.map((d) => d.cumulativeTotalCredits),
              borderColor: 'rgba(156, 163, 175, 0.8)',
              backgroundColor: 'rgba(156, 163, 175, 0.1)',
              borderDash: [5, 5],
              tension: 0.3,
              fill: false,
              pointRadius: 5,
            },
            {
              label: 'TC tích lũy (pass)',
              data: data.map((d) => d.cumulativeEarnedCredits),
              borderColor: 'rgba(99, 102, 241, 0.9)',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              tension: 0.3,
              fill: true,
              pointRadius: 5,
              pointBackgroundColor: 'rgba(99, 102, 241, 1)',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { color: 'rgba(156, 163, 175, 1)', font: { size: 12 } },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} tín chỉ`,
              },
            },
          },
          scales: {
            x: {
              ticks: { color: 'rgba(156, 163, 175, 0.9)' },
              grid: { color: 'rgba(255,255,255,0.05)' },
            },
            y: {
              ticks: { color: 'rgba(156, 163, 175, 0.9)' },
              grid: { color: 'rgba(255,255,255,0.05)' },
              beginAtZero: true,
            },
          },
        },
      })
    }

    void loadChart()

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [data, labels])

  if (data.length === 0) {
    return (
      <div
        data-testid="credit-chart"
        data-chart-type="line"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: '12px',
          color: 'rgba(156, 163, 175, 0.7)',
          fontSize: '14px',
        }}
      >
        Thêm học kỳ để xem biểu đồ tín chỉ
      </div>
    )
  }

  return (
    <div
      data-testid="credit-chart"
      data-chart-type="line"
      style={{ position: 'relative', height: '280px', width: '100%' }}
    >
      <canvas ref={canvasRef} />
    </div>
  )
}
