import type { Metadata } from 'next'
import { NotesPage } from '@/components/NotesPage'

export const metadata: Metadata = {
  title: 'Ghi chú cá nhân — StudyFlow',
  description:
    'Quản lý ghi chú cá nhân với trình soạn thảo rich text, gắn tag theo môn học và tìm kiếm toàn văn offline.',
}

export default function NotesRoute() {
  return <NotesPage />
}
