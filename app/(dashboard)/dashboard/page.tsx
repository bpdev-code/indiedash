import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MRRChart from './mrr-chart'
import PeriodSelector from './period-selector'
import ProjectSelector from './project-selector'
import { DemoImportBanner } from '../_components/demo-import-banner'
import { buildDashboardView, type RevenueRow } from '@/lib/dashboard-data'

const STATUS_COLOR: Record<string, string> = {
  idea: '#444', dev: '#7C3AED', live: '#00E5FF', archived: '#333',
}
const STATUS_LABEL: Record<string, string> = {
  idea: 'IDEA', dev: 'DEV', live: 'LIVE', archived: 'ARCHIVED',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; project?: string }>
}) {
  const { period = '6m', project = 'all' } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at')

  const liveIds = (projects ?? []).filter(p => p.status === 'live').map(p => p.id)
  let history: RevenueRow[] = []
  if (liveIds.length > 0) {
    const { data: allHistory } = await supabase
      .from('revenue_history')
      .select('month, mrr, project_id')
      .in('project_id', liveIds)
      .order('month')
    history = allHistory ?? []
  }

  const view = buildDashboardView(projects ?? [], history, { period, project })
  const { liveProjects, chartProjects, chartData, currentMonth } = view

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6 md:space-y-8">
      <DemoImportBanner />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>MRR</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>¥{view.totalMRR.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>前月比</p>
          <p className="text-2xl font-bold" style={{ color: view.growthColor }}>{view.growthLabel}</p>
        </div>
        <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>累計売上</p>
          <p className="text-2xl font-bold">¥{view.cumulativeMRR.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>顧客数</p>
          <p className="text-2xl font-bold">{view.totalCustomers.toLocaleString()}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <ProjectSelector projects={liveProjects.map(p => ({ id: p.id, name: p.name, color: p.color }))} current={project} />
          <div className="flex items-center gap-2">
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>MRR TREND</p>
            <PeriodSelector current={period} />
          </div>
        </div>
        <MRRChart data={chartData} projects={chartProjects} currentMonth={currentMonth} />
      </div>

      {/* Live Projects */}
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
