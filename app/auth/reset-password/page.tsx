'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setMessage({ text: '6文字以上で入力してください', ok: false })
      return
    }
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setMessage({ text: error.message, ok: false })
      } else {
        setMessage({ text: 'パスワードを変更しました', ok: true })
        setTimeout(() => router.push('/dashboard'), 1500)
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <a href="/" className="text-xl font-bold tracking-wider">
            INDIE<span style={{ color: 'var(--accent)' }}>DASH</span>
          </a>
        </div>
        <div className="rounded-lg p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h1 className="text-sm font-bold tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>
            NEW PASSWORD
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>新しいパスワード</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={6}
                required
                className="w-full px-3 py-2 text-sm rounded"
              />
            </div>
            {message && (
              <p className="text-xs" style={{ color: message.ok ? 'var(--accent)' : '#ff4444' }}>
                {message.text}
              </p>
            )}
            <button type="submit" disabled={isPending}
              className="w-full py-2 text-sm font-bold rounded transition-opacity"
              style={{ background: 'var(--accent)', color: '#000', opacity: isPending ? 0.6 : 1 }}>
              {isPending ? '...' : '変更する'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
