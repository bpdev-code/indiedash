import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  const { data: feedback } = await supabase
    .from('feedback')
    .select('id, message, created_at, profiles(email)')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>
        ADMIN — FEEDBACK ({feedback?.length ?? 0})
      </h1>

      {!feedback || feedback.length === 0 ? (
        <p className="text-xs py-8 text-center" style={{ color: 'var(--text-dim)' }}>
          まだフィードバックはありません
        </p>
      ) : (
        <div className="space-y-2">
          {feedback.map(f => (
            <div key={f.id} className="p-3 rounded text-xs space-y-1"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--accent)' }}>
                  {(f.profiles as unknown as { email: string } | null)?.email ?? '不明'}
                </span>
                <span style={{ color: 'var(--text-dim)' }}>
                  {new Date(f.created_at).toLocaleString('ja-JP')}
                </span>
              </div>
              <p style={{ color: 'var(--text)' }}>{f.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
