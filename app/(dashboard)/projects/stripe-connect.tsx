'use client'

import { useState, useTransition, useEffect } from 'react'
import { connectStripe, syncStripeMRR, disconnectStripe, getStripeStatus } from '@/app/actions/stripe-sync'

interface Props {
  projectId: string
}

export default function StripeConnect({ projectId }: Props) {
  const [connected, setConnected] = useState(false)
  const [mrr, setMrr] = useState(0)
  const [plan, setPlan] = useState<string>('free')
  const [freeSlotUsedByOther, setFreeSlotUsedByOther] = useState(false)
  const [key, setKey] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getStripeStatus(projectId).then(s => {
      setConnected(s.connected)
      setMrr(s.mrr)
      setPlan(s.plan)
      setFreeSlotUsedByOther(s.freeSlotUsedByOther)
    })
  }, [projectId])

  function handleConnect() {
    if (!key) return
    setMessage(null)
    startTransition(async () => {
      const result = await connectStripe(projectId, key)
      if (result.error) {
        setMessage({ text: result.error, ok: false })
      } else {
        setConnected(true)
        setKey('')
        setMessage({ text: 'Stripeを連携しました', ok: true })
        getStripeStatus(projectId).then(s => setMrr(s.mrr))
      }
    })
  }

  function handleSync() {
    setMessage(null)
    startTransition(async () => {
      const result = await syncStripeMRR(projectId)
      if (result.error) {
        setMessage({ text: result.error, ok: false })
      } else {
        setMessage({ text: `同期完了 — MRR: ¥${result.mrr?.toLocaleString()}`, ok: true })
        setMrr(result.mrr ?? 0)
      }
    })
  }

  function handleDisconnect() {
    if (!confirm('Stripe連携を解除しますか？')) return
    startTransition(async () => {
      await disconnectStripe(projectId)
      setConnected(false)
      setMrr(0)
      setMessage({ text: '連携を解除しました', ok: true })
    })
  }

  if (plan === 'free' && !connected && freeSlotUsedByOther) {
    return (
      <div className="p-3 rounded space-y-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>Stripe 連携</span>
          <span className="text-[10px] px-2 py-0.5 rounded font-bold"
            style={{ background: 'var(--accent)', color: '#000' }}>PRO</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
          無料プランのStripe連携枠（1プロジェクトまで）は他のプロジェクトで使用中です。複数連携するにはPROプランへアップグレードしてください
        </p>
      </div>
    )
  }

  if (connected) {
    return (
      <div className="p-3 rounded space-y-3" style={{ background: '#0a1a0a', border: '1px solid #1a3a1a' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
            <span className="text-xs font-bold" style={{ color: '#10B981' }}>Stripe 連携済み</span>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            MRR: ¥{mrr.toLocaleString()}
          </span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleSync} disabled={isPending}
            className="text-xs px-3 py-1.5 rounded font-bold transition-opacity"
            style={{ background: '#10B981', color: '#000', opacity: isPending ? 0.6 : 1 }}>
            {isPending ? '同期中...' : '今すぐ同期'}
          </button>
          <button type="button" onClick={handleDisconnect} disabled={isPending}
            className="text-xs px-3 py-1.5 rounded transition-colors hover:bg-[#221111]"
            style={{ color: '#ff4444', border: '1px solid #1a1a1a' }}>
            連携解除
          </button>
        </div>
        {message && (
          <p className="text-xs" style={{ color: message.ok ? '#10B981' : '#ff4444' }}>{message.text}</p>
        )}
      </div>
    )
  }

  return (
    <div className="p-3 rounded space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Stripe 連携</span>
        <button type="button" onClick={() => setShowGuide(!showGuide)}
          className="text-xs" style={{ color: 'var(--accent)' }}>
          {showGuide ? '閉じる' : 'キーの取得方法'}
        </button>
      </div>

      {showGuide && (
        <div className="text-xs space-y-1.5 p-3 rounded" style={{ background: '#0a0a0a', color: 'var(--text-muted)' }}>
          <p className="font-bold mb-2" style={{ color: 'var(--text)' }}>制限付きキーの作成手順</p>
          <p>1. Stripeダッシュボード（本番環境）→ 開発者 → APIキー</p>
          <p>2. 「制限付きのキーを作成」をクリック</p>
          <p>3. 名前: <span style={{ color: 'var(--accent)' }}>INDIEDASH</span> など分かる名前を入力</p>
          <p>4. 「このキーの使用方法」で <span style={{ color: 'var(--accent)' }}>このキーをサードパーティーのアプリケーションに提供する</span> を選択</p>
          <p>5. 権限: <span style={{ color: 'var(--accent)' }}>Billing → Subscriptions → 読み取り(Read)</span> のみON（他はNoneのまま）</p>
          <p>6. 作成して <span style={{ color: 'var(--accent)' }}>rk_</span> で始まるキーをコピーし、下に貼り付け</p>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="password"
          name="stripe_secret_key_field"
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="rk_live_... または rk_test_..."
          autoComplete="one-time-code"
          data-1p-ignore
          data-lpignore="true"
          data-bwignore
          className="flex-1 px-3 py-2 text-xs rounded"
        />
        <button type="button" onClick={handleConnect} disabled={isPending || !key}
          className="px-4 py-2 text-xs font-bold rounded transition-opacity"
          style={{ background: 'var(--accent)', color: '#000', opacity: (isPending || !key) ? 0.5 : 1 }}>
          {isPending ? '...' : '連携'}
        </button>
      </div>

      {message && (
        <p className="text-xs" style={{ color: message.ok ? '#10B981' : '#ff4444' }}>{message.text}</p>
      )}
    </div>
  )
}
