import type { Metadata } from 'next'
import { DemoProjectsView } from './projects-view'

export const metadata: Metadata = {
  title: 'サンプル — プロジェクト',
  robots: { index: false, follow: true },
}

export default function DemoProjectsPage() {
  return <DemoProjectsView />
}
