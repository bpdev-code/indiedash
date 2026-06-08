'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ProjectStatus } from '@/types'

function generateMonthsBetween(from: string, to: string): string[] {
  const months: string[] = []
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  let y = fy, m = fm
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return months
}

async function upsertRevenueHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  mrr: number,
  launchMonth: string | null
) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const startMonth = launchMonth && launchMonth <= currentMonth ? launchMonth : currentMonth
  const months = generateMonthsBetween(startMonth, currentMonth)

  await supabase.from('revenue_history').upsert(
    months.map(month => ({ project_id: projectId, month, mrr })),
    { onConflict: 'project_id,month' }
  )
}

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .neq('status', 'archived')

  if ((count ?? 0) >= 3 && profile?.plan === 'free') {
    return { error: '無料プランはプロジェクト3件まで。アップグレードしてください。' }
  }

  const name = formData.get('name') as string
  const status = formData.get('status') as ProjectStatus
  const color = formData.get('color') as string
  const mrr = parseInt(formData.get('mrr') as string) || 0
  const launch_month = (formData.get('launch_month') as string) || null

  const price = parseInt(formData.get('price') as string) || null
  const payment_provider = (formData.get('payment_provider') as string) || 'manual'

  const { data: project, error } = await supabase
    .from('projects')
    .insert({ user_id: user.id, name, status, color, mrr, price, payment_provider, launch_month })
    .select('id')
    .single()

  if (error) return { error: error.message }

  if (mrr > 0 && project) {
    await upsertRevenueHistory(supabase, project.id, mrr, launch_month)
  }

  revalidatePath('/dashboard')
  revalidatePath('/projects')
  redirect('/projects')
}

export async function updateProject(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const mrr = parseInt(formData.get('mrr') as string) || 0
  const launch_month = (formData.get('launch_month') as string) || null
  const price = parseInt(formData.get('price') as string) || null
  const payment_provider = (formData.get('payment_provider') as string) || 'manual'

  const { error } = await supabase
    .from('projects')
    .update({
      name: formData.get('name') as string,
      status: formData.get('status') as ProjectStatus,
      color: formData.get('color') as string,
      mrr,
      price,
      payment_provider,
      launch_month,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  if (mrr > 0) {
    await upsertRevenueHistory(supabase, id, mrr, launch_month)
  }

  revalidatePath('/dashboard')
  revalidatePath('/projects')
  redirect('/projects')
}

export async function deleteProject(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.from('projects').delete().eq('id', id).eq('user_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/projects')
}
