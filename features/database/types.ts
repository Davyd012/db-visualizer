export type ConnectionConfig = {
  host: string
  port: number
  user: string
  password: string
  database?: string
}

export type DatabaseSummary = {
  name: string
}

export type TableSummary = {
  name: string
  type: string
  engine: string | null
  rows: number | null
  createdAt: Date | null
  updatedAt: Date | null
}

export type ColumnMetadata = {
  name: string
  ordinalPosition: number
  columnType: string
  isNullable: boolean
  defaultValue: string | null
  extra: string
  key: string
  comment: string
  characterSet: string | null
  collation: string | null
}

export type IndexMetadata = {
  name: string
  nonUnique: boolean
  sequence: number
  columnName: string
  collation: string | null
  type: string
}

export type ForeignKeyMetadata = {
  constraintName: string
  columnName: string
  referencedTableName: string
  referencedColumnName: string
}

export type ReferencingTableMetadata = {
  tableName: string
  columnName: string
  constraintName: string
}

export type TableMetadata = {
  columns: ColumnMetadata[]
  indexes: IndexMetadata[]
  foreignKeys: ForeignKeyMetadata[]
  referencingTables: ReferencingTableMetadata[]
}

export type RowValue = string | number | boolean | Date | Buffer | null
export type DataRow = Record<string, RowValue>

export type UniqueKey = {
  name: string
  columns: string[]
  primary: boolean
}

export type RowPage = {
  rows: DataRow[]
  page: number
  pageSize: number
  selectedColumns: string[]
  sortColumn: string
  sortDirection: "asc" | "desc"
  search: string
  hasNextPage: boolean
  totalColumns: number
  uniqueKeys: UniqueKey[]
}
