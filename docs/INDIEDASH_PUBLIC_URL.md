# INDIEDASH — 公開ダッシュボードURL 実装メモ

## 概要

ユーザーが自分の収益を公開できるURL。  
`indiedash.app/public/takumi` を開くと誰でも見られる。  
シェアされるたびにINDIEDASHが宣伝される **PLG（Product-Led Growth）** の核心機能。  
無料ユーザーは「Powered by INDIEDASH」バッジ付きで公開可能。有料ユーザーはバッジなし。

---

## DBテーブル設計（Supabase）

```sql
-- ユーザー
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  slug text unique not null, -- 公開URL用ハンドル例: "takumi"
  plan text default 'free',  -- 'free' | 'pro'
  created_at timestamptz default now()
);

-- プロジェクト
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  status text default 'idea', -- 'idea' | 'dev' | 'live' | 'archived'
  color text default '#00E5FF',
  mrr integer default 0,
  users_count integer default 0,
  stripe_product_id text,     -- Stripe連携時のプロダクトID（nullなら手動入力）
  launch_month text,          -- 例: '2026-01'
  created_at timestamptz default now()
);

-- 月次収益履歴
create table revenue_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  month text not null, -- 例: '2026-06'
  mrr integer default 0
);

-- 公開設定
create table public_settings (
  user_id uuid primary key references users(id) on delete cascade,
  is_public boolean default false
);
```

---

## ファイル構成（Next.js App Router）

```
app/
  public/
    [slug]/
      page.tsx          ← 公開ダッシュボードページ
  api/
    og/
      [slug]/
        route.tsx       ← OGP画像生成（@vercel/og）
  dashboard/
    settings/
      page.tsx          ← 公開設定UI（slug設定・公開ON/OFF）
```

---

## 公開ページ実装（app/public/[slug]/page.tsx）

```tsx
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return {
    title: `${params.slug} — INDIEDASH`,
    openGraph: {
      images: [`/api/og/${params.slug}`],
    },
  }
}

export default async function PublicDashboard({ params }: { params: { slug: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: user } = await supabase
    .from('users')
    .select('id, slug, plan')
    .eq('slug', params.slug)
    .single()

  if (!user) return notFound()

  const { data: settings } = await supabase
    .from('public_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!settings?.is_public) return notFound()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'live') // archived は表示しない

  return (
    <PublicDashboardView
      projects={projects}
      slug={params.slug}
      showBadge={user.plan === 'free'}
    />
  )
}
```

---

## OGP画像生成（app/api/og/[slug]/route.tsx）

```tsx
import { ImageResponse } from '@vercel/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: user } = await supabase
    .from('users').select('id, plan').eq('slug', params.slug).single()

  if (!user) return new Response('Not found', { status: 404 })

  const { data: settings } = await supabase
    .from('public_settings').select('*').eq('user_id', user.id).single()

  if (!settings?.is_public) return new Response('Not found', { status: 404 })

  const { data: projects } = await supabase
    .from('projects').select('*').eq('user_id', user.id).eq('status', 'live')

  const totalMRR = projects?.reduce((s, p) => s + (p.mrr || 0), 0) ?? 0
  const isFree = user.plan === 'free'

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, background: '#080808', display: 'flex',
        flexDirection: 'column', padding: '64px 72px', fontFamily: 'monospace' }}>

        {/* ロゴ */}
        <div style={{ display: 'flex', marginBottom: 48 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>
            INDIE<span style={{ color: '#00E5FF' }}>DASH</span>
          </span>
          <span style={{ fontSize: 14, color: '#444', marginLeft: 16, alignSelf: 'flex-end' }}>
            /{params.slug}
          </span>
        </div>

        {/* MRR */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 48 }}>
          <span style={{ fontSize: 13, color: '#444', letterSpacing: 3, marginBottom: 8 }}>
            MONTHLY RECURRING REVENUE
          </span>
          <span style={{ fontSize: 96, fontWeight: 700, color: '#00E5FF', lineHeight: 1 }}>
            ¥{totalMRR.toLocaleString()}
          </span>
        </div>

        {/* プロジェクト */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {projects?.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8,
              background: '#0d0d0d', border: '1px solid #1a1a1a',
              borderRadius: 6, padding: '10px 16px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
              <span style={{ fontSize: 16, color: '#888' }}>{p.name}</span>
              <span style={{ fontSize: 16, color: p.color, marginLeft: 4 }}>
                ¥{p.mrr.toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* フッター：無料プランはバッジ表示 */}
        <div style={{ position: 'absolute', bottom: 48, left: 72, right: 72,
          display: 'flex', justifyContent: 'space-between',
          borderTop: '1px solid #1a1a1a', paddingTop: 20 }}>
          <span style={{ fontSize: 13, color: isFree ? '#555' : '#333' }}>
            {isFree ? 'Powered by INDIEDASH — indiedash.app' : 'indiedash.app'}
          </span>
          <span style={{ fontSize: 13, color: '#333' }}>
            {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

---

## プライバシー設定（2段階）

| 設定 | 表示内容 |
|------|---------|
| `is_public: true` | MRR・プロジェクト名・グラフ全部表示 |
| `is_public: false` | URLにアクセスしても404 |

---

## 無料 vs 有料の違い

| 機能 | 無料 | 有料（¥480/月） |
|------|------|----------------|
| 公開ダッシュボードURL | ◎（バッジ付き） | ◎（バッジなし） |
| Stripe連携 | 1プロダクトのみ | 無制限 |
| OGP画像生成 | ◎ | ◎ |

---

## 実装優先度

1. `public_settings` テーブル + slug設定UI（1日）
2. `/public/[slug]` ページ（1日）
3. OGP画像生成 `/api/og/[slug]`（半日）
4. ダッシュボード内「シェア」ボタン → URL + X投稿テキスト生成（半日）

**合計: 3〜4日**

---

## シェアの流れ

```
「Xにシェア」クリック
  → twitter.com/intent/tweet?url=https://indiedash.app/public/takumi
  → XのタイムラインにOGP画像カードが展開
  → 見た人がリンクを踏む → サインアップ
```

---

## Vercelデプロイ時の注意

- `@vercel/og` はEdge Runtimeで動作
- カスタムフォントは `fetch()` で読み込む
- Supabase Service Role Keyはサーバーサイドのみ（クライアント露出NG）
- OGPキャッシュはVercelが自動でやってくれる（TTL調整可）
