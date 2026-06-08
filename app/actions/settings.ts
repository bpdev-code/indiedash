'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateSlug(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未ログイン' }

  const slug = (formData.get('slug') as string).toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (!slug) return { error: 'slugが無効です' }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', slug)
    .neq('id', user.id)
    .single()

  if (existing) return { error: 'そのslugはすでに使われています' }

  const { error } = await supabase
    .from('profiles')
    .update({ slug })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function updatePublicSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未ログイン' }

  const is_public = formData.get('is_public') === 'true'

  const { error } = await supabase
    .from('public_settings')
    .upsert({ user_id: user.id, is_public }, { onConflict: 'user_id' })

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function createStripeCheckout() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未ログイン' }

  const { stripe } = await import('@/lib/stripe')
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({ email: profile?.email })
    customerId = customer.id
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    metadata: { user_id: user.id },
  })

  return { url: session.url }
}
