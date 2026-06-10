'use client'

import { useState, useMemo, useTransition } from 'react'
import { updateRevenueHistory } from '@/app/actions/projects'

type MonthlyMRR = { month: string; mrr: number }

function generateMonthsBetween(from: string, to: string): string[] {
  const months: string[] = []
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  let y = fy, m = fm
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return months
}

function formatMonth(month: string) {
  const [year, m] = month.split('-')
  return `${year}年 ${parseInt(m)}月`
}

export function RevenueHistoryEditor({
  projectId,
  initialHistory,
  launchMonth,
}: {
  projectId: string
  initialHistory: MonthlyMRR[]
  launchMonth: string | null
}) {
  const [edits, setEdits] = useState<Record<string, number>>(
    () => Object.fromEntries(initialHistory.map(h => [h.month, h.mrr]))
  )
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const displayMonths = useMemo(() => {
    if (!launchMonth) return initialHistory.map(h => h.month)
    const current = new Date().toISOString().slice(0, 7)
    const start = launchMonth <= current ? launchMonth : current
    return generateMonthsBetween(start, current)
  }, [launchMonth, initialHistory])

  function updateMRR(month: string, value: string) {
    setSaved(false)
    setEdits(prev => ({ ...prev, [month]: Math.max(0, parseInt(value) || 0) }))
  }

  function handleSave() {
    setError(null)
    setSaved(false)
    const history = displayMonths.map(month => ({ month, mrr: edits[month] ?? 0 }))
    startTransition(async () => {
      const result = await updateRevenueHistory(projectId, history)
      if (result?.error) setError(result.error)
      else setSaved(true)
    })
  }

  if (displayMonths.length === 0) return null

  return (
    <div>
      <div className="text-[9px] tracking-widest mb-4" style={{ color: 'var(--text-dim)' }}>
        MRR 履歴
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {displayMonths.map(month => (
          <div key={month} className="flex items-center gap-4">
            <span className="text-[11px] w-24 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
              {formatMonth(month)}
            </span>
            <input
              type="number"
              min="0"
              value={edits[month] ?? 0}
              onChange={e => updateMRR(month, e.target.value)}
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
