'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

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

function monthlyAmountForItems(items: Stripe.SubscriptionItem[]): number {
  let total = 0
  for (const item of items) {
    const price = item.price
    const amount = price.unit_amount ?? 0
    const quantity = item.quantity ?? 1
    const currency = price.currency

    let monthlyAmount = amount * quantity
    if (price.recurring?.interval === 'year') {
      monthlyAmount = Math.round(monthlyAmount / 12)
    } else if (price.recurring?.interval === 'week') {
      monthlyAmount = Math.round(monthlyAmount * 52 / 12)
    } else if (price.recurring?.interval === 'day') {
      monthlyAmount = Math.round(monthlyAmount * 365 / 12)
    }

    // JPY以外は100で割る（cents → ドル等）
    if (currency !== 'jpy') {
      monthlyAmount = Math.round(monthlyAmount / 100)
    }

    total += monthlyAmount
  }
  return total
}

// 全サブスクリプション（解約済み含む）を開始月〜終了月で走査し、月ごとのMRRを再構築する
async function computeMonthlyMRRHistory(stripe: Stripe): Promise<Record<string, number>> {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthlyTotals: Record<string, number> = {}

  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const subs = await stripe.subscriptions.list({
      status: 'all',
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    for (const sub of subs.data) {
      const monthlyAmount = monthlyAmountForItems(sub.items.data)
      if (monthlyAmount <= 0) continue

      const startMonth = new Date((sub.start_date ?? sub.created) * 1000).toISOString().slice(0, 7)
      const endTimestamp = sub.ended_at ?? sub.canceled_at
      const rawEndMonth = endTimestamp
        ? new Date(endTimestamp * 1000).toISOString().slice(0, 7)
        : currentMonth
      const endMonth = rawEndMonth < currentMonth ? rawEndMonth : currentMonth
      if (endMonth < startMonth) continue

      for (const month of generateMonthsBetween(startMonth, endMonth)) {
        monthlyTotals[month] = (monthlyTotals[month] ?? 0) + monthlyAmount
      }
    }

    hasMore = subs.has_more
    if (subs.data.length > 0) {
      startingAfter = subs.data[subs.data.length - 1].id
    }
  }

  return monthlyTotals
}

export async function connectStripe(projectId: string, secretKey: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未ログイン' }

  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  if (profile?.plan !== 'pro') return { error: 'Stripe連携はPROプランのみご利用いただけます' }

  // キーの形式チェック
  if (!secretKey.startsWith('sk_') && !secretKey.startsWith('rk_')) {
    return { error: 'Stripeのキーは sk_ または rk_ で始まります' }
  }

  // Stripeへの接続テスト
  try {
    const stripe = new Stripe(secretKey, { apiVersion: '2026-05-27.dahlia' })
    await stripe.subscriptions.list({ limit: 1 })
  } catch {
    return { error: 'Stripeキーが無効です。権限を確認してください。' }
  }

  // キーを保存
  const { error } = await supabase
    .from('projects')
    .update({ stripe_secret_key: secretKey, payment_provider: 'stripe' })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  // 即時同期
  await syncStripeMRR(projectId)

  revalidatePath('/projects')
  revalidatePath('/dashboard')
  return { success: true }
}

// Stripeからprojectを実際に同期する中核ロジック。
// ユーザー操作（Server Action）とcronジョブ（service roleクライアント）の両方から呼ばれる。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncProjectFromStripe(supabase: SupabaseClient<any>, projectId: string, secretKey: string) {
  const stripe = new Stripe(secretKey, { apiVersion: '2026-05-27.dahlia' })

  // 全サブスクリプション（解約済み含む）から月ごとのMRR履歴を再構築
  const monthlyHistory = await computeMonthlyMRRHistory(stripe)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const mrr = monthlyHistory[currentMonth] ?? 0

  await supabase
    .from('projects')
    .update({ mrr })
    .eq('id', projectId)

  // revenue_historyに過去分すべてを反映（Stripe実データで上書き）
  const historyEntries = Object.entries(monthlyHistory)
  if (historyEntries.length > 0) {
    await supabase.from('revenue_history').upsert(
      historyEntries.map(([month, monthMrr]) => ({ project_id: projectId, month, mrr: monthMrr })),
      { onConflict: 'project_id,month' }
    )
  } else {
    await supabase.from('revenue_history').upsert(
      { project_id: projectId, month: currentMonth, mrr },
      { onConflict: 'project_id,month' }
    )
  }

  return mrr
}

export async function syncStripeMRR(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未ログイン' }

  const { data: project } = await supabase
    .from('projects')
    .select('stripe_secret_key, launch_month')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project?.stripe_secret_key) return { error: 'Stripeが連携されていません' }

  const mrr = await syncProjectFromStripe(supabase, projectId, project.stripe_secret_key)

  revalidatePath('/dashboard')
  revalidatePath('/projects')
  return { success: true, mrr }
}

export async function disconnectStripe(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未ログイン' }

  await supabase
    .from('projects')
    .update({ stripe_secret_key: null, payment_provider: 'manual' })
    .eq('id', projectId)
    .eq('user_id', user.id)

  revalidatePath('/projects')
  return { success: true }
}

export async function getStripeStatus(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { connected: false, mrr: 0, plan: 'free' }

  const [{ data: project }, { data: profile }] = await Promise.all([
    supabase.from('projects').select('stripe_secret_key, mrr').eq('id', projectId).eq('user_id', user.id).single(),
    supabase.from('profiles').select('plan').eq('id', user.id).single(),
  ])

  return {
    connected: !!project?.stripe_secret_key,
    mrr: project?.mrr ?? 0,
    plan: profile?.plan ?? 'free',
  }
}
