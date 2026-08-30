import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { buildAggregateChart } from '@/lib/public-chart'

type Props = { params: Promise<{ slug: string }> }

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
    .select('id, name, mrr, color, users_count, launch_month')
    .eq('user_id', profile.id)
    .eq('status', 'live')

  const totalMRR = (projects ?? []).reduce((s, p) => s + (p.mrr || 0), 0)
  const totalCustomers = (projects ?? []).reduce((s, p) => s + (p.users_count || 0), 0)

  const liveIds = (projects ?? []).map(p => p.id)
  let growthRate: number | null = null
  let cumulativeMRR = 0
  let chartPointsData: { month: string; actual: number | null; forecast: number | null }[] = []
  const currentMonth = new Date().toISOString().slice(0, 7)

  if (liveIds.length > 0) {
    const { data: history } = await supabase
      .from('revenue_history')
      .select('month, mrr, project_id')
      .in('project_id', liveIds)
      .order('month')

    const totals: Record<string, number> = {}
    const historyByProject: Record<string, Record<string, number>> = {}
    for (const h of history ?? []) {
      totals[h.month] = (totals[h.month] ?? 0) + (h.mrr ?? 0)
      if (!historyByProject[h.project_id]) historyByProject[h.project_id] = {}
      historyByProject[h.project_id][h.month] = h.mrr ?? 0
    }
    const sortedMonths = Object.keys(totals).sort()
    cumulativeMRR = sortedMonths.reduce((s, m) => s + totals[m], 0)
    if (sortedMonths.length >= 2) {
      const prev = totals[sortedMonths[sortedMonths.length - 2]]
      const curr = totals[sortedMonths[sortedMonths.length - 1]]
      if (prev > 0) growthRate = ((curr - prev) / prev) * 100
    }

    chartPointsData = buildAggregateChart(
      (projects ?? []).map(p => ({ id: p.id, mrr: p.mrr ?? 0, launchMonth: p.launch_month })),
      historyByProject,
      currentMonth
    )
  }

  const growthLabel = growthRate === null ? '—' : `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`
  const growthColor = growthRate === null ? 'var(--text-dim)' : growthRate >= 0 ? '#10B981' : '#EF4444'
  const hasHistory = chartPointsData.some(d => d.actual != null || d.forecast != null)
  const maxTotal = Math.max(...chartPointsData.map(d => d.actual ?? d.forecast ?? 0), 1)
  const CW = 800, CH = 140, CPAD = 8
  const n = chartPointsData.length
  const xAt = (i: number) => CPAD + (n > 1 ? i / (n - 1) : 0.5) * (CW - CPAD * 2)
  const yAt = (v: number) => CPAD + (1 - v / maxTotal) * (CH - CPAD * 2)

  const actualPts = chartPointsData
    .map((d, i) => (d.actual != null ? { x: xAt(i), y: yAt(d.actual) } : null))
    .filter((p): p is { x: number; y: number } => p !== null)
  const actualLine = actualPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = actualPts.length > 0
    ? `${actualLine} L${actualPts[actualPts.length - 1].x.toFixed(1)},${CH} L${actualPts[0].x.toFixed(1)},${CH} Z`
    : ''

  // 予測線: 最後の実績点 → 予測点をつなぐ
  const forecastPts = chartPointsData
    .map((d, i) => (d.forecast != null ? { x: xAt(i), y: yAt(d.forecast) } : null))
    .filter((p): p is { x: number; y: number } => p !== null)
  const forecastLine = actualPts.length > 0 && forecastPts.length > 0
    ? `M${actualPts[actualPts.length - 1].x.toFixed(1)},${actualPts[actualPts.length - 1].y.toFixed(1)} ` +
      forecastPts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
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
              <path d={actualLine} fill="none" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d={forecastLine} fill="none" stroke="#00E5FF" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.5" />
              {actualPts.map((p, i) => (
                <circle key={`a${i}`} cx={p.x} cy={p.y}
                  r={i === actualPts.length - 1 ? 5 : 3}
                  fill={i === actualPts.length - 1 ? '#00E5FF' : 'var(--bg-card)'}
                  stroke="#00E5FF" strokeWidth="1.5" />
              ))}
              {forecastPts.map((p, i) => (
                <circle key={`f${i}`} cx={p.x} cy={p.y} r={3} fill="var(--bg-card)" stroke="#00E5FF" strokeWidth="1.5" strokeOpacity="0.5" />
              ))}
            </svg>
            <div className="flex justify-between pt-1">
              {chartPointsData.map((d, i) => (
                <span key={i} className="text-[10px]" style={{ color: d.month === currentMonth ? 'var(--text-muted)' : 'var(--text-dim)' }}>
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
