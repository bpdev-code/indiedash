import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DeleteButton from './delete-button'

const STATUS_COLOR: Record<string, string> = {
  idea: '#555', dev: '#7C3AED', live: '#00E5FF', archived: '#333',
}
const STATUS_LABEL: Record<string, string> = {
  idea: 'IDEA', dev: 'DEV', live: 'LIVE', archived: 'ARCHIVED',
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('status')
    .order('created_at')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const activeCount = (projects ?? []).filter(p => p.status !== 'archived').length
  const limit = profile?.plan === 'pro' ? Infinity : 3

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>PROJECTS</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
            {activeCount}/{limit === Infinity ? '∞' : limit} 件
          </p>
        </div>
        <Link href="/projects/new" className="text-xs px-4 py-2 rounded font-bold"
          style={{ background: 'var(--accent)', color: '#000' }}>
          + NEW PROJECT
        </Link>
      </div>

      {(projects ?? []).length === 0 ? (
        <p className="text-xs py-16 text-center" style={{ color: 'var(--text-dim)' }}>
          プロジェクトなし —{' '}
          <Link href="/projects/new" style={{ color: 'var(--accent)' }}>最初のプロジェクトを追加</Link>
        </p>
      ) : (
        <div className="space-y-2">
          {(projects ?? []).map(p => (
            <div key={p.id} className="p-3 rounded"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: p.status === 'archived' ? 0.5 : 1 }}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{p.name}</p>
                  {p.launch_month && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{p.launch_month}</p>
                  )}
                </div>
                <span className="text-sm font-bold" style={{ color: p.color }}>
                  ¥{(p.mrr ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 pl-5">
                <span className="text-xs px-2 py-0.5 rounded"
                  style={{ color: STATUS_COLOR[p.status], background: '#111' }}>
                  {STATUS_LABEL[p.status]}
                </span>
                <div className="flex-1" />
                <Link href={`/projects/${p.id}/edit`}
                  className="text-xs px-2 py-1 rounded hover:bg-[#222] transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  EDIT
                </Link>
                <DeleteButton id={p.id} name={p.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
