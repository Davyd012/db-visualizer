import "server-only"

import type { RowDataPacket } from "mysql2"

import { quoteIdentifier } from "./identifier"
import { withConnection, type MysqlConnection } from "./mysql"
import type {
  ColumnMetadata,
  ConnectionConfig,
  DatabaseSummary,
  ForeignKeyMetadata,
  IndexMetadata,
  ReferencingTableMetadata,
  TableMetadata,
  TableSummary,
  UniqueKey,
} from "./types"

const systemDatabases = [
  "information_schema",
  "mysql",
  "performance_schema",
  "sys",
]

type MetadataScalar = string | number | bigint | Buffer | Date | null | undefined
type SchemaRow = RowDataPacket & { schema_name?: MetadataScalar } & Record<
    string,
    MetadataScalar
  >
type TableRow = RowDataPacket & {
  table_name: string
  table_type: string
  engine: string | null
  table_rows: number | null
  create_time: Date | null
  update_time: Date | null
}
type ShowTableRow = RowDataPacket & Record<string, MetadataScalar>
type ColumnRow = RowDataPacket & {
  column_name: string
  ordinal_position: number
  column_type: string
  is_nullable: "YES" | "NO"
  column_default: string | null
  extra: string
  column_key: string
  column_comment: string
  character_set_name: string | null
  collation_name: string | null
}
type ShowColumnRow = RowDataPacket & {
  Field: MetadataScalar
  Type: MetadataScalar
  Null: MetadataScalar
  Key: MetadataScalar
  Default: MetadataScalar
  Extra: MetadataScalar
}
type IndexRow = RowDataPacket & {
  index_name: string
  non_unique: 0 | 1
  seq_in_index: number
  column_name: string
  collation: string | null
  index_type: string
}
type ForeignKeyRow = RowDataPacket & {
  constraint_name: string
  column_name: string
  referenced_table_name: string
  referenced_column_name: string
}
type ReferencingRow = RowDataPacket & {
  table_name: string
  column_name: string
  constraint_name: string
}

function allowedDatabaseNames(names: string[]) {
  const allowlist = process.env.DATABASE_VISUALIZER_ALLOWED_DATABASES?.split(
    ","
  )
    .map((name) => name.trim())
    .filter(Boolean)

  if (!allowlist?.length) {
    return names
  }

  return names.filter((name) => allowlist.includes(name))
}

export async function listDatabases(
  config: ConnectionConfig
): Promise<DatabaseSummary[]> {
  return withConnection(config, async (connection) => {
    const names = new Set<string>()

    try {
      const [rows] = await connection.query<SchemaRow[]>("SHOW DATABASES")

      for (const row of rows) {
        const name = readDatabaseName(row)

        if (name && !systemDatabases.includes(name)) {
          names.add(name)
        }
      }
    } catch {
      const [rows] = await connection.query<SchemaRow[]>(
        `SELECT schema_name AS schema_name
         FROM information_schema.schemata
         WHERE schema_name NOT IN (?, ?, ?, ?)
         ORDER BY schema_name`,
        systemDatabases
      )

      for (const row of rows) {
        const name = normalizeMetadataValue(row.schema_name)

        if (name) {
          names.add(name)
        }
      }
    }

    if (
      config.database &&
      (await canUseDatabase(connection, config.database))
    ) {
      names.add(config.database)
    }

    return allowedDatabaseNames([...names].sort()).map((name) => ({ name }))
  })
}

export async function listTables(
  config: ConnectionConfig,
  database: string
): Promise<TableSummary[]> {
  return withConnection(config, async (connection) => {
    await assertDatabaseExists(connection, database)

    const [rows] = await connection.query<TableRow[]>(
      `SELECT
         table_name AS table_name,
         table_type AS table_type,
         engine AS engine,
         table_rows AS table_rows,
         create_time AS create_time,
         update_time AS update_time
       FROM information_schema.tables
       WHERE table_schema = ?
       ORDER BY table_name`,
      [database]
    )

    if (!rows.length) {
      const showTables = await listTablesWithShowTables(connection, database)

      if (showTables.length) {
        return showTables
      }
    }

    return rows.map((row) => ({
      name: row.table_name,
      type: row.table_type,
      engine: row.engine,
      rows: row.table_rows,
      createdAt: row.create_time,
      updatedAt: row.update_time,
    }))
  })
}

export async function getTableMetadata(
  config: ConnectionConfig,
  database: string,
  table: string
): Promise<TableMetadata> {
  return withConnection(config, async (connection) => {
    await assertTableExists(connection, database, table)

    const [columns] = await connection.query<ColumnRow[]>(
      `SELECT
              column_name AS column_name,
              ordinal_position AS ordinal_position,
              column_type AS column_type,
              is_nullable AS is_nullable,
              column_default AS column_default,
              extra AS extra,
              column_key AS column_key,
              column_comment AS column_comment,
              character_set_name AS character_set_name,
              collation_name AS collation_name
       FROM information_schema.columns
       WHERE table_schema = ? AND table_name = ?
       ORDER BY ordinal_position`,
      [database, table]
    )
    const [indexes] = await connection.query<IndexRow[]>(
      `SELECT
              index_name AS index_name,
              non_unique AS non_unique,
              seq_in_index AS seq_in_index,
              column_name AS column_name,
              collation AS collation,
              index_type AS index_type
       FROM information_schema.statistics
       WHERE table_schema = ? AND table_name = ?
       ORDER BY index_name, seq_in_index`,
      [database, table]
    )
    const [foreignKeys] = await connection.query<ForeignKeyRow[]>(
      `SELECT
              constraint_name AS constraint_name,
              column_name AS column_name,
              referenced_table_name AS referenced_table_name,
              referenced_column_name AS referenced_column_name
       FROM information_schema.key_column_usage
       WHERE table_schema = ? AND table_name = ? AND referenced_table_name IS NOT NULL
       ORDER BY constraint_name, ordinal_position`,
      [database, table]
    )
    const [referencingTables] = await connection.query<ReferencingRow[]>(
      `SELECT
              table_name AS table_name,
              column_name AS column_name,
              constraint_name AS constraint_name
       FROM information_schema.key_column_usage
       WHERE table_schema = ? AND referenced_table_name = ? AND referenced_column_name IS NOT NULL
       ORDER BY table_name, column_name`,
      [database, table]
    )

    return {
      columns: columns.length
        ? columns.map(mapColumn)
        : await listColumnsWithShowColumns(connection, database, table),
      indexes: indexes.map(mapIndex),
      foreignKeys: foreignKeys.map(mapForeignKey),
      referencingTables: referencingTables.map(mapReferencingTable),
    }
  })
}

export async function assertDatabaseExists(
  connection: MysqlConnection,
  database: string
) {
  if (!allowedDatabaseNames([database]).includes(database)) {
    throw new Error("Database is not allowed by this app.")
  }

  const visibleDatabases = await getVisibleDatabaseNames(connection)

  if (visibleDatabases.includes(database)) {
    return
  }

  if (!(await canUseDatabase(connection, database))) {
    throw new Error("Database is not available.")
  }
}

export async function assertTableExists(
  connection: MysqlConnection,
  database: string,
  table: string
) {
  await assertDatabaseExists(connection, database)

  const [rows] = await connection.query<TableRow[]>(
    `SELECT table_name AS table_name
     FROM information_schema.tables
     WHERE table_schema = ? AND table_name = ?`,
    [database, table]
  )

  if (!rows.some((row) => row.table_name === table)) {
    const showTables = await listTablesWithShowTables(connection, database)

    if (!showTables.some((row) => row.name === table)) {
      throw new Error("Table is not available.")
    }
  }
}

export async function getColumnsForTable(
  connection: MysqlConnection,
  database: string,
  table: string
) {
  await assertTableExists(connection, database, table)

  const [rows] = await connection.query<ColumnRow[]>(
    `SELECT
            column_name AS column_name,
            ordinal_position AS ordinal_position,
            column_type AS column_type,
            is_nullable AS is_nullable,
            column_default AS column_default,
            extra AS extra,
            column_key AS column_key,
            column_comment AS column_comment,
            character_set_name AS character_set_name,
            collation_name AS collation_name
     FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ?
     ORDER BY ordinal_position`,
    [database, table]
  )

  if (rows.length) {
    return rows.map(mapColumn)
  }

  return listColumnsWithShowColumns(connection, database, table)
}

export function getUniqueKeys(indexes: IndexMetadata[]): UniqueKey[] {
  const grouped = new Map<string, IndexMetadata[]>()

  for (const index of indexes) {
    if (index.nonUnique) {
      continue
    }

    grouped.set(index.name, [...(grouped.get(index.name) ?? []), index])
  }

  return [...grouped.entries()].map(([name, parts]) => ({
    name,
    columns: parts
      .sort((a, b) => a.sequence - b.sequence)
      .map((part) => part.columnName),
    primary: name === "PRIMARY",
  }))
}

function mapColumn(row: ColumnRow): ColumnMetadata {
  return {
    name: row.column_name,
    ordinalPosition: row.ordinal_position,
    columnType: row.column_type,
    isNullable: row.is_nullable === "YES",
    defaultValue: row.column_default,
    extra: row.extra,
    key: row.column_key,
    comment: row.column_comment,
    characterSet: row.character_set_name,
    collation: row.collation_name,
  }
}

function mapIndex(row: IndexRow): IndexMetadata {
  return {
    name: row.index_name,
    nonUnique: row.non_unique === 1,
    sequence: row.seq_in_index,
    columnName: row.column_name,
    collation: row.collation,
    type: row.index_type,
  }
}

function mapForeignKey(row: ForeignKeyRow): ForeignKeyMetadata {
  return {
    constraintName: row.constraint_name,
    columnName: row.column_name,
    referencedTableName: row.referenced_table_name,
    referencedColumnName: row.referenced_column_name,
  }
}

function mapReferencingTable(row: ReferencingRow): ReferencingTableMetadata {
  return {
    tableName: row.table_name,
    columnName: row.column_name,
    constraintName: row.constraint_name,
  }
}

async function getVisibleDatabaseNames(connection: MysqlConnection) {
  try {
    const [rows] = await connection.query<SchemaRow[]>("SHOW DATABASES")

    return rows.map(readDatabaseName).filter(isPresent)
  } catch {
    const [rows] = await connection.query<SchemaRow[]>(
      `SELECT schema_name AS schema_name
       FROM information_schema.schemata
       WHERE schema_name NOT IN (?, ?, ?, ?)`,
      systemDatabases
    )

    return rows.map((row) => normalizeMetadataValue(row.schema_name)).filter(isPresent)
  }
}

async function canUseDatabase(connection: MysqlConnection, database: string) {
  try {
    await connection.query(`USE ${quoteIdentifier(database)}`)
    return true
  } catch {
    return false
  }
}

function readDatabaseName(row: SchemaRow) {
  return (
    normalizeMetadataValue(row.schema_name) ??
    Object.values(row).map(normalizeMetadataValue).find(isPresent)
  )
}

function isPresent(value: string | undefined | null): value is string {
  return typeof value === "string" && value.length > 0
}

async function listTablesWithShowTables(
  connection: MysqlConnection,
  database: string
): Promise<TableSummary[]> {
  const [rows] = await connection.query<ShowTableRow[]>(
    `SHOW FULL TABLES FROM ${quoteIdentifier(database)}`
  )
  const tables: TableSummary[] = []

  for (const row of rows) {
    const entries = Object.entries(row)
      .map(([key, value]) => [key, normalizeMetadataValue(value)] as const)
      .filter((entry): entry is readonly [string, string] => isPresent(entry[1]))
    const name =
      entries.find(([key]) => key.toLowerCase().startsWith("tables_in_"))?.[1] ??
      entries.find(([key]) => key.toLowerCase() !== "table_type")?.[1]
    const type = entries.find(([key]) => key.toLowerCase() === "table_type")?.[1]

    if (!name) {
      continue
    }

    tables.push({
      name,
      type: type ?? "BASE TABLE",
      engine: null,
      rows: null,
      createdAt: null,
      updatedAt: null,
    })
  }

  return tables
}

async function listColumnsWithShowColumns(
  connection: MysqlConnection,
  database: string,
  table: string
): Promise<ColumnMetadata[]> {
  const [rows] = await connection.query<ShowColumnRow[]>(
    `SHOW FULL COLUMNS FROM ${quoteIdentifier(database)}.${quoteIdentifier(table)}`
  )

  return rows.map((row, index) => {
    const name = normalizeMetadataValue(row.Field) ?? ""
    const columnType = normalizeMetadataValue(row.Type) ?? "unknown"
    const nullable = normalizeMetadataValue(row.Null) === "YES"

    return {
      name,
      ordinalPosition: index + 1,
      columnType,
      isNullable: nullable,
      defaultValue: normalizeMetadataValue(row.Default) ?? null,
      extra: normalizeMetadataValue(row.Extra) ?? "",
      key: normalizeMetadataValue(row.Key) ?? "",
      comment: "",
      characterSet: null,
      collation: null,
    }
  })
}

function normalizeMetadataValue(value: MetadataScalar) {
  if (value === null || value === undefined) {
    return undefined
  }

  if (Buffer.isBuffer(value)) {
    return value.toString("utf8")
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return String(value)
}
