import { $fetch } from 'ofetch'
import { useRequestHeaders } from '#imports'

export async function apiFetch<T>(url: string, options?: Parameters<typeof $fetch<T>>[1]): Promise<T> {
  // SSR 阶段需要将浏览器 cookie 转发到内部 API
  const headers: Record<string, string> = {}
  if (import.meta.server) {
    const reqHeaders = useRequestHeaders(['cookie'])
    if (reqHeaders.cookie) {
      headers.cookie = reqHeaders.cookie
    }
  }

  return await $fetch<T>(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...headers,
      ...(options?.headers as Record<string, string>)
    }
  })
}

/**
 * 流式 POST 请求，逐块读取文本流。
 * @param url 请求地址
 * @param body 请求体
 * @param onChunk 每收到一个文本 chunk 时的回调（参数为增量文本）
 * @returns 完整的文本内容
 */
export async function apiStreamFetch(
  url: string,
  body: Record<string, unknown>,
  onChunk: (chunk: string) => void
): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    throw new Error(`请求失败 (${response.status}): ${text}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('响应不支持流式读取')
  }

  const decoder = new TextDecoder()
  let fullText = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      fullText += chunk
      onChunk(chunk)
    }
  } finally {
    reader.releaseLock()
  }

  return fullText
}
