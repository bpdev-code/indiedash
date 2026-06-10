import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

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

  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630, background: '#080808',
        display: 'flex', flexDirection: 'column',
        padding: '64px 72px', fontFamily: 'monospace',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 48 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>INDIE</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#00E5FF' }}>DASH</span>
          <span style={{ fontSize: 14, color: '#444', marginLeft: 16 }}>/{slug}</span>
        </div>

        {/* MRR */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 48 }}>
          <span style={{ fontSize: 13, color: '#444', letterSpacing: 3, marginBottom: 8 }}>
            MONTHLY RECURRING REVENUE
          </span>
          <span style={{ fontSize: 96, fontWeight: 700, color: '#00E5FF', lineHeight: 1 }}>
            ¥{totalMRR.toLocaleString()}
          </span>
        </div>

        {/* Projects */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {(projects ?? []).slice(0, 4).map((p: { id: string; name: string; color: string; mrr?: number }, i: number) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#0d0d0d', border: '1px solid #1a1a1a',
              borderRadius: 6, padding: '10px 16px',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
              <span style={{ fontSize: 16, color: '#888' }}>{p.name}</span>
              <span style={{ fontSize: 16, color: p.color, marginLeft: 4 }}>
                ¥{(p.mrr ?? 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          position: 'absolute', bottom: 48, left: 72, right: 72,
          display: 'flex', justifyContent: 'space-between',
          borderTop: '1px solid #1a1a1a', paddingTop: 20,
        }}>
          <span style={{ fontSize: 13, color: isFree ? '#555' : '#333' }}>
            {isFree ? 'Powered by INDIEDASH — indiedash.app' : 'indiedash.app'}
          </span>
          <span style={{ fontSize: 13, color: '#333' }}>
            {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
          </span>
        </div>
      </div>
    ),
    size,
  )
}
