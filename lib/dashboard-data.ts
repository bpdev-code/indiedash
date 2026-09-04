// ダッシュボードのチャート/KPI 算出ロジック。
// 本番ダッシュボード（app/(dashboard)/dashboard/page.tsx）と、サインイン不要のサンプル
// （app/demo）の両方から呼ばれる。DB には依存せず、projects と revenue_history 相当の
// 配列を受け取って表示用データを返す。

export interface DashProject {
  id: string
  name: string
  color: string
  status: string
  mrr: number | null
  users_count: number | null
  launch_month: string | null
}

export interface RevenueRow {
  month: string
  mrr: number
  project_id: string
}

export interface DashChartProject {
  id: string
  name: string
  color: string
  launchMonth: string | null
  launchMrr: number | null
}

export const PERIOD_MONTHS: Record<string, number> = {
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

// revenue_historyに記録が無い月でも、ローンチ月〜当月の範囲内なら0円として扱う
// （Stripe連携で「サブスクがまだ無かった月」はそもそもレコードが作られないため、
// 実績ラインに穴が空いてしまうのを防ぐ）
function actualOrZero(
  chartMap: Record<string, Record<string, number>>,
  month: string,
  name: string,
  launchMonth: string | null,
  currentMonth: string
): number | null {
  const recorded = chartMap[month]?.[name]
  if (recorded != null) return recorded
  if (launchMonth && month >= launchMonth && month <= currentMonth) return 0
  return null
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

export interface DashboardView {
  currentMonth: string
  totalMRR: number
  totalCustomers: number
  cumulativeMRR: number
  growthLabel: string
  growthColor: string
  // 各行に per-project MRR / _proj に加えて、右軸用の __cum（実績累計）と
  // __cumProj（予測累計）を持つ
  chartData: Record<string, string | number | null>[]
  chartProjects: DashChartProject[]
  liveProjects: DashProject[]
  // MRRグラフの縦軸を「現在値がほぼ中央」に来るようにするための基準値
  yCenterValue: number
}

export function buildDashboardView(
  projects: DashProject[],
  history: RevenueRow[],
  opts: { period?: string; project?: string } = {}
): DashboardView {
  const period = opts.period ?? '6m'
  const project = opts.project ?? 'all'

  const liveProjects = projects.filter(p => p.status === 'live')
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
  const chartProjects: DashChartProject[] = selectedProject
    ? [{ id: selectedProject.id, name: selectedProject.name, color: selectedProject.color, launchMonth: selectedProject.launch_month, launchMrr: null }]
    : liveProjects.map(p => ({ id: p.id, name: p.name, color: p.color, launchMonth: p.launch_month, launchMrr: null }))
  const chartIds = chartProjects.map(p => p.id)

  let chartData: Record<string, string | number | null>[] = []
  let yCenterValue = 0

  if (chartIds.length > 0) {
    const allHistory = history.filter(h => liveIds.includes(h.project_id))

    // Build month→project→mrr map (for all live projects, for KPI)
    const fullMap: Record<string, Record<string, number>> = {}
    for (const h of allHistory) {
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
    for (const h of allHistory) {
      if (!chartIds.includes(h.project_id)) continue
      if (!chartMap[h.month]) chartMap[h.month] = {}
      const p = chartProjects.find(cp => cp.id === h.project_id)
      if (p) chartMap[h.month][p.name] = h.mrr
    }

    // ローンチ月のMRR（グラフ上に●を打つため。データが無ければ0円扱い）
    for (const p of chartProjects) {
      p.launchMrr = p.launchMonth ? actualOrZero(chartMap, p.launchMonth, p.name, p.launchMonth, currentMonth) : null
    }

    // Current MRR per project — 当月の実績が無ければプロジェクトの現在のMRRにフォールバック
    // （Stripe未同期などで revenue_history に当月分がまだ無いケース）
    const currentMrrByProject: Record<string, number> = {}
    const growthRateByProject: Record<string, number> = {}
    // 当月まで実績が継続入力されているプロジェクトだけ予測を出す（test3のように更新が
    // 止まっているプロジェクトの予測は、古いデータに基づく信頼できない値になるため出さない）
    const hasUpToDateActual: Record<string, boolean> = {}
    for (const p of chartProjects) {
      const proj = liveProjects.find(lp => lp.id === p.id)
      currentMrrByProject[p.name] = chartMap[currentMonth]?.[p.name] ?? proj?.mrr ?? 0
      hasUpToDateActual[p.name] = chartMap[currentMonth]?.[p.name] != null

      const actualSeries: Record<string, number> = {}
      for (const [month, vals] of Object.entries(chartMap)) {
        if (month <= currentMonth && vals[p.name] != null) actualSeries[month] = vals[p.name]
      }
      growthRateByProject[p.name] = trailingGrowthRate(actualSeries)
    }

    // Build month list: centered on current month (or all history if period=all)
    let months: string[]
    if (period === 'all') {
      const histMonths = new Set(Object.keys(chartMap))
      histMonths.add(currentMonth)
      for (const p of chartProjects) {
        if (p.launchMonth) histMonths.add(p.launchMonth)
      }
      months = Array.from(histMonths).sort()
    } else {
      const n = PERIOD_MONTHS[period] ?? 6
      const pastCount = Math.floor(n / 2)
      months = Array.from({ length: n }, (_, i) => offsetMonth(currentMonth, i - pastCount))
    }

    // 縦軸センタリング用: 選択スコープの各プロジェクトの現在MRRの最大値
    yCenterValue = Math.max(0, ...chartProjects.map(p => currentMrrByProject[p.name] ?? 0))

    // 累計売上: プロジェクトごとに history を月順で積み上げ、月ごとの合計を出せるようにする
    const cumByProject: Record<string, { month: string; cum: number }[]> = {}
    for (const p of chartProjects) {
      const rows = allHistory
        .filter(h => h.project_id === p.id)
        .sort((a, b) => a.month.localeCompare(b.month))
      let run = 0
      cumByProject[p.id] = rows.map(r => {
        run += r.mrr
        return { month: r.month, cum: run }
      })
    }
    const cumTotalAt = (month: string): number => {
      let total = 0
      for (const p of chartProjects) {
        const series = cumByProject[p.id] ?? []
        let val = 0
        for (const pt of series) {
          if (pt.month <= month) val = pt.cum
          else break
        }
        total += val
      }
      return total
    }
    chartData = months.map(month => {
      const isFuture = month > currentMonth
      const entry: Record<string, string | number | null> = { month }
      for (const p of chartProjects) {
        const actualMrr = actualOrZero(chartMap, month, p.name, p.launchMonth, currentMonth)
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
          entry[`${p.name}_proj`] = hasUpToDateActual[p.name] && base != null
            ? Math.max(0, Math.round(base * Math.pow(1 + rate, monthsAhead)))
            : null
        }
      }

      // 累計売上（同じグラフの右軸に載せる。実績のみ、予測は出さない）
      entry.__cum = isFuture ? null : cumTotalAt(month)
      return entry
    })
  }

  const growthLabel = growthRate === null ? '—'
    : `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`
  const growthColor = growthRate === null ? 'var(--text-dim)'
    : growthRate >= 0 ? '#10B981' : '#EF4444'

  return {
    currentMonth,
    totalMRR,
    totalCustomers,
    cumulativeMRR,
    growthLabel,
    growthColor,
    chartData,
    chartProjects,
    liveProjects,
    yCenterValue,
  }
}
