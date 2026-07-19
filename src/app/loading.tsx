import { LifeBuoy } from "lucide-react";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f8fc] px-6">
      <div className="text-center" role="status" aria-live="polite">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#123d78] text-white shadow-lg">
          <LifeBuoy className="size-6 animate-pulse" aria-hidden="true" />
        </span>
        <p className="mt-4 text-sm font-semibold text-slate-700">Preparing your local recovery workspace…</p>
      </div>
    </main>
  );
}
