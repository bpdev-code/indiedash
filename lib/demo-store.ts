// お試し用（サインイン不要）のデータ。ブラウザの localStorage にのみ保存し、
// サインイン後に importDemoProjects でアカウントへ取り込む。
// 本番の projects / revenue_history に対応する構造を持つ（Stripe連携は無し）。

export const DEMO_STORAGE_KEY = 'indiedash:demo:v2'

export type DemoStatus = 'idea' | 'dev' | 'live' | 'archived'

export interface DemoProject {
  id: string
  name: string
  status: DemoStatus
  color: string
  mrr: number
  price: number | null
  customers: number
  launchMonth: string                 // 'YYYY-MM'
  history: Record<string, number>     // month('YYYY-MM') -> mrr
}

export const DEMO_COLORS = ['#00E5FF', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#EC4899']
export const DEMO_MAX_PROJECTS = 12
export const DEMO_STATUSES: DemoStatus[] = ['idea', 'dev', 'live', 'archived']

// ── 月ユーティリティ ──────────────────────────────────────────────
export function demoCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = []
  let [y, m] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  let guard = 0
  while ((y < ty || (y === ty && m <= tm)) && guard++ < 360) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return out
}

function monthsAgo(n: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ローンチ月〜当月で history に無い月を mrr で埋める（本番 backfillRevenueHistory と同じ発想）。
// 既存の月の値は残す。返り値は新しい map。
export function backfillHistory(
  history: Record<string, number>,
  launchMonth: string,
  mrr: number,
): Record<string, number> {
  const current = demoCurrentMonth()
  const start = launchMonth <= current ? launchMonth : current
  const next: Record<string, number> = { ...history }
  for (const month of monthsBetween(start, current)) {
    if (next[month] == null) next[month] = mrr
  }
  return next
}

// なだらかに伸びる履歴（サンプルのシード用。一直線だと分かりにくいので曲線にする）。
// 顧客数を 0→現在値へランプさせ、MRR = 単価 × 顧客数 とするので、値は必ず単価の倍数になる。
function rampHistory(launchMonth: string, customers: number, price: number): Record<string, number> {
  const months = monthsBetween(launchMonth, demoCurrentMonth())
  const n = months.length
  const h: Record<string, number> = {}
  months.forEach((month, i) => {
    const t = n <= 1 ? 1 : i / (n - 1)
    const factor = 0.18 + 0.82 * Math.pow(t, 1.5)
    const cust = Math.max(1, Math.round(customers * factor))
    h[month] = cust * price
  })
  return h
}

export function demoSeed(): DemoProject[] {
  const a = monthsAgo(6)
  const b = monthsAgo(4)
  return [
    {
      id: 'seed-1', name: 'タスク管理アプリ', status: 'live', color: '#00E5FF',
      price: 490, customers: 20, mrr: 490 * 20, launchMonth: a, history: rampHistory(a, 20, 490),
    },
    {
      id: 'seed-2', name: '請求書作成ツール', status: 'live', color: '#7C3AED',
      price: 980, customers: 15, mrr: 980 * 15, launchMonth: b, history: rampHistory(b, 15, 980),
    },
  ]
}

export function newDemoProject(index: number): DemoProject {
  const launch = demoCurrentMonth()
  return {
    id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: '新しいプロダクト',
    status: 'idea',
    color: DEMO_COLORS[index % DEMO_COLORS.length],
    mrr: 0,
    price: null,
    customers: 0,
    launchMonth: launch,
    history: { [launch]: 0 },
  }
}

// ── 正規化 ───────────────────────────────────────────────────────
function sanitizeHistory(raw: unknown, launchMonth: string, mrr: number): Record<string, number> {
  const h: Record<string, number> = {}
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (/^\d{4}-\d{2}$/.test(k)) h[k] = Math.max(0, Math.floor(Number(v) || 0))
    }
  }
  return backfillHistory(h, launchMonth, mrr)
}

export function sanitizeDemoProjects(raw: unknown): DemoProject[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .slice(0, DEMO_MAX_PROJECTS)
    .map((p, i) => {
      const launchMonth = typeof p.launchMonth === 'string' && /^\d{4}-\d{2}$/.test(p.launchMonth)
        ? p.launchMonth : demoCurrentMonth()
      const mrr = Math.max(0, Math.floor(Number(p.mrr) || 0))
      const rawPrice = Number(p.price)
      return {
        id: typeof p.id === 'string' ? p.id : `p-${i}`,
        name: (typeof p.name === 'string' ? p.name : '').trim().slice(0, 80) || '無名のプロダクト',
        status: DEMO_STATUSES.includes(p.status as DemoStatus) ? (p.status as DemoStatus) : 'idea',
        color: typeof p.color === 'string' && DEMO_COLORS.includes(p.color) ? p.color : DEMO_COLORS[i % DEMO_COLORS.length],
        mrr,
        price: Number.isFinite(rawPrice) && rawPrice > 0 ? Math.floor(rawPrice) : null,
        customers: Math.max(0, Math.floor(Number(p.customers) || 0)),
        launchMonth,
        history: sanitizeHistory(p.history, launchMonth, mrr),
      }
    })
}

// ── buildDashboardView / import 用の変換 ─────────────────────────
export function demoAsDashProjects(projects: DemoProject[]) {
  return projects.map(p => ({
    id: p.id,
    name: p.name,
    color: p.color,
    status: p.status,
    mrr: p.mrr,
    users_count: p.customers,
    launch_month: p.launchMonth,
  }))
}

export function demoRevenueRows(projects: DemoProject[]) {
  const rows: { month: string; mrr: number; project_id: string }[] = []
  for (const p of projects) {
    for (const [month, mrr] of Object.entries(p.history)) {
      rows.push({ month, mrr, project_id: p.id })
    }
  }
  return rows
}

// ── localStorage I/O（同一タブ購読者への通知つき） ───────────────
const listeners = new Set<() => void>()

export function subscribeDemo(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  listeners.add(callback)
  window.addEventListener('storage', callback)
  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', callback)
  }
}

function emit() {
  for (const l of listeners) l()
}

export function saveDemoProjects(projects: DemoProject[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(projects))
  } catch {
    // プライベートモード等での保存失敗は無視
  }
  emit()
}

export function clearDemoProjects(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(DEMO_STORAGE_KEY)
  } catch {
    // 無視
  }
  emit()
}

// ── useSyncExternalStore 用スナップショット ──────────────────────
// 「保存済みのお試しデータ」だけを返す。未保存なら空配列（呼び出し側がシードへフォールバック）。
export const DEMO_EMPTY: DemoProject[] = []

let snapshotForRaw: string | null | undefined
let cachedSnapshot: DemoProject[] = DEMO_EMPTY

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
