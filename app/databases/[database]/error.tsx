"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function DatabaseError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <main className="grid min-h-svh place-items-center bg-background p-6">
      <section className="w-full max-w-lg rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <p className="text-sm text-muted-foreground">Database error</p>
        <h1 className="mt-1 text-xl font-semibold">
          Could not open this database
        </h1>
        <p className="mt-3 text-sm break-words text-muted-foreground">
          {error.message ||
            "The connected MySQL user cannot access this database."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/databases">Choose database</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/login">Reconnect</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
