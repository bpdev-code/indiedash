'use client'

import { useState } from 'react'

interface Props {
  defaultValue?: string | null
  onChange?: (value: string) => void
}

function currentYM() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

const YEARS = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 5 + i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function MonthSelect({ defaultValue, onChange }: Props) {
  const def = defaultValue
    ? { year: parseInt(defaultValue.split('-')[0]), month: parseInt(defaultValue.split('-')[1]) }
    : currentYM()

  const [year, setYear] = useState(def.year)
  const [month, setMonth] = useState(def.month)
  const value = `${year}-${String(month).padStart(2, '0')}`

  return (
    <div className="flex gap-2 items-center">
      <select
        value={year}
        onChange={e => {
          const y = Number(e.target.value)
          setYear(y)
          onChange?.(`${y}-${String(month).padStart(2, '0')}`)
        }}
        className="flex-1 px-3 py-2 text-sm rounded"
      >
        {YEARS.map(y => <option key={y} value={y}>{y}年</option>)}
      </select>
      <select
        value={month}
        onChange={e => {
          const m = Number(e.target.value)
          setMonth(m)
          onChange?.(`${year}-${String(m).padStart(2, '0')}`)
        }}
        className="flex-1 px-3 py-2 text-sm rounded"
      >
        {MONTHS.map(m => <option key={m} value={m}>{m}月</option>)}
      </select>
      <input type="hidden" name="launch_month" value={value} />
    </div>
  )
}
