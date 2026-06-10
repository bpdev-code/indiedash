import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `${slug} — INDIEDASH`,
    openGraph: {
      images: [`/public/${slug}/opengraph-image`],
    },
  }
}

export default async function PublicDashboardPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, plan')
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
    .select('id, name, mrr, color')
    .eq('user_id', profile.id)
    .eq('status', 'live')

  const totalMRR = (projects ?? []).reduce((s, p) => s + (p.mrr || 0), 0)
  const isFree = profile.plan === 'free'

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
        <div>
          <p className="text-xs tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>MRR</p>
          <p className="text-5xl font-bold" style={{ color: 'var(--accent)' }}>
            ¥{totalMRR.toLocaleString()}
          </p>
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
          {isFree && (
            <a href="/" className="hover:underline" style={{ color: 'var(--accent)' }}>
              Powered by INDIEDASH
            </a>
          )}
        </div>
      </main>
    </div>
  )
}
