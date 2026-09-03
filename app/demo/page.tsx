import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DemoApp } from './demo-app'

export const metadata: Metadata = {
  title: 'サンプルダッシュボード',
  description: 'INDIEDASH のダッシュボードを、サインインなしで試せるサンプル。数字は自由に編集できます。',
  robots: { index: false, follow: true },
}

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; project?: string }>
}) {
  const { period = '6m', project = 'all' } = await searchParams

  return (
    <Suspense fallback={null}>
      <DemoApp period={period} project={project} />
    </Suspense>
  )
}
