import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http')) {
    return new NextResponse('Server configuration error', { status: 500 })
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
  if (!request.headers.get('next-router-prefetch')) {
    event.waitUntil(
      (async () => {
        try {
          await createAdminClient().from('page_views').insert({ path })
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
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
