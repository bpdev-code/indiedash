'use client'

import { useState } from 'react'
import { EditProjectForm } from './edit-project-form'
import { RevenueHistoryEditor } from './revenue-history-editor'
import type { Project } from '@/types'

type EditableProject = Pick<Project,
  'id' | 'name' | 'status' | 'color' | 'mrr' | 'price' | 'payment_provider' | 'launch_month' | 'users_count'
>

export function EditPageClient({
  project,
  initialHistory,
  stripeConnected,
}: {
  project: EditableProject
  initialHistory: { month: string; mrr: number }[]
  stripeConnected: boolean
}) {
  const [launchMonth, setLaunchMonth] = useState<string | null>(project.launch_month)

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <EditProjectForm project={project} onLaunchMonthChange={setLaunchMonth} stripeConnected={stripeConnected} />

      {!stripeConnected && (launchMonth !== null || initialHistory.length > 0) && (
        <div className="pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
          <RevenueHistoryEditor
            projectId={project.id}
            initialHistory={initialHistory}
            launchMonth={launchMonth}
          />
        </div>
      )}

      {stripeConnected && (
        <p className="text-xs pt-4 border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
          Stripe連携中は、MRRと収益履歴はStripeから自動的に取得されるため手入力は不要です。
        </p>
      )}
    </div>
  )
}
