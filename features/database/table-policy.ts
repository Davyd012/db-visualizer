import type { ColumnMetadata, UniqueKey } from "./types"

export type TablePolicy = {
  canInsert: boolean
  canUpdate: boolean
  canDelete: boolean
  hiddenColumns: string[]
  readOnlyColumns: string[]
  editableColumns?: string[]
  unsafeEditableColumns?: string[]
}

export const defaultTablePolicy: TablePolicy = {
  canInsert: false,
  canUpdate: true,
  canDelete: false,
  hiddenColumns: [],
  readOnlyColumns: [],
}

const tablePolicies: Record<string, Record<string, Partial<TablePolicy>>> = {}

export function getTablePolicy(database: string, table: string): TablePolicy {
  const databasePolicy = tablePolicies[database] ?? {}
  const tablePolicy = databasePolicy[table] ?? {}

  return {
    ...defaultTablePolicy,
    ...tablePolicy,
    hiddenColumns:
      tablePolicy.hiddenColumns ?? defaultTablePolicy.hiddenColumns,
    readOnlyColumns:
      tablePolicy.readOnlyColumns ?? defaultTablePolicy.readOnlyColumns,
    unsafeEditableColumns: tablePolicy.unsafeEditableColumns ?? [],
  }
}

export function canEditColumn(
  policy: TablePolicy,
  column: ColumnMetadata,
  uniqueKeys: UniqueKey[] = []
) {
  const columnName = column.name

  if (
    policy.hiddenColumns.includes(columnName) ||
    policy.readOnlyColumns.includes(columnName)
  ) {
    return false
  }

  if (policy.editableColumns) {
    return policy.editableColumns.includes(columnName)
  }

  if (policy.unsafeEditableColumns?.includes(columnName)) {
    return true
  }

  return isSafeDefaultEditableColumn(column, uniqueKeys)
}

export function getEditableColumns(
  policy: TablePolicy,
  columns: ColumnMetadata[],
  uniqueKeys: UniqueKey[] = []
) {
  return columns.filter((column) => canEditColumn(policy, column, uniqueKeys))
}

export function isSafeDefaultEditableColumn(
  column: ColumnMetadata,
  uniqueKeys: UniqueKey[]
) {
  const name = column.name.toLowerCase()
  const extra = column.extra.toLowerCase()
  const type = column.columnType.toLowerCase()
  const keyColumns = new Set(uniqueKeys.flatMap((key) => key.columns))

  if (keyColumns.has(column.name)) {
    return false
  }

  if (
    extra.includes("auto_increment") ||
    extra.includes("generated") ||
    extra.includes("virtual") ||
    extra.includes("stored")
  ) {
    return false
  }

  if (
    name === "created_at" ||
    name === "updated_at" ||
    name === "deleted_at" ||
    name === "created_on" ||
    name === "updated_on" ||
    name === "modified_at"
  ) {
    return false
  }

  if (
    name.includes("password") ||
    name.includes("passwd") ||
    name.includes("hash") ||
    name.includes("token") ||
    name.includes("secret") ||
    name.endsWith("_key") ||
    name.includes("api_key") ||
    name.includes("private_key")
  ) {
    return false
  }

  if (type.includes("binary") || type.includes("blob")) {
    return false
  }

  return true
}
