"use client"

import { useActionState } from "react"
import { Database } from "lucide-react"

import { loginAction } from "../actions"
import { Button } from "@/components/ui/button"

export function LoginForm() {
  const [error, action, pending] = useActionState(loginAction, null)

  return (
    <form action={action} className="grid gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg border bg-muted">
          <Database className="size-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Connect to MySQL</h1>
          <p className="text-sm text-muted-foreground">
            Credentials stay in an encrypted HTTP-only session cookie.
          </p>
        </div>
      </div>

      <label className="grid gap-1.5 text-sm font-medium">
        Host
        <input
          name="host"
          required
          autoComplete="off"
          defaultValue="localhost"
          className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      </label>

      <div className="grid grid-cols-[1fr_120px] gap-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Username
          <input
            name="user"
            required
            autoComplete="username"
            className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Port
          <input
            name="port"
            required
            inputMode="numeric"
            defaultValue="3306"
            className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </label>
      </div>

      <label className="grid gap-1.5 text-sm font-medium">
        Password
        <input
          name="password"
          required
          type="password"
          autoComplete="current-password"
          className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      </label>

      <label className="grid gap-1.5 text-sm font-medium">
        Default database
        <input
          name="database"
          autoComplete="off"
          placeholder="Optional"
          className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      </label>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Connecting..." : "Connect"}
      </Button>
    </form>
  )
}
