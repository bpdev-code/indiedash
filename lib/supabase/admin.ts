import { createClient } from '@supabase/supabase-js'

// service role — RLSを無視して全ユーザーのデータにアクセスする（cronジョブ専用、クライアントに露出しないこと）
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
