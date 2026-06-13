import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    ).then(r => r.text())
    const match = css.match(/src: url\(([^)]+)\)/)
    if (!match) return null
    return fetch(match[1]).then(r => r.arrayBuffer())
  } catch {
    return null
  }
}

function getLast6Months(): string[] {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, plan')
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
    .select('id, name, mrr, color')
    .eq('user_id', profile.id)
    .eq('status', 'live')

  const totalMRR = (projects ?? []).reduce((s: number, p: { mrr?: number }) => s + (p.mrr || 0), 0)
  const isFree = profile.plan === 'free'

  // Fetch last 6 months of history for the chart
  const last6 = getLast6Months()
  const liveIds = (projects ?? []).map((p: { id: string }) => p.id)
  let chartData: { month: string; total: number }[] = last6.map(m => ({ month: m, total: 0 }))

  if (liveIds.length > 0) {
    const { data: history } = await supabase
      .from('revenue_history')
      .select('month, mrr')
      .in('project_id', liveIds)
      .gte('month', last6[0])
      .order('month')

    const totals: Record<string, number> = {}
    for (const h of history ?? []) {
      totals[h.month] = (totals[h.month] ?? 0) + (h.mrr ?? 0)
    }
    chartData = last6.map(m => ({ month: m, total: totals[m] ?? 0 }))
  }

  const maxTotal = Math.max(...chartData.map(d => d.total), 1)
  const BAR_H = 60
  const hasHistory = chartData.some(d => d.total > 0)
  const fontData = await loadFont()

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

        {/* MRR */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 28 }}>
          <span style={{ fontSize: 12, color: '#444', letterSpacing: 3, marginBottom: 6 }}>
            MONTHLY RECURRING REVENUE
          </span>
          <span style={{ fontSize: 88, fontWeight: 700, color: '#00E5FF', lineHeight: 1 }}>
            ¥{totalMRR.toLocaleString()}
          </span>
        </div>

        {/* Bar Chart */}
        {hasHistory && (
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 24 }}>
            <span style={{ fontSize: 10, color: '#333', letterSpacing: 2, marginBottom: 10 }}>
              MRR TREND (6 MONTHS)
            </span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: BAR_H + 20 }}>
              {chartData.map((d, i) => {
                const barH = Math.max(2, Math.round((d.total / maxTotal) * BAR_H))
                const isLatest = i === chartData.length - 1
                return (
                  <div key={i} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 4, width: 160,
                  }}>
                    <div style={{
                      width: 160,
                      height: barH,
                      background: isLatest ? '#00E5FF' : '#0a2a30',
                      borderRadius: '3px 3px 0 0',
                      border: isLatest ? 'none' : '1px solid #1a3a3f',
                    }} />
                    <span style={{ fontSize: 11, color: isLatest ? '#555' : '#333' }}>
                      {parseInt(d.month.split('-')[1])}月
                    </span>
                  </div>
                )
              })}
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
          <span style={{ fontSize: 12, color: isFree ? '#555' : '#333' }}>
            {isFree ? 'Powered by INDIEDASH — indiedash.app' : 'indiedash.app'}
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
