"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LeadRescueApp } from "@/components/lead-rescue-app";
import { importCsvRows } from "@/lib/csv-import-client";
import { leadArraySchema } from "@/lib/schemas";
import { fetchWorkspaceSnapshot, WorkspaceRequestError } from "@/lib/workspace-client";
import type { Lead } from "@/lib/types";

const ACTIVE_CACHE_KEY = "leadrescue-phase1-leads";
const LEGACY_ARCHIVE_KEY = "leadrescue-phase1-legacy-leads";
const LEGACY_DISMISSED_KEY = "leadrescue-phase1-legacy-dismissed";
export const WORKSPACE_CHANGED_EVENT = "leadrescue:workspace-changed";

function readLegacyLeads(): Lead[] {
  try {
    const archived = window.localStorage.getItem(LEGACY_ARCHIVE_KEY);
    if (archived) {
      const parsed = leadArraySchema.safeParse(JSON.parse(archived));
      return parsed.success ? parsed.data : [];
    }

    const current = window.localStorage.getItem(ACTIVE_CACHE_KEY);
    if (!current) return [];
    const parsed = leadArraySchema.safeParse(JSON.parse(current));
    if (!parsed.success || parsed.data.length === 0) return [];

    window.localStorage.setItem(LEGACY_ARCHIVE_KEY, JSON.stringify(parsed.data));
    return parsed.data;
  } catch {
    return [];
  }
}

function writeWorkspaceCache(leads: Lead[]) {
  try {
    window.localStorage.setItem(ACTIVE_CACHE_KEY, JSON.stringify(leads));
  } catch {
    // The authenticated server workspace remains authoritative if browser storage is unavailable.
  }
}

export function WorkspaceLeadRescueApp() {
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [workspaceError, setWorkspaceError] = useState("");
  const [legacyLeads, setLegacyLeads] = useState<Lead[]>([]);
  const [legacyDismissed, setLegacyDismissed] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState("");

  const refreshWorkspace = useCallback(async () => {
    try {
      const snapshot = await fetchWorkspaceSnapshot();
      writeWorkspaceCache(snapshot.leads);
      setWorkspaceError("");
      setVersion((value) => value + 1);
      setReady(true);
    } catch (error) {
      const message = error instanceof WorkspaceRequestError
        ? error.message
        : "The shared workspace could not be loaded.";
      setWorkspaceError(message);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const legacy = readLegacyLeads();
    setLegacyLeads(legacy);
    try {
      setLegacyDismissed(window.localStorage.getItem(LEGACY_DISMISSED_KEY) === "1");
    } catch {
      setLegacyDismissed(true);
    }
    void refreshWorkspace();
  }, [refreshWorkspace]);

  useEffect(() => {
    const handleWorkspaceChanged = () => void refreshWorkspace();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refreshWorkspace();
    };
    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshWorkspace]);

  const showLegacyImport = useMemo(
    () => !legacyDismissed && legacyLeads.length > 0,
    [legacyDismissed, legacyLeads.length],
  );

  async function importLegacyWorkspace() {
    if (isMigrating || legacyLeads.length === 0) return;
    if (!window.confirm(
      `Import ${legacyLeads.length} archived browser lead${legacyLeads.length === 1 ? "" : "s"} into this authenticated organization? This is an explicit migration and does not deduplicate contacts by email or phone.`,
    )) return;

    setIsMigrating(true);
    setMigrationMessage("");
    try {
      const result = await importCsvRows(
        legacyLeads.map((lead, index) => ({ rowNumber: index + 2, lead })),
      );
      setMigrationMessage(
        `${result.created} created, ${result.existing} existing, ${result.errors} failed. The shared workspace has been refreshed.`,
      );
      await refreshWorkspace();
    } catch (error) {
      setMigrationMessage(error instanceof Error ? error.message : "Legacy migration could not be completed.");
    } finally {
      setIsMigrating(false);
    }
  }

  function dismissLegacyImport() {
    try {
      window.localStorage.setItem(LEGACY_DISMISSED_KEY, "1");
    } catch {
      // Ignore browser-storage failure. No server data is changed.
    }
    setLegacyDismissed(true);
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8fc] px-4">
        <p className="text-sm font-semibold text-slate-600">Loading your shared LeadRescue workspace…</p>
      </main>
    );
  }

  if (workspaceError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8fc] px-4">
        <section className="w-full max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl shadow-slate-900/[0.04]">
          <h1 className="text-xl font-bold text-slate-950">Shared workspace unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{workspaceError}</p>
          <button
            type="button"
            onClick={() => void refreshWorkspace()}
            className="mt-6 rounded-xl bg-[#123d78] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0d2d5b]"
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  return (
    <>
      {showLegacyImport && (
        <div className="fixed inset-x-4 top-16 z-[60] mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xl shadow-slate-900/10">
          <p className="text-sm font-bold text-amber-950">Old browser workspace found</p>
          <p className="mt-1 text-xs leading-5 text-amber-900">
            {legacyLeads.length} archived browser lead{legacyLeads.length === 1 ? "" : "s"} were preserved locally. They have not been uploaded. Import them only if they belong in this organization.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isMigrating}
              onClick={() => void importLegacyWorkspace()}
              className="rounded-lg bg-amber-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              {isMigrating ? "Importing…" : "Import old browser leads"}
            </button>
            <button
              type="button"
              onClick={dismissLegacyImport}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-950"
            >
              Keep archived only
            </button>
            {migrationMessage && <span className="text-xs font-semibold text-amber-950">{migrationMessage}</span>}
          </div>
        </div>
      )}
      <LeadRescueApp key={version} />
    </>
  );
}
