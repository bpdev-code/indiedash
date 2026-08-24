import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DeleteButton from './delete-button'

const STATUS_COLOR: Record<string, string> = {
  idea: '#555', dev: '#7C3AED', live: '#00E5FF', archived: '#333',
}
const STATUS_LABEL: Record<string, string> = {
  idea: 'IDEA', dev: 'DEV', live: 'LIVE', archived: 'ARCHIVED',
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: projects }, { data: profile }] = await Promise.all([
    supabase.from('projects').select('*').eq('user_id', user.id).order('status').order('created_at'),
    supabase.from('profiles').select('plan').eq('id', user.id).single(),
  ])

  const liveProjects = (projects ?? []).filter(p => p.status === 'live')
  const liveIds = liveProjects.map(p => p.id)
  const totalMRR = liveProjects.reduce((s, p) => s + (p.mrr || 0), 0)
  const totalCustomers = liveProjects.reduce((s, p) => s + (p.users_count || 0), 0)

  let growthRate: number | null = null
  let cumulativeMRR = 0

  if (liveIds.length > 0) {
    const { data: history } = await supabase
      .from('revenue_history')
      .select('month, mrr')
      .in('project_id', liveIds)
      .order('month')

    const monthTotals: Record<string, number> = {}
    for (const h of history ?? []) {
      monthTotals[h.month] = (monthTotals[h.month] ?? 0) + h.mrr
    }
    const sorted = Object.entries(monthTotals).sort(([a], [b]) => a.localeCompare(b))
    cumulativeMRR = sorted.reduce((s, [, v]) => s + v, 0)
    if (sorted.length >= 2) {
      const prev = sorted[sorted.length - 2][1]
      const curr = sorted[sorted.length - 1][1]
      if (prev > 0) growthRate = ((curr - prev) / prev) * 100
    }
  }

  const growthLabel = growthRate === null ? '—'
    : `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`
  const growthColor = growthRate === null ? 'var(--text-dim)'
    : growthRate >= 0 ? '#10B981' : '#EF4444'

  const activeCount = (projects ?? []).filter(p => p.status !== 'archived').length
  const limit = profile?.plan === 'pro' ? Infinity : 3

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>MRR</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>¥{totalMRR.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>前月比</p>
          <p className="text-2xl font-bold" style={{ color: growthColor }}>{growthLabel}</p>
        </div>
        <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>累計売上</p>
          <p className="text-2xl font-bold">¥{cumulativeMRR.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>顧客数</p>
          <p className="text-2xl font-bold">{totalCustomers.toLocaleString()}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>PROJECTS</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
            {activeCount}/{limit === Infinity ? '∞' : limit} 件
          </p>
        </div>
        <Link href="/projects/new" className="text-xs px-4 py-2 rounded font-bold"
          style={{ background: 'var(--accent)', color: '#000' }}>
          + NEW PROJECT
        </Link>
      </div>

      {/* Project List */}
      {(projects ?? []).length === 0 ? (
        <p className="text-xs py-16 text-center" style={{ color: 'var(--text-dim)' }}>
          プロジェクトなし —{' '}
          <Link href="/projects/new" style={{ color: 'var(--accent)' }}>最初のプロジェクトを追加</Link>
        </p>
      ) : (
        <div className="space-y-2">
          {(projects ?? []).map(p => (
            <div key={p.id} className="relative rounded"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: p.status === 'archived' ? 0.5 : 1 }}>
              <Link href={`/projects/${p.id}/edit`} className="block p-3 pr-16">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{p.name}</p>
                    {p.launch_month && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{p.launch_month}</p>
                    )}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded"
                    style={{ color: STATUS_COLOR[p.status], background: '#111' }}>
                    {STATUS_LABEL[p.status]}
                  </span>
                  <span className="text-sm font-bold" style={{ color: p.color }}>
                    ¥{(p.mrr ?? 0).toLocaleString()}
                  </span>
                </div>
                {p.users_count > 0 && (
                  <p className="text-xs mt-1 pl-5" style={{ color: 'var(--text-dim)' }}>
                    {p.users_count} 顧客
                  </p>
                )}
              </Link>
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <DeleteButton id={p.id} name={p.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
