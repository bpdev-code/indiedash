import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { submitFeedback } from '@/app/actions/feedback'
import FeedbackForm from './feedback-form'

export default async function FeedbackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myFeedback } = await supabase
    .from('feedback')
    .select('id, message, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <h1 className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>FEEDBACK</h1>

      <section className="p-4 rounded space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          気づいた不具合、欲しい機能、なんでもどうぞ。運営に直接届きます。
        </p>
        <FeedbackForm action={submitFeedback} />
      </section>

      {myFeedback && myFeedback.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>送信済み</p>
          {myFeedback.map(f => (
            <div key={f.id} className="p-3 rounded text-xs space-y-1"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--text)' }}>{f.message}</p>
              <p style={{ color: 'var(--text-dim)' }}>
                {new Date(f.created_at).toLocaleString('ja-JP')}
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
