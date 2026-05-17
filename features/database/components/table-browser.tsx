import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"

import { deleteRowAction, insertRowAction, updateRowAction } from "../actions"
import { canEditColumn, getTablePolicy } from "../table-policy"
import type {
  ColumnMetadata,
  DataRow,
  RowPage,
  TableMetadata,
  UniqueKey,
} from "../types"
import { formatValue, valueInputString } from "../value-format"
import { Button } from "@/components/ui/button"

type TableBrowserProps = {
  database: string
  table: string
  metadata: TableMetadata
  rowPage: RowPage
  returnPath: string
}

export function TableBrowser({
  database,
  table,
  metadata,
  rowPage,
  returnPath,
}: TableBrowserProps) {
  const policy = getTablePolicy(database, table)
  const visibleColumns = metadata.columns.filter(
    (column) => !policy.hiddenColumns.includes(column.name)
  )
  const uniqueKey =
    rowPage.uniqueKeys.find((key) => key.primary) ?? rowPage.uniqueKeys[0]
  const canUpdate = policy.canUpdate && Boolean(uniqueKey)
  const canDelete = policy.canDelete && Boolean(uniqueKey)

  return (
    <section className="grid min-h-svh grid-rows-[auto_1fr]">
      <header className="border-b p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm break-all text-muted-foreground">
              {database}
            </p>
            <h1 className="text-xl font-semibold break-all">{table}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {policy.canInsert ? (
              <details className="relative">
                <summary className="list-none">
                  <Button asChild size="sm">
                    <span>
                      <Plus />
                      Insert
                    </span>
                  </Button>
                </summary>
                <div className="absolute right-0 z-20 mt-2 w-[min(92vw,520px)] rounded-lg border bg-popover p-4 shadow-lg">
                  <RowForm
                    action={insertRowAction}
                    database={database}
                    table={table}
                    columns={visibleColumns}
                    row={{}}
                    returnPath={returnPath}
                    mode="insert"
                  />
                </div>
              </details>
            ) : null}
          </div>
        </div>

        <TableControls
          database={database}
          table={table}
          columns={visibleColumns}
          rowPage={rowPage}
        />
      </header>

      <div className="min-w-0 overflow-auto">
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              {rowPage.selectedColumns.map((column) => (
                <th
                  key={column}
                  className="border-b px-3 py-2 text-left font-medium"
                >
                  <Link
                    href={buildTableHref(database, table, {
                      columns: rowPage.selectedColumns,
                      page: 1,
                      pageSize: rowPage.pageSize,
                      search: rowPage.search,
                      sort: column,
                      dir:
                        rowPage.sortColumn === column &&
                        rowPage.sortDirection === "asc"
                          ? "desc"
                          : "asc",
                    })}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    <span className="max-w-52 truncate" title={column}>
                      {column}
                    </span>
                    {keyColumns(rowPage.uniqueKeys).includes(column) ? (
                      <KeyRound className="size-3 text-muted-foreground" />
                    ) : null}
                  </Link>
                </th>
              ))}
              {canUpdate || canDelete ? (
                <th className="sticky right-0 border-b bg-background px-3 py-2 text-right font-medium">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rowPage.rows.map((row, index) => (
              <tr
                key={rowIdentity(row, index, uniqueKey)}
                className="align-top hover:bg-muted/35"
              >
                {rowPage.selectedColumns.map((column) => (
                  <td key={column} className="max-w-[360px] border-b px-3 py-2">
                    <CellValue value={row[column]} />
                  </td>
                ))}
                {canUpdate || canDelete ? (
                  <td className="sticky right-0 border-b bg-background px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      {canUpdate ? (
                        <details className="relative">
                          <summary className="list-none">
                            <Button asChild variant="ghost" size="icon-sm">
                              <span title="Edit row">
                                <Pencil />
                              </span>
                            </Button>
                          </summary>
                          <div className="absolute right-0 z-20 mt-2 w-[min(92vw,560px)] rounded-lg border bg-popover p-4 text-left shadow-lg">
                            <RowForm
                              action={updateRowAction}
                              database={database}
                              table={table}
                              columns={visibleColumns}
                              row={row}
                              uniqueKey={uniqueKey}
                              returnPath={returnPath}
                              mode="update"
                            />
                          </div>
                        </details>
                      ) : null}
                      {canDelete ? (
                        <form action={deleteRowAction}>
                          <WriteHiddenFields
                            database={database}
                            table={table}
                            returnPath={returnPath}
                          />
                          <KeyHiddenFields row={row} uniqueKey={uniqueKey} />
                          <Button
                            type="submit"
                            variant="destructive"
                            size="icon-sm"
                            title="Delete row"
                          >
                            <Trash2 />
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>

        {!rowPage.rows.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No rows found.
          </div>
        ) : null}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm text-muted-foreground">
        <span>
          Page {rowPage.page} · Showing {rowPage.rows.length} rows ·{" "}
          {rowPage.totalColumns} columns
        </span>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={rowPage.page <= 1}
          >
            <Link
              aria-disabled={rowPage.page <= 1}
              href={buildTableHref(database, table, {
                columns: rowPage.selectedColumns,
                page: Math.max(1, rowPage.page - 1),
                pageSize: rowPage.pageSize,
                search: rowPage.search,
                sort: rowPage.sortColumn,
                dir: rowPage.sortDirection,
              })}
            >
              <ChevronLeft />
              Previous
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={!rowPage.hasNextPage}
          >
            <Link
              aria-disabled={!rowPage.hasNextPage}
              href={buildTableHref(database, table, {
                columns: rowPage.selectedColumns,
                page: rowPage.page + 1,
                pageSize: rowPage.pageSize,
                search: rowPage.search,
                sort: rowPage.sortColumn,
                dir: rowPage.sortDirection,
              })}
            >
              Next
              <ChevronRight />
            </Link>
          </Button>
        </div>
      </footer>

      <MetadataPanel metadata={metadata} />
    </section>
  )
}

function TableControls({
  database,
  table,
  columns,
  rowPage,
}: {
  database: string
  table: string
  columns: ColumnMetadata[]
  rowPage: RowPage
}) {
  return (
    <form
      action={`/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}`}
      className="mt-4 grid gap-3"
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_130px_auto]">
        <input
          name="search"
          defaultValue={rowPage.search}
          placeholder="Search visible columns"
          className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <select
          name="pageSize"
          defaultValue={String(rowPage.pageSize)}
          className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          {[10, 25, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size} rows
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Apply
        </Button>
      </div>
      <div className="flex max-h-28 flex-wrap gap-2 overflow-auto rounded-md border bg-muted/20 p-2">
        {columns.map((column) => (
          <label
            key={column.name}
            className="flex items-center gap-1.5 rounded-md bg-background px-2 py-1 text-xs"
          >
            <input
              type="checkbox"
              name="columns"
              value={column.name}
              defaultChecked={rowPage.selectedColumns.includes(column.name)}
            />
            <span className="max-w-40 truncate" title={column.name}>
              {column.name}
            </span>
          </label>
        ))}
      </div>
    </form>
  )
}

function RowForm({
  action,
  database,
  table,
  columns,
  row,
  uniqueKey,
  returnPath,
  mode,
}: {
  action: (formData: FormData) => void | Promise<void>
  database: string
  table: string
  columns: ColumnMetadata[]
  row: DataRow
  uniqueKey?: UniqueKey
  returnPath: string
  mode: "insert" | "update"
}) {
  const policy = getTablePolicy(database, table)
  const editableColumns = columns.filter((column) =>
    canEditColumn(policy, column.name)
  )

  return (
    <form action={action} className="grid max-h-[75vh] gap-3 overflow-auto">
      <WriteHiddenFields
        database={database}
        table={table}
        returnPath={returnPath}
      />
      {mode === "update" ? (
        <KeyHiddenFields row={row} uniqueKey={uniqueKey} />
      ) : null}
      <div>
        <h2 className="font-medium">
          {mode === "insert" ? "Insert row" : "Edit row"}
        </h2>
        <p className="text-xs text-muted-foreground">
          Only policy-enabled fields are editable.
        </p>
      </div>
      {editableColumns.map((column) => (
        <label key={column.name} className="grid gap-1.5 text-sm">
          <span className="flex items-center justify-between gap-2">
            <span className="font-medium break-all">{column.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {column.columnType}
            </span>
          </span>
          <textarea
            name={`value:${column.name}`}
            defaultValue={valueInputString(row[column.name])}
            rows={
              column.columnType.includes("text") ||
              column.columnType.includes("json")
                ? 4
                : 2
            }
            className="min-h-10 rounded-md border bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </label>
      ))}
      <Button type="submit">
        {mode === "insert" ? "Insert row" : "Save changes"}
      </Button>
    </form>
  )
}

function MetadataPanel({ metadata }: { metadata: TableMetadata }) {
  return (
    <details className="border-t bg-muted/20 p-4">
      <summary className="cursor-pointer text-sm font-medium">Metadata</summary>
      <div className="mt-4 grid gap-4 text-xs lg:grid-cols-3">
        <MetadataList
          title="Columns"
          items={metadata.columns.map(
            (column) =>
              `${column.name} · ${column.columnType}${column.isNullable ? " · nullable" : ""}`
          )}
        />
        <MetadataList
          title="Indexes"
          items={metadata.indexes.map(
            (index) =>
              `${index.name} · ${index.columnName} · ${index.nonUnique ? "index" : "unique"}`
          )}
        />
        <MetadataList
          title="Foreign keys"
          items={metadata.foreignKeys.map(
            (key) =>
              `${key.columnName} → ${key.referencedTableName}.${key.referencedColumnName}`
          )}
        />
      </div>
    </details>
  )
}

function MetadataList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 font-medium">{title}</h3>
      <ul className="grid gap-1 text-muted-foreground">
        {items.length ? (
          items.map((item) => (
            <li key={item} className="break-all">
              {item}
            </li>
          ))
        ) : (
          <li>None</li>
        )}
      </ul>
    </div>
  )
}

function CellValue({ value }: { value: DataRow[string] }) {
  if (value === null) {
    return <span className="text-muted-foreground">NULL</span>
  }

  return (
    <pre className="max-h-28 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
      {formatValue(value)}
    </pre>
  )
}

function WriteHiddenFields({
  database,
  table,
  returnPath,
}: {
  database: string
  table: string
  returnPath: string
}) {
  return (
    <>
      <input type="hidden" name="database" value={database} />
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="returnPath" value={returnPath} />
    </>
  )
}

function KeyHiddenFields({
  row,
  uniqueKey,
}: {
  row: DataRow
  uniqueKey?: UniqueKey
}) {
  if (!uniqueKey) {
    return null
  }

  return (
    <>
      {uniqueKey.columns.map((column) => (
        <input
          key={column}
          type="hidden"
          name={`key:${column}`}
          value={valueInputString(row[column])}
        />
      ))}
    </>
  )
}

function keyColumns(uniqueKeys: UniqueKey[]) {
  return [...new Set(uniqueKeys.flatMap((key) => key.columns))]
}

function rowIdentity(row: DataRow, index: number, uniqueKey?: UniqueKey) {
  if (!uniqueKey) {
    return String(index)
  }

  return uniqueKey.columns.map((column) => formatValue(row[column])).join("|")
}

function buildTableHref(
  database: string,
  table: string,
  params: {
    columns: string[]
    page: number
    pageSize: number
    search: string
    sort: string
    dir: "asc" | "desc"
  }
) {
  const searchParams = new URLSearchParams()
  searchParams.set("page", String(params.page))
  searchParams.set("pageSize", String(params.pageSize))
  searchParams.set("sort", params.sort)
  searchParams.set("dir", params.dir)

  if (params.search) {
    searchParams.set("search", params.search)
  }

  for (const column of params.columns) {
    searchParams.append("columns", column)
  }

  return `/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}?${searchParams}`
}
