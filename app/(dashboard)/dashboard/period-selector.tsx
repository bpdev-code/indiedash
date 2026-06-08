'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const PERIODS = [
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '12m', label: '12M' },
  { value: 'all', label: 'ALL' },
]

export default function PeriodSelector({ current }: { current: string }) {
  const router = useRouter()

  return (
    <div className="flex gap-1">
      {PERIODS.map(p => (
        <button
          key={p.value}
          onClick={() => router.push(`/dashboard?period=${p.value}`)}
          className="px-2 py-0.5 text-xs rounded transition-colors"
          style={{
            background: current === p.value ? 'var(--accent)' : 'transparent',
            color: current === p.value ? '#000' : 'var(--text-dim)',
            border: `1px solid ${current === p.value ? 'var(--accent)' : 'var(--border)'}`,
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
