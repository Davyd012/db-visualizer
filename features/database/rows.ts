import "server-only"

import type { ResultSetHeader, RowDataPacket } from "mysql2"

import { quoteIdentifier, quoteQualifiedIdentifier } from "./identifier"
import { getColumnsForTable, getUniqueKeys } from "./metadata"
import { withConnection, type MysqlConnection } from "./mysql"
import { getEditableColumns, getTablePolicy } from "./table-policy"
import type {
  ConnectionConfig,
  DataRow,
  RowPage,
  RowValue,
  UniqueKey,
} from "./types"

export type RowQueryInput = {
  database: string
  table: string
  columns: string[]
  page: number
  pageSize: number
  sortColumn?: string
  sortDirection?: "asc" | "desc"
  search?: string
}

export async function getRows(
  config: ConnectionConfig,
  input: RowQueryInput
): Promise<RowPage> {
  return withConnection(config, async (connection) => {
    const columns = await getColumnsForTable(
      connection,
      input.database,
      input.table
    )
    const metadataColumns = columns.map((column) => column.name)
    const policy = getTablePolicy(input.database, input.table)
    const visibleColumns = metadataColumns.filter(
      (column) => !policy.hiddenColumns.includes(column)
    )
    const selectedColumns = sanitizeSelectedColumns(
      input.columns,
      visibleColumns
    )
    const sortColumn = visibleColumns.includes(input.sortColumn ?? "")
      ? input.sortColumn!
      : selectedColumns[0]
    const sortDirection = input.sortDirection === "asc" ? "asc" : "desc"
    const pageSize = clamp(input.pageSize, 10, 100)
    const page = Math.max(1, input.page)
    const offset = (page - 1) * pageSize
    const search = input.search?.trim() ?? ""
    const where = buildSearchWhere(search, selectedColumns)
    const qualifiedTable = quoteQualifiedIdentifier(input.database, input.table)
    const sql = [
      `SELECT ${selectedColumns.map(quoteIdentifier).join(", ")}`,
      `FROM ${qualifiedTable}`,
      where.sql,
      `ORDER BY ${quoteIdentifier(sortColumn)} ${sortDirection.toUpperCase()}`,
      "LIMIT ? OFFSET ?",
    ]
      .filter(Boolean)
      .join(" ")

    const [rows] = await connection.query<RowDataPacket[]>(sql, [
      ...where.params,
      pageSize + 1,
      offset,
    ])
    const [indexRows] = await connection.query<RowDataPacket[]>(
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
      [input.database, input.table]
    )

    return {
      rows: rows.slice(0, pageSize).map(normalizeRow),
      page,
      pageSize,
      selectedColumns,
      sortColumn,
      sortDirection,
      search,
      hasNextPage: rows.length > pageSize,
      totalColumns: visibleColumns.length,
      uniqueKeys: getUniqueKeys(
        indexRows.map((row) => ({
          name: String(row.index_name),
          nonUnique: Number(row.non_unique) === 1,
          sequence: Number(row.seq_in_index),
          columnName: String(row.column_name),
          collation: row.collation === null ? null : String(row.collation),
          type: String(row.index_type),
        }))
      ),
    }
  })
}

export async function insertRow(
  config: ConnectionConfig,
  database: string,
  table: string,
  values: Record<string, string>
) {
  return withConnection(config, async (connection) => {
    const { editableColumns } = await getWriteContext(
      connection,
      database,
      table,
      "insert"
    )
    const entries = Object.entries(values).filter(([column]) =>
      editableColumns.includes(column)
    )

    if (!entries.length) {
      throw new Error("No editable values were provided.")
    }

    const sql = `INSERT INTO ${quoteQualifiedIdentifier(database, table)}
      (${entries.map(([column]) => quoteIdentifier(column)).join(", ")})
      VALUES (${entries.map(() => "?").join(", ")})`

    await connection.beginTransaction()
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        sql,
        entries.map(([, value]) => normalizeSubmittedValue(value))
      )
      await connection.commit()
      return result.affectedRows
    } catch (error) {
      await connection.rollback()
      throw error
    }
  })
}

export async function updateRow(
  config: ConnectionConfig,
  database: string,
  table: string,
  keyValues: Record<string, string>,
  values: Record<string, string>
) {
  return withConnection(config, async (connection) => {
    const { editableColumns, uniqueKey } = await getWriteContext(
      connection,
      database,
      table,
      "update"
    )
    const entries = Object.entries(values).filter(([column]) =>
      editableColumns.includes(column)
    )

    if (!uniqueKey) {
      throw new Error("Updates require a primary key or unique key.")
    }

    if (!entries.length) {
      throw new Error("No editable values were provided.")
    }

    const where = buildKeyWhere(uniqueKey, keyValues)
    const sql = `UPDATE ${quoteQualifiedIdentifier(database, table)}
      SET ${entries.map(([column]) => `${quoteIdentifier(column)} = ?`).join(", ")}
      WHERE ${where.sql}
      LIMIT 1`

    await connection.beginTransaction()
    try {
      const [result] = await connection.execute<ResultSetHeader>(sql, [
        ...entries.map(([, value]) => normalizeSubmittedValue(value)),
        ...where.params,
      ])
      await connection.commit()
      return result.affectedRows
    } catch (error) {
      await connection.rollback()
      throw error
    }
  })
}

export async function deleteRow(
  config: ConnectionConfig,
  database: string,
  table: string,
  keyValues: Record<string, string>
) {
  return withConnection(config, async (connection) => {
    const { uniqueKey } = await getWriteContext(
      connection,
      database,
      table,
      "delete"
    )

    if (!uniqueKey) {
      throw new Error("Deletes require a primary key or unique key.")
    }

    const where = buildKeyWhere(uniqueKey, keyValues)
    const sql = `DELETE FROM ${quoteQualifiedIdentifier(database, table)}
      WHERE ${where.sql}
      LIMIT 1`

    await connection.beginTransaction()
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        sql,
        where.params
      )
      await connection.commit()
      return result.affectedRows
    } catch (error) {
      await connection.rollback()
      throw error
    }
  })
}

function sanitizeSelectedColumns(
  requested: string[],
  visibleColumns: string[]
) {
  const selected = requested.filter((column) => visibleColumns.includes(column))

  return selected.length ? selected : visibleColumns.slice(0, 12)
}

function buildSearchWhere(search: string, selectedColumns: string[]) {
  if (!search) {
    return { sql: "", params: [] as string[] }
  }

  return {
    sql: `WHERE ${selectedColumns.map((column) => `CAST(${quoteIdentifier(column)} AS CHAR) LIKE ?`).join(" OR ")}`,
    params: selectedColumns.map(() => `%${search}%`),
  }
}

async function getWriteContext(
  connection: MysqlConnection,
  database: string,
  table: string,
  operation: "insert" | "update" | "delete"
) {
  const columns = await getColumnsForTable(connection, database, table)
  const [indexRows] = await connection.query<RowDataPacket[]>(
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
  const policy = getTablePolicy(database, table)
  const allowed =
    operation === "insert"
      ? policy.canInsert
      : operation === "update"
        ? policy.canUpdate
        : policy.canDelete

  if (!allowed) {
    throw new Error(`${operation} is disabled for this table.`)
  }

  const uniqueKeys = getUniqueKeys(
    indexRows.map((row) => ({
      name: String(row.index_name),
      nonUnique: Number(row.non_unique) === 1,
      sequence: Number(row.seq_in_index),
      columnName: String(row.column_name),
      collation: row.collation === null ? null : String(row.collation),
      type: String(row.index_type),
    }))
  )

  return {
    editableColumns: getEditableColumns(policy, columns, uniqueKeys).map(
      (column) => column.name
    ),
    uniqueKey: uniqueKeys.sort(
      (a, b) => Number(!a.primary) - Number(!b.primary)
    )[0],
  }
}

function buildKeyWhere(
  uniqueKey: UniqueKey,
  keyValues: Record<string, string>
) {
  const params = uniqueKey.columns.map((column) => {
    const value = keyValues[column]

    if (value === undefined) {
      throw new Error("Missing row key value.")
    }

    return normalizeSubmittedValue(value)
  })

  return {
    sql: uniqueKey.columns
      .map((column) => `${quoteIdentifier(column)} = ?`)
      .join(" AND "),
    params,
  }
}

function normalizeSubmittedValue(value: string) {
  return value === "__DBV_NULL__" ? null : value
}

function normalizeRow(row: RowDataPacket): DataRow {
  const normalized: DataRow = {}

  for (const [key, value] of Object.entries(row)) {
    normalized[key] = value as RowValue
  }

  return normalized
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min
  }

  return Math.min(max, Math.max(min, value))
}
