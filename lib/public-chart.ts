// 公開ページ・OGP画像で使う集計チャートのロジック。
// ダッシュボード（app/(dashboard)/dashboard/page.tsx）と同じ考え方:
// 今月を中心に前後の月を表示し、ローンチ月より前は描画せず、未来は予測（CMGR）で延長する。

export function offsetMonth(base: string, offset: number): string {
  const [y, m] = base.split('-').map(Number)
  const d = new Date(y, m - 1 + offset, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthsDiff(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

// CMGR（複利月次成長率）。直近最大7データ点（6ヶ月分の変化）から算出し、±15%/月にクランプする
function trailingGrowthRate(series: Record<string, number>): number {
  const months = Object.keys(series).sort()
  const window = months.slice(-7)
  const periods = window.length - 1
  if (periods < 2) return 0
  const start = series[window[0]]
  const end = series[window[window.length - 1]]
  if (start <= 0) return 0
  const cmgr = Math.pow(end / start, 1 / periods) - 1
  return Math.max(-0.15, Math.min(0.15, cmgr))
}

export interface ProjectForChart {
  id: string
  mrr: number
  launchMonth: string | null
}

export interface AggregateChartPoint {
  month: string
  actual: number | null
  forecast: number | null
}

// historyByProject: projectId -> (month -> mrr)
export function buildAggregateChart(
  projects: ProjectForChart[],
  historyByProject: Record<string, Record<string, number>>,
  currentMonth: string
): AggregateChartPoint[] {
  const months = Array.from({ length: 6 }, (_, i) => offsetMonth(currentMonth, i - 3))

  const perProject = projects.map(p => {
    const hist = historyByProject[p.id] ?? {}
    const currentActual = hist[currentMonth]
    const hasUpToDate = currentActual != null
    const base = currentActual ?? p.mrr ?? 0
    const actualSeries: Record<string, number> = {}
    for (const [m, v] of Object.entries(hist)) {
      if (m <= currentMonth) actualSeries[m] = v
    }
    return { ...p, hist, base, hasUpToDate, rate: trailingGrowthRate(actualSeries) }
  })

  return months.map(month => {
    const isFuture = month > currentMonth
    let actualSum = 0
    let hasActual = false
    let forecastSum = 0
    let hasForecast = false

    for (const p of perProject) {
      if (!isFuture) {
        const v = p.hist[month]
        if (v != null) {
          actualSum += v
          hasActual = true
        } else if (p.launchMonth && month >= p.launchMonth && month <= currentMonth) {
          hasActual = true // ローンチ後だがデータが無い月は0円として扱う
        }
      } else if (p.hasUpToDate) {
        const monthsAhead = monthsDiff(currentMonth, month)
        forecastSum += Math.max(0, Math.round(p.base * Math.pow(1 + p.rate, monthsAhead)))
        hasForecast = true
      }
    }

    return {
      month,
      actual: !isFuture && hasActual ? actualSum : null,
      forecast: isFuture && hasForecast ? forecastSum : null,
    }
  })
}
