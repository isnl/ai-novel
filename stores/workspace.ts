import type { Chapter, ChapterDraft, Project } from '~/types/domain'

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
    async fetchProjects() {
      this.loading = true
      try {
        const res = await apiFetch<{ projects: Project[] }>('/api/projects')
        this.projects = res.projects
      } finally {
        this.loading = false
      }
    },
    async createProject(payload: { title: string; genre: string; style: string; targetWords: number }) {
      const res = await apiFetch<{ project: Project }>('/api/projects', {
        method: 'POST',
        body: payload
      })
      this.projects.unshift(res.project)
      return res.project
    },
    async fetchProject(id: string) {
      const res = await apiFetch<{ project: Project; chapters: Chapter[] }>(`/api/projects/${id}`)
      this.currentProject = res.project
      this.chapters = res.chapters
      return res
    },
    async createChapter(projectId: string, payload: { title: string }) {
      const res = await apiFetch<{ chapter: Chapter }>(`/api/projects/${projectId}/chapters`, {
        method: 'POST',
        body: payload
      })
      this.chapters.push(res.chapter)
      return res.chapter
    },
    async fetchDrafts(chapterId: string) {
      const res = await apiFetch<{ drafts: ChapterDraft[] }>(`/api/chapters/${chapterId}/drafts`)
      this.drafts = res.drafts
      return res.drafts
    }
  }
})
