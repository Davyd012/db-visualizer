"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { listDatabases } from "./metadata"
import { createMysqlConnection } from "./mysql"
import { deleteRow, insertRow, updateRow } from "./rows"
import {
  clearConnectionConfig,
  getConnectionConfig,
  loginSchema,
  setConnectionConfig,
} from "./session"

const writeSchema = z.object({
  database: z.string().min(1),
  table: z.string().min(1),
  returnPath: z.string().min(1),
})

export async function loginAction(_state: string | null, formData: FormData) {
  const parsed = loginSchema.safeParse({
    host: formData.get("host"),
    port: formData.get("port"),
    user: formData.get("user"),
    password: formData.get("password"),
    database: formData.get("database"),
  })

  if (!parsed.success) {
    return "Enter a valid host, port, username, and password."
  }

  try {
    const connection = await createMysqlConnection(parsed.data)
    await connection.ping()
    await connection.end()
    await setConnectionConfig(parsed.data)
    const databases = await listDatabases(parsed.data)
    const target = parsed.data.database || databases[0]?.name

    redirect(target ? `/databases/${encodeURIComponent(target)}` : "/databases")
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }

    return error instanceof Error
      ? error.message
      : "Unable to connect to MySQL."
  }
}

export async function logoutAction() {
  await clearConnectionConfig()
  redirect("/login")
}

export async function insertRowAction(formData: FormData) {
  const config = await requireConfig()
  const { database, table, returnPath } = parseWriteTarget(formData)
  const values = collectPrefixedValues(formData, "value:")

  await insertRow(config, database, table, values)
  revalidatePath(returnPath)
  redirect(returnPath)
}

export async function updateRowAction(formData: FormData) {
  const config = await requireConfig()
  const { database, table, returnPath } = parseWriteTarget(formData)
  const keys = collectPrefixedValues(formData, "key:")
  const values = collectPrefixedValues(formData, "value:")

  await updateRow(config, database, table, keys, values)
  revalidatePath(returnPath)
  redirect(returnPath)
}

export async function deleteRowAction(formData: FormData) {
  const config = await requireConfig()
  const { database, table, returnPath } = parseWriteTarget(formData)
  const keys = collectPrefixedValues(formData, "key:")

  await deleteRow(config, database, table, keys)
  revalidatePath(returnPath)
  redirect(returnPath)
}

async function requireConfig() {
  const config = await getConnectionConfig()

  if (!config) {
    redirect("/login")
  }

  return config
}

function parseWriteTarget(formData: FormData) {
  return writeSchema.parse({
    database: formData.get("database"),
    table: formData.get("table"),
    returnPath: formData.get("returnPath"),
  })
}

function collectPrefixedValues(formData: FormData, prefix: string) {
  const values: Record<string, string> = {}

  for (const [key, value] of formData.entries()) {
    if (key.startsWith(prefix) && typeof value === "string") {
      values[key.slice(prefix.length)] = value
    }
  }

  return values
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  )
}
