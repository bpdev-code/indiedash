import Link from 'next/link'
import type { Metadata } from 'next'
import { DemoDashboard } from './demo-dashboard'

export const metadata: Metadata = {
  title: 'サンプルダッシュボード',
  description: 'INDIEDASH の公開ダッシュボードを、サインインなしで試せるサンプル。数字は自由に編集できます。',
  robots: { index: false, follow: true },
}

export default function DemoPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* サンプル告知バー */}
      <div className="px-6 py-2.5 text-center text-xs"
        style={{ background: '#0a1a1c', borderBottom: '1px solid var(--accent)', color: 'var(--accent)' }}>
        サインイン不要のサンプルです。数字を自分のプロダクトに置き換えて試せます。
      </div>

      <header className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: 'var(--border)' }}>
        <Link href="/" className="text-sm font-bold tracking-wider">
          INDIE<span style={{ color: 'var(--accent)' }}>DASH</span>
        </Link>
        <Link href="/signup?from=demo" className="text-xs px-3 py-1.5 rounded font-bold"
          style={{ background: 'var(--accent)', color: '#000' }}>
          無料で始める
        </Link>
      </header>

      <main className="flex-1 px-6 py-12 max-w-2xl mx-auto w-full">
        <DemoDashboard />
      </main>
    </div>
  )
}
