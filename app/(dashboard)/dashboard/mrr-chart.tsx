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
  ReferenceDot,
} from 'recharts'

interface ProjectLine {
  id: string
  name: string
  color: string
  launchMonth: string | null
  launchMrr: number | null
}

interface Props {
  data: Record<string, string | number | null>[]
  projects: ProjectLine[]
  currentMonth: string
  // サンプル画面では値を編集するたびに再アニメーションすると気が散るので切れるようにする
  animate?: boolean
  // >0 のとき、現在値がほぼ縦軸の中央に来るよう上限を 2倍に寄せる
  yCenterValue?: number
  // 右軸に累計売上（__cum / __cumProj）を重ねて表示する
  showCumulative?: boolean
}

const CUM_COLOR = '#E5E5E5'

function formatAxis(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
  return `${v}`
}

interface TooltipItem {
  dataKey?: unknown
  value?: unknown
  color?: string
}

// 当月は実績とダミー同値の予測ポイントが重複するので、当月だけ「予測」行を除外する
function ChartTooltip({ active, payload, label, currentMonth }: {
  active?: boolean
  payload?: readonly TooltipItem[]
  label?: unknown
  currentMonth: string
}) {
  if (!active || !payload || payload.length === 0) return null

  const items = payload.filter(entry => {
    const key = String(entry.dataKey ?? '')
    if (key.endsWith('_proj') && label === currentMonth) return false
    return entry.value != null
  })
  if (items.length === 0) return null

  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', fontSize: 11, borderRadius: 4, padding: '6px 10px' }}>
      <p style={{ color: '#888', margin: '0 0 4px' }}>{String(label ?? '')}</p>
      {items.map((entry, i) => {
        const key = String(entry.dataKey ?? '')
        let displayLabel: string
        if (key === '__cum') displayLabel = '累計'
        else displayLabel = key.replace(/_proj$/, ' (予測)')
        return (
          <p key={i} style={{ color: entry.color, margin: 0 }}>
            {displayLabel}: ¥{Number(entry.value).toLocaleString()}
          </p>
        )
      })}
    </div>
  )
}

export default function MRRChart({
  data,
  projects,
  currentMonth,
  animate = true,
  yCenterValue = 0,
  showCumulative = false,
}: Props) {
  if (data.length === 0 || projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs" style={{ color: 'var(--text-dim)' }}>
        データなし — プロジェクトのMRRを入力してください
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={data} margin={{ top: 8, right: showCumulative ? 4 : 8, left: 0, bottom: 0 }}>
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
          yAxisId="left"
          tick={{ fontSize: 10, fill: '#444' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatAxis}
          width={48}
          domain={yCenterValue > 0
            ? [0, (dataMax: number) => Math.max(Math.ceil(dataMax * 1.05), yCenterValue * 2)]
            : [0, 'auto']}
        />
        {showCumulative && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10, fill: '#555' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatAxis}
            width={44}
            domain={[0, 'auto']}
          />
        )}
        <Tooltip content={(props) => <ChartTooltip {...props} currentMonth={currentMonth} />} />
        <ReferenceLine
          yAxisId="left"
          x={currentMonth}
          stroke="#333"
          strokeDasharray="3 3"
        />
        {projects.map((p, i) => (
          <>
            {/* 実績エリア (フェードするグラデーション塗り) */}
            <Area
              key={`${p.id}-actual`}
              yAxisId="left"
              type="monotone"
              dataKey={p.name}
              stroke={p.color}
              strokeWidth={2}
              fill={`url(#mrr-grad-${i})`}
              dot={false}
              activeDot={{ r: 4, fill: p.color }}
              connectNulls={false}
              isAnimationActive={animate}
            />
            {/* 予測ライン (dashed) */}
            <Line
              key={`${p.id}-proj`}
              yAxisId="left"
              type="monotone"
              dataKey={`${p.name}_proj`}
              stroke={p.color}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 3, fill: p.color }}
              connectNulls={false}
              strokeOpacity={0.5}
              isAnimationActive={animate}
            />
            {/* ローンチ月マーカー */}
            {p.launchMonth && p.launchMrr != null && (
              <ReferenceDot
                key={`${p.id}-launch`}
                yAxisId="left"
                x={p.launchMonth}
                y={p.launchMrr}
                r={4}
                fill={p.color}
                stroke="#000"
                strokeWidth={1.5}
              />
            )}
          </>
        ))}
        {showCumulative && (
          /* 累計売上 実績（右軸・白線） */
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="__cum"
            stroke={CUM_COLOR}
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 3, fill: CUM_COLOR }}
            connectNulls={false}
            isAnimationActive={animate}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
