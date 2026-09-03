'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ProjectStatus } from '@/types'
import { DEMO_COLORS, DEMO_MAX_PROJECTS, sanitizeDemoProjects } from '@/lib/demo-store'

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

// プロジェクト新規作成時のみ使用: launch_month から現在月までをバックフィル
// ignoreDuplicates: true で既存データを上書きしない
async function backfillRevenueHistory(
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
    { onConflict: 'project_id,month', ignoreDuplicates: true }
  )
}

// プロジェクト更新時のみ使用: 当月のみ記録（過去の履歴を上書きしない）
async function recordCurrentMonthRevenue(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  mrr: number,
) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  await supabase.from('revenue_history').upsert(
    { project_id: projectId, month: currentMonth, mrr },
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

  if (project) {
    await backfillRevenueHistory(supabase, project.id, mrr, launch_month)
  }

  revalidatePath('/dashboard')
  revalidatePath('/projects')
  redirect('/projects')
}

// お試し（/demo）で作ったプロジェクトを、サインイン後のアカウントへ取り込む。
// クライアントの localStorage から渡された配列をそのまま信用せず、sanitize してから挿入する。
export async function importDemoProjects(rawItems: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const items = sanitizeDemoProjects(rawItems).slice(0, DEMO_MAX_PROJECTS)
  if (items.length === 0) return { imported: 0, skipped: 0 }

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

  const limit = profile?.plan === 'free' ? 3 : Infinity
  let existing = count ?? 0
  let imported = 0
  let skipped = 0

  for (const item of items) {
    const countsTowardLimit = item.status !== 'archived'
    if (countsTowardLimit && existing >= limit) { skipped++; continue }

    const color = DEMO_COLORS.includes(item.color) ? item.color : DEMO_COLORS[0]
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: item.name,
        status: item.status,
        color,
        mrr: item.mrr,
        price: item.price,
        users_count: item.customers,
        payment_provider: 'manual',
        launch_month: item.launchMonth,
      })
      .select('id')
      .single()

    if (error || !project) { skipped++; continue }

    // サンプルで編集した月次履歴をそのまま持ち込む
    const rows = Object.entries(item.history).map(([month, mrr]) => ({
      project_id: project.id, month, mrr: Math.max(0, Math.round(mrr)),
    }))
    if (rows.length > 0) {
      await supabase.from('revenue_history').upsert(rows, { onConflict: 'project_id,month' })
    } else {
      await backfillRevenueHistory(supabase, project.id, item.mrr, item.launchMonth)
    }
    if (countsTowardLimit) existing++
    imported++
  }

  revalidatePath('/dashboard')
  revalidatePath('/projects')
  return { imported, skipped }
}

export async function updateProject(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const mrr = parseInt(formData.get('mrr') as string) || 0
  const launch_month = (formData.get('launch_month') as string) || null
  const price = parseInt(formData.get('price') as string) || null
  const payment_provider = (formData.get('payment_provider') as string) || 'manual'
  const users_count = parseInt(formData.get('users_count') as string) || 0

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
      users_count,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  // 当月のみ更新（過去の成長履歴を保持する）
  await recordCurrentMonthRevenue(supabase, id, mrr)

  revalidatePath('/dashboard')
  revalidatePath('/projects')
  redirect('/projects')
}

export async function updateRevenueHistory(
  projectId: string,
  history: { month: string; mrr: number }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return { error: 'プロジェクトが見つかりません' }

  const { error } = await supabase
    .from('revenue_history')
    .upsert(
      history.map(h => ({ project_id: projectId, month: h.month, mrr: Math.max(0, h.mrr) })),
      { onConflict: 'project_id,month' }
    )

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/projects')
  return { success: true }
}

export async function deleteProject(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.from('projects').delete().eq('id', id).eq('user_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/projects')
}
