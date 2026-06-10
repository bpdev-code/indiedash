import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  if (!sig) return new Response('Missing stripe-signature', { status: 400 })

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    // 一回払いはサブスクリプションではないので無視
    if (session.mode !== 'subscription') return Response.json({ received: true })

    const customerId = session.customer as string
    if (!customerId) return Response.json({ received: true })

    // metadata.user_id は攻撃者が操作できるため、customer_id で本人確認する
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (profile) {
      await supabaseAdmin
        .from('profiles')
        .update({ plan: 'pro' })
        .eq('id', profile.id)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', subscription.customer as string)
      .single()

    if (profile) {
      await supabaseAdmin
        .from('profiles')
        .update({ plan: 'free' })
        .eq('id', profile.id)
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object
    const isActive = subscription.status === 'active'
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', subscription.customer as string)
      .single()

    if (profile) {
      await supabaseAdmin
        .from('profiles')
        .update({ plan: isActive ? 'pro' : 'free' })
        .eq('id', profile.id)
    }
  }

  return Response.json({ received: true })
}
