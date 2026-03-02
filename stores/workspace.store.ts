import { defineStore } from 'pinia'
import type { Chapter, ChapterDraft, Project } from '~/types/domain'
import { apiFetch } from '~/composables/useApi'

interface WorkspaceState {
  projects: Project[]
  currentProject: Project | null
  chapters: Chapter[]
  drafts: ChapterDraft[]
  loading: boolean
}

export const useWorkspaceStore = defineStore('workspace', {
  state: (): WorkspaceState => ({
    projects: [],
    currentProject: null,
    chapters: [],
    drafts: [],
    loading: false
  }),
  actions: {
    async fetchProjects(): Promise<void> {
      this.loading = true
      try {
        const res = await apiFetch<{ projects: Project[] }>('/api/projects')
        this.projects = res.projects
      } finally {
        this.loading = false
      }
    },
    async createProject(payload: { title: string; genre: string; style: string; targetWords: number }): Promise<Project> {
      const res = await apiFetch<{ project: Project }>('/api/projects', {
        method: 'POST',
        body: payload
      })
      this.projects.unshift(res.project)
      return res.project
    },
    async fetchProject(id: string): Promise<{ project: Project; chapters: Chapter[] }> {
      const res = await apiFetch<{ project: Project; chapters: Chapter[] }>(`/api/projects/${id}`)
      this.currentProject = res.project
      this.chapters = res.chapters
      return res
    },
    async createChapter(projectId: string, payload: { title: string }): Promise<Chapter> {
      const res = await apiFetch<{ chapter: Chapter }>(`/api/projects/${projectId}/chapters`, {
        method: 'POST',
        body: payload
      })
      this.chapters.push(res.chapter)
      return res.chapter
    },
    async fetchDrafts(chapterId: string): Promise<ChapterDraft[]> {
      const res = await apiFetch<{ drafts: ChapterDraft[] }>(`/api/chapters/${chapterId}/drafts`)
      this.drafts = res.drafts
      return res.drafts
    }
  }
})
