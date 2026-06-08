# INDIEDASH — 公開ダッシュボードURL 実装メモ

最終更新: 2026-06-08

---

## 概要

ユーザーが自分の収益を公開できるURL。
`indiedash.app/public/yourslug` を開くと誰でも見られる。
シェアされるたびにINDIEDASHが宣伝される **PLG（Product-Led Growth）** の核心機能。

- 無料ユーザー: 「Powered by INDIEDASH」バッジ付きで公開可能
- 有料ユーザー: バッジなし

---

## DBスキーマ（Supabase / 実装済み）

```sql
-- ユーザープロフィール（auth.usersを拡張）
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  slug text unique,                          -- 公開URL用ハンドル（例: "takumi"）
  plan text default 'free'                   -- 'free' | 'pro'
    check (plan in ('free', 'pro')),
  stripe_customer_id text,                   -- Stripe課金用
  created_at timestamptz default now()
);

-- プロジェクト
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  status text default 'idea'                 -- 'idea' | 'dev' | 'live' | 'archived'
    check (status in ('idea', 'dev', 'live', 'archived')),
  color text default '#00E5FF',
  mrr integer default 0,                     -- 月次収益（円）
  users_count integer default 0,
  price integer default null,                -- 月額単価（円）※Stripe自動計算用
  payment_provider text default 'manual',    -- 'manual' | 'stripe' | 'paddle' | 'lemonsqueezy' | 'gumroad'
  stripe_secret_key text,                    -- Stripe制限付きキー（サーバーサイドのみ）
  stripe_product_id text,                    -- 将来のStripe Connect用
  launch_month text,                         -- 例: '2026-06'
  created_at timestamptz default now()
);

-- 月次収益履歴
create table revenue_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  month text not null,                       -- 例: '2026-06'
  mrr integer default 0,
  unique(project_id, month)
);

-- 公開設定
create table public_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  is_public boolean default false
);
```

### RLS設定方針

- `profiles`: 本人のみ読み書き。ただし `is_public=true` のユーザーは誰でも読める
- `projects`: 本人のみ管理。`live` かつ `is_public=true` のユーザーのものは誰でも読める
- `revenue_history`: 同上
- `public_settings`: 本人のみ管理。読み取りは全員可

---

## ファイル構成（Next.js 16 App Router）

```
app/
  public/
    [slug]/
      page.tsx              ← 公開ダッシュボードページ（Server Component）
      opengraph-image.tsx   ← OGP画像生成（next/og、ImageResponse）
  (dashboard)/
    settings/
      page.tsx              ← 公開設定UI（Client Component）
```

---

## 公開ページ（app/public/[slug]/page.tsx）

### Next.js 16での注意点

`params` は Promise なので `await` が必要:

```tsx
type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params   // ← awaitが必須
  ...
}

export default async function PublicDashboardPage({ params }: Props) {
  const { slug } = await params   // ← awaitが必須
  ...
}
```

### データ取得フロー

```
1. slug → profiles テーブルで id・plan を取得
2. public_settings で is_public を確認 → false なら 404
3. projects で status='live' のもののみ取得（archived は除外）
4. totalMRR を計算して表示
5. plan='free' なら「Powered by INDIEDASH」バッジを表示
```

---

## OGP画像生成（app/public/[slug]/opengraph-image.tsx）

### ファイル規約（Next.js 16）

- Route Handlerではなく `opengraph-image.tsx` ファイル規約を使用
- `export const size = { width: 1200, height: 630 }`
- `export const contentType = 'image/png'`
- `ImageResponse` は `next/og` からimport（`@vercel/og` は不要）
- `params` は Promise: `export default async function Image({ params }: { params: Promise<{ slug: string }> })`

### 画像レイアウト

```
┌──────────────────────────────────────────┐
│ INDIEDASH  /slug                          │
│                                          │
│ MONTHLY RECURRING REVENUE                │
│ ¥24,500                                  │
│                                          │
│ [● タスク管理アプリ ¥9,800]              │
│ [● 請求書作成ツール ¥14,700]             │
│                                          │
│ ─────────────────────────────────────── │
│ Powered by INDIEDASH — indiedash.app     │ ← 無料プランのみ
└──────────────────────────────────────────┘
```

---

## 設定ページ（app/(dashboard)/settings/page.tsx）

Client Componentで以下を管理:

1. **PLAN表示** + アップグレードボタン（¥480/月）
2. **slug設定** → 英小文字・数字・ハイフンのみ許可
3. **公開トグル** → slugが未設定の場合はdisabled
4. **Xシェアボタン** → 公開中かつslug設定済みの場合に表示

### Xシェアリンク生成

```
https://twitter.com/intent/tweet
  ?url=https://indiedash.app/public/{slug}
  &text=自分のプロダクト収益を公開しています #indiedash #個人開発
```

---

## Stripe連携（制限付きキー方式）

### なぜ制限付きキーか

- Stripe Connect OAuthはStripeの審査が必要（MVP段階では非現実的）
- 制限付きキーなら即日導入可能
- BaremetricsやChartMogulも同じ方式

### ユーザー操作手順

1. Stripeダッシュボード → 開発者 → APIキー → 制限付きキーを作成
2. 権限: **Subscriptions → 読み取りのみ**
3. 作成されたキー（`rk_` で始まる）をINDIEDASHに貼り付け
4. 「連携」をクリック → 接続テスト → MRR自動取得

### MRR算出ロジック

```ts
// アクティブサブスクを全件取得（ページネーション対応）
for (sub of activeSubscriptions) {
  for (item of sub.items) {
    let amount = item.price.unit_amount * item.quantity
    if (interval === 'year') amount = amount / 12  // 年払いは月額換算
    if (currency !== 'jpy') amount = amount / 100  // セント → ドル等
    mrr += amount
  }
}
```

### revenue_historyのバックフィル

プロジェクト作成・更新時に `launch_month` から現在月まで全月分を記録:

```ts
// 例: launch_month='2026-03' の場合
// 2026-03, 2026-04, 2026-05, 2026-06 の4件をupsert
```

---

## グラフ表示

### 期間切り替え

URL searchParamsで管理: `/dashboard?period=6m`

| パラメータ | 表示期間 |
|-----------|---------|
| `3m` | 直近3ヶ月 |
| `6m` | 直近6ヶ月（デフォルト） |
| `12m` | 直近12ヶ月 |
| `all` | 全期間 |

### プロジェクト別ライン

- liveプロジェクトごとに1本のライン
- プロジェクトのカラー（color）でライン色を設定
- 各ラインの始点に小さいドット（r=4）を表示
- 2本以上の場合は凡例（Legend）を表示

---

## デプロイ後のチェックリスト

- [ ] `NEXT_PUBLIC_APP_URL` を本番URLに更新（.envまたはVercel環境変数）
- [ ] Supabase → Authentication → URL Configuration に本番URLを追加
- [ ] Supabase → Authentication → Redirect URLs に `https://yourdomain.com/auth/callback` を追加
- [ ] Stripe Webhookを本番URLに登録
- [ ] `STRIPE_WEBHOOK_SECRET` をVercel環境変数に設定
- [ ] cron-job.org で週1回本番URLにアクセスするジョブを設定（Supabase休止対策）

---

## プライバシー設定（2段階）

| 設定 | 表示 |
|------|------|
| `is_public: true` | MRR・プロジェクト名全部表示 |
| `is_public: false` | 404 |
