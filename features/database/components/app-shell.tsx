import Link from "next/link"
import { LogOut } from "lucide-react"

import { logoutAction } from "../actions"
import type { DatabaseSummary, TableSummary } from "../types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AppShellProps = {
  databases: DatabaseSummary[]
  tables?: TableSummary[]
  activeDatabase?: string
  activeTable?: string
  children: React.ReactNode
}

export function AppShell({
  databases,
  tables = [],
  activeDatabase,
  activeTable,
  children,
}: AppShellProps) {
  return (
    <div className="grid min-h-svh bg-background text-foreground lg:grid-cols-[280px_1fr]">
      <aside className="border-r bg-muted/25">
        <div className="sticky top-0 flex h-svh flex-col">
          <div className="border-b p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">DB Visualizer</p>
                <p className="text-xs text-muted-foreground">
                  MySQL metadata browser
                </p>
              </div>
              <form action={logoutAction}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  title="Log out"
                >
                  <LogOut />
                </Button>
              </form>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <p className="px-2 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Databases
            </p>
            <nav className="grid gap-1">
              {databases.map((database) => (
                <Link
                  key={database.name}
                  href={`/databases/${encodeURIComponent(database.name)}`}
                  className={cn(
                    "truncate rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                    activeDatabase === database.name && "bg-muted font-medium"
                  )}
                  title={database.name}
                >
                  {database.name}
                </Link>
              ))}
            </nav>

            {activeDatabase ? (
              <>
                <p className="px-2 pt-5 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Tables
                </p>
                <nav className="grid gap-1">
                  {tables.map((table) => (
                    <Link
                      key={table.name}
                      href={`/databases/${encodeURIComponent(activeDatabase)}/tables/${encodeURIComponent(table.name)}`}
                      className={cn(
                        "truncate rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                        activeTable === table.name && "bg-muted font-medium"
                      )}
                      title={table.name}
                    >
                      {table.name}
                    </Link>
                  ))}
                </nav>
              </>
            ) : null}
          </div>
        </div>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  )
}
