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

export function loadDemoProjects(): DemoProject[] {
  if (typeof window === 'undefined') return demoSeed()
  try {
    const stored = window.localStorage.getItem(DEMO_STORAGE_KEY)
    if (!stored) return demoSeed()
    const parsed = sanitizeDemoProjects(JSON.parse(stored))
    return parsed.length > 0 ? parsed : demoSeed()
  } catch {
    return demoSeed()
  }
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

export function peekDemoProjects(): DemoProject[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(DEMO_STORAGE_KEY)
    if (!stored) return []
    return sanitizeDemoProjects(JSON.parse(stored))
  } catch {
    return []
  }
}

export function clearDemoProjects(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(DEMO_STORAGE_KEY)
  } catch {
    // 無視
  }
}
