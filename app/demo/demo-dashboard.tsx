'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
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
} from '@/lib/demo-store'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}
function addMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthSpan(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

// ── チャート算出（お試し用の擬似的な推移。ローンチ月→当月でなだらかに伸ばす） ──
function buildChart(projects: DemoProject[]) {
  const cm = currentMonth()
  const earliest = projects.reduce((min, p) => (p.launchMonth < min ? p.launchMonth : min), cm)
  let months: string[] = []
  for (let i = 0; i <= monthSpan(earliest, cm); i++) months.push(addMonth(earliest, i))
  if (months.length > 12) months = months.slice(-12)

  const actual = months.map(mo =>
    projects.reduce((sum, p) => {
      if (mo < p.launchMonth) return sum
      const span = Math.max(1, monthSpan(p.launchMonth, cm))
      const t = Math.min(1, Math.max(0, monthSpan(p.launchMonth, mo) / span))
      return sum + Math.round((0.15 + 0.85 * t) * p.mrr)
    }, 0)
  )
  const totalMRR = projects.reduce((s, p) => s + p.mrr, 0)
  const forecast = Math.round(totalMRR * 1.1)
  const cumulative = actual.reduce((s, v) => s + v, 0)
  const growth =
    actual.length >= 2 && actual[actual.length - 2] > 0
      ? ((actual[actual.length - 1] - actual[actual.length - 2]) / actual[actual.length - 2]) * 100
      : null

  return { months, actual, forecast, cumulative, growth, totalMRR }
}

const CW = 800
const CH = 150
const CPAD = 10

export function DemoDashboard() {
  const seed = useMemo(() => demoSeed(), [])
  // localStorage を唯一の情報源にしつつ、編集は override に持つ（保存も同時に行う）
  const persisted = useSyncExternalStore(subscribeDemo, getDemoSnapshot, getDemoServerSnapshot)
  const [override, setOverride] = useState<DemoProject[] | null>(null)
  const list = override ?? (persisted.length > 0 ? persisted : seed)

  const chart = useMemo(() => buildChart(list), [list])
  const totalCustomers = list.reduce((s, p) => s + p.customers, 0)

  const maxV = Math.max(...chart.actual, chart.forecast, 1)
  const n = chart.months.length + 1
  const xAt = (i: number) => CPAD + (n > 1 ? i / (n - 1) : 0.5) * (CW - CPAD * 2)
  const yAt = (v: number) => CPAD + (1 - v / maxV) * (CH - CPAD * 2)
  const actualPts = chart.actual.map((v, i) => ({ x: xAt(i), y: yAt(v) }))
  const actualLine = actualPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath =
    actualPts.length > 0
      ? `${actualLine} L${actualPts[actualPts.length - 1].x.toFixed(1)},${CH} L${actualPts[0].x.toFixed(1)},${CH} Z`
      : ''
  const forecastPt = { x: xAt(n - 1), y: yAt(chart.forecast) }
  const forecastLine =
    actualPts.length > 0
      ? `M${actualPts[actualPts.length - 1].x.toFixed(1)},${actualPts[actualPts.length - 1].y.toFixed(1)} L${forecastPt.x.toFixed(1)},${forecastPt.y.toFixed(1)}`
      : ''

  function commit(next: DemoProject[]) {
    setOverride(next)
    saveDemoProjects(next)
  }
  function update(id: string, patch: Partial<DemoProject>) {
    commit(list.map(p => (p.id === id ? { ...p, ...patch } : p)))
  }
  function remove(id: string) {
    commit(list.filter(p => p.id !== id))
  }
  function add() {
    if (list.length >= DEMO_MAX_PROJECTS) return
    commit([...list, newDemoProject(list.length)])
  }
  function reset() {
    clearDemoProjects()
    setOverride(null)
  }

  return (
    <div className="space-y-8">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="MRR" value={`¥${chart.totalMRR.toLocaleString()}`} color="var(--accent)" />
        <Kpi
          label="前月比"
          value={chart.growth === null ? '—' : `${chart.growth >= 0 ? '+' : ''}${chart.growth.toFixed(1)}%`}
          color={chart.growth === null ? 'var(--text-dim)' : chart.growth >= 0 ? '#10B981' : '#EF4444'}
        />
        <Kpi label="累計売上" value={`¥${chart.cumulative.toLocaleString()}`} />
        <Kpi label="顧客数" value={totalCustomers.toLocaleString()} />
      </div>

      {/* チャート */}
      <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <p className="text-[10px] tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>MRR TREND</p>
        <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full" style={{ height: 150 }}>
          <defs>
            <linearGradient id="demo-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
            </linearGradient>
          </defs>
          {areaPath && <path d={areaPath} fill="url(#demo-grad)" />}
          {actualLine && (
            <path d={actualLine} fill="none" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {forecastLine && (
            <path d={forecastLine} fill="none" stroke="#00E5FF" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.5" />
          )}
          {actualPts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === actualPts.length - 1 ? 5 : 3}
              fill={i === actualPts.length - 1 ? '#00E5FF' : 'var(--bg-card)'}
              stroke="#00E5FF"
              strokeWidth="1.5"
            />
          ))}
          <circle cx={forecastPt.x} cy={forecastPt.y} r={3} fill="var(--bg-card)" stroke="#00E5FF" strokeWidth="1.5" strokeOpacity="0.5" />
        </svg>
        <div className="flex justify-between pt-1">
          {chart.months.map((mo, i) => (
            <span key={mo + i} className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {parseInt(mo.split('-')[1])}月
            </span>
          ))}
          <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
            {parseInt(addMonth(currentMonth(), 1).split('-')[1])}月
          </span>
        </div>
      </div>

      {/* プロジェクト編集 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs tracking-widest" style={{ color: 'var(--text-muted)' }}>PROJECTS（自由に編集OK）</p>
          <button onClick={reset} className="text-xs hover:underline" style={{ color: 'var(--text-dim)' }}>
            サンプルに戻す
          </button>
        </div>

        {list.map(p => (
          <div key={p.id} className="p-3 rounded space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <button
                type="button"
                title="色を変更"
                onClick={() => {
                  const idx = DEMO_COLORS.indexOf(p.color)
                  update(p.id, { color: DEMO_COLORS[(idx + 1) % DEMO_COLORS.length] })
                }}
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: p.color }}
              />
              <input
                value={p.name}
                onChange={e => update(p.id, { name: e.target.value })}
                className="flex-1 px-2 py-1 text-sm rounded"
                placeholder="プロダクト名"
              />
              <button
                onClick={() => remove(p.id)}
                className="text-xs px-2 py-1 rounded flex-shrink-0"
                style={{ color: 'var(--text-dim)' }}
                title="削除"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="block text-[10px] mb-1" style={{ color: 'var(--text-dim)' }}>MRR (円)</span>
                <input
                  type="number"
                  min={0}
                  value={p.mrr}
                  onChange={e => update(p.id, { mrr: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                  className="w-full px-2 py-1 text-sm rounded"
                />
              </label>
              <label className="block">
                <span className="block text-[10px] mb-1" style={{ color: 'var(--text-dim)' }}>顧客数</span>
                <input
                  type="number"
                  min={0}
                  value={p.customers}
                  onChange={e => update(p.id, { customers: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                  className="w-full px-2 py-1 text-sm rounded"
                />
              </label>
              <label className="block">
                <span className="block text-[10px] mb-1" style={{ color: 'var(--text-dim)' }}>ローンチ月</span>
                <input
                  type="month"
                  value={p.launchMonth}
                  max={currentMonth()}
                  onChange={e => {
                    const v = e.target.value
                    if (/^\d{4}-\d{2}$/.test(v)) update(p.id, { launchMonth: v })
                  }}
                  className="w-full px-2 py-1 text-sm rounded"
                />
              </label>
            </div>
          </div>
        ))}

        {list.length < DEMO_MAX_PROJECTS && (
          <button
            onClick={add}
            className="w-full py-2 text-xs rounded border border-dashed"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            + プロジェクトを追加
          </button>
        )}
      </div>

      {/* 保存 CTA */}
      <div className="rounded p-6 text-center" style={{ background: '#0a1a0a', border: '1px solid var(--accent)' }}>
        <p className="text-sm font-bold mb-1">この内容で公開ダッシュボードを作る</p>
        <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
          入力内容はこの端末に保存されています。サインインするとアカウントに取り込めます（無料・カード不要）。
        </p>
        <Link
          href="/signup?from=demo"
          className="inline-block px-8 py-2.5 rounded font-bold text-sm"
          style={{ background: 'var(--accent)', color: '#000' }}
        >
          サインインして保存 →
        </Link>
      </div>
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: color ?? 'var(--text)' }}>{value}</p>
    </div>
  )
}
