'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { version } from '@/package.json'
import { useDemoProjects } from './use-demo'

const DEMO_SLUG = 'sample'

const NAV = [
  { href: '/demo', label: 'DASHBOARD', match: (p: string) => p === '/demo' },
  { href: '/demo/projects', label: 'PROJECTS', match: (p: string) => p.startsWith('/demo/projects') },
  { href: '/signup?from=demo', label: 'SETTINGS', match: () => false },
  { href: '/signup?from=demo', label: 'FEEDBACK', match: () => false },
]

const BOTTOM_NAV = [
  { href: '/demo', label: 'HOME', icon: '⬡', match: (p: string) => p === '/demo' },
  { href: '/demo/projects', label: 'PROJECTS', icon: '◈', match: (p: string) => p.startsWith('/demo/projects') },
  { href: '/signup?from=demo', label: 'SETTINGS', icon: '◎', match: () => false },
  { href: '/signup?from=demo', label: 'FEEDBACK', icon: '✎', match: () => false },
]

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { projects } = useDemoProjects()
  const totalMRR = projects.filter(p => p.status === 'live').reduce((s, p) => s + p.mrr, 0)

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* 左サイドバー（デスクトップのみ） */}
      <aside className="hidden md:flex w-48 flex-col border-r py-6 px-4 flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <Link href="/demo" className="text-sm font-bold tracking-wider mb-8">
          INDIE<span style={{ color: 'var(--accent)' }}>DASH</span>
        </Link>

        <nav className="flex flex-col gap-1 flex-1 text-xs">
          {NAV.map(item => {
            const active = item.match(pathname)
            return (
              <Link key={item.label} href={item.href}
                className="px-3 py-2 rounded hover:bg-[#111] transition-colors"
                style={{ color: active ? 'var(--text)' : 'var(--text-muted)', background: active ? '#111' : undefined }}>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-3">
          <span className="text-xs px-2 py-0.5 rounded font-bold"
            style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
            SAMPLE
          </span>
          <Link href="/" className="block text-xs px-3 py-2 rounded hover:bg-[#111] transition-colors"
            style={{ color: 'var(--text-dim)' }}>
            終了
          </Link>
          <p className="text-[10px] px-3" style={{ color: 'var(--text-dim)' }}>v{version}</p>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* モバイルヘッダー */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}>
          <Link href="/demo" className="text-sm font-bold tracking-wider">
            INDIE<span style={{ color: 'var(--accent)' }}>DASH</span>
          </Link>
          <span className="text-xs px-2 py-0.5 rounded font-bold"
            style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
            SAMPLE
          </span>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* 右サイドバー（lg以上のみ） */}
      <aside className="hidden lg:flex w-64 flex-col border-l flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-col gap-7 py-6 px-5 h-full">
          <div>
            <div className="text-[9px] tracking-widest mb-3" style={{ color: 'var(--text-dim)' }}>PLAN</div>
            <div className="text-sm font-bold mb-3">SAMPLE</div>
            <div className="flex flex-col gap-2">
              <Link href="/signup?from=demo"
                className="block w-full text-center text-xs py-2 rounded font-bold"
                style={{ background: 'var(--accent)', color: '#000' }}>
                サインイン
              </Link>
              <Link href="/login"
                className="block w-full text-center text-xs py-2 rounded"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                ログイン
              </Link>
            </div>
          </div>

          <div>
            <div className="text-[9px] tracking-widest mb-3" style={{ color: 'var(--text-dim)' }}>PUBLIC URL</div>
            <div className="text-[11px] mb-3 break-all" style={{ color: 'var(--accent)' }}>/public/{DEMO_SLUG}</div>
            <div className="flex gap-2">
              <Link href="/signup?from=demo" className="flex-1 text-center text-[10px] py-1.5 rounded"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>COPY</Link>
              <Link href="/signup?from=demo" className="flex-1 text-center text-[10px] py-1.5 rounded"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>X シェア</Link>
            </div>
          </div>

          <div className="mt-auto">
            <div className="text-[9px] tracking-widest mb-3" style={{ color: 'var(--text-dim)' }}>ACCOUNT</div>
            <div className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>ゲスト（サンプル）</div>
            <div className="text-[11px] mb-4" style={{ color: 'var(--text-dim)' }}>MRR ¥{totalMRR.toLocaleString()}</div>
            <Link href="/" className="text-[10px]" style={{ color: 'var(--text-dim)' }}>終了</Link>
          </div>
        </div>
      </aside>

      {/* ボトムナビ（モバイルのみ） */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex border-t"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        {BOTTOM_NAV.map(item => {
          const active = item.match(pathname)
          return (
            <Link key={item.label} href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs transition-colors"
              style={{ color: active ? 'var(--accent)' : 'var(--text-dim)' }}>
              <span className="text-base">{item.icon}</span>
              <span style={{ fontSize: 9, letterSpacing: 1 }}>{item.label}</span>
            </Link>
          )
        })}
        <Link href="/" className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs"
          style={{ color: 'var(--text-dim)' }}>
          <span className="text-base">→</span>
          <span style={{ fontSize: 9, letterSpacing: 1 }}>終了</span>
        </Link>
      </nav>
    </div>
  )
}
