import type { Metadata } from 'next'
import { DemoEditProjectView } from './edit-view'

export const metadata: Metadata = {
  title: 'サンプル — プロジェクト編集',
  robots: { index: false, follow: true },
}

export default async function DemoEditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <DemoEditProjectView id={id} />
}
