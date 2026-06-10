'use client'

import { useState } from 'react'
import { EditProjectForm } from './edit-project-form'
import { RevenueHistoryEditor } from './revenue-history-editor'
import type { Project } from '@/types'

type EditableProject = Pick<Project,
  'id' | 'name' | 'status' | 'color' | 'mrr' | 'price' | 'payment_provider' | 'launch_month'
>

export function EditPageClient({
  project,
  initialHistory,
}: {
  project: EditableProject
  initialHistory: { month: string; mrr: number }[]
}) {
  const [launchMonth, setLaunchMonth] = useState<string | null>(project.launch_month)

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <EditProjectForm project={project} onLaunchMonthChange={setLaunchMonth} />

      {(launchMonth !== null || initialHistory.length > 0) && (
        <div className="pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
          <RevenueHistoryEditor
            projectId={project.id}
            initialHistory={initialHistory}
            launchMonth={launchMonth}
          />
        </div>
      )}
    </div>
  )
}
