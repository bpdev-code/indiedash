import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MRRChart from './mrr-chart'
import PeriodSelector from './period-selector'

const STATUS_COLOR: Record<string, string> = {
  idea: '#444', dev: '#7C3AED', live: '#00E5FF', archived: '#333',
}
const STATUS_LABEL: Record<string, string> = {
  idea: 'IDEA', dev: 'DEV', live: 'LIVE', archived: 'ARCHIVED',
}

const PERIOD_SLICE: Record<string, number> = {
  '3m': 3, '6m': 6, '12m': 12,
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period = '6m' } = await searchParams
  const sliceCount = period === 'all' ? undefined : (PERIOD_SLICE[period] ?? 6)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at')

  const liveProjects = (projects ?? []).filter(p => p.status === 'live')
  const totalMRR = liveProjects.reduce((s, p) => s + (p.mrr || 0), 0)
  const totalCustomers = liveProjects.reduce((s, p) => s + (p.users_count || 0), 0)
  const liveIds = liveProjects.map(p => p.id)

  let chartData: Record<string, string | number>[] = []
  const chartProjects = liveProjects.map(p => ({ id: p.id, name: p.name, color: p.color }))
  let growthRate: number | null = null
  let cumulativeMRR = 0

  if (liveIds.length > 0) {
    const { data: allHistory } = await supabase
      .from('revenue_history')
      .select('month, mrr, project_id')
      .in('project_id', liveIds)
      .order('month')

    const monthMap: Record<string, Record<string, number>> = {}
    for (const h of allHistory ?? []) {
      if (!monthMap[h.month]) monthMap[h.month] = {}
      const project = liveProjects.find(p => p.id === h.project_id)
      if (project) monthMap[h.month][project.name] = h.mrr
    }

    const sorted = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b))

    // 累計売上: 全月の合計
    cumulativeMRR = sorted.reduce((s, [, values]) =>
      s + Object.values(values).reduce((a, b) => a + b, 0), 0)

    // MRR成長率: 直近2ヶ月比較
    if (sorted.length >= 2) {
      const prevTotal = Object.values(sorted[sorted.length - 2][1]).reduce((a, b) => a + b, 0)
      const currTotal = Object.values(sorted[sorted.length - 1][1]).reduce((a, b) => a + b, 0)
      if (prevTotal > 0) growthRate = ((currTotal - prevTotal) / prevTotal) * 100
    }

    const sliced = sliceCount !== undefined ? sorted.slice(-sliceCount) : sorted
    chartData = sliced.map(([month, values]) => ({ month, ...values }))
  }

  const growthLabel = growthRate === null ? '—'
    : `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`
  const growthColor = growthRate === null ? 'var(--text-dim)'
    : growthRate >= 0 ? '#10B981' : '#EF4444'

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6 md:space-y-8">
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

      <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>MRR TREND</p>
          <PeriodSelector current={period} />
        </div>
        <MRRChart data={chartData} projects={chartProjects} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>LIVE PROJECTS</p>
          <Link href="/projects/new" className="text-xs px-3 py-1 rounded"
            style={{ background: 'var(--accent)', color: '#000' }}>
            + ADD
          </Link>
        </div>

        {liveProjects.length === 0 ? (
          <p className="text-xs py-8 text-center" style={{ color: 'var(--text-dim)' }}>
            まだライブのプロジェクトなし —{' '}
            <Link href="/projects/new" style={{ color: 'var(--accent)' }}>追加する</Link>
          </p>
        ) : (
          <div className="space-y-2">
            {liveProjects.map(p => (
              <Link key={p.id} href={`/projects/${p.id}/edit`}
                className="flex items-center gap-3 p-3 rounded transition-colors hover:bg-[#111]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                <span className="text-sm flex-1">{p.name}</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ color: STATUS_COLOR[p.status], background: '#111' }}>
                  {STATUS_LABEL[p.status]}
                </span>
                <span className="text-sm font-bold" style={{ color: p.color }}>
                  ¥{(p.mrr ?? 0).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
