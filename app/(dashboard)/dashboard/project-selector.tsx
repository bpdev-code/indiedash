'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Project { id: string; name: string; color: string }

export default function ProjectSelector({
  projects,
  current,
}: {
  projects: Project[]
  current: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('project', value)
    router.push(`/dashboard?${params.toString()}`)
  }

  if (projects.length <= 1) return null

  return (
    <div className="flex gap-1 flex-wrap">
      <button
        onClick={() => select('all')}
        className="px-2 py-0.5 text-xs rounded transition-colors"
        style={{
          background: current === 'all' ? '#222' : 'transparent',
          color: current === 'all' ? 'var(--text)' : 'var(--text-dim)',
          border: `1px solid ${current === 'all' ? '#333' : 'var(--border)'}`,
        }}
      >
        ALL
      </button>
      {projects.map(p => (
        <button
          key={p.id}
          onClick={() => select(p.id)}
          className="px-2 py-0.5 text-xs rounded transition-colors flex items-center gap-1"
          style={{
            background: current === p.id ? '#222' : 'transparent',
            color: current === p.id ? p.color : 'var(--text-dim)',
            border: `1px solid ${current === p.id ? p.color : 'var(--border)'}`,
          }}
        >
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: p.color }} />
          {p.name}
        </button>
      ))}
    </div>
  )
}
