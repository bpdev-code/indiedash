'use client'

import {
  ComposedChart,
  Area,
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
  launchMonth: string | null
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

// ローンチ月のデータ点だけに● を表示する
function renderLaunchDot(color: string, launchMonth: string | null) {
  return ({ cx, cy, payload }: { cx?: number; cy?: number; payload?: { month: string } }) => {
    const isLaunch = launchMonth && payload?.month === launchMonth
    if (!isLaunch || cx == null || cy == null) {
      return <circle key={`dot-${payload?.month}`} cx={cx ?? 0} cy={cy ?? 0} r={0} fill="none" />
    }
    return (
      <circle key={`launch-${payload.month}`} cx={cx} cy={cy} r={4}
        fill={color} stroke="#000" strokeWidth={1.5} />
    )
  }
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
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {projects.map((p, i) => (
            <linearGradient key={p.id} id={`mrr-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p.color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={p.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
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
        {projects.map((p, i) => (
          <>
            {/* 実績エリア (フェードするグラデーション塗り) */}
            <Area
              key={`${p.id}-actual`}
              type="monotone"
              dataKey={p.name}
              stroke={p.color}
              strokeWidth={2}
              fill={`url(#mrr-grad-${i})`}
              dot={renderLaunchDot(p.color, p.launchMonth)}
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
      </ComposedChart>
    </ResponsiveContainer>
  )
}
