// お試し用（サインイン不要）ダッシュボードのデータ。ブラウザの localStorage にのみ保存し、
// サインイン後に importDemoProjects でアカウントへ取り込む。

export const DEMO_STORAGE_KEY = 'indiedash:demo:v1'

export interface DemoProject {
  id: string          // ローカル専用ID
  name: string
  mrr: number
  color: string
  launchMonth: string // 'YYYY-MM'
  customers: number
}

export const DEMO_COLORS = ['#00E5FF', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#EC4899']

export const DEMO_MAX_PROJECTS = 10

function monthsAgo(n: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function demoSeed(): DemoProject[] {
  return [
    { id: 'seed-1', name: 'タスク管理アプリ', mrr: 9800, color: '#00E5FF', launchMonth: monthsAgo(6), customers: 42 },
    { id: 'seed-2', name: '請求書作成ツール', mrr: 14700, color: '#7C3AED', launchMonth: monthsAgo(4), customers: 61 },
  ]
}

export function newDemoProject(index: number): DemoProject {
  return {
    id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: '新しいプロダクト',
    mrr: 0,
    color: DEMO_COLORS[index % DEMO_COLORS.length],
    launchMonth: monthsAgo(0),
    customers: 0,
  }
}

// localStorage の値を DemoProject[] へ正規化する（壊れた値は捨てる）
export function sanitizeDemoProjects(raw: unknown): DemoProject[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .slice(0, DEMO_MAX_PROJECTS)
    .map((p, i) => ({
      id: typeof p.id === 'string' ? p.id : `p-${i}`,
      name: (typeof p.name === 'string' ? p.name : '').trim().slice(0, 80) || '無名のプロダクト',
      mrr: Math.max(0, Math.floor(Number(p.mrr) || 0)),
      color: typeof p.color === 'string' && DEMO_COLORS.includes(p.color) ? p.color : DEMO_COLORS[i % DEMO_COLORS.length],
      launchMonth: typeof p.launchMonth === 'string' && /^\d{4}-\d{2}$/.test(p.launchMonth) ? p.launchMonth : monthsAgo(0),
      customers: Math.max(0, Math.floor(Number(p.customers) || 0)),
    }))
}

// DemoProject を buildDashboardView が受け取る形へ変換する（すべて status:'live' 扱い）
export function demoAsDashProjects(projects: DemoProject[]) {
  return projects.map(p => ({
    id: p.id,
    name: p.name,
    color: p.color,
    status: 'live',
    mrr: p.mrr,
    users_count: p.customers,
    launch_month: p.launchMonth,
  }))
}

// サンプル用の月次推移。ローンチ月は現在MRRの ~18%、そこから当月の現在値まで
// なだらかに増加させる（当月の値は必ず p.mrr に一致 = KPI と揃う）。
// 本番の backfillRevenueHistory はフラットだが、サンプルでは一直線だと分かりにくいので
// 伸びのある曲線にしている。
export function demoRevenueHistory(projects: DemoProject[]) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const rows: { month: string; mrr: number; project_id: string }[] = []
  for (const p of projects) {
    const start = p.launchMonth <= currentMonth ? p.launchMonth : currentMonth
    const months: string[] = []
    let [y, m] = start.split('-').map(Number)
    const [cy, cm] = currentMonth.split('-').map(Number)
    let guard = 0
    while ((y < cy || (y === cy && m <= cm)) && guard++ < 240) {
      months.push(`${y}-${String(m).padStart(2, '0')}`)
      m++
      if (m > 12) { m = 1; y++ }
    }
    const n = months.length
    months.forEach((month, i) => {
      const t = n <= 1 ? 1 : i / (n - 1)
      const factor = 0.18 + 0.82 * Math.pow(t, 1.5)
      rows.push({ month, mrr: Math.round(p.mrr * factor), project_id: p.id })
    })
  }
  return rows
}

export function saveDemoProjects(projects: DemoProject[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(projects))
  } catch {
    // 保存失敗（プライベートモード等）は無視する
  }
}

// ── useSyncExternalStore 用（SSR セーフに localStorage を読む） ────────────
// 「保存済みのお試しデータ」だけを返す。未保存ならシードは返さず空配列
// （呼び出し側が表示用にシードへフォールバックする）。
export const DEMO_EMPTY: DemoProject[] = []

let snapshotForRaw: string | null | undefined
let cachedSnapshot: DemoProject[] = DEMO_EMPTY

// 同じ localStorage 文字列に対しては同一参照を返す（無限再レンダー防止）。
export function getDemoSnapshot(): DemoProject[] {
  if (typeof window === 'undefined') return DEMO_EMPTY
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(DEMO_STORAGE_KEY)
  } catch {
    raw = null
  }
  if (raw === snapshotForRaw) return cachedSnapshot
  snapshotForRaw = raw
  if (!raw) {
    cachedSnapshot = DEMO_EMPTY
  } else {
    try {
      cachedSnapshot = sanitizeDemoProjects(JSON.parse(raw))
    } catch {
      cachedSnapshot = DEMO_EMPTY
    }
  }
  return cachedSnapshot
}

export function getDemoServerSnapshot(): DemoProject[] {
  return DEMO_EMPTY
}

export function subscribeDemo(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

export function clearDemoProjects(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(DEMO_STORAGE_KEY)
  } catch {
    // 無視
  }
}
