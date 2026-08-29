'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateSlug, updatePublicSettings, createStripeCheckout } from '@/app/actions/settings'
import type { Profile, PublicSettings } from '@/types'

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [slugMsg, setSlugMsg] = useState<string | null>(null)
  const [isPendingSlug, startSlug] = useTransition()
  const [isPendingPublic, startPublic] = useTransition()
  const [isPendingStripe, startStripe] = useTransition()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => setProfile(data))
      supabase.from('public_settings').select('*').eq('user_id', user.id).single().then(({ data }) => setSettings(data))
    })
  }, [])

  if (!profile) return <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Loading...</div>

  const publicUrl = profile?.slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/public/${profile.slug}`
    : null

  function handleSlug(formData: FormData) {
    setSlugMsg(null)
    startSlug(async () => {
      const result = await updateSlug(formData)
      if (result?.error) setSlugMsg(result.error)
      else {
        setSlugMsg('保存しました')
        setProfile(prev => prev ? { ...prev, slug: formData.get('slug') as string } : prev)
      }
    })
  }

  function handleTogglePublic() {
    const newValue = !settings?.is_public
    startPublic(async () => {
      const fd = new FormData()
      fd.set('is_public', String(newValue))
      await updatePublicSettings(fd)
      setSettings(prev => prev ? { ...prev, is_public: newValue } : { user_id: profile!.id, is_public: newValue })
    })
  }

  function handleUpgrade() {
    startStripe(async () => {
      const result = await createStripeCheckout()
      if (result?.url) window.location.href = result.url
    })
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <h1 className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>SETTINGS</h1>

      {/* Plan */}
      <section className="p-4 rounded space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs tracking-widest mb-1" style={{ color: 'var(--text-dim)' }}>PLAN</p>
            <p className="text-sm font-bold" style={{ color: profile.plan === 'pro' ? 'var(--accent)' : 'var(--text)' }}>
              {profile.plan === 'pro' ? 'PRO' : 'FREE'}
            </p>
          </div>
          {profile.plan === 'free' && (
            <button onClick={handleUpgrade} disabled={isPendingStripe}
              className="text-xs px-4 py-2 rounded font-bold transition-opacity"
              style={{ background: 'var(--accent)', color: '#000', opacity: isPendingStripe ? 0.6 : 1 }}>
              {isPendingStripe ? '...' : 'UPGRADE — ¥300/月'}
            </button>
          )}
        </div>
        {profile.plan === 'free' && (
          <ul className="text-xs space-y-1" style={{ color: 'var(--text-dim)' }}>
            <li>• プロジェクト3件まで</li>
            <li>• Stripe連携1件まで</li>
            <li>• 公開URL（Powered by INDIEDASH バッジ付き）</li>
          </ul>
        )}
      </section>

      {/* Slug */}
      <section className="p-4 rounded space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <p className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>PUBLIC URL HANDLE</p>
        <form action={handleSlug} className="flex gap-2">
          <span className="flex items-center text-xs px-2" style={{ color: 'var(--text-dim)' }}>
            /public/
          </span>
          <input name="slug" defaultValue={profile.slug ?? ''} placeholder="yourname"
            className="flex-1 px-3 py-2 text-sm rounded"
            pattern="[a-z0-9\-]+"
            title="英小文字・数字・ハイフンのみ" />
          <button type="submit" disabled={isPendingSlug}
            className="px-4 py-2 text-xs font-bold rounded transition-opacity"
            style={{ background: 'var(--accent)', color: '#000', opacity: isPendingSlug ? 0.6 : 1 }}>
            {isPendingSlug ? '...' : 'SAVE'}
          </button>
        </form>
        {slugMsg && <p className="text-xs" style={{ color: slugMsg === '保存しました' ? 'var(--accent)' : '#ff4444' }}>{slugMsg}</p>}
        {publicUrl && (
          <div className="flex items-center gap-2">
            <p className="text-xs truncate flex-1" style={{ color: 'var(--text-muted)' }}>{publicUrl}</p>
            <button onClick={() => navigator.clipboard.writeText(publicUrl)}
              className="text-xs px-2 py-1 rounded" style={{ color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
              COPY
            </button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs px-2 py-1 rounded" style={{ color: 'var(--accent)', border: '1px solid var(--border)' }}>
              OPEN
            </a>
          </div>
        )}
      </section>

      {/* Public toggle */}
      <section className="p-4 rounded space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs tracking-widest mb-1" style={{ color: 'var(--text-dim)' }}>PUBLIC DASHBOARD</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {settings?.is_public ? '公開中' : '非公開（404）'}
            </p>
          </div>
          <button
            onClick={handleTogglePublic}
            disabled={isPendingPublic || !profile.slug}
            className="w-12 h-6 rounded-full relative transition-colors"
            style={{
              background: settings?.is_public ? 'var(--accent)' : 'var(--border)',
              opacity: (!profile.slug || isPendingPublic) ? 0.5 : 1,
            }}>
            <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: settings?.is_public ? '26px' : '4px' }} />
          </button>
        </div>
        {!profile.slug && (
          <p className="text-xs" style={{ color: '#ff4444' }}>slug を設定してから公開できます</p>
        )}
        {profile.plan === 'free' && settings?.is_public && (
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            無料プランでは「Powered by INDIEDASH」バッジが表示されます
          </p>
        )}
      </section>

      {/* Share */}
      {settings?.is_public && publicUrl && (
        <section className="p-4 rounded space-y-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>SHARE ON X</p>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent('自分のプロダクト収益を公開しています #indiedash #個人開発')}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-block text-xs px-4 py-2 rounded font-bold"
            style={{ background: '#000', color: '#fff', border: '1px solid #333' }}>
            X にシェア
          </a>
        </section>
      )}
    </div>
  )
}
