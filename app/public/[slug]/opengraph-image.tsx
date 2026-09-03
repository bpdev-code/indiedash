import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { buildAggregateChart } from '@/lib/public-chart'
import { loadOgFont } from '@/lib/og-font'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PUBLIC_HOST = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/^https?:\/\//, '') || 'indiedash.vercel.app'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!profile) return new Response('Not found', { status: 404 })

  const { data: settings } = await supabase
    .from('public_settings')
    .select('is_public')
    .eq('user_id', profile.id)
    .single()

  if (!settings?.is_public) return new Response('Not found', { status: 404 })

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, mrr, color, users_count, launch_month')
    .eq('user_id', profile.id)
    .eq('status', 'live')

  const totalMRR = (projects ?? []).reduce((s: number, p: { mrr?: number }) => s + (p.mrr || 0), 0)
  const totalCustomers = (projects ?? []).reduce((s: number, p: { users_count?: number }) => s + (p.users_count || 0), 0)

  const liveIds = (projects ?? []).map((p: { id: string }) => p.id)
  let chartPointsData: { month: string; actual: number | null; forecast: number | null }[] = []
  let growthRate: number | null = null
  let cumulativeMRR = 0
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
      (projects ?? []).map((p: { id: string; mrr?: number; launch_month?: string | null }) =>
        ({ id: p.id, mrr: p.mrr ?? 0, launchMonth: p.launch_month ?? null })),
      historyByProject,
      currentMonth
    )
  }

  const growthLabel = growthRate === null ? '—' : `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`
  const growthColor = growthRate === null ? '#666' : growthRate >= 0 ? '#10B981' : '#EF4444'

  const maxTotal = Math.max(...chartPointsData.map(d => d.actual ?? d.forecast ?? 0), 1)
  const hasHistory = chartPointsData.some(d => d.actual != null || d.forecast != null)
  const fontData = await loadOgFont()

  // SVG line chart paths
  const CW = 1056, CH = 72, PX = 6, PY = 6
  const n = chartPointsData.length
  const xAt = (i: number) => PX + (n > 1 ? i / (n - 1) : 0.5) * (CW - PX * 2)
  const yAt = (v: number) => PY + (1 - v / maxTotal) * (CH - PY * 2)

  const actualPts = chartPointsData
    .map((d, i) => (d.actual != null ? { x: xAt(i), y: yAt(d.actual) } : null))
    .filter((p): p is { x: number; y: number } => p !== null)
  const actualLine = actualPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = actualPts.length > 0
    ? `${actualLine} L${actualPts[actualPts.length - 1].x.toFixed(1)},${CH} L${actualPts[0].x.toFixed(1)},${CH} Z`
    : ''

  const forecastPts = chartPointsData
    .map((d, i) => (d.forecast != null ? { x: xAt(i), y: yAt(d.forecast) } : null))
    .filter((p): p is { x: number; y: number } => p !== null)
  const forecastLine = actualPts.length > 0 && forecastPts.length > 0
    ? `M${actualPts[actualPts.length - 1].x.toFixed(1)},${actualPts[actualPts.length - 1].y.toFixed(1)} ` +
      forecastPts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    : ''

  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630, background: '#080808',
        display: 'flex', flexDirection: 'column',
        padding: '56px 72px', fontFamily: 'NotoSansJP, monospace',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 36 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>INDIE</span>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#00E5FF' }}>DASH</span>
          <span style={{ fontSize: 13, color: '#444', marginLeft: 14 }}>/{slug}</span>
        </div>

        {/* MRR + KPIs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 12, color: '#444', letterSpacing: 3, marginBottom: 6 }}>
              MONTHLY RECURRING REVENUE
            </span>
            <span style={{ fontSize: 88, fontWeight: 700, color: '#00E5FF', lineHeight: 1 }}>
              ¥{totalMRR.toLocaleString()}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 11, color: '#444', letterSpacing: 2, marginBottom: 6 }}>前月比</span>
              <span style={{ fontSize: 30, fontWeight: 700, color: growthColor }}>{growthLabel}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 11, color: '#444', letterSpacing: 2, marginBottom: 6 }}>累計売上</span>
              <span style={{ fontSize: 30, fontWeight: 700, color: '#fff' }}>¥{cumulativeMRR.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 11, color: '#444', letterSpacing: 2, marginBottom: 6 }}>顧客数</span>
              <span style={{ fontSize: 30, fontWeight: 700, color: '#fff' }}>{totalCustomers.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Line Chart */}
        {hasHistory && (
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 24 }}>
            <span style={{ fontSize: 10, color: '#333', letterSpacing: 2, marginBottom: 8 }}>
              MRR TREND
            </span>
            <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`} style={{ display: 'block' }}>
              <path d={areaPath} fill="#00E5FF" fillOpacity="0.08" />
              <path d={actualLine} fill="none" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d={forecastLine} fill="none" stroke="#00E5FF" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.5" />
              {actualPts.map((p, i) => (
                <circle key={`a${i}`} cx={p.x} cy={p.y}
                  r={i === actualPts.length - 1 ? 5 : 3}
                  fill={i === actualPts.length - 1 ? '#00E5FF' : '#080808'}
                  stroke="#00E5FF" strokeWidth="1.5" />
              ))}
              {forecastPts.map((p, i) => (
                <circle key={`f${i}`} cx={p.x} cy={p.y} r={3} fill="#080808" stroke="#00E5FF" strokeWidth="1.5" strokeOpacity="0.5" />
              ))}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6 }}>
              {chartPointsData.map((d, i) => (
                <span key={i} style={{ fontSize: 11, color: d.month === currentMonth ? '#555' : '#2a2a2a' }}>
                  {parseInt(d.month.split('-')[1])}月
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(projects ?? []).slice(0, 4).map((p: { id: string; name: string; color: string; mrr?: number }, i: number) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#0d0d0d', border: '1px solid #1a1a1a',
              borderRadius: 6, padding: '8px 14px',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.color }} />
              <span style={{ fontSize: 15, color: '#777' }}>{p.name}</span>
              <span style={{ fontSize: 15, color: p.color, marginLeft: 2 }}>
                ¥{(p.mrr ?? 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          position: 'absolute', bottom: 44, left: 72, right: 72,
          display: 'flex', justifyContent: 'space-between',
          borderTop: '1px solid #1a1a1a', paddingTop: 18,
        }}>
          <span style={{ fontSize: 12, color: '#555' }}>
            Powered by INDIEDASH — {PUBLIC_HOST}
          </span>
          <span style={{ fontSize: 12, color: '#333' }}>
            {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [{ name: 'NotoSansJP', data: fontData, weight: 700 as const, style: 'normal' as const }]
        : [],
    }
  )
}
