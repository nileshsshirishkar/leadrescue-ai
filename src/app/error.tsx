"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f8fc] px-6">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-950">This view could not be prepared</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Your source file has not been sent anywhere. Try reloading the local workspace.</p>
        <button onClick={reset} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#123d78] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d2d5b]">
          <RotateCcw className="size-4" aria-hidden="true" /> Try again
        </button>
      </section>
    </main>
  );
}
