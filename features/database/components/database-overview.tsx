import Link from "next/link"
import { Table2 } from "lucide-react"

import type { TableSummary } from "../types"

type DatabaseOverviewProps = {
  database: string
  tables: TableSummary[]
}

export function DatabaseOverview({ database, tables }: DatabaseOverviewProps) {
  return (
    <section className="p-6">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Database</p>
        <h1 className="text-2xl font-semibold break-all">{database}</h1>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {tables.map((table) => (
          <Link
            key={table.name}
            href={`/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table.name)}`}
            className="rounded-lg border bg-card p-4 text-card-foreground transition-colors hover:bg-muted/50"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <Table2 className="size-4" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-medium" title={table.name}>
                  {table.name}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {table.type}
                  {table.engine ? ` · ${table.engine}` : ""}
                  {typeof table.rows === "number"
                    ? ` · ~${table.rows} rows`
                    : ""}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
