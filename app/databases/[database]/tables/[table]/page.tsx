import { redirect } from "next/navigation"

import { AppShell } from "@/features/database/components/app-shell"
import { TableBrowser } from "@/features/database/components/table-browser"
import { parseListParam } from "@/features/database/identifier"
import {
  getTableMetadata,
  listDatabases,
  listTables,
} from "@/features/database/metadata"
import { getRows } from "@/features/database/rows"
import { getConnectionConfig } from "@/features/database/session"

type TablePageProps = {
  params: Promise<{ database: string; table: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function TablePage({
  params,
  searchParams,
}: TablePageProps) {
  const config = await getConnectionConfig()

  if (!config) {
    redirect("/login")
  }

  const [{ database: encodedDatabase, table: encodedTable }, query] =
    await Promise.all([params, searchParams])
  const database = decodeURIComponent(encodedDatabase)
  const table = decodeURIComponent(encodedTable)
  const page = Number(query.page ?? "1")
  const pageSize = Number(query.pageSize ?? "25")
  const sortDirection = query.dir === "asc" ? "asc" : "desc"
  const columns = parseListParam(query.columns)
  const search = Array.isArray(query.search) ? query.search[0] : query.search
  const sort = Array.isArray(query.sort) ? query.sort[0] : query.sort
  const [databases, tables, metadata, rowPage] = await Promise.all([
    listDatabases(config),
    listTables(config, database),
    getTableMetadata(config, database, table),
    getRows(config, {
      database,
      table,
      columns,
      page,
      pageSize,
      sortColumn: sort,
      sortDirection,
      search,
    }),
  ])
  const returnPath = buildReturnPath(database, table, query)

  return (
    <AppShell
      databases={databases}
      tables={tables}
      activeDatabase={database}
      activeTable={table}
    >
      <TableBrowser
        database={database}
        table={table}
        metadata={metadata}
        rowPage={rowPage}
        returnPath={returnPath}
      />
    </AppShell>
  )
}

function buildReturnPath(
  database: string,
  table: string,
  query: Record<string, string | string[] | undefined>
) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item)
      }
    } else if (value) {
      params.set(key, value)
    }
  }

  const suffix = params.size ? `?${params}` : ""

  return `/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}${suffix}`
}
