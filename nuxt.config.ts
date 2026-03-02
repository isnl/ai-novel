export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@unocss/nuxt'],
  css: ['~/assets/css/theme.css'],
  app: {
    head: {
      title: 'AI 小说创作系统',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }]
    }
  },
  runtimeConfig: {
    sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production',
    apiKeySecret: process.env.API_KEY_SECRET || 'change-me-in-production-key'
  },
  nitro: {
    routeRules: {
      '/api/**': {
        cors: true
      }
    }
  },
  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: false
      }
    }
  }
})
