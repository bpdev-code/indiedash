import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import { AccountPanel } from './_components/account-panel'
import { version } from '@/package.json'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from('profiles').select('plan, slug, email, is_admin').eq('id', user!.id).single(),
    supabase.from('public_settings').select('is_public').eq('user_id', user!.id).maybeSingle(),
  ])

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* 左サイドバー（デスクトップのみ） */}
      <aside className="hidden md:flex w-48 flex-col border-r py-6 px-4 flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <Link href="/dashboard" className="text-sm font-bold tracking-wider mb-8">
          INDIE<span style={{ color: 'var(--accent)' }}>DASH</span>
        </Link>

        <nav className="flex flex-col gap-1 flex-1 text-xs">
          <Link href="/dashboard" className="px-3 py-2 rounded hover:bg-[#111] transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            DASHBOARD
          </Link>
          <Link href="/projects" className="px-3 py-2 rounded hover:bg-[#111] transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            PROJECTS
          </Link>
          <Link href="/settings" className="px-3 py-2 rounded hover:bg-[#111] transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            SETTINGS
          </Link>
          <Link href="/feedback" className="px-3 py-2 rounded hover:bg-[#111] transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            FEEDBACK
          </Link>
          {profile?.is_admin && (
            <Link href="/admin" className="px-3 py-2 rounded hover:bg-[#111] transition-colors"
              style={{ color: 'var(--accent)' }}>
              ADMIN
            </Link>
          )}
        </nav>

        <div className="space-y-3">
          <span className="text-xs px-2 py-0.5 rounded font-bold"
            style={{
              background: profile?.plan === 'pro' ? 'var(--accent)' : 'var(--border)',
              color: profile?.plan === 'pro' ? '#000' : 'var(--text-muted)',
            }}>
            {profile?.plan?.toUpperCase() ?? 'FREE'}
          </span>
          <form action={signOut}>
            <button type="submit" className="text-xs w-full text-left px-3 py-2 rounded hover:bg-[#111] transition-colors"
              style={{ color: 'var(--text-dim)' }}>
              LOGOUT
            </button>
          </form>
          <p className="text-[10px] px-3" style={{ color: 'var(--text-dim)' }}>v{version}</p>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* モバイルヘッダー */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}>
          <Link href="/dashboard" className="text-sm font-bold tracking-wider">
            INDIE<span style={{ color: 'var(--accent)' }}>DASH</span>
          </Link>
          <span className="text-xs px-2 py-0.5 rounded font-bold"
            style={{
              background: profile?.plan === 'pro' ? 'var(--accent)' : 'var(--border)',
              color: profile?.plan === 'pro' ? '#000' : 'var(--text-muted)',
            }}>
            {profile?.plan?.toUpperCase() ?? 'FREE'}
          </span>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* 右サイドバー（lg以上のみ） */}
      <aside className="hidden lg:flex w-64 flex-col border-l flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <AccountPanel profile={profile} settings={settings} />
      </aside>

      {/* ボトムナビ（モバイルのみ） */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex border-t"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        {[
          { href: '/dashboard', label: 'HOME', icon: '⬡' },
          { href: '/projects', label: 'PROJECTS', icon: '◈' },
          { href: '/settings', label: 'SETTINGS', icon: '◎' },
          { href: '/feedback', label: 'FEEDBACK', icon: '✎' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs transition-colors"
            style={{ color: 'var(--text-dim)' }}>
            <span className="text-base">{item.icon}</span>
            <span style={{ fontSize: 9, letterSpacing: 1 }}>{item.label}</span>
          </Link>
        ))}
        <form action={signOut} className="flex-1">
          <button type="submit" className="w-full flex flex-col items-center justify-center py-3 gap-1 text-xs"
            style={{ color: 'var(--text-dim)' }}>
            <span className="text-base">→</span>
            <span style={{ fontSize: 9, letterSpacing: 1 }}>LOGOUT</span>
          </button>
        </form>
      </nav>
    </div>
  )
}
