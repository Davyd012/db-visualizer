import "server-only"

import { cookies } from "next/headers"
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"
import { z } from "zod"

import type { ConnectionConfig } from "./types"

const cookieName = "dbv_session"

const connectionConfigSchema = z.object({
  host: z.string().trim().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535),
  user: z.string().trim().min(1).max(255),
  password: z.string().min(1),
  database: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .optional()
    .or(z.literal("").transform(() => undefined)),
})

export const loginSchema = connectionConfigSchema

function getSessionKey() {
  const secret =
    process.env.DATABASE_VISUALIZER_SESSION_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "db-visualizer-local-development-secret"

  return createHash("sha256").update(secret).digest()
}

function encryptSession(config: ConnectionConfig) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getSessionKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(config), "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return Buffer.concat([iv, tag, ciphertext]).toString("base64url")
}

function decryptSession(value: string): ConnectionConfig | null {
  try {
    const payload = Buffer.from(value, "base64url")
    const iv = payload.subarray(0, 12)
    const tag = payload.subarray(12, 28)
    const ciphertext = payload.subarray(28)
    const decipher = createDecipheriv("aes-256-gcm", getSessionKey(), iv)
    decipher.setAuthTag(tag)

    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8")

    return connectionConfigSchema.parse(JSON.parse(plaintext))
  } catch {
    return null
  }
}

export async function getConnectionConfig() {
  const cookieStore = await cookies()
  const value = cookieStore.get(cookieName)?.value

  if (!value) {
    return null
  }

  return decryptSession(value)
}

export async function setConnectionConfig(config: ConnectionConfig) {
  const cookieStore = await cookies()
  cookieStore.set(cookieName, encryptSession(config), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  })
}

export async function clearConnectionConfig() {
  const cookieStore = await cookies()
  cookieStore.delete(cookieName)
}
