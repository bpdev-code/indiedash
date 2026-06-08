'use client'

import { deleteProject } from '@/app/actions/projects'
import { useTransition } from 'react'

export default function DeleteButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`"${name}" を削除しますか？`)) return
    startTransition(() => deleteProject(id))
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-xs px-2 py-1 rounded hover:bg-[#221111] transition-colors"
      style={{ color: '#ff4444', opacity: isPending ? 0.5 : 1 }}
    >
      {isPending ? '...' : 'DEL'}
    </button>
  )
}
