'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'

interface ProjectLine {
  id: string
  name: string
  color: string
}

interface Props {
  data: Record<string, string | number | null>[]
  projects: ProjectLine[]
  currentMonth: string
}

function formatYAxis(v: number) {
  if (v >= 1000) return `¥${(v / 1000).toFixed(0)}k`
  return `¥${v}`
}

export default function MRRChart({ data, projects, currentMonth }: Props) {
  if (data.length === 0 || projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs" style={{ color: 'var(--text-dim)' }}>
        データなし — プロジェクトのMRRを入力してください
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#1a1a1a" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: '#444' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#444' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatYAxis}
          width={48}
        />
        <Tooltip
          contentStyle={{ background: '#0d0d0d', border: '1px solid #1a1a1a', fontSize: 11, borderRadius: 4 }}
          labelStyle={{ color: '#888' }}
          formatter={(value, name) => {
            const label = String(name).replace(/_proj$/, ' (予測)')
            return [`¥${Number(value).toLocaleString()}`, label]
          }}
        />
        <ReferenceLine
          x={currentMonth}
          stroke="#333"
          strokeDasharray="3 3"
          label={{ value: '今月', position: 'top', fontSize: 9, fill: '#444' }}
        />
        {projects.map(p => (
          <>
            {/* 実績ライン (solid) */}
            <Line
              key={`${p.id}-actual`}
              type="monotone"
              dataKey={p.name}
              stroke={p.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: p.color }}
              connectNulls={false}
            />
            {/* 予測ライン (dashed) */}
            <Line
              key={`${p.id}-proj`}
              type="monotone"
              dataKey={`${p.name}_proj`}
              stroke={p.color}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 3, fill: p.color }}
              connectNulls={false}
              strokeOpacity={0.5}
            />
          </>
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
