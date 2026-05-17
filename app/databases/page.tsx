import Link from "next/link"
import { redirect } from "next/navigation"

import { AppShell } from "@/features/database/components/app-shell"
import { listDatabases } from "@/features/database/metadata"
import { getConnectionConfig } from "@/features/database/session"

export default async function DatabasesPage() {
  const config = await getConnectionConfig()

  if (!config) {
    redirect("/login")
  }

  const databases = await listDatabases(config)

  return (
    <AppShell databases={databases}>
      <section className="p-6">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">Connected</p>
          <h1 className="text-2xl font-semibold">Choose a database</h1>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {databases.map((database) => (
            <Link
              key={database.name}
              href={`/databases/${encodeURIComponent(database.name)}`}
              className="truncate rounded-lg border bg-card p-4 text-sm font-medium hover:bg-muted/50"
              title={database.name}
            >
              {database.name}
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  )
}
