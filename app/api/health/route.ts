import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Vercelがデプロイ時に自動で設定する環境変数。今どのcommitが本番で動いているか確認するため。
const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'unknown'
const deployedAt = process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null

export async function GET() {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('public_settings')
      .select('user_id', { count: 'exact', head: true })

    if (error) throw error

    return NextResponse.json({ status: 'ok', commit, commitMessage: deployedAt })
  } catch {
    return NextResponse.json({ status: 'error', commit, commitMessage: deployedAt }, { status: 503 })
  }
}
