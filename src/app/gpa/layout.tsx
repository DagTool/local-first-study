import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tiến trình Học tập — StudyFlow',
  description: 'Quản lý học kỳ, môn học, tính GPA hệ 4/10 và xem biểu đồ tín chỉ tích lũy.',
}

export default function GPALayout({ children }: { children: React.ReactNode }) {
  return children
}
