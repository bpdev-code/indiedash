'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MonthSelect from '@/app/(dashboard)/projects/month-select'
import {
  DEMO_COLORS,
  DEMO_MAX_PROJECTS,
  demoCurrentMonth,
  backfillHistory,
  type DemoStatus,
  type DemoProject,
} from '@/lib/demo-store'
import { useDemoProjects } from '../../use-demo'

const STATUSES: { value: DemoStatus; label: string }[] = [
  { value: 'idea', label: 'IDEA — 構想中' },
  { value: 'dev', label: 'DEV — 開発中' },
  { value: 'live', label: 'LIVE — リリース済み' },
]

export function DemoNewProjectView() {
  const router = useRouter()
  const { projects, setProjects } = useDemoProjects()

  const [color, setColor] = useState(DEMO_COLORS[projects.length % DEMO_COLORS.length])
  const [launchMonth, setLaunchMonth] = useState(demoCurrentMonth())
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    if (projects.length >= DEMO_MAX_PROJECTS) {
      setError(`サンプルはプロジェクト${DEMO_MAX_PROJECTS}件までです。`)
      return
    }
    const name = ((formData.get('name') as string) || '').trim()
    if (!name) { setError('プロジェクト名を入力してください。'); return }

    let mrr = Math.max(0, Math.floor(Number(formData.get('mrr')) || 0))
    const priceRaw = Math.floor(Number(formData.get('price')) || 0)
    // 単価が入っていれば MRR を単価の倍数に丸める
    if (priceRaw > 0 && mrr > 0) mrr = Math.round(mrr / priceRaw) * priceRaw

    const project: DemoProject = {
      id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.slice(0, 80),
      status: (formData.get('status') as DemoStatus) || 'idea',
      color,
      mrr,
      price: priceRaw > 0 ? priceRaw : null,
      customers: 0,
      launchMonth,
      history: backfillHistory({}, launchMonth, mrr),
    }
    setProjects([...projects, project])
    router.push('/demo/projects')
  }

  return (
    <div className="max-w-lg mx-auto">
      <form action={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/demo/projects" className="text-xs" style={{ color: 'var(--text-dim)' }}>← PROJECTS</Link>
          <h1 className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>NEW PROJECT</h1>
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>PROJECT NAME *</label>
          <input name="name" required className="w-full px-3 py-2 text-sm rounded" placeholder="New Product" />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>STATUS</label>
          <select name="status" defaultValue="idea" className="w-full px-3 py-2 text-sm rounded">
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-2" style={{ color: 'var(--text-dim)' }}>COLOR</label>
          <div className="flex gap-2">
            {DEMO_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-all"
                style={{ background: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>MRR (円)</label>
            <input name="mrr" type="number" min="0" defaultValue="0" className="w-full px-3 py-2 text-sm rounded" />
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>月額単価 (円)</label>
            <input name="price" type="number" min="0" placeholder="例: 980" className="w-full px-3 py-2 text-sm rounded" />
          </div>
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>ローンチ月</label>
          <MonthSelect defaultValue={launchMonth} onChange={setLaunchMonth} />
        </div>

        {error && <p className="text-xs" style={{ color: '#ff4444' }}>{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-6 py-2 text-sm font-bold rounded"
            style={{ background: 'var(--accent)', color: '#000' }}>
            CREATE
          </button>
          <Link href="/demo/projects" className="px-6 py-2 text-sm rounded"
            style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            CANCEL
          </Link>
        </div>
      </form>
    </div>
  )
}
