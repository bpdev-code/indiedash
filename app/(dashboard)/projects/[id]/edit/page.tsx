import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EditPageClient } from '../_components/edit-page-client'

type Props = { params: Promise<{ id: string }> }

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: history }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, status, color, mrr, price, payment_provider, launch_month, users_count, stripe_secret_key')
      .eq('id', id)
      .single(),
    supabase
      .from('revenue_history')
      .select('month, mrr')
      .eq('project_id', id)
      .order('month', { ascending: true }),
  ])

  if (!project) return notFound()

  // stripe_secret_keyはクライアントに渡さない（接続有無のフラグだけ渡す）
  const { stripe_secret_key, ...safeProject } = project
  const stripeConnected = !!stripe_secret_key

  return <EditPageClient project={safeProject} initialHistory={history ?? []} stripeConnected={stripeConnected} />
}
