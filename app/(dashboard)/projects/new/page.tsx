'use client'

import { useState, useTransition } from 'react'
import { createProject } from '@/app/actions/projects'
import Link from 'next/link'
import MonthSelect from '../month-select'

const COLORS = ['#00E5FF', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#EC4899']
const PROVIDERS = [
  { value: 'manual', label: 'Manual（手動入力）' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'paddle', label: 'Paddle' },
  { value: 'lemonsqueezy', label: 'Lemon Squeezy' },
  { value: 'gumroad', label: 'Gumroad' },
]
const STATUSES = [
  { value: 'idea', label: 'IDEA — 構想中' },
  { value: 'dev', label: 'DEV — 開発中' },
  { value: 'live', label: 'LIVE — リリース済み' },
]

export default function NewProjectPage() {
  const [error, setError] = useState<string | null>(null)
  const [color, setColor] = useState(COLORS[0])
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    formData.set('color', color)
    setError(null)
    startTransition(async () => {
      const result = await createProject(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects" className="text-xs" style={{ color: 'var(--text-dim)' }}>← PROJECTS</Link>
        <h1 className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>NEW PROJECT</h1>
      </div>

      <form action={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>PROJECT NAME *</label>
          <input name="name" required className="w-full px-3 py-2 text-sm rounded" placeholder="New Product" />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>STATUS</label>
          <select name="status" className="w-full px-3 py-2 text-sm rounded">
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-2" style={{ color: 'var(--text-dim)' }}>COLOR</label>
          <div className="flex gap-2">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-all"
                style={{
                  background: c,
                  outline: color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>PAYMENT PROVIDER</label>
          <select name="payment_provider" className="w-full px-3 py-2 text-sm rounded">
            {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>MRR (円)</label>
            <input name="mrr" type="number" min="0" defaultValue="0"
              className="w-full px-3 py-2 text-sm rounded" />
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>月額単価 (円)</label>
            <input name="price" type="number" min="0" placeholder="例: 980"
              className="w-full px-3 py-2 text-sm rounded" />
          </div>
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>ローンチ月</label>
          <MonthSelect />
        </div>

        {error && <p className="text-xs" style={{ color: '#ff4444' }}>{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isPending}
            className="px-6 py-2 text-sm font-bold rounded transition-opacity"
            style={{ background: 'var(--accent)', color: '#000', opacity: isPending ? 0.6 : 1 }}>
            {isPending ? '...' : 'CREATE'}
          </button>
          <Link href="/projects" className="px-6 py-2 text-sm rounded"
            style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            CANCEL
          </Link>
        </div>
      </form>
    </div>
  )
}
