'use client'

import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'

function formatYAxis(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
  return `${v}`
}

interface Props {
  data: { month: string; total: number }[]
  currentMonth: string
  color?: string
  animate?: boolean
}

function CumulativeTooltip({ active, payload, label }: {
  active?: boolean
  payload?: readonly { value?: unknown; color?: string }[]
  label?: unknown
}) {
  if (!active || !payload || payload.length === 0 || payload[0].value == null) return null
  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', fontSize: 11, borderRadius: 4, padding: '6px 10px' }}>
      <p style={{ color: '#888', margin: '0 0 4px' }}>{String(label ?? '')}</p>
      <p style={{ color: payload[0].color, margin: 0 }}>Total: ¥{Number(payload[0].value).toLocaleString()}</p>
    </div>
  )
}

export default function CumulativeChart({ data, currentMonth, color = '#00E5FF', animate = true }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs" style={{ color: 'var(--text-dim)' }}>
        データなし
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cum-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1a1a1a" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#444' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 10, fill: '#444' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatYAxis}
          width={48}
        />
        <Tooltip content={(props) => <CumulativeTooltip {...props} />} />
        <ReferenceLine x={currentMonth} stroke="#333" strokeDasharray="3 3" />
        <Area
          type="monotone"
          dataKey="total"
          stroke={color}
          strokeWidth={2}
          fill="url(#cum-grad)"
          dot={false}
          activeDot={{ r: 4, fill: color }}
          isAnimationActive={animate}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
