export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/workspace')) {
    return
  }

  const auth = useAuthStore()

  if (!auth.user) {
    await auth.fetchMe()
  }

  if (!auth.user) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
