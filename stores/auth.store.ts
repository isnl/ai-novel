import { defineStore } from 'pinia'
import { navigateTo } from '#imports'
import type { User, UserPreference } from '~/types/domain'
import { apiFetch } from '~/composables/useApi'

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
    isLoggedIn: (state): boolean => Boolean(state.user)
  },
  actions: {
    async fetchMe(): Promise<void> {
      try {
        const res = await apiFetch<{ user: User }>('/api/me')
        this.user = res.user
      } catch {
        this.user = null
      }
    },
    async register(payload: { email: string; password: string; nickname: string }): Promise<void> {
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
    async login(payload: { email: string; password: string }): Promise<void> {
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
    async logout(): Promise<void> {
      await apiFetch('/api/auth/logout', { method: 'POST' })
      this.user = null
      await navigateTo('/login')
    },
    async updatePreferences(payload: UserPreference): Promise<void> {
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
