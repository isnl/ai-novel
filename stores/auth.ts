import type { User, UserPreference } from '~/types/domain'

interface AuthState {
  user: User | null
  pending: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    pending: false
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.user)
  },
  actions: {
    async fetchMe() {
      try {
        const res = await apiFetch<{ user: User }>('/api/me')
        this.user = res.user
      } catch {
        this.user = null
      }
    },
    async register(payload: { email: string; password: string; nickname: string }) {
      this.pending = true
      try {
        const res = await apiFetch<{ user: User }>('/api/auth/register', {
          method: 'POST',
          body: payload
        })
        this.user = res.user
      } finally {
        this.pending = false
      }
    },
    async login(payload: { email: string; password: string }) {
      this.pending = true
      try {
        const res = await apiFetch<{ user: User }>('/api/auth/login', {
          method: 'POST',
          body: payload
        })
        this.user = res.user
      } finally {
        this.pending = false
      }
    },
    async logout() {
      await apiFetch('/api/auth/logout', { method: 'POST' })
      this.user = null
      await navigateTo('/login')
    },
    async updatePreferences(payload: UserPreference) {
      const res = await apiFetch<{ preferences: UserPreference }>('/api/me/preferences', {
        method: 'PUT',
        body: payload
      })
      if (this.user) {
        this.user.preferences = res.preferences
      }
    }
  }
})
