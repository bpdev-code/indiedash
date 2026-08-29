'use client'

import { useRef, useState, useTransition } from 'react'

interface Props {
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>
}

export default function FeedbackForm({ action }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const result = await action(formData)
      if (result?.error) {
        setMessage({ text: result.error, ok: false })
      } else {
        setMessage({ text: '送信しました。ありがとうございます！', ok: true })
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-2">
      <textarea
        name="message"
        required
        rows={4}
        placeholder="フィードバックを入力..."
        className="w-full px-3 py-2 text-xs rounded resize-none"
      />
      <button type="submit" disabled={isPending}
        className="text-xs px-4 py-2 rounded font-bold transition-opacity"
        style={{ background: 'var(--accent)', color: '#000', opacity: isPending ? 0.6 : 1 }}>
        {isPending ? '送信中...' : '送信'}
      </button>
      {message && (
        <p className="text-xs" style={{ color: message.ok ? '#10B981' : '#ff4444' }}>{message.text}</p>
      )}
    </form>
  )
}
