import { redirect } from "next/navigation"

import { AppShell } from "@/features/database/components/app-shell"
import { DatabaseOverview } from "@/features/database/components/database-overview"
import { listDatabases, listTables } from "@/features/database/metadata"
import { getConnectionConfig } from "@/features/database/session"

type DatabasePageProps = {
  params: Promise<{ database: string }>
}

export default async function DatabasePage({ params }: DatabasePageProps) {
  const config = await getConnectionConfig()

  if (!config) {
    redirect("/login")
  }

  const { database: encodedDatabase } = await params
  const database = decodeURIComponent(encodedDatabase)
  const [databases, tables] = await Promise.all([
    listDatabases(config),
    listTables(config, database),
  ])

  return (
    <AppShell databases={databases} tables={tables} activeDatabase={database}>
      <DatabaseOverview database={database} tables={tables} />
    </AppShell>
  )
}
