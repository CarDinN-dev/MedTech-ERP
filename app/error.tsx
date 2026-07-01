"use client";

import { Button } from "@/components/ui";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-900">
    <section className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-lg font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">The workspace could not load this view. Try again or return to the dashboard.</p>
      <div className="mt-5 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="secondary" onClick={() => window.location.assign("/")}>Dashboard</Button>
      </div>
    </section>
  </main>;
}
