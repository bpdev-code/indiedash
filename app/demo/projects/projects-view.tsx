'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { buildDashboardView } from '@/lib/dashboard-data'
import { demoAsDashProjects, demoRevenueRows, DEMO_MAX_PROJECTS, clearDemoProjects } from '@/lib/demo-store'
import { useDemoProjects } from '../use-demo'

const STATUS_COLOR: Record<string, string> = {
  idea: '#555', dev: '#7C3AED', live: '#00E5FF', archived: '#333',
}
const STATUS_LABEL: Record<string, string> = {
  idea: 'IDEA', dev: 'DEV', live: 'LIVE', archived: 'ARCHIVED',
}

export function DemoProjectsView() {
  const { projects, removeProject } = useDemoProjects()

  const view = useMemo(
    () => buildDashboardView(demoAsDashProjects(projects), demoRevenueRows(projects), {}),
    [projects],
  )

  const activeCount = projects.filter(p => p.status !== 'archived').length

  function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" を削除しますか？`)) return
    removeProject(id)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>MRR</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>¥{view.totalMRR.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>GROWTH</p>
          <p className="text-2xl font-bold" style={{ color: view.growthColor }}>{view.growthLabel}</p>
        </div>
        <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>TOTAL REVENUE</p>
          <p className="text-2xl font-bold">¥{view.cumulativeMRR.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>CUSTOMERS</p>
          <p className="text-2xl font-bold">{view.totalCustomers.toLocaleString()}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>PROJECTS</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>{activeCount}/∞ 件</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={clearDemoProjects} className="text-xs hover:underline" style={{ color: 'var(--text-dim)' }}>
            サンプルに戻す
          </button>
          {projects.length < DEMO_MAX_PROJECTS && (
            <Link href="/demo/projects/new" className="text-xs px-4 py-2 rounded font-bold"
              style={{ background: 'var(--accent)', color: '#000' }}>
              + NEW PROJECT
            </Link>
          )}
        </div>
      </div>

      {/* Project List */}
      {projects.length === 0 ? (
        <p className="text-xs py-16 text-center" style={{ color: 'var(--text-dim)' }}>
          プロジェクトなし —{' '}
          <Link href="/demo/projects/new" style={{ color: 'var(--accent)' }}>最初のプロジェクトを追加</Link>
        </p>
      ) : (
        <div className="space-y-2">
          {projects.map(p => (
            <div key={p.id} className="relative rounded"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: p.status === 'archived' ? 0.5 : 1 }}>
              <Link href={`/demo/projects/${p.id}`} className="block p-3 pr-16">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{p.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{p.launchMonth}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded"
                    style={{ color: STATUS_COLOR[p.status], background: '#111' }}>
                    {STATUS_LABEL[p.status]}
                  </span>
                  <span className="text-sm font-bold" style={{ color: p.color }}>
                    ¥{p.mrr.toLocaleString()}
                  </span>
                </div>
                {p.customers > 0 && (
                  <p className="text-xs mt-1 pl-5" style={{ color: 'var(--text-dim)' }}>{p.customers} customers</p>
                )}
              </Link>
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  className="text-xs px-2 py-1 rounded hover:bg-[#221111] transition-colors"
                  style={{ color: '#ff4444' }}>
                  DEL
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
