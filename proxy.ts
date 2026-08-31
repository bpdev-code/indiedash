import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VISITOR_COOKIE = 'iv_id'

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http')) {
    return new NextResponse('Server configuration error', { status: 500 })
  }

  // 匿名訪問者ID（ユニーク訪問者数の集計用）。既存Cookieが無ければ新規発行する
  const existingVisitorId = request.cookies.get(VISITOR_COOKIE)?.value
  const visitorId = existingVisitorId ?? crypto.randomUUID()
  function withVisitorCookie(res: NextResponse) {
    if (!existingVisitorId) {
      res.cookies.set(VISITOR_COOKIE, visitorId, {
        httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 400, path: '/',
      })
    }
    return res
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // ページビュー記録（管理者用の集計に使う）。レスポンスをブロックせず、
  // Next.jsのリンクprefetchによる実際のアクセスでないリクエストは除外する
  // （通常のprefetchヘッダーに加え、Next.js 16のセグメント単位prefetchヘッダーも見る）
  const isPrefetch =
    request.headers.get('next-router-prefetch') ||
    request.headers.get('next-router-segment-prefetch')
  if (!isPrefetch) {
    event.waitUntil(
      (async () => {
        try {
          await createAdminClient().from('page_views').insert({ path, visitor_id: visitorId, user_id: user?.id ?? null })
        } catch {
          // 記録失敗はページ表示に影響させない
        }
      })()
    )
  }
  const isProtected =
    path.startsWith('/dashboard') ||
    path.startsWith('/projects') ||
    path.startsWith('/settings') ||
    path.startsWith('/feedback') ||
    path.startsWith('/admin')
  const isAuthPage = path === '/login' || path === '/signup'

  if (isProtected && !user) {
    return withVisitorCookie(NextResponse.redirect(new URL('/login', request.url)))
  }
  if (isAuthPage && user) {
    return withVisitorCookie(NextResponse.redirect(new URL('/dashboard', request.url)))
  }

  return withVisitorCookie(supabaseResponse)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
