'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import MRRChart from '@/app/(dashboard)/dashboard/mrr-chart'
import CumulativeChart from '@/app/(dashboard)/dashboard/cumulative-chart'
import PeriodSelector from '@/app/(dashboard)/dashboard/period-selector'
import ProjectSelector from '@/app/(dashboard)/dashboard/project-selector'
import { buildDashboardView } from '@/lib/dashboard-data'
import { demoAsDashProjects, demoRevenueRows } from '@/lib/demo-store'
import { useDemoProjects } from './use-demo'

const STATUS_COLOR: Record<string, string> = {
  idea: '#444', dev: '#7C3AED', live: '#00E5FF', archived: '#333',
}
const STATUS_LABEL: Record<string, string> = {
  idea: 'IDEA', dev: 'DEV', live: 'LIVE', archived: 'ARCHIVED',
}

export function DemoDashboardView({ period, project }: { period: string; project: string }) {
  const { projects } = useDemoProjects()

  const view = useMemo(
    () => buildDashboardView(demoAsDashProjects(projects), demoRevenueRows(projects), { period, project }),
    [projects, period, project],
  )

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6 md:space-y-8">
      <p className="text-xs rounded px-3 py-2"
        style={{ background: '#0a1a1c', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
        サインイン不要のサンプルです。<Link href="/demo/projects" className="underline">プロジェクト</Link>で数字を自分のプロダクトに置き換えて試せます。
      </p>

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

      {/* Chart */}
      <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <ProjectSelector
            basePath="/demo"
            current={project}
            projects={view.liveProjects.map(p => ({ id: p.id, name: p.name, color: p.color }))}
          />
          <div className="flex items-center gap-2">
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>MRR TREND</p>
            <PeriodSelector basePath="/demo" current={period} />
          </div>
        </div>
        <MRRChart data={view.chartData} projects={view.chartProjects} currentMonth={view.currentMonth}
          yCenterValue={view.yCenterValue} animate={false} />
      </div>

      {/* Cumulative revenue */}
      <div className="p-4 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <p className="text-xs mb-3" style={{ color: 'var(--text-dim)' }}>TOTAL REVENUE</p>
        <CumulativeChart
          data={view.cumulativeChartData}
          currentMonth={view.currentMonth}
          color={view.chartProjects.length === 1 ? view.chartProjects[0].color : '#00E5FF'}
          animate={false}
        />
      </div>

      {/* Live Projects（本番ダッシュボードと同じ表示） */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>LIVE PROJECTS</p>
          <Link href="/demo/projects/new" className="text-xs px-3 py-1 rounded"
            style={{ background: 'var(--accent)', color: '#000' }}>
            + ADD
          </Link>
        </div>

        {view.liveProjects.length === 0 ? (
          <p className="text-xs py-8 text-center" style={{ color: 'var(--text-dim)' }}>
            まだライブのプロジェクトなし —{' '}
            <Link href="/demo/projects" style={{ color: 'var(--accent)' }}>プロジェクトで追加</Link>
          </p>
        ) : (
          <div className="space-y-2">
            {view.liveProjects.map(p => (
              <Link key={p.id} href={`/demo/projects/${p.id}`}
                className="flex items-center gap-3 p-3 rounded transition-colors hover:bg-[#111]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                <span className="text-sm flex-1">{p.name}</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ color: STATUS_COLOR[p.status], background: '#111' }}>
                  {STATUS_LABEL[p.status]}
                </span>
                <span className="text-sm font-bold" style={{ color: p.color }}>
                  ¥{(p.mrr ?? 0).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 保存 CTA */}
      <div className="rounded p-6 text-center" style={{ background: '#0a1a0a', border: '1px solid var(--accent)' }}>
        <p className="text-sm font-bold mb-1">この内容で公開ダッシュボードを作る</p>
        <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
          入力内容はこの端末に保存されています。サインインするとアカウントに取り込めます（無料・カード不要）。
        </p>
        <Link href="/signup?from=demo" className="inline-block px-8 py-2.5 rounded font-bold text-sm"
          style={{ background: 'var(--accent)', color: '#000' }}>
          サインインして保存 →
        </Link>
      </div>
    </div>
  )
}
