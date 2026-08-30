import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  const { data: feedback } = await supabase
    .from('feedback')
    .select('id, message, created_at, profiles(email)')
    .order('created_at', { ascending: false })

  // page_viewsはservice roleのみ読み書き可能（RLSでanon/authenticatedを遮断しているため）
  const admin = createAdminClient()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ count: totalViews }, { count: todayViews }, { count: weekViews }, { count: monthViews }] = await Promise.all([
    admin.from('page_views').select('id', { count: 'exact', head: true }),
    admin.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    admin.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    admin.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-xs tracking-widest mb-3" style={{ color: 'var(--text-dim)' }}>
          ADMIN — SITE VISITS
        </h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>今日</p>
            <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{(todayViews ?? 0).toLocaleString()}</p>
          </div>
          <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>過去7日</p>
            <p className="text-xl font-bold">{(weekViews ?? 0).toLocaleString()}</p>
          </div>
          <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>過去30日</p>
            <p className="text-xl font-bold">{(monthViews ?? 0).toLocaleString()}</p>
          </div>
          <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>累計</p>
            <p className="text-xl font-bold">{(totalViews ?? 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <h1 className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>
        ADMIN — FEEDBACK ({feedback?.length ?? 0})
      </h1>

      {!feedback || feedback.length === 0 ? (
        <p className="text-xs py-8 text-center" style={{ color: 'var(--text-dim)' }}>
          まだフィードバックはありません
        </p>
      ) : (
        <div className="space-y-2">
          {feedback.map(f => (
            <div key={f.id} className="p-3 rounded text-xs space-y-1"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--accent)' }}>
                  {(f.profiles as unknown as { email: string } | null)?.email ?? '不明'}
                </span>
                <span style={{ color: 'var(--text-dim)' }}>
                  {new Date(f.created_at).toLocaleString('ja-JP')}
                </span>
              </div>
              <p style={{ color: 'var(--text)' }}>{f.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
