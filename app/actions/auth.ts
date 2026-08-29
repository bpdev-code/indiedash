'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_WINDOW_MINUTES = 15

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }

  // トリガーで自動作成されるが、emailが未反映の場合に備えてupsert
  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      email: data.user.email ?? email,
      plan: 'free',
    }, { onConflict: 'id', ignoreDuplicates: true })
  }

  if (!data.session) {
    // メール確認待ち状態
    return { error: 'メール確認メールを送りました。確認後ログインしてください。' }
  }

  redirect('/dashboard')
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const admin = createAdminClient()
  const windowStart = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000).toISOString()

  const { count } = await admin
    .from('login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .eq('success', false)
    .gte('attempted_at', windowStart)

  if ((count ?? 0) >= MAX_LOGIN_ATTEMPTS) {
    return { error: `ログイン試行回数が上限を超えました。${LOGIN_WINDOW_MINUTES}分後に再度お試しください。` }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  await admin.from('login_attempts').insert({ email, success: !error })

  if (error) return { error: error.message }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}
