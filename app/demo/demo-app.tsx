'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import MRRChart from '@/app/(dashboard)/dashboard/mrr-chart'
import PeriodSelector from '@/app/(dashboard)/dashboard/period-selector'
import ProjectSelector from '@/app/(dashboard)/dashboard/project-selector'
import MonthSelect from '@/app/(dashboard)/projects/month-select'
import { buildDashboardView } from '@/lib/dashboard-data'
import {
  type DemoProject,
  DEMO_COLORS,
  DEMO_MAX_PROJECTS,
  demoSeed,
  newDemoProject,
  saveDemoProjects,
  clearDemoProjects,
  subscribeDemo,
  getDemoSnapshot,
  getDemoServerSnapshot,
  demoAsDashProjects,
  demoRevenueHistory,
} from '@/lib/demo-store'
import { version } from '@/package.json'

const DEMO_SLUG = 'sample'

const NAV = [
  { href: '/demo', label: 'DASHBOARD', active: true },
  { href: '/signup?from=demo', label: 'PROJECTS', active: false },
  { href: '/signup?from=demo', label: 'SETTINGS', active: false },
  { href: '/signup?from=demo', label: 'FEEDBACK', active: false },
]

const BOTTOM_NAV = [
  { href: '/demo', label: 'HOME', icon: '⬡' },
  { href: '/signup?from=demo', label: 'PROJECTS', icon: '◈' },
  { href: '/signup?from=demo', label: 'SETTINGS', icon: '◎' },
  { href: '/signup?from=demo', label: 'FEEDBACK', icon: '✎' },
]

export function DemoApp({ period, project }: { period: string; project: string }) {
  const seed = useMemo(() => demoSeed(), [])
  const persisted = useSyncExternalStore(subscribeDemo, getDemoSnapshot, getDemoServerSnapshot)
  const [override, setOverride] = useState<DemoProject[] | null>(null)
  const list = override ?? (persisted.length > 0 ? persisted : seed)

  const view = useMemo(
    () => buildDashboardView(demoAsDashProjects(list), demoRevenueHistory(list), { period, project }),
    [list, period, project],
  )

  function commit(next: DemoProject[]) {
    setOverride(next)
    saveDemoProjects(next)
  }
  const update = (id: string, patch: Partial<DemoProject>) =>
    commit(list.map(p => (p.id === id ? { ...p, ...patch } : p)))
  const remove = (id: string) => commit(list.filter(p => p.id !== id))
  const add = () => {
    if (list.length >= DEMO_MAX_PROJECTS) return
    commit([...list, newDemoProject(list.length)])
  }
  const reset = () => {
    clearDemoProjects()
    setOverride(null)
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* 左サイドバー（デスクトップのみ） */}
      <aside className="hidden md:flex w-48 flex-col border-r py-6 px-4 flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <Link href="/demo" className="text-sm font-bold tracking-wider mb-8">
          INDIE<span style={{ color: 'var(--accent)' }}>DASH</span>
        </Link>

        <nav className="flex flex-col gap-1 flex-1 text-xs">
          {NAV.map(item => (
            <Link key={item.label} href={item.href}
              className="px-3 py-2 rounded hover:bg-[#111] transition-colors"
              style={{ color: item.active ? 'var(--text)' : 'var(--text-muted)', background: item.active ? '#111' : undefined }}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="space-y-3">
          <span className="text-xs px-2 py-0.5 rounded font-bold"
            style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
            SAMPLE
          </span>
          <Link href="/" className="block text-xs px-3 py-2 rounded hover:bg-[#111] transition-colors"
            style={{ color: 'var(--text-dim)' }}>
            終了
          </Link>
          <p className="text-[10px] px-3" style={{ color: 'var(--text-dim)' }}>v{version}</p>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* モバイルヘッダー */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}>
          <Link href="/demo" className="text-sm font-bold tracking-wider">
            INDIE<span style={{ color: 'var(--accent)' }}>DASH</span>
          </Link>
          <span className="text-xs px-2 py-0.5 rounded font-bold"
            style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
            SAMPLE
          </span>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto pb-24 md:pb-8">
          <div className="max-w-3xl w-full mx-auto space-y-6 md:space-y-8">

            <p className="text-xs rounded px-3 py-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              サインイン不要のサンプルです。下の数字を自分のプロダクトに置き換えて試せます。
            </p>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="MRR" value={`¥${view.totalMRR.toLocaleString()}`} color="var(--accent)" />
              <Kpi label="前月比" value={view.growthLabel} color={view.growthColor} />
              <Kpi label="累計売上" value={`¥${view.cumulativeMRR.toLocaleString()}`} />
              <Kpi label="顧客数" value={view.totalCustomers.toLocaleString()} />
            </div>

            {/* Chart */}
            <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <ProjectSelector
                  basePath="/demo"
                  current={project}
                  projects={view.liveProjects.map(p => ({ id: p.id, name: p.name, color: p.color }))}
                />
                <div className="flex items-center gap-2">
                  <p className="text-xs" style={{ color: 'var(--text-dim)' }}>MRR TREND</p>
                  <PeriodSelector basePath="/demo" current={period} />
                </div>
              </div>
              <MRRChart data={view.chartData} projects={view.chartProjects} currentMonth={view.currentMonth} animate={false} />
            </div>

            {/* Editable projects */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>LIVE PROJECTS</p>
                <button onClick={reset} className="text-xs hover:underline" style={{ color: 'var(--text-dim)' }}>
                  サンプルに戻す
                </button>
              </div>

              <div className="space-y-2">
                {list.map(p => (
                  <div key={p.id} className="p-3 rounded space-y-3"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        title="色を変更"
                        onClick={() => update(p.id, { color: DEMO_COLORS[(DEMO_COLORS.indexOf(p.color) + 1) % DEMO_COLORS.length] })}
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: p.color }}
                      />
                      <input
                        value={p.name}
                        onChange={e => update(p.id, { name: e.target.value })}
                        className="flex-1 px-2 py-1 text-sm rounded"
                        placeholder="プロダクト名"
                      />
                      <span className="text-xs px-2 py-0.5 rounded" style={{ color: '#00E5FF', background: '#111' }}>LIVE</span>
                      <button onClick={() => remove(p.id)} className="text-xs px-1" style={{ color: 'var(--text-dim)' }} title="削除">×</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className="block">
                        <span className="block text-[10px] mb-1" style={{ color: 'var(--text-dim)' }}>MRR (円)</span>
                        <input type="number" min={0} value={p.mrr}
                          onChange={e => update(p.id, { mrr: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                          className="w-full px-2 py-1 text-sm rounded" />
                      </label>
                      <label className="block">
                        <span className="block text-[10px] mb-1" style={{ color: 'var(--text-dim)' }}>顧客数</span>
                        <input type="number" min={0} value={p.customers}
                          onChange={e => update(p.id, { customers: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                          className="w-full px-2 py-1 text-sm rounded" />
                      </label>
                      <div>
                        <span className="block text-[10px] mb-1" style={{ color: 'var(--text-dim)' }}>ローンチ月</span>
                        <MonthSelect defaultValue={p.launchMonth} onChange={v => update(p.id, { launchMonth: v })} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {list.length < DEMO_MAX_PROJECTS && (
                <button onClick={add}
                  className="w-full mt-2 py-2 text-xs rounded border border-dashed"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  + プロジェクトを追加
                </button>
              )}
            </div>

            {/* Save CTA */}
            <div className="rounded p-6 text-center" style={{ background: '#0a1a0a', border: '1px solid var(--accent)' }}>
              <p className="text-sm font-bold mb-1">この内容で公開ダッシュボードを作る</p>
              <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
                入力内容はこの端末に保存されています。サインインするとアカウントに取り込めます（無料・カード不要）。
              </p>
              <Link href="/signup?from=demo" className="inline-block px-8 py-2.5 rounded font-bold text-sm"
                style={{ background: 'var(--accent)', color: '#000' }}>
                サインインして保存 →
              </Link>
            </div>
          </div>
        </main>
      </div>

      {/* 右サイドバー（lg以上のみ） */}
      <aside className="hidden lg:flex w-64 flex-col border-l flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-col gap-7 py-6 px-5 h-full">
          <div>
            <div className="text-[9px] tracking-widest mb-3" style={{ color: 'var(--text-dim)' }}>PLAN</div>
            <div className="text-sm font-bold mb-3">FREE</div>
            <Link href="/signup?from=demo"
              className="block w-full text-center text-xs py-2 rounded font-bold"
              style={{ background: 'var(--accent)', color: '#000' }}>
              PRO にアップグレード
            </Link>
          </div>

          <div>
            <div className="text-[9px] tracking-widest mb-3" style={{ color: 'var(--text-dim)' }}>PUBLIC URL</div>
            <div className="text-[11px] mb-3 break-all" style={{ color: 'var(--accent)' }}>/public/{DEMO_SLUG}</div>
            <div className="flex gap-2">
              <Link href="/signup?from=demo" className="flex-1 text-center text-[10px] py-1.5 rounded"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>COPY</Link>
              <Link href="/signup?from=demo" className="flex-1 text-center text-[10px] py-1.5 rounded"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>X シェア</Link>
            </div>
          </div>

          <div className="mt-auto">
            <div className="text-[9px] tracking-widest mb-3" style={{ color: 'var(--text-dim)' }}>ACCOUNT</div>
            <div className="text-[11px] mb-4 truncate" style={{ color: 'var(--text-muted)' }}>ゲスト（サンプル）</div>
            <Link href="/" className="text-[10px]" style={{ color: 'var(--text-dim)' }}>終了</Link>
          </div>
        </div>
      </aside>

      {/* ボトムナビ（モバイルのみ） */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex border-t"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        {BOTTOM_NAV.map(item => (
          <Link key={item.label} href={item.href}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs transition-colors"
            style={{ color: 'var(--text-dim)' }}>
            <span className="text-base">{item.icon}</span>
            <span style={{ fontSize: 9, letterSpacing: 1 }}>{item.label}</span>
          </Link>
        ))}
        <Link href="/" className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs"
          style={{ color: 'var(--text-dim)' }}>
          <span className="text-base">→</span>
          <span style={{ fontSize: 9, letterSpacing: 1 }}>終了</span>
        </Link>
      </nav>
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: color ?? 'var(--text)' }}>{value}</p>
    </div>
  )
}
