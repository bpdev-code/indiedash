import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MRRChart from './mrr-chart'
import PeriodSelector from './period-selector'
import ProjectSelector from './project-selector'

const STATUS_COLOR: Record<string, string> = {
  idea: '#444', dev: '#7C3AED', live: '#00E5FF', archived: '#333',
}
const STATUS_LABEL: Record<string, string> = {
  idea: 'IDEA', dev: 'DEV', live: 'LIVE', archived: 'ARCHIVED',
}

const PERIOD_MONTHS: Record<string, number> = {
  '3m': 3, '6m': 6, '12m': 12,
}

function offsetMonth(base: string, offset: number): string {
  const [y, m] = base.split('-').map(Number)
  const d = new Date(y, m - 1 + offset, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthsDiff(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

// CMGR (Compound Monthly Growth Rate) — 直近の実績ウィンドウの始点・終点から
// 複利ベースの月次成長率を算出する。単純な月次成長率の算術平均は、MRRのような
// 複利で積み上がる値の予測には数学的に整合しないため使わない。
// 参考: CMGR = (終値 / 始値)^(1 / 経過月数) − 1
//
// CMGRは始点・終点の2つの値だけで決まる（途中の月は打ち消し合って結果に影響しない）ため、
// ウィンドウが短いと直近1回の変動（顧客数が少ないと1人の解約でも%が大きく振れる）だけで
// 将来予測全体が引っ張られてしまう。直近6ヶ月分に広げてその影響を薄め、変化点が
// 2回未満（＝ノイズが支配的）の場合は横ばい（0%）にフォールバックする。
function trailingGrowthRate(series: Record<string, number>): number {
  const months = Object.keys(series).sort()
  const window = months.slice(-7) // 直近最大7データ点（=6ヶ月分の成長）
  const periods = window.length - 1
  if (periods < 2) return 0

  const start = series[window[0]]
  const end = series[window[window.length - 1]]
  if (start <= 0) return 0

  const cmgr = Math.pow(end / start, 1 / periods) - 1
  return Math.max(-0.15, Math.min(0.15, cmgr))
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

  const liveProjects = (projects ?? []).filter(p => p.status === 'live')
  const totalMRR = liveProjects.reduce((s, p) => s + (p.mrr || 0), 0)
  const totalCustomers = liveProjects.reduce((s, p) => s + (p.users_count || 0), 0)
  const liveIds = liveProjects.map(p => p.id)

  const currentMonth = new Date().toISOString().slice(0, 7)
  let growthRate: number | null = null
  let cumulativeMRR = 0

  // Filter to selected project
  const selectedProject = project !== 'all'
    ? liveProjects.find(p => p.id === project) ?? null
    : null
  const chartProjects = selectedProject
    ? [{ id: selectedProject.id, name: selectedProject.name, color: selectedProject.color, launchMonth: selectedProject.launch_month }]
    : liveProjects.map(p => ({ id: p.id, name: p.name, color: p.color, launchMonth: p.launch_month }))
  const chartIds = chartProjects.map(p => p.id)

  let chartData: Record<string, string | number | null>[] = []

  if (chartIds.length > 0) {
    const { data: allHistory } = await supabase
      .from('revenue_history')
      .select('month, mrr, project_id')
      .in('project_id', liveIds) // always fetch all for KPI calculation
      .order('month')

    // Build month→project→mrr map (for all live projects, for KPI)
    const fullMap: Record<string, Record<string, number>> = {}
    for (const h of allHistory ?? []) {
      if (!fullMap[h.month]) fullMap[h.month] = {}
      const p = liveProjects.find(lp => lp.id === h.project_id)
      if (p) fullMap[h.month][p.name] = h.mrr
    }

    const allSorted = Object.entries(fullMap).sort(([a], [b]) => a.localeCompare(b))
    cumulativeMRR = allSorted.reduce((s, [, vals]) =>
      s + Object.values(vals).reduce((a, b) => a + b, 0), 0)

    if (allSorted.length >= 2) {
      const prev = Object.values(allSorted[allSorted.length - 2][1]).reduce((a, b) => a + b, 0)
      const curr = Object.values(allSorted[allSorted.length - 1][1]).reduce((a, b) => a + b, 0)
      if (prev > 0) growthRate = ((curr - prev) / prev) * 100
    }

    // Build chart-specific map (filtered to selected project(s))
    const chartMap: Record<string, Record<string, number>> = {}
    for (const h of allHistory ?? []) {
      if (!chartIds.includes(h.project_id)) continue
      if (!chartMap[h.month]) chartMap[h.month] = {}
      const p = chartProjects.find(cp => cp.id === h.project_id)
      if (p) chartMap[h.month][p.name] = h.mrr
    }

    // Current MRR per project — 当月の実績が無ければプロジェクトの現在のMRRにフォールバック
    // （Stripe未同期などで revenue_history に当月分がまだ無いケース）
    const currentMrrByProject: Record<string, number> = {}
    const growthRateByProject: Record<string, number> = {}
    for (const p of chartProjects) {
      const project = liveProjects.find(lp => lp.id === p.id)
      currentMrrByProject[p.name] = chartMap[currentMonth]?.[p.name] ?? project?.mrr ?? 0

      const actualSeries: Record<string, number> = {}
      for (const [month, vals] of Object.entries(chartMap)) {
        if (month <= currentMonth && vals[p.name] != null) actualSeries[month] = vals[p.name]
      }
      growthRateByProject[p.name] = trailingGrowthRate(actualSeries)
    }

    // Build month list: centered on current month (or all history if period=all)
    let months: string[]
    if (period === 'all') {
      const histMonths = Object.keys(chartMap).sort()
      if (!histMonths.includes(currentMonth)) histMonths.push(currentMonth)
      months = histMonths
    } else {
      const n = PERIOD_MONTHS[period] ?? 6
      const pastCount = Math.floor(n / 2)
      months = Array.from({ length: n }, (_, i) => offsetMonth(currentMonth, i - pastCount))
    }

    chartData = months.map(month => {
      const isFuture = month > currentMonth
      const entry: Record<string, string | number | null> = { month }
      for (const p of chartProjects) {
        const actualMrr = chartMap[month]?.[p.name] ?? null
        if (!isFuture) {
          entry[p.name] = actualMrr
          // 当月の点は実績とダミーで同値（点線を実績ラインへ視覚的に繋げるためだけの点）。
          // ツールチップ側で当月の「予測」表示は別途抑制する（mrr-chart.tsx参照）。
          entry[`${p.name}_proj`] = month === currentMonth
            ? (actualMrr ?? currentMrrByProject[p.name])
            : null
        } else {
          entry[p.name] = null
          const base = currentMrrByProject[p.name]
          const monthsAhead = monthsDiff(currentMonth, month)
          const rate = growthRateByProject[p.name] ?? 0
          entry[`${p.name}_proj`] = base != null
            ? Math.max(0, Math.round(base * Math.pow(1 + rate, monthsAhead)))
            : null
        }
      }
      return entry
    })
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
