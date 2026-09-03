'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import { signUp } from '@/app/actions/auth'
import { subscribeDemo, getDemoSnapshot, getDemoServerSnapshot } from '@/lib/demo-store'
import Link from 'next/link'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  // localStorage に保存済みのお試しデータの件数（無ければ 0）
  const demoCount = useSyncExternalStore(subscribeDemo, getDemoSnapshot, getDemoServerSnapshot).length

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await signUp(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="rounded-lg p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h1 className="text-sm font-bold tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>
        SIGN UP
      </h1>

      {demoCount > 0 && (
        <p className="text-xs rounded p-3 mb-5"
          style={{ background: '#0a1a0a', border: '1px solid var(--accent)', color: 'var(--text-muted)' }}>
          サンプルで作った{demoCount}件のプロジェクトは、アカウント作成後に取り込めます。
        </p>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>EMAIL</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full px-3 py-2 text-sm rounded"
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-dim)' }}>PASSWORD</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full px-3 py-2 text-sm rounded"
          />
        </div>

        {error && (
          <p className="text-xs" style={{ color: '#ff4444' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2 text-sm font-bold rounded transition-opacity"
          style={{ background: 'var(--accent)', color: '#000', opacity: isPending ? 0.6 : 1 }}
        >
          {isPending ? '...' : 'CREATE ACCOUNT'}
        </button>
      </form>

      <p className="mt-4 text-xs text-center" style={{ color: 'var(--text-dim)' }}>
        すでにアカウントあり?{' '}
        <Link href="/login" style={{ color: 'var(--accent)' }}>ログイン</Link>
      </p>
    </div>
  )
}
