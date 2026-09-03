'use client'

import { useMemo, useSyncExternalStore } from 'react'
import {
  subscribeDemo,
  getDemoSnapshot,
  getDemoServerSnapshot,
  demoSeed,
  saveDemoProjects,
  type DemoProject,
} from '@/lib/demo-store'

// localStorage を唯一の情報源にした demo プロジェクトの読み書き。
// 未保存のうちはシードを表示し、最初の編集で保存される。
export function useDemoProjects() {
  const stored = useSyncExternalStore(subscribeDemo, getDemoSnapshot, getDemoServerSnapshot)
  const seed = useMemo(() => demoSeed(), [])
  const projects = stored.length > 0 ? stored : seed

  function setProjects(next: DemoProject[]) {
    saveDemoProjects(next)
  }
  function updateProject(id: string, patch: Partial<DemoProject>) {
    saveDemoProjects(projects.map(p => (p.id === id ? { ...p, ...patch } : p)))
  }
  function removeProject(id: string) {
    saveDemoProjects(projects.filter(p => p.id !== id))
  }

  return { projects, setProjects, updateProject, removeProject }
}
