import { redirect } from "next/navigation"

import { LoginForm } from "@/features/database/components/login-form"
import { getConnectionConfig } from "@/features/database/session"

export default async function LoginPage() {
  const config = await getConnectionConfig()

  if (config) {
    redirect("/databases")
  }

  return (
    <main className="grid min-h-svh place-items-center bg-muted/25 p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <LoginForm />
      </div>
    </main>
  )
}
