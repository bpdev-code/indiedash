import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncProjectFromStripe } from '@/app/actions/stripe-sync'

// Vercel Cronから定期実行され、Stripe連携済みの全プロジェクトのMRRを自動同期する。
// Vercelは設定されたCRON_SECRETを Authorization: Bearer ヘッダーで自動送信する。
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, stripe_secret_key')
    .eq('payment_provider', 'stripe')
    .not('stripe_secret_key', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = await Promise.allSettled(
    (projects ?? []).map(p => syncProjectFromStripe(supabase, p.id, p.stripe_secret_key as string))
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed = results.length - succeeded

  return NextResponse.json({ synced: succeeded, failed, total: results.length })
}
