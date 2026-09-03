import type { Metadata } from 'next'
import { DemoNewProjectView } from './new-view'

export const metadata: Metadata = {
  title: 'サンプル — 新規プロジェクト',
  robots: { index: false, follow: true },
}

export default function DemoNewProjectPage() {
  return <DemoNewProjectView />
}
