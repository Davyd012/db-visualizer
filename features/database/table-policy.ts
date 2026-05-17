export type TablePolicy = {
  canInsert: boolean
  canUpdate: boolean
  canDelete: boolean
  hiddenColumns: string[]
  readOnlyColumns: string[]
  editableColumns?: string[]
}

export const defaultTablePolicy: TablePolicy = {
  canInsert: false,
  canUpdate: false,
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
  }
}

export function canEditColumn(policy: TablePolicy, column: string) {
  if (
    policy.hiddenColumns.includes(column) ||
    policy.readOnlyColumns.includes(column)
  ) {
    return false
  }

  if (policy.editableColumns) {
    return policy.editableColumns.includes(column)
  }

  return true
}
