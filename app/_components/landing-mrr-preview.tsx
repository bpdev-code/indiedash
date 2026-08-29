'use client'

import { useState } from 'react'

interface ProjectSeries {
  key: string
  name: string
  color: string
  actual: number[] // 実績7ヶ月分
  projected: number // 翌月の予測値
}

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月']

const PROJECTS: ProjectSeries[] = [
  { key: 'a', name: 'タスク管理アプリ', color: '#00E5FF', actual: [1680, 2720, 3240, 4480, 6240, 7920, 9800], projected: 11960 },
  { key: 'b', name: '請求書作成ツール', color: '#7C3AED', actual: [2520, 4080, 4860, 6720, 9360, 11880, 14700], projected: 17940 },
]

const W = 400
const H = 120
const PAD = { top: 10, right: 10, bottom: 20, left: 10 }
const IW = W - PAD.left - PAD.right
const IH = H - PAD.top - PAD.bottom
const N = 8

function xAt(i: number) {
  return PAD.left + (i / (N - 1)) * IW
}

export function LandingMRRPreview() {
  const [selected, setSelected] = useState<'all' | 'a' | 'b'>('all')
  const visible = selected === 'all' ? PROJECTS : PROJECTS.filter(p => p.key === selected)

  const max = Math.max(...visible.flatMap(p => [...p.actual, p.projected]), 1)
  const yAt = (v: number) => PAD.top + IH - (v / max) * IH

  return (
    <div>
      {/* プロジェクト切り替え（実際のダッシュボードと同じ挙動のモック） */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setSelected('all')}
          className="px-2 py-0.5 text-xs rounded transition-colors"
          style={{
            background: selected === 'all' ? '#222' : 'transparent',
            color: selected === 'all' ? '#fff' : 'var(--text-dim)',
            border: `1px solid ${selected === 'all' ? '#333' : 'var(--border)'}`,
          }}
        >
          ALL
        </button>
        {PROJECTS.map(p => (
          <button
            key={p.key}
            onClick={() => setSelected(p.key as 'a' | 'b')}
            className="px-2 py-0.5 text-xs rounded transition-colors flex items-center gap-1"
            style={{
              background: selected === p.key ? '#222' : 'transparent',
              color: selected === p.key ? p.color : 'var(--text-dim)',
              border: `1px solid ${selected === p.key ? p.color : 'var(--border)'}`,
            }}
          >
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: p.color }} />
            {p.name}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
        <defs>
          {visible.map(p => (
            <linearGradient key={p.key} id={`landing-grad-${p.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p.color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={p.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* グリッド */}
        {[0.25, 0.5, 0.75].map(r => (
          <line key={r} x1={PAD.left} y1={PAD.top + IH * (1 - r)} x2={W - PAD.right} y2={PAD.top + IH * (1 - r)}
            stroke="#1a1a1a" strokeWidth="1" />
        ))}

        {visible.map(p => {
          const actualPoints = p.actual.map((v, i) => ({ x: xAt(i), y: yAt(v) }))
          const actualPath = actualPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')
          const area = `${actualPath} L ${actualPoints[actualPoints.length - 1].x} ${H - PAD.bottom} L ${actualPoints[0].x} ${H - PAD.bottom} Z`
          const lastActual = actualPoints[actualPoints.length - 1]
          const projPoint = { x: xAt(N - 1), y: yAt(p.projected) }
          const projPath = `M ${lastActual.x} ${lastActual.y} L ${projPoint.x} ${projPoint.y}`

          return (
            <g key={p.key}>
              <path d={area} fill={`url(#landing-grad-${p.key})`} />
              <path d={actualPath} fill="none" stroke={p.color} strokeWidth="2" />
              <path d={projPath} fill="none" stroke={p.color} strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.5" />
              <circle cx={actualPoints[0].x} cy={actualPoints[0].y} r="3" fill={p.color} />
              <circle cx={lastActual.x} cy={lastActual.y} r="4" fill={p.color} />
              <circle cx={projPoint.x} cy={projPoint.y} r="3" fill={p.color} fillOpacity="0.5" />
            </g>
          )
        })}

        {/* X軸ラベル */}
        {MONTHS.map((m, i) => (
          <text key={m} x={xAt(i)} y={H - 4} textAnchor="middle" fontSize="8" fill="#444">{m}</text>
        ))}
      </svg>
    </div>
  )
}
