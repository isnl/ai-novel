import { $fetch } from 'ofetch'

export async function apiFetch<T>(url: string, options?: Parameters<typeof $fetch<T>>[1]): Promise<T> {
  return await $fetch<T>(url, {
    ...options,
    credentials: 'include'
  })
}
