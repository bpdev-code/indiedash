# INDIEDASH — プロダクト構想書

最終更新: 2026-06-08

---

## 一言で言うと

個人開発者が複数アプリの収益を一画面で管理し、BuildInPublicとして公開・シェアできるダッシュボード。

---

## ターゲット

- 個人開発者（ソロ開発、インディーハッカー）
- 複数アプリを運営している、または今後増やしたい人
- BuildInPublicとしてXで発信している人

---

## 解決する課題

| 課題 | 現状 |
|------|------|
| 複数アプリの収益をひとつで見たい | Baremetrics等は1プロダクト前提 |
| 毎月Xにシェアするのが面倒 | 手動でスクショ・テキスト作成 |
| 既存ツールが高すぎる | Baremetrics $129/月〜、個人には重い |
| 日本語対応ツールがない | 競合は全員英語 |

---

## 競合と差別化

| ツール | 価格 | 複数アプリ | BuildInPublic連携 | 日本語 |
|--------|------|-----------|-------------------|--------|
| Baremetrics | $129/月〜 | △ | ✗ | ✗ |
| **INDIEDASH** | **¥480/月〜** | **◎** | **◎** | **◎** |

> INDIEDASHはBaremetricsの競合ではなく、**その上に乗るダッシュボード**という位置づけ。
> StripeやRevenueCatのデータを集約し、BuildInPublicシェアに特化する点が差別化。

---

## 機能一覧

### 無料プラン
- プロジェクト登録（最大3件）
- MRR手動入力
- Stripe連携（1プロダクトのみ）
- グラフ表示（期間切り替え: 3M / 6M / 12M / ALL）
- 公開ダッシュボードURL（`indiedash.app/public/yourname`、「Powered by INDIEDASH」バッジ付き）
- OGP画像自動生成
- Xシェアボタン

### 有料プラン（¥480/月）
- プロジェクト無制限
- Stripe連携（無制限）
- 公開ダッシュボードURL（バッジなし）
- グラフ表示（全期間）

---

## 核心機能：公開ダッシュボードURL

`indiedash.app/public/yourname` を公開すると、誰でもそのダッシュボードを見られる。

XにURLを貼るとOGP画像カードが自動展開：

```
┌─────────────────────────────┐
│ INDIEDASH  /takumi          │
│                             │
│ MRR  ¥24,500               │
│                             │
│ ● タスク管理アプリ ¥9,800  │
│ ● 請求書作成ツール ¥14,700 │
│                             │
│ Powered by INDIEDASH        │
└─────────────────────────────┘
```

### PLG設計

- ユーザーがシェアするたびにINDIEDASHが露出する
- 無料ユーザーのバッジが無料段階からバイラルを回す
- リンクを踏んだ人がUIを直接体験 → サインアップ

### プライバシー設定（2段階）

| モード | 表示 |
|--------|------|
| フル公開 | MRR・プロジェクト名・グラフ全部 |
| 完全非公開 | URLにアクセスしても404 |

---

## プロジェクトステータス

| ステータス | 意味 |
|-----------|------|
| `idea` | 構想中 |
| `dev` | 開発中 |
| `live` | リリース済み・稼働中 |
| `archived` | 終了・休止（公開ダッシュボードに表示しない） |

---

## Stripe連携方針

**制限付きAPIキー方式**（Stripe Connect OAuthではない）

ユーザーがStripeダッシュボードで制限付きキー（`rk_`）を作成し、INDIEDASHに貼り付けるだけ。

必要な権限: **Subscriptions → 読み取りのみ**

MRR算出ロジック:
- アクティブなサブスクリプションを全件取得
- 年払いは ÷12 して月額換算
- JPY以外は100で割ってから換算
- 合計 = MRR

> Stripe Connect OAuth（ボタン1つで連携）はStripeの審査が必要なため、MVP段階では非採用。
> ユーザー数が増えたタイミングで移行を検討。

---

## 決済プロバイダー対応状況

| プロバイダー | 対応状況 |
|------------|---------|
| Manual（手動入力） | ✅ 実装済み |
| Stripe | ✅ 実装済み（制限付きキー方式） |
| Paddle | 🔜 デプロイ後に実装予定 |
| Lemon Squeezy | 🔜 デプロイ後に実装予定 |
| RevenueCat | 🔜 デプロイ後に実装予定（iOS/Android対応） |
| Gumroad | 未定 |

---

## マネタイズ

| フェーズ | 価格 | 内容 |
|---------|------|------|
| ローンチ〜3ヶ月 | 無料 | 全機能解放、アーリーユーザー獲得 |
| 3ヶ月〜 | ¥480/月 | Stripe無制限・バッジなし・プロジェクト無制限 |
| 将来 | 値上げ検討 | 既存ユーザーは据え置き |

Stripe決済フロー:
1. 設定ページ「UPGRADE ¥480/月」クリック
2. Stripeチェックアウトセッションにリダイレクト
3. 支払い完了 → Webhook → `profiles.plan = 'pro'` に更新
4. 解約 → Webhook → `profiles.plan = 'free'` に戻す

---

## 成長戦略

```
ユーザーがXにシェア（無料ユーザーもバッジ付きでシェア）
  → OGP画像がタイムラインに流れる
    → 「これ何？」でリンクを踏む
      → 公開ダッシュボードを体験
        → 「自分も作りたい」でサインアップ
          → また誰かがシェア → 繰り返し
```

- 日本の個人開発コミュニティ（Xの#個人開発タグ）に先行リリース
- Product Huntに英語でローンチ（海外個人開発者も狙える）

---

## 技術スタック

| カテゴリ | 採用技術 |
|---------|---------|
| Frontend | Next.js 16.2.7（App Router）+ Tailwind CSS |
| Backend | Supabase（Auth・PostgreSQL・RLS） |
| OGP画像 | `next/og`（ImageResponse、opengraph-image.tsx規約） |
| グラフ | Recharts |
| 決済（ユーザー課金） | Stripe（Checkout + Webhook） |
| 決済（データ取得） | Stripe制限付きキー |
| Deploy | Vercel |
| 言語 | TypeScript |

### Next.js 16 特記事項

- `middleware.ts` → `proxy.ts` にリネーム（関数名も `proxy`）
- `params` / `cookies()` / `headers()` が完全非同期（`await` 必須）
- OGP画像は `opengraph-image.tsx` ファイル規約を使用（Route Handlerではない）
- Turbopackがdev/buildのデフォルト

---

## ファイル構成

```
app/
  (auth)/
    layout.tsx
    login/page.tsx
    signup/page.tsx
  (dashboard)/
    layout.tsx              ← サイドバーナビ
    dashboard/
      page.tsx              ← MRRグラフ + ライブプロジェクト
      mrr-chart.tsx         ← Recharts（Client Component）
      period-selector.tsx   ← 期間切り替えボタン（Client Component）
    projects/
      page.tsx              ← プロジェクト一覧
      new/page.tsx          ← 新規作成フォーム
      [id]/edit/page.tsx    ← 編集フォーム
      delete-button.tsx     ← 削除ボタン（Client Component）
      stripe-connect.tsx    ← Stripe連携UI（Client Component）
      month-select.tsx      ← 年月プルダウン（Client Component）
    settings/page.tsx       ← slug・公開設定・プランアップグレード
  public/
    [slug]/
      page.tsx              ← 公開ダッシュボード
      opengraph-image.tsx   ← OGP画像生成
  auth/callback/route.ts   ← Supabase認証コールバック
  api/webhooks/stripe/route.ts ← Stripe Webhook
  actions/
    auth.ts                 ← 認証Server Actions
    projects.ts             ← プロジェクトServer Actions
    settings.ts             ← 設定Server Actions
    stripe-sync.ts          ← Stripe同期Server Actions
  layout.tsx
  page.tsx                  ← ランディングページ
  globals.css
lib/
  supabase/
    client.ts               ← ブラウザ用クライアント
    server.ts               ← サーバー用クライアント（async cookies）
  stripe.ts                 ← Stripe SDK（apiVersion: 2026-05-27.dahlia）
types/index.ts
proxy.ts                    ← 認証ガード（Next.js 16のmiddleware）
supabase/schema.sql         ← DBスキーマ + RLS
```

---

## 実装済みスコープ（MVP完了）

- [x] 認証（Supabase Auth、メール+パスワード）
- [x] プロジェクトCRUD + archivedステータス
- [x] MRR手動入力
- [x] Stripe連携（制限付きキー、MRR自動取得）
- [x] revenue_history自動バックフィル（ローンチ月から現在まで）
- [x] MRRグラフ（プロジェクト別・期間切り替え・始点ドット）
- [x] 公開ダッシュボードURL
- [x] OGP画像生成（無料バッジ付き / 有料バッジなし）
- [x] 設定ページ（slug・公開ON/OFF・Xシェア）
- [x] Stripe決済（プランアップグレード）コード実装
- [x] ランディングページ

## 未実装（デプロイ後）

- [ ] Vercelデプロイ
- [ ] Stripe商品・価格（¥480/月）作成 + STRIPE_PRO_PRICE_ID設定
- [ ] Stripe Webhookエンドポイント登録
- [ ] cron-job.orgでSupabase休止対策
- [ ] RevenueCat連携
- [ ] Paddle / Lemon Squeezy連携
- [ ] Google OAuth（現在はメール+パスワードのみ）
- [ ] MRRリマインダー通知
