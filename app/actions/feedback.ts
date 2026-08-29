'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitFeedback(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未ログイン' }

  const message = (formData.get('message') as string)?.trim()
  if (!message) return { error: '内容を入力してください' }

  const { error } = await supabase
    .from('feedback')
    .insert({ user_id: user.id, message })

  if (error) return { error: error.message }

  revalidatePath('/feedback')
  return { success: true }
}
