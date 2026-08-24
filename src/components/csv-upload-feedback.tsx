"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";

type UploadFeedback =
  | { kind: "success"; title: string; detail: string }
  | { kind: "error"; title: string; detail: string };

function readUploadFeedback(): UploadFeedback | null {
  const region = document.querySelector<HTMLElement>('#import [aria-live="polite"]');
  if (!region) return null;

  const text = region.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (!text) return null;

  const savedMatch = text.match(/(\d+) leads? saved to the shared workspace/i);
  if (savedMatch) {
    const count = Number(savedMatch[1]);
    return {
      kind: "success",
      title: `Upload complete, ${count} lead${count === 1 ? "" : "s"} saved`,
      detail: "Your saved leads are ready in the workspace below.",
    };
  }

  const hasImportFailure =
    /import stopped|no valid leads were found|no valid leads were saved|could not be imported|csv import issues/i.test(text) ||
    Boolean(region.querySelector('[role="alert"]'));

  if (hasImportFailure) {
    return {
      kind: "error",
      title: "Upload failed",
      detail: "Check the file, fix the reported issues, and upload a valid CSV.",
    };
  }

  return null;
}

export function CsvUploadFeedback() {
  const [feedback, setFeedback] = useState<UploadFeedback | null>(null);

  useEffect(() => {
    const syncFeedback = () => setFeedback(readUploadFeedback());
    syncFeedback();

    const observer = new MutationObserver(syncFeedback);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  if (!feedback) return null;

  const isSuccess = feedback.kind === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      aria-live={isSuccess ? "polite" : "assertive"}
      className={`fixed right-4 top-4 z-[100] w-[min(420px,calc(100vw-2rem))] rounded-2xl border p-4 shadow-2xl sm:right-6 sm:top-6 ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : "border-red-200 bg-red-50 text-red-950"
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-5 shrink-0 ${isSuccess ? "text-emerald-600" : "text-red-600"}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">{feedback.title}</p>
          <p className="mt-1 text-xs leading-5 opacity-80">{feedback.detail}</p>
        </div>
        <button
          type="button"
          onClick={() => setFeedback(null)}
          aria-label="Dismiss upload message"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-current/15 bg-white/70 opacity-70 hover:opacity-100"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
