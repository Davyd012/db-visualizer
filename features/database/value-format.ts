import type { RowValue } from "./types"

export function formatValue(value: RowValue) {
  if (value === null) {
    return "NULL"
  }

  if (Buffer.isBuffer(value)) {
    return `<binary ${value.byteLength} bytes>`
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }

  return String(value)
}

export function valueInputString(value: RowValue) {
  if (value === null) {
    return ""
  }

  if (Buffer.isBuffer(value)) {
    return value.toString("base64")
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return String(value)
}
