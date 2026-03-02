export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@unocss/nuxt'],
  css: ['~/assets/css/theme.css'],
  imports: {
    autoImport: false
  },
  components: {
    dirs: []
  },
  app: {
    head: {
      title: '纸墨青 · AI 小说创作平台',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;600;700&display=swap'
        }
      ]
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
