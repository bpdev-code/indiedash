import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EditProjectForm } from '../_components/edit-project-form'
import { RevenueHistoryEditor } from '../_components/revenue-history-editor'

type Props = { params: Promise<{ id: string }> }

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: history }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, status, color, mrr, price, payment_provider, launch_month')
      .eq('id', id)
      .single(),
    supabase
      .from('revenue_history')
      .select('month, mrr')
      .eq('project_id', id)
      .order('month', { ascending: true }),
  ])

  if (!project) return notFound()

  return (
    <div className="max-w-lg space-y-6">
      <EditProjectForm project={project} />

      {(history ?? []).length > 0 && (
        <div className="pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
          <RevenueHistoryEditor projectId={id} initialHistory={history ?? []} />
        </div>
      )}
    </div>
  )
}
