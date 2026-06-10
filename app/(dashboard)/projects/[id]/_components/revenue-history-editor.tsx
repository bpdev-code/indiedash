'use client'

import { useState, useTransition } from 'react'
import { updateRevenueHistory } from '@/app/actions/projects'

type MonthlyMRR = { month: string; mrr: number }

function formatMonth(month: string) {
  const [year, m] = month.split('-')
  return `${year}年 ${parseInt(m)}月`
}

export function RevenueHistoryEditor({
  projectId,
  initialHistory,
}: {
  projectId: string
  initialHistory: MonthlyMRR[]
}) {
  const [history, setHistory] = useState(initialHistory)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function updateMRR(month: string, value: string) {
    setSaved(false)
    setHistory(prev =>
      prev.map(h => h.month === month ? { ...h, mrr: Math.max(0, parseInt(value) || 0) } : h)
    )
  }

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateRevenueHistory(projectId, history)
      if (result?.error) setError(result.error)
      else setSaved(true)
    })
  }

  return (
    <div>
      <div className="text-[9px] tracking-widest mb-4" style={{ color: 'var(--text-dim)' }}>
        MRR 履歴
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {history.map(h => (
          <div key={h.month} className="flex items-center gap-4">
            <span className="text-[11px] w-24 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
              {formatMonth(h.month)}
            </span>
            <input
              type="number"
              min="0"
              value={h.mrr}
              onChange={e => updateMRR(h.month, e.target.value)}
              className="w-32 px-3 py-1.5 text-sm rounded text-right"
            />
            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>円</span>
          </div>
        ))}
      </div>

      {error && <p className="text-xs mb-3" style={{ color: '#ff4444' }}>{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="text-xs px-6 py-2 rounded font-bold transition-opacity"
          style={{ background: 'var(--accent)', color: '#000', opacity: isPending ? 0.6 : 1 }}>
          {isPending ? '保存中...' : '保存'}
        </button>
        {saved && (
          <span className="text-xs" style={{ color: 'var(--accent)' }}>保存しました</span>
        )}
      </div>
    </div>
  )
}
