'use client'

import { useTransition, useState } from 'react'
import { createStripeCheckout } from '@/app/actions/settings'
import { signOut } from '@/app/actions/auth'
import { buildShareTweetText } from '@/lib/share-text'

type Props = {
  profile: { plan: string; slug: string | null; email: string } | null
  settings: { is_public: boolean } | null
  totalMRR: number
}

export function AccountPanel({ profile, settings, totalMRR }: Props) {
  const [isPending, startTransition] = useTransition()

  const [upgradeError, setUpgradeError] = useState<string | null>(null)

  function handleUpgrade() {
    setUpgradeError(null)
    startTransition(async () => {
      const result = await createStripeCheckout()
      if (result?.url) {
        window.location.href = result.url
      } else if (result?.error) {
        setUpgradeError(result.error)
      }
    })
  }

  const isPublic = settings?.is_public && profile?.slug
  const publicUrl = profile?.slug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/public/${profile.slug}`
    : null

  return (
    <div className="flex flex-col gap-7 py-6 px-5 h-full">

      {/* PLAN */}
      <div>
        <div className="text-[9px] tracking-widest mb-3" style={{ color: 'var(--text-dim)' }}>
          PLAN
        </div>
        <div className="text-sm font-bold mb-3"
          style={{ color: profile?.plan === 'pro' ? 'var(--accent)' : 'var(--text)' }}>
          {profile?.plan === 'pro' ? 'PRO' : 'FREE'}
        </div>
        {profile?.plan === 'free' && (
          <>
            <button
              onClick={handleUpgrade}
              disabled={isPending}
              className="w-full text-xs py-2 rounded font-bold transition-opacity"
              style={{ background: 'var(--accent)', color: '#000', opacity: isPending ? 0.6 : 1 }}>
              {isPending ? '...' : 'PRO にアップグレード'}
            </button>
            {upgradeError && (
              <p className="text-[10px] mt-2" style={{ color: '#ff4444' }}>{upgradeError}</p>
            )}
          </>
        )}
      </div>

      {/* PUBLIC URL */}
      <div>
        <div className="text-[9px] tracking-widest mb-3" style={{ color: 'var(--text-dim)' }}>
          PUBLIC URL
        </div>
        {isPublic && publicUrl ? (
          <>
            <div className="text-[11px] mb-3 break-all" style={{ color: 'var(--accent)' }}>
              /public/{profile!.slug}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(publicUrl)}
                className="flex-1 text-[10px] py-1.5 rounded transition-colors hover:opacity-70"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                COPY
              </button>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(buildShareTweetText(publicUrl, totalMRR))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-[10px] py-1.5 rounded transition-colors hover:opacity-70"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                X シェア
              </a>
            </div>
          </>
        ) : (
          <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
            {!profile?.slug
              ? '設定でslugを設定すると公開できます'
              : '非公開（設定で公開できます）'}
          </div>
        )}
      </div>

      {/* ACCOUNT */}
      <div className="mt-auto">
        <div className="text-[9px] tracking-widest mb-3" style={{ color: 'var(--text-dim)' }}>
          ACCOUNT
        </div>
        <div className="text-[11px] mb-4 truncate" style={{ color: 'var(--text-muted)' }}>
          {profile?.email}
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="text-[10px] transition-colors hover:opacity-70"
            style={{ color: 'var(--text-dim)' }}>
            LOGOUT
          </button>
        </form>
      </div>

    </div>
  )
}
