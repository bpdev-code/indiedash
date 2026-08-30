import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

function getLast6Months(): string[] {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const ogImage = `${process.env.NEXT_PUBLIC_APP_URL}/public/${slug}/opengraph-image`
  return {
    title: `${slug} — INDIEDASH`,
    openGraph: {
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImage],
    },
  }
}

export default async function PublicDashboardPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug')
    .eq('slug', slug)
    .single()

  if (!profile) return notFound()

  const { data: settings } = await supabase
    .from('public_settings')
    .select('is_public')
    .eq('user_id', profile.id)
    .single()

  if (!settings?.is_public) return notFound()

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, mrr, color, users_count')
    .eq('user_id', profile.id)
    .eq('status', 'live')

  const totalMRR = (projects ?? []).reduce((s, p) => s + (p.mrr || 0), 0)
  const totalCustomers = (projects ?? []).reduce((s, p) => s + (p.users_count || 0), 0)

  const liveIds = (projects ?? []).map(p => p.id)
  let growthRate: number | null = null
  let cumulativeMRR = 0

  if (liveIds.length > 0) {
    const { data: history } = await supabase
      .from('revenue_history')
      .select('month, mrr')
      .in('project_id', liveIds)
      .order('month')

    const totals: Record<string, number> = {}
    for (const h of history ?? []) {
      totals[h.month] = (totals[h.month] ?? 0) + (h.mrr ?? 0)
    }
    const sortedMonths = Object.keys(totals).sort()
    cumulativeMRR = sortedMonths.reduce((s, m) => s + totals[m], 0)
    if (sortedMonths.length >= 2) {
      const prev = totals[sortedMonths[sortedMonths.length - 2]]
      const curr = totals[sortedMonths[sortedMonths.length - 1]]
      if (prev > 0) growthRate = ((curr - prev) / prev) * 100
    }
  }

  const growthLabel = growthRate === null ? '—' : `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`
  const growthColor = growthRate === null ? 'var(--text-dim)' : growthRate >= 0 ? '#10B981' : '#EF4444'

  // トレンドチャート用（直近6ヶ月）
  const last6 = getLast6Months()
  const chartTotals: Record<string, number> = {}
  if (liveIds.length > 0) {
    const { data: recentHistory } = await supabase
      .from('revenue_history')
      .select('month, mrr')
      .in('project_id', liveIds)
      .gte('month', last6[0])
      .order('month')
    for (const h of recentHistory ?? []) {
      chartTotals[h.month] = (chartTotals[h.month] ?? 0) + (h.mrr ?? 0)
    }
  }
  const chartData = last6.map(m => ({ month: m, total: chartTotals[m] ?? 0 }))
  const hasHistory = chartData.some(d => d.total > 0)
  const maxTotal = Math.max(...chartData.map(d => d.total), 1)
  const CW = 800, CH = 140, CPAD = 8
  const chartPoints = chartData.map((d, i) => ({
    x: CPAD + (chartData.length > 1 ? i / (chartData.length - 1) : 0.5) * (CW - CPAD * 2),
    y: CPAD + (1 - d.total / maxTotal) * (CH - CPAD * 2),
  }))
  const linePath = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = chartPoints.length > 0
    ? `${linePath} L${chartPoints[chartPoints.length - 1].x.toFixed(1)},${CH} L${chartPoints[0].x.toFixed(1)},${CH} Z`
    : ''

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <header className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: 'var(--border)' }}>
        <a href="/" className="text-sm font-bold tracking-wider">
          INDIE<span style={{ color: 'var(--accent)' }}>DASH</span>
        </a>
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>/{slug}</span>
      </header>

      <main className="flex-1 px-6 py-12 max-w-2xl mx-auto w-full space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>MRR</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>¥{totalMRR.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>前月比</p>
            <p className="text-2xl font-bold" style={{ color: growthColor }}>{growthLabel}</p>
          </div>
          <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>累計売上</p>
            <p className="text-2xl font-bold">¥{cumulativeMRR.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>顧客数</p>
            <p className="text-2xl font-bold">{totalCustomers.toLocaleString()}</p>
          </div>
        </div>

        {hasHistory && (
          <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] tracking-widest mb-3" style={{ color: 'var(--text-dim)' }}>MRR TREND</p>
            <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full" style={{ height: 140 }}>
              <defs>
                <linearGradient id="public-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#public-grad)" />
              <path d={linePath} fill="none" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {chartPoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y}
                  r={i === chartPoints.length - 1 ? 5 : 3}
                  fill={i === chartPoints.length - 1 ? '#00E5FF' : 'var(--bg-card)'}
                  stroke="#00E5FF" strokeWidth="1.5" />
              ))}
            </svg>
            <div className="flex justify-between pt-1">
              {chartData.map((d, i) => (
                <span key={i} className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                  {parseInt(d.month.split('-')[1])}月
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>LIVE PROJECTS</p>
          {(projects ?? []).length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>ライブのプロジェクトなし</p>
          ) : (
            (projects ?? []).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                <span className="text-sm flex-1">{p.name}</span>
                <span className="text-sm font-bold" style={{ color: p.color }}>
                  ¥{(p.mrr ?? 0).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t text-xs flex items-center justify-between"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
          <span>{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}</span>
          <a href="/" className="hover:underline" style={{ color: 'var(--accent)' }}>
            Powered by INDIEDASH
          </a>
        </div>
      </main>
    </div>
  )
}
