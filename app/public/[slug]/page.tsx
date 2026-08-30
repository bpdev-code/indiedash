import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

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
