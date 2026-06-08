'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'

interface ProjectLine {
  id: string
  name: string
  color: string
}

interface Props {
  data: Record<string, string | number>[]
  projects: ProjectLine[]
}

function formatYAxis(v: number) {
  if (v >= 1000) return `¥${(v / 1000).toFixed(0)}k`
  return `¥${v}`
}

function StartDot(color: string, firstIndex: number) {
  return function Dot(props: Record<string, unknown>) {
    const { cx, cy, index } = props as { cx: number; cy: number; index: number }
    if (index !== firstIndex) return <g key={`empty-${cx}-${cy}`} />
    return <circle key={`start-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={color} strokeWidth={0} />
  }
}

export default function MRRChart({ data, projects }: Props) {
  if (data.length === 0 || projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs" style={{ color: 'var(--text-dim)' }}>
        データなし — プロジェクトのMRRを入力してください
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
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
          formatter={(value, name) => [`¥${Number(value).toLocaleString()}`, name]}
        />
        {projects.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 10, color: '#666', paddingTop: 8 }} />
        )}
        {projects.map(p => {
          const firstIndex = data.findIndex(d => d[p.name] !== undefined && d[p.name] !== null)
          return (
            <Line
              key={p.id}
              type="monotone"
              dataKey={p.name}
              stroke={p.color}
              strokeWidth={2}
              dot={StartDot(p.color, firstIndex)}
              activeDot={{ r: 4, fill: p.color }}
            />
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}
