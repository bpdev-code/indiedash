'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Stripe from 'stripe'

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

  const stripe = new Stripe(project.stripe_secret_key, { apiVersion: '2026-05-27.dahlia' })

  // アクティブなサブスクリプションを全件取得
  let mrr = 0
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const subs = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    for (const sub of subs.data) {
      for (const item of sub.items.data) {
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

        mrr += monthlyAmount
      }
    }

    hasMore = subs.has_more
    if (subs.data.length > 0) {
      startingAfter = subs.data[subs.data.length - 1].id
    }
  }

  // projectのMRRを更新
  await supabase
    .from('projects')
    .update({ mrr })
    .eq('id', projectId)
    .eq('user_id', user.id)

  // revenue_historyに記録
  const currentMonth = new Date().toISOString().slice(0, 7)
  await supabase.from('revenue_history').upsert(
    { project_id: projectId, month: currentMonth, mrr },
    { onConflict: 'project_id,month' }
  )

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
