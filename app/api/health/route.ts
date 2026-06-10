import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('public_settings')
      .select('user_id', { count: 'exact', head: true })

    if (error) throw error

    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}
