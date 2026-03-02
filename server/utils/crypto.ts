import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const SALT_BYTES = 16
const IV_BYTES = 12

export function randomId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString('hex')}`
}

export function hashPassword(password: string) {
  const salt = randomBytes(SALT_BYTES)
  const hash = scryptSync(password, salt, 32)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false

  const salt = Buffer.from(saltHex, 'hex')
  const hash = Buffer.from(hashHex, 'hex')
  const inputHash = scryptSync(password, salt, 32)
  if (hash.length !== inputHash.length) return false

  return timingSafeEqual(hash, inputHash)
}

function deriveKey(secret: string) {
  return createHash('sha256').update(secret).digest()
}

export function encryptApiKey(apiKey: string, secret: string) {
  const iv = randomBytes(IV_BYTES)
  const key = deriveKey(secret)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptApiKey(cipherText: string, secret: string) {
  const [ivHex, tagHex, dataHex] = cipherText.split(':')
  if (!ivHex || !tagHex || !dataHex) return ''

  const key = deriveKey(secret)
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

export function maskApiKey(apiKey: string) {
  if (!apiKey) return ''
  if (apiKey.length <= 8) return `${apiKey.slice(0, 2)}****`
  return `${apiKey.slice(0, 4)}****${apiKey.slice(-4)}`
}
