export function quoteIdentifier(identifier: string) {
  return `\`${identifier.replaceAll("`", "``")}\``
}

export function quoteQualifiedIdentifier(database: string, table: string) {
  return `${quoteIdentifier(database)}.${quoteIdentifier(table)}`
}

export function parseListParam(value: string | string[] | undefined) {
  if (!value) {
    return []
  }

  const raw = Array.isArray(value) ? value.join(",") : value

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}
