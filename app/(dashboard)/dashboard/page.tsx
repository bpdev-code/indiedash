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
  const allProjects = projects ?? []
  const totalMRR = liveProjects.reduce((s, p) => s + (p.mrr || 0), 0)
  const liveIds = liveProjects.map(p => p.id)

  let chartData: Record<string, string | number>[] = []
  const chartProjects = liveProjects.map(p => ({ id: p.id, name: p.name, color: p.color }))

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
    const sliced = sliceCount !== undefined ? sorted.slice(-sliceCount) : sorted
    chartData = sliced.map(([month, values]) => ({ month, ...values }))
  }

  return (
    <div className="w-full space-y-6">
      {/* MRR 合計 */}
      <div>
        <p className="text-xs tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>
          MONTHLY RECURRING REVENUE
        </p>
        <p className="text-4xl md:text-5xl font-bold" style={{ color: 'var(--accent)' }}>
          ¥{totalMRR.toLocaleString()}
        </p>
      </div>

      {/* デスクトップ: 2カラム / モバイル: 1カラム */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* 左: グラフ (3/5) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>MRR TREND</p>
              <PeriodSelector current={period} />
            </div>
            <MRRChart data={chartData} projects={chartProjects} />
          </div>

          {/* 全プロジェクト一覧（デスクトップ左下） */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>ALL PROJECTS</p>
              <Link href="/projects" className="text-xs" style={{ color: 'var(--accent)' }}>管理 →</Link>
            </div>
            <div className="space-y-1">
              {allProjects.map(p => (
                <div key={p.id} className="flex items-center gap-2 py-1.5 text-xs"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                  <span className="flex-1 truncate" style={{ color: p.status === 'archived' ? 'var(--text-dim)' : 'var(--text-muted)' }}>
                    {p.name}
                  </span>
                  <span style={{ color: STATUS_COLOR[p.status] }}>{STATUS_LABEL[p.status]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右: ライブプロジェクト (2/5) */}
        <div className="lg:col-span-2 space-y-4">
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
                まだなし —{' '}
                <Link href="/projects/new" style={{ color: 'var(--accent)' }}>追加する</Link>
              </p>
            ) : (
              <div className="space-y-2">
                {liveProjects.map(p => (
                  <Link key={p.id} href={`/projects/${p.id}/edit`}
                    className="flex items-center gap-3 p-3 rounded transition-colors hover:bg-[#111]"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    <span className="text-sm flex-1 truncate">{p.name}</span>
                    <span className="text-sm font-bold" style={{ color: p.color }}>
                      ¥{(p.mrr ?? 0).toLocaleString()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 合計プロジェクト数 */}
          <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'TOTAL', value: allProjects.length },
                { label: 'LIVE', value: liveProjects.length },
                { label: 'MRR', value: `¥${(totalMRR / 1000).toFixed(0)}k` },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{s.value}</p>
                  <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
