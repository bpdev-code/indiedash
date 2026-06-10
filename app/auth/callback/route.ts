import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

const ALLOWED_OTP_TYPES = ['magiclink', 'recovery', 'email'] as const
type AllowedOtpType = typeof ALLOWED_OTP_TYPES[number]

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const nextParam = searchParams.get('next')

  // Only allow relative paths to prevent open redirect
  const next =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : type === 'recovery'
        ? '/auth/reset-password'
        : '/dashboard'

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return NextResponse.redirect(new URL('/login?error=auth', origin))
  } else if (token_hash && type && (ALLOWED_OTP_TYPES as readonly string[]).includes(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as AllowedOtpType,
    })
    if (error) return NextResponse.redirect(new URL('/login?error=auth', origin))
  } else {
    return NextResponse.redirect(new URL('/login', origin))
  }

  return NextResponse.redirect(new URL(next, origin))
}
