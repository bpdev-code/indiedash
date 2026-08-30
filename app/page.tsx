import Link from 'next/link'
import { LandingMRRPreview } from './_components/landing-mrr-preview'
import { version } from '@/package.json'

const APP_URL = '/signup'
const PUBLIC_HOST = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/^https?:\/\//, '') || 'indiedash.vercel.app'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-lg font-bold tracking-wider">
          INDIE<span style={{ color: 'var(--accent)' }}>DASH</span>
        </span>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/login" style={{ color: 'var(--text-muted)' }}>Login</Link>
          <Link href={APP_URL} className="px-4 py-1.5 rounded text-xs font-bold"
            style={{ background: 'var(--accent)', color: '#000' }}>
            無料で始める
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 py-24 text-center">
        <p className="text-xs tracking-widest mb-6" style={{ color: 'var(--accent)' }}>FOR INDIE HACKERS</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          複数アプリの収益を、<br />1つのURLで公開。
        </h1>
        <p className="text-sm max-w-lg mb-3" style={{ color: 'var(--text-muted)' }}>
          毎月Xで収益報告していますか？スクショを撮って、数字をまとめて、テキストを書いて——
        </p>
        <p className="text-sm max-w-lg mb-10 font-bold">
          INDIEDASHなら、URLを貼るだけで終わります。
        </p>
        <Link href={APP_URL} className="px-10 py-3 rounded font-bold text-sm mb-3"
          style={{ background: 'var(--accent)', color: '#000' }}>
          無料で始める →
        </Link>
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>クレジットカード不要</p>

        {/* Dashboard Preview */}
        <div className="mt-16 w-full max-w-lg rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 px-4 py-3"
            style={{ background: '#0d0d0d', borderBottom: '1px solid var(--border)' }}>
            <div className="w-3 h-3 rounded-full" style={{ background: '#333' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#333' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#333' }} />
            <span className="text-xs ml-2" style={{ color: 'var(--text-dim)' }}>
              {PUBLIC_HOST}/public/yourname
            </span>
          </div>
          <div className="p-6 text-left" style={{ background: 'var(--bg)' }}>
            <p className="text-xs tracking-widest mb-1" style={{ color: 'var(--text-dim)' }}>MRR</p>
            <p className="text-4xl font-bold mb-4" style={{ color: 'var(--accent)' }}>¥24,500</p>
            <LandingMRRPreview />
            <div className="space-y-2 mt-4">
              {[
                { name: 'タスク管理アプリ', mrr: 9800, color: '#00E5FF' },
                { name: '請求書作成ツール', mrr: 14700, color: '#7C3AED' },
              ].map(p => (
                <div key={p.name} className="flex items-center gap-3 p-3 rounded text-xs"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  <span style={{ color: 'var(--text-muted)' }}>{p.name}</span>
                  <span className="ml-auto font-bold" style={{ color: p.color }}>¥{p.mrr.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <p className="text-xs mt-4 text-right" style={{ color: 'var(--text-dim)' }}>Powered by INDIEDASH</p>
          </div>
        </div>
      </section>

      {/* Stripe連携 */}
      <section className="px-6 py-20 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-widest mb-3 text-center" style={{ color: 'var(--accent)' }}>STRIPE INTEGRATION</p>
          <h2 className="text-2xl font-bold mb-3 text-center">Stripeと繋いで、自動化する</h2>
          <p className="text-sm text-center mb-12" style={{ color: 'var(--text-muted)' }}>
            制限付きAPIキーを貼り付けるだけ。MRRが自動で同期される。
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { step: '01', title: 'キーを作成', desc: 'Stripeで読み取り専用の制限付きキーを作成（1分）' },
              { step: '02', title: 'INDIEDASHに貼り付け', desc: 'プロジェクト設定にキーを貼り付けて「連携」をクリック' },
              { step: '03', title: '自動同期完了', desc: 'サブスクリプションのMRRが自動で取得・グラフに反映' },
            ].map(s => (
              <div key={s.step} className="p-5 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-2xl font-bold mb-3" style={{ color: 'var(--accent)' }}>{s.step}</p>
                <p className="text-xs font-bold mb-2">{s.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 課題 */}
      <section className="px-6 py-20 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-widest mb-8 text-center" style={{ color: 'var(--text-dim)' }}>PROBLEM</p>
          <div className="space-y-3">
            {[
              '複数アプリの収益をスプレッドシートで管理している',
              '毎月Xで収益報告するのに時間がかかる',
              'Baremetricsは高すぎる（$129/月〜）',
              '日本語対応のツールがない',
            ].map(t => (
              <div key={t} className="flex items-center gap-3 text-sm p-4 rounded"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <span style={{ color: '#ff4444' }}>×</span>
                <span style={{ color: 'var(--text-muted)' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 特徴 */}
      <section className="px-6 py-20 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-widest mb-8 text-center" style={{ color: 'var(--text-dim)' }}>FEATURES</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { title: '複数アプリを一元管理', desc: '全プロダクトのMRRをひとつのダッシュボードに集約。プロジェクトごとにグラフで推移を確認。' },
              { title: 'Stripe連携で自動更新', desc: '制限付きAPIキーを登録するだけ。サブスクMRRが自動で取得・記録される。' },
              { title: '公開URLで即シェア', desc: `${PUBLIC_HOST}/public/yourname を作成。URLを貼るだけでXに共有できる。` },
              { title: 'OGP画像を自動生成', desc: 'XにURLを貼るとMRRカードが自動展開。毎月の収益報告が10秒で終わる。' },
            ].map(f => (
              <div key={f.title} className="p-5 rounded"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--accent)' }}>{f.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 価格比較 */}
      <section className="px-6 py-20 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-widest mb-8 text-center" style={{ color: 'var(--text-dim)' }}>PRICING</p>

          {/* FREE / PRO 比較 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
            <div className="p-6 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-xs tracking-widest mb-1" style={{ color: 'var(--text-dim)' }}>FREE</p>
              <p className="text-2xl font-bold mb-5">¥0</p>
              <ul className="space-y-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <li>✓ プロジェクト3件まで</li>
                <li>✓ MRR手動入力</li>
                <li>✓ 公開URL・OGP画像・Xシェア</li>
                <li>✓ グラフ表示（全期間）</li>
                <li style={{ color: 'var(--text-dim)' }}>✗ Stripe自動連携</li>
              </ul>
            </div>
            <div className="p-6 rounded" style={{ background: '#0a1a0a', border: '1px solid var(--accent)' }}>
              <p className="text-xs tracking-widest mb-1" style={{ color: 'var(--accent)' }}>PRO</p>
              <p className="text-2xl font-bold mb-5" style={{ color: 'var(--accent)' }}>
                ¥300<span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>/月</span>
              </p>
              <ul className="space-y-2 text-xs" style={{ color: 'var(--text)' }}>
                <li>✓ プロジェクト無制限</li>
                <li>✓ Stripe連携で自動更新（無制限）</li>
                <li>✓ FREEの全機能を含む</li>
              </ul>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['ツール', '価格', '複数アプリ', '公開URL', '日本語'].map(h => (
                    <th key={h} className={`py-3 ${h === 'ツール' ? 'text-left' : 'text-center'}`}
                      style={{ color: 'var(--text-dim)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Baremetrics', price: '$129/月〜', multi: '△', pub: '✗', ja: '✗', highlight: false },
                  { name: 'INDIEDASH', price: '¥300/月〜', multi: '◎', pub: '◎', ja: '◎', highlight: true },
                ].map(r => (
                  <tr key={r.name} style={{
                    borderBottom: '1px solid var(--border)',
                    background: r.highlight ? '#0a1a0a' : 'transparent',
                  }}>
                    <td className="py-3 font-bold" style={{ color: r.highlight ? 'var(--accent)' : 'var(--text-muted)' }}>{r.name}</td>
                    <td className="py-3 text-center" style={{ color: r.highlight ? 'var(--accent)' : 'var(--text-muted)' }}>{r.price}</td>
                    <td className="py-3 text-center" style={{ color: r.highlight ? '#10B981' : 'var(--text-dim)' }}>{r.multi}</td>
                    <td className="py-3 text-center" style={{ color: r.highlight ? '#10B981' : 'var(--text-dim)' }}>{r.pub}</td>
                    <td className="py-3 text-center" style={{ color: r.highlight ? '#10B981' : 'var(--text-dim)' }}>{r.ja}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 border-t text-center" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-2xl font-bold mb-4">今すぐ収益を公開しよう</h2>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          無料プランで今すぐ使える。公開URLでシェアも思いのまま（Stripe自動連携はPROプランで）。
        </p>
        <Link href={APP_URL} className="inline-block px-10 py-3 rounded font-bold text-sm"
          style={{ background: 'var(--accent)', color: '#000' }}>
          無料で始める →
        </Link>
        <p className="text-xs mt-4" style={{ color: 'var(--text-dim)' }}>クレジットカード不要</p>
      </section>

      <footer className="border-t py-6 text-center text-xs"
        style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
        © 2026 INDIEDASH · v{version}
      </footer>
    </div>
  )
}
