'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MonthSelect from '@/app/(dashboard)/projects/month-select'
import {
  DEMO_COLORS,
  demoCurrentMonth,
  monthsBetween,
  backfillHistory,
  type DemoStatus,
  type DemoProject,
} from '@/lib/demo-store'
import { useDemoProjects } from '../../use-demo'

const STATUSES: { value: DemoStatus; label: string }[] = [
  { value: 'idea', label: 'IDEA — 構想中' },
  { value: 'dev', label: 'DEV — 開発中' },
  { value: 'live', label: 'LIVE — リリース済み' },
  { value: 'archived', label: 'ARCHIVED — 終了' },
]

function formatMonth(month: string) {
  const [year, m] = month.split('-')
  return `${year}年 ${parseInt(m)}月`
}

export function DemoEditProjectView({ id }: { id: string }) {
  const router = useRouter()
  const { projects, updateProject, removeProject } = useDemoProjects()
  const project = projects.find(p => p.id === id)

  const [savedForm, setSavedForm] = useState(false)
  const [savedHistory, setSavedHistory] = useState(false)

  // フォームのローカル状態（未保存の編集を保持）
  const [name, setName] = useState(project?.name ?? '')
  const [status, setStatus] = useState<DemoStatus>(project?.status ?? 'idea')
  const [color, setColor] = useState(project?.color ?? DEMO_COLORS[0])
  const [mrr, setMrr] = useState(project?.mrr ?? 0)
  const [price, setPrice] = useState<string>(project?.price != null ? String(project.price) : '')
  const [customers, setCustomers] = useState(project?.customers ?? 0)
  const [launchMonth, setLaunchMonth] = useState(project?.launchMonth ?? demoCurrentMonth())

  // MRR履歴エディタのローカル状態
  const displayMonths = useMemo(
    () => monthsBetween(launchMonth <= demoCurrentMonth() ? launchMonth : demoCurrentMonth(), demoCurrentMonth()),
    [launchMonth],
  )
  const [historyEdits, setHistoryEdits] = useState<Record<string, number>>(() => ({ ...(project?.history ?? {}) }))

  if (!project) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>プロジェクトが見つかりません。</p>
        <Link href="/demo/projects" className="text-xs" style={{ color: 'var(--accent)' }}>← PROJECTS</Link>
      </div>
    )
  }

  const priceNum = Math.max(0, Math.floor(Number(price) || 0))
  // 単価が入っていれば MRR = 単価 × 顧客数（常に単価の倍数）。無ければ手入力値。
  const mrrAuto = priceNum > 0
  const effectiveMrr = mrrAuto ? priceNum * customers : Math.max(0, Math.floor(mrr))

  function saveForm() {
    const current = demoCurrentMonth()
    const nextHistory = backfillHistory(
      { ...(project!.history), [current]: effectiveMrr },
      launchMonth,
      effectiveMrr,
    )
    updateProject(id, {
      name: name.trim().slice(0, 80) || '無名のプロダクト',
      status,
      color,
      mrr: effectiveMrr,
      price: priceNum > 0 ? priceNum : null,
      customers: Math.max(0, Math.floor(customers)),
      launchMonth,
      history: nextHistory,
    })
    setMrr(effectiveMrr)
    setHistoryEdits({ ...nextHistory })
    setSavedForm(true)
    setSavedHistory(false)
  }

  function saveHistory() {
    const nextHistory: Record<string, number> = { ...project!.history }
    for (const month of displayMonths) {
      nextHistory[month] = Math.max(0, Math.floor(historyEdits[month] ?? 0))
    }
    const current = demoCurrentMonth()
    // 単価×顧客数で自動計算しているときは MRR を履歴で上書きしない
    const patch: Partial<DemoProject> = { history: nextHistory }
    if (!mrrAuto && nextHistory[current] != null) {
      patch.mrr = nextHistory[current]
      setMrr(nextHistory[current])
    }
    updateProject(id, patch)
    setSavedHistory(true)
    setSavedForm(false)
  }

  function handleDelete() {
    if (!confirm(`"${project!.name}" を削除しますか？`)) return
    removeProject(id)
    router.push('/demo/projects')
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Edit form */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/demo/projects" className="text-xs" style={{ color: 'var(--text-dim)' }}>← PROJECTS</Link>
          <h1 className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>EDIT PROJECT</h1>
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>PROJECT NAME *</label>
          <input value={name} onChange={e => { setName(e.target.value); setSavedForm(false) }}
            className="w-full px-3 py-2 text-sm rounded" />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>STATUS</label>
          <select value={status} onChange={e => { setStatus(e.target.value as DemoStatus); setSavedForm(false) }}
            className="w-full px-3 py-2 text-sm rounded">
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-2" style={{ color: 'var(--text-dim)' }}>COLOR</label>
          <div className="flex gap-2">
            {DEMO_COLORS.map(c => (
              <button key={c} type="button" onClick={() => { setColor(c); setSavedForm(false) }}
                className="w-7 h-7 rounded-full transition-all"
                style={{ background: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>MRR (円)</label>
            {mrrAuto ? (
              <p className="px-3 py-2 text-sm rounded" style={{ color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
                ¥{effectiveMrr.toLocaleString()}
              </p>
            ) : (
              <input type="number" min="0" value={mrr}
                onChange={e => { setMrr(Math.max(0, Math.floor(Number(e.target.value) || 0))); setSavedForm(false) }}
                className="w-full px-3 py-2 text-sm rounded" />
            )}
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>月額単価 (円)</label>
            <input type="number" min="0" value={price} placeholder="例: 980"
              onChange={e => { setPrice(e.target.value); setSavedForm(false) }}
              className="w-full px-3 py-2 text-sm rounded" />
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>顧客数</label>
            <input type="number" min="0" value={customers}
              onChange={e => { setCustomers(Math.max(0, Math.floor(Number(e.target.value) || 0))); setSavedForm(false) }}
              className="w-full px-3 py-2 text-sm rounded" />
          </div>
        </div>
        {mrrAuto && (
          <p className="text-[10px] -mt-3" style={{ color: 'var(--text-dim)' }}>MRR = 単価 × 顧客数 で自動計算</p>
        )}

        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>ローンチ月</label>
          <MonthSelect defaultValue={launchMonth} onChange={m => { setLaunchMonth(m); setSavedForm(false) }} />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={saveForm} className="px-6 py-2 text-sm font-bold rounded"
            style={{ background: 'var(--accent)', color: '#000' }}>
            SAVE
          </button>
          <Link href="/demo/projects" className="px-6 py-2 text-sm rounded"
            style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            CANCEL
          </Link>
          {savedForm && <span className="text-xs" style={{ color: 'var(--accent)' }}>保存しました</span>}
        </div>
      </div>

      {/* Revenue history editor */}
      {displayMonths.length > 0 && (
        <div className="pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="text-[9px] tracking-widest mb-4" style={{ color: 'var(--text-dim)' }}>MRR 履歴</div>

          <div className="flex flex-col gap-2 mb-4">
            {displayMonths.map(month => (
              <div key={month} className="flex items-center gap-4">
                <span className="text-[11px] w-24 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {formatMonth(month)}
                </span>
                <input
                  type="number"
                  min="0"
                  value={historyEdits[month] ?? 0}
                  onChange={e => {
                    setSavedHistory(false)
                    setHistoryEdits(prev => ({ ...prev, [month]: Math.max(0, parseInt(e.target.value) || 0) }))
                  }}
                  className="w-32 px-3 py-1.5 text-sm rounded text-right"
                />
                <span className="text-xs" style={{ color: 'var(--text-dim)' }}>円</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={saveHistory} className="text-xs px-6 py-2 rounded font-bold"
              style={{ background: 'var(--accent)', color: '#000' }}>
              保存
            </button>
            {savedHistory && <span className="text-xs" style={{ color: 'var(--accent)' }}>保存しました</span>}
          </div>
        </div>
      )}

      {/* Delete */}
      <div className="pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <button onClick={handleDelete} className="text-xs px-4 py-2 rounded hover:bg-[#221111] transition-colors"
          style={{ color: '#ff4444', border: '1px solid #3a1a1a' }}>
          このプロジェクトを削除
        </button>
      </div>
    </div>
  )
}
