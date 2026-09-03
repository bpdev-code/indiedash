import { ImageResponse } from 'next/og'
import { loadOgFont } from '@/lib/og-font'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'INDIEDASH — 複数アプリのMRRを、1画面で管理・公開'

const PUBLIC_HOST = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/^https?:\/\//, '') || 'indiedash.vercel.app'

// サンプルのプロジェクト内訳（LP のモックと同じ数字）
const SAMPLE = [
  { name: 'タスク管理アプリ', mrr: 9800, color: '#00E5FF' },
  { name: '請求書作成ツール', mrr: 14700, color: '#7C3AED' },
]
const SAMPLE_TOTAL = SAMPLE.reduce((s, p) => s + p.mrr, 0)

export default async function Image() {
  const fontData = await loadOgFont()

  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630, background: '#080808',
        display: 'flex', flexDirection: 'column',
        padding: '64px 72px', fontFamily: 'NotoSansJP, monospace',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 48 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>INDIE</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#00E5FF' }}>DASH</span>
          <span style={{ fontSize: 14, color: '#444', marginLeft: 16, letterSpacing: 3 }}>
            FOR INDIE HACKERS
          </span>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 44 }}>
          <span style={{ fontSize: 60, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
            複数アプリのMRRを、
          </span>
          <span style={{ fontSize: 60, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
            1画面で管理・公開。
          </span>
        </div>

        {/* Sample MRR card */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 10,
          padding: '28px 32px',
        }}>
          <span style={{ fontSize: 12, color: '#444', letterSpacing: 3, marginBottom: 8 }}>
            MONTHLY RECURRING REVENUE
          </span>
          <span style={{ fontSize: 64, fontWeight: 700, color: '#00E5FF', lineHeight: 1, marginBottom: 20 }}>
            ¥{SAMPLE_TOTAL.toLocaleString()}
          </span>
          <div style={{ display: 'flex', gap: 12 }}>
            {SAMPLE.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#080808', border: '1px solid #1a1a1a',
                borderRadius: 6, padding: '10px 16px',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                <span style={{ fontSize: 16, color: '#888' }}>{p.name}</span>
                <span style={{ fontSize: 16, color: p.color, marginLeft: 2 }}>
                  ¥{p.mrr.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          position: 'absolute', bottom: 48, left: 72, right: 72,
          display: 'flex', justifyContent: 'space-between',
          borderTop: '1px solid #1a1a1a', paddingTop: 20,
        }}>
          <span style={{ fontSize: 13, color: '#555' }}>
            Stripe連携で自動更新 · 公開URL · OGP画像
          </span>
          <span style={{ fontSize: 13, color: '#555' }}>{PUBLIC_HOST}</span>
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
