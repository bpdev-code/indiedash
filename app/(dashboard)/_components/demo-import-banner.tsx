'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  subscribeDemo,
  getDemoSnapshot,
  getDemoServerSnapshot,
  clearDemoProjects,
} from '@/lib/demo-store'
import { importDemoProjects } from '@/app/actions/projects'

export function DemoImportBanner() {
  const pending = useSyncExternalStore(subscribeDemo, getDemoSnapshot, getDemoServerSnapshot)
  const [message, setMessage] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (message) {
    return (
      <div
        className="rounded p-3 mb-4 flex items-center justify-between gap-3 text-xs"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        <span>{message}</span>
        <button onClick={() => setMessage(null)} style={{ color: 'var(--text-dim)' }} aria-label="閉じる">✕</button>
      </div>
    )
  }

  if (dismissed || pending.length === 0) return null

  function doImport() {
    const items = pending
    startTransition(async () => {
      const res = await importDemoProjects(items)
      clearDemoProjects()
      if ('error' in res && res.error) {
        setMessage('取り込みに失敗しました。お手数ですが手動で追加してください。')
        return
      }
      const { imported, skipped } = res as { imported: number; skipped: number }
      setMessage(
        skipped > 0
          ? `${imported}件を取り込みました（${skipped}件は無料プランの上限のためスキップ）。`
          : `${imported}件のプロジェクトを取り込みました。`
      )
      router.refresh()
    })
  }

  function discard() {
    clearDemoProjects()
    setDismissed(true)
  }

  return (
    <div className="rounded p-4 mb-4" style={{ background: '#0a1a0a', border: '1px solid var(--accent)' }}>
      <p className="text-sm font-bold mb-1">サンプルで作ったデータがあります</p>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        {pending.length}件のプロジェクトをこのアカウントに取り込みますか？
      </p>
      <div className="flex gap-2">
        <button
          onClick={doImport}
          disabled={isPending}
          className="px-4 py-1.5 text-xs font-bold rounded"
          style={{ background: 'var(--accent)', color: '#000', opacity: isPending ? 0.6 : 1 }}
        >
          {isPending ? '取り込み中...' : '取り込む'}
        </button>
        <button
          onClick={discard}
          disabled={isPending}
          className="px-4 py-1.5 text-xs rounded"
          style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          破棄する
        </button>
      </div>
    </div>
  )
}
