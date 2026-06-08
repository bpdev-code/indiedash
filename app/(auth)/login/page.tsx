'use client'

import { useState, useTransition } from 'react'
import { signIn } from '@/app/actions/auth'
import Link from 'next/link'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await signIn(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="rounded-lg p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h1 className="text-sm font-bold tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>
        LOGIN
      </h1>

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
            autoComplete="current-password"
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
          {isPending ? '...' : 'LOGIN'}
        </button>
      </form>

      <p className="mt-4 text-xs text-center" style={{ color: 'var(--text-dim)' }}>
        アカウントなし?{' '}
        <Link href="/signup" style={{ color: 'var(--accent)' }}>サインアップ</Link>
      </p>
    </div>
  )
}
