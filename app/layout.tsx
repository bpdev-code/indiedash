import type { Metadata } from 'next'
import { Geist_Mono } from 'next/font/google'
import './globals.css'

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://indiedash.vercel.app'

const TITLE = 'INDIEDASH — 複数アプリのMRRを1画面で管理・公開'
const DESCRIPTION =
  'バラバラのStripe・スプレッドシートを1つのダッシュボードに集約。Stripe連携で自動更新、公開URLとOGP画像で収益報告も10秒。個人開発者向け・日本語対応・月¥300〜。'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: TITLE,
    template: '%s — INDIEDASH',
  },
  description: DESCRIPTION,
  keywords: ['個人開発', 'インディーハッカー', 'MRR', '収益ダッシュボード', 'Stripe', '収益報告', 'Baremetrics 代替'],
  openGraph: {
    type: 'website',
    siteName: 'INDIEDASH',
    locale: 'ja_JP',
    url: '/',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={geistMono.variable}>
      <body>{children}</body>
    </html>
  )
}
