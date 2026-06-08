import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, slug')
    .eq('id', user!.id)
    .single()

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside className="w-48 flex flex-col border-r py-6 px-4" style={{ borderColor: 'var(--border)' }}>
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
        </nav>

        {/* Plan badge + logout */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded font-bold"
              style={{
                background: profile?.plan === 'pro' ? 'var(--accent)' : 'var(--border)',
                color: profile?.plan === 'pro' ? '#000' : 'var(--text-muted)',
              }}>
              {profile?.plan?.toUpperCase() ?? 'FREE'}
            </span>
          </div>
          <form action={signOut}>
            <button type="submit" className="text-xs w-full text-left px-3 py-2 rounded hover:bg-[#111] transition-colors"
              style={{ color: 'var(--text-dim)' }}>
              LOGOUT
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
