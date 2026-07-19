"use client";

import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Copy,
  FileSpreadsheet,
  Gauge,
  Info,
  LayoutDashboard,
  LifeBuoy,
  ListFilter,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { getSampleLeads } from "@/data/sample-leads";
import { parseLeadCsv } from "@/lib/csv";
import {
  clearCachedEnhancements,
  clearDemoAccessCode,
  createEnhancementFingerprint,
  createEnhancementRequest,
  EnhancementRequestError,
  getEnhancementControls,
  readDemoAccessCode,
  readCachedEnhancement,
  requestLeadEnhancement,
  writeDemoAccessCode,
  writeCachedEnhancement,
  type EnhancementApiResponse,
} from "@/lib/enhancement";
import { leadArraySchema } from "@/lib/schemas";
import { getOutreachPresentation } from "@/lib/outreach";
import { analyzeLead, rankAnalyses, summarizeAnalyses } from "@/lib/scoring";
import type { CsvRowError, Lead, LeadAnalysis, RecoveryPriority } from "@/lib/types";

const STORAGE_KEY = "leadrescue-phase1-leads";

const PRIORITY_STYLES: Record<RecoveryPriority, string> = {
  Critical: "border-red-200 bg-red-50 text-red-700",
  High: "border-amber-200 bg-amber-50 text-amber-700",
  Medium: "border-cyan-200 bg-cyan-50 text-cyan-700",
  Low: "border-slate-200 bg-slate-50 text-slate-600",
};

type QueueFilter = "All" | "Recover now" | "At risk";

function saveLeads(leads: Lead[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  } catch {
    // The app remains fully usable if storage is disabled.
  }
}

function PriorityBadge({ priority }: { priority: RecoveryPriority }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${PRIORITY_STYLES[priority]}`}>
      {priority}
    </span>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  accent = "blue",
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  accent?: "blue" | "cyan" | "amber" | "red";
}) {
  const colors = {
    blue: "bg-blue-50 text-[#123d78]",
    cyan: "bg-cyan-50 text-cyan-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <article className="metric-card rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${colors[accent]}`}>
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{helper}</p>
    </article>
  );
}

function QueueCard({ analysis, onReview }: { analysis: LeadAnalysis; onReview: () => void }) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/5 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-[#123d78]">
          {analysis.lead.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="truncate text-sm font-bold text-slate-950">{analysis.lead.name}</h3>
              <p className="mt-0.5 truncate text-xs text-slate-500">{analysis.lead.serviceInterest || "Service not recorded"}</p>
            </div>
            <PriorityBadge priority={analysis.recoveryPriority} />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full border-4 border-cyan-100 bg-cyan-50 text-sm font-bold text-[#123d78]">
              {analysis.recoveryScore}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800">{analysis.leakageType}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                <CalendarClock className="size-3.5" aria-hidden="true" /> {analysis.actionDeadline}
              </p>
            </div>
          </div>
          <p className="mt-4 line-clamp-2 text-xs leading-5 text-slate-600">{analysis.recommendedNextAction}</p>
          <button onClick={onReview} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#123d78] hover:text-cyan-700">
            Review lead <ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

function LeadDrawer({ analysis, onClose }: { analysis: LeadAnalysis; onClose: () => void }) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [enhancedCopyState, setEnhancedCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [enhancement, setEnhancement] = useState<EnhancementApiResponse | null>(null);
  const [enhancementSource, setEnhancementSource] = useState<"fresh" | "cache" | null>(null);
  const [enhancementError, setEnhancementError] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [demoAccessCode, setDemoAccessCode] = useState("");
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [accessCodeError, setAccessCodeError] = useState("");
  const accessCodeInputId = useId();
  const outreach = getOutreachPresentation(analysis);
  const enhancementControls = getEnhancementControls(analysis);
  const enhancementRequest = useMemo(() => createEnhancementRequest(analysis), [analysis]);
  const enhancementFingerprint = useMemo(() => createEnhancementFingerprint(analysis), [analysis]);

  useEffect(() => {
    drawerRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const cached = readCachedEnhancement(window.localStorage, enhancementFingerprint);
      setEnhancement(cached);
      setEnhancementSource(cached ? "cache" : null);
      setEnhancementError("");
      setEnhancedCopyState("idle");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [enhancementFingerprint]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDemoAccessCode(readDemoAccessCode(window.sessionStorage));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function rememberDemoAccessCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessCodeInput.trim()) {
      setAccessCodeError("Enter the demo access code.");
      return;
    }

    writeDemoAccessCode(window.sessionStorage, accessCodeInput);
    setDemoAccessCode(accessCodeInput);
    setAccessCodeInput("");
    setAccessCodeError("");
    setEnhancementError("");
  }

  function forgetDemoAccessCode() {
    clearDemoAccessCode(window.sessionStorage);
    setDemoAccessCode("");
    setAccessCodeInput("");
    setAccessCodeError("");
  }

  async function copyMessage() {
    if (!outreach.canCopyMessage) return;

    try {
      await navigator.clipboard.writeText(analysis.recoveryMessage);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
    }
  }

  async function copyEnhancedMessage() {
    if (!enhancement) return;

    try {
      await navigator.clipboard.writeText(enhancement.enhancement.enhancedRecoveryMessage);
      setEnhancedCopyState("copied");
      window.setTimeout(() => setEnhancedCopyState("idle"), 1800);
    } catch {
      setEnhancedCopyState("failed");
    }
  }

  async function enhanceLead(regenerate = false) {
    if (!enhancementControls.allowEnhancement || isEnhancing) return;
    if (!demoAccessCode) {
      setAccessCodeError("Enter the demo access code before requesting enhancement.");
      return;
    }
    if (regenerate && !window.confirm("Regenerate this enhancement? This creates one new paid API request for this lead.")) return;

    setIsEnhancing(true);
    setEnhancementError("");
    try {
      const result = await requestLeadEnhancement(enhancementFingerprint, enhancementRequest, demoAccessCode);
      writeCachedEnhancement(window.localStorage, enhancementFingerprint, result);
      setEnhancement(result);
      setEnhancementSource("fresh");
    } catch (error) {
      if (error instanceof EnhancementRequestError && error.status === 401) {
        clearDemoAccessCode(window.sessionStorage);
        setDemoAccessCode("");
        setAccessCodeError("The access code was not accepted. Enter it again.");
      }
      setEnhancementError(error instanceof Error
        ? error.message
        : "AI enhancement is temporarily unavailable. The deterministic result is still ready to use.");
    } finally {
      setIsEnhancing(false);
    }
  }

  return (
    <div className="fade-in fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-drawer-title"
        tabIndex={-1}
        className="drawer-shadow slide-in ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden bg-[#f8fafc]"
      >
        <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={analysis.recoveryPriority} />
                <span className="text-xs font-semibold text-slate-500">{analysis.confidence} confidence</span>
              </div>
              <h2 id="lead-drawer-title" className="mt-3 truncate text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{analysis.lead.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{analysis.lead.businessType || "Business type not recorded"} · {analysis.lead.serviceInterest || "Service not recorded"}</p>
            </div>
            <button onClick={onClose} aria-label="Close lead details" className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <section className="grid gap-3 sm:grid-cols-[132px_1fr]">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-[#123d78] p-5 text-white">
              <span className="text-4xl font-bold tracking-tight">{analysis.recoveryScore}</span>
              <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-200">Recovery score</span>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700">Leakage diagnosis</p>
              <p className="mt-2 text-base font-bold text-slate-950">{analysis.leakageType}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{analysis.recommendedNextAction}</p>
              <p className="mt-3 flex items-center gap-2 text-xs font-bold text-[#123d78]"><Clock3 className="size-4" aria-hidden="true" /> {analysis.actionDeadline}</p>
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-700">Record evidence</p>
                <h3 className="mt-1 text-base font-bold text-slate-950">Why this lead is ranked here</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{analysis.intentLevel} intent</span>
            </div>
            <ul className="mt-4 space-y-3">
              {analysis.evidence.map((fact) => (
                <li key={fact} className="flex gap-3 text-sm leading-6 text-slate-600">
                  <CheckCircle2 className="mt-1 size-4 shrink-0 text-cyan-600" aria-hidden="true" /> {fact}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Likely objection</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{analysis.likelyObjection}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Missing information</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{analysis.missingInformation.length ? analysis.missingInformation.join(", ") : "No core information gaps detected."}</p>
            </div>
          </section>

          <section className="mt-5 overflow-hidden rounded-2xl border border-cyan-200 bg-white">
            <div className="flex items-center justify-between gap-4 border-b border-cyan-100 bg-cyan-50/60 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                {outreach.customerOutreachRecommended
                  ? <Sparkles className="size-4 text-cyan-700" aria-hidden="true" />
                  : <ShieldCheck className="size-4 text-cyan-700" aria-hidden="true" />}
                <h3 className="text-sm font-bold text-slate-950">{outreach.heading}</h3>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${outreach.customerOutreachRecommended ? "border-amber-200 bg-amber-50 text-amber-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                  {outreach.statusLabel}
                </span>
                {!outreach.customerOutreachRecommended && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">Human review required</span>
                )}
              </div>
            </div>
            <div className="p-5 sm:p-6">
              {outreach.customerOutreachRecommended ? (
                <blockquote className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">{analysis.recoveryMessage}</blockquote>
              ) : (
                <div role="note" className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-4 text-sm leading-7 text-slate-700">{analysis.recommendedNextAction}</div>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="size-4 text-cyan-700" aria-hidden="true" /> {outreach.reviewInstruction}</p>
                {outreach.canCopyMessage && (
                  <button onClick={copyMessage} className="inline-flex items-center gap-2 rounded-xl bg-[#123d78] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0d2d5b]">
                    {copyState === "copied" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                    {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy message"}
                  </button>
                )}
              </div>
            </div>
          </section>

          {enhancementControls.showEnhanceButton && (
            <section className="mt-5 overflow-hidden rounded-2xl border border-blue-200 bg-white" aria-busy={isEnhancing}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/60 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-[#123d78]" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-slate-950">GPT-5.6 enhancement</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {enhancementSource === "cache" && (
                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-cyan-700">Saved AI result</span>
                  )}
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">Human review required</span>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Demo access</p>
                  {demoAccessCode ? (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <ShieldCheck className="size-4 text-cyan-700" aria-hidden="true" />
                        Access code saved for this tab.
                      </p>
                      <button
                        type="button"
                        onClick={forgetDemoAccessCode}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-red-200 hover:text-red-700"
                      >
                        Clear access code
                      </button>
                    </div>
                  ) : (
                    <form className="mt-3" onSubmit={rememberDemoAccessCode}>
                      <label htmlFor={accessCodeInputId} className="text-xs font-semibold text-slate-700">Enter the demo access code to enable paid enhancement</label>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          id={accessCodeInputId}
                          name="demo-access-code"
                          type="password"
                          value={accessCodeInput}
                          maxLength={256}
                          autoComplete="off"
                          spellCheck={false}
                          onChange={(event) => {
                            setAccessCodeInput(event.target.value);
                            setAccessCodeError("");
                          }}
                          aria-describedby={`${accessCodeInputId}-help`}
                          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                        <button type="submit" className="rounded-lg bg-[#123d78] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0d2d5b]">Save for this tab</button>
                      </div>
                      <p id={`${accessCodeInputId}-help`} className="mt-2 text-[11px] leading-5 text-slate-500">Stored only in this tab&apos;s session and never displayed after saving.</p>
                      {accessCodeError && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{accessCodeError}</p>}
                    </form>
                  )}
                </div>

                {!enhancement ? (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Optional language and conversation support</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Runs one AI enhancement for this lead only.</p>
                    </div>
                    <button
                      type="button"
                      disabled={isEnhancing || !demoAccessCode}
                      onClick={() => void enhanceLead(false)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#123d78] px-4 py-3 text-xs font-bold text-white hover:bg-[#0d2d5b] disabled:cursor-wait disabled:opacity-60"
                    >
                      {isEnhancing ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
                      {isEnhancing ? "Enhancing one lead…" : "Enhance with GPT-5.6"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-700">Why this needs attention</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{enhancement.enhancement.enhancedExplanation}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-700">Enhanced recovery message</p>
                      <blockquote className="mt-2 rounded-xl border border-blue-100 bg-blue-50/40 p-4 text-sm leading-7 text-slate-700">{enhancement.enhancement.enhancedRecoveryMessage}</blockquote>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-700">Conversation guidance</p>
                      <ul className="mt-2 space-y-2">
                        {enhancement.enhancement.conversationGuidance.map((item) => (
                          <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700"><CheckCircle2 className="mt-1 size-4 shrink-0 text-cyan-600" aria-hidden="true" /> {item}</li>
                        ))}
                      </ul>
                    </div>
                    {enhancement.enhancement.uncertaintyNote && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                        <span className="font-bold text-slate-800">Uncertainty:</span> {enhancement.enhancement.uncertaintyNote}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <div className="space-y-1">
                        <p className="flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="size-4 text-cyan-700" aria-hidden="true" /> Review facts and tone before sending.</p>
                        {enhancement.usage && (
                          <p className="text-[10px] text-slate-400">Tokens: {enhancement.usage.inputTokens} input · {enhancement.usage.outputTokens} output · {enhancement.usage.totalTokens} total</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isEnhancing || !demoAccessCode}
                          onClick={() => void enhanceLead(true)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:border-blue-200 hover:text-[#123d78] disabled:cursor-wait disabled:opacity-60"
                        >
                          {isEnhancing ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
                          {isEnhancing ? "Regenerating…" : "Regenerate"}
                        </button>
                        <button type="button" onClick={copyEnhancedMessage} className="inline-flex items-center gap-2 rounded-xl bg-[#123d78] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0d2d5b]">
                          {enhancedCopyState === "copied" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                          {enhancedCopyState === "copied" ? "Copied" : enhancedCopyState === "failed" ? "Copy failed" : "Copy enhanced message"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {enhancementError && (
                  <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>{enhancementError}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h3 className="text-sm font-bold text-slate-950">Lead record</h3>
            <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              {[
                ["Status", analysis.lead.status || "Not recorded"],
                ["Source", analysis.lead.source || "Not recorded"],
                ["Phone", analysis.lead.phone || "Not recorded"],
                ["Email", analysis.lead.email || "Not recorded"],
                ["Follow-ups", String(analysis.lead.followUpCount)],
                ["Appointment", analysis.lead.appointmentStatus || "Not recorded"],
                ["Quoted price", analysis.lead.quotedPrice === undefined ? "Not recorded" : analysis.lead.quotedPrice.toLocaleString()],
                ["Budget signal", analysis.lead.budgetSignal || "Not recorded"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold text-slate-500">{label}</dt>
                  <dd className="mt-1 break-words text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
            {(analysis.lead.enquiryText || analysis.lead.notes) && (
              <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                {analysis.lead.enquiryText && <div><p className="text-xs font-semibold text-slate-500">Enquiry</p><p className="mt-1 text-sm leading-6 text-slate-700">{analysis.lead.enquiryText}</p></div>}
                {analysis.lead.notes && <div><p className="text-xs font-semibold text-slate-500">Notes</p><p className="mt-1 text-sm leading-6 text-slate-700">{analysis.lead.notes}</p></div>}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export function LeadRescueApp() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<QueueFilter>("All");
  const [csvErrors, setCsvErrors] = useState<CsvRowError[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = leadArraySchema.safeParse(JSON.parse(stored));
          if (parsed.success) setLeads(parsed.data);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      setIsReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const analyses = useMemo(() => rankAnalyses(leads.map((lead) => analyzeLead(lead))), [leads]);
  const metrics = useMemo(() => summarizeAnalyses(analyses), [analyses]);
  const selectedAnalysis = analyses.find((item) => item.lead.id === selectedId) ?? null;

  const visibleAnalyses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return analyses.filter((item) => {
      const matchesFilter = filter === "All" ||
        (filter === "Recover now" && ["Critical", "High"].includes(item.recoveryPriority)) ||
        (filter === "At risk" && item.isAtRisk);
      const matchesSearch = !query || [item.lead.name, item.lead.serviceInterest, item.lead.businessType, item.leakageType]
        .some((value) => value.toLowerCase().includes(query));
      return matchesFilter && matchesSearch;
    });
  }, [analyses, filter, search]);

  function loadSample(reset = false) {
    const sample = getSampleLeads();
    setLeads(sample);
    saveLeads(sample);
    setCsvErrors([]);
    setStatusMessage(reset ? "Demo data restored to its original state." : "14 fictional leads loaded and analyzed locally.");
    window.setTimeout(() => document.getElementById("overview")?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  function clearWorkspace() {
    setLeads([]);
    setSelectedId(null);
    setCsvErrors([]);
    clearCachedEnhancements(window.localStorage);
    setStatusMessage("Local lead data and saved AI results cleared.");
    window.localStorage.removeItem(STORAGE_KEY);
  }

  async function handleCsvFile(file: File) {
    setIsProcessing(true);
    setStatusMessage("");
    setCsvErrors([]);
    try {
      if (!file.name.toLowerCase().endsWith(".csv")) throw new Error("Choose a .csv file.");
      if (file.size > 5 * 1024 * 1024) throw new Error("CSV files must be 5 MB or smaller for this local demo.");
      const result = parseLeadCsv(await file.text());
      setCsvErrors(result.errors);
      if (!result.leads.length) {
        setStatusMessage("No valid leads were found. Check the row errors and required name field.");
        return;
      }
      setLeads(result.leads);
      saveLeads(result.leads);
      setStatusMessage(`${result.leads.length} valid lead${result.leads.length === 1 ? "" : "s"} imported and analyzed locally${result.errors.length ? `; ${result.errors.length} row error${result.errors.length === 1 ? "" : "s"} skipped` : ""}.`);
    } catch (error) {
      setCsvErrors([{ row: 0, message: error instanceof Error ? error.message : "The CSV could not be read." }]);
      setStatusMessage("Import stopped. Your existing workspace was not changed.");
    } finally {
      setIsProcessing(false);
      setIsDragging(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f8fc] lg:grid lg:grid-cols-[236px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex items-center gap-3 px-6 py-6">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#123d78] text-white shadow-lg shadow-blue-950/15"><LifeBuoy className="size-5" aria-hidden="true" /></span>
          <div><p className="text-sm font-extrabold tracking-tight text-slate-950">LeadRescue <span className="text-cyan-600">AI</span></p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Recovery workspace</p></div>
        </div>
        <nav aria-label="Primary navigation" className="mt-4 space-y-1 px-3">
          {[
            ["#overview", "Overview", LayoutDashboard],
            ["#import", "Import leads", Upload],
            ["#queue", "Rescue queue", ListFilter],
            ["#methodology", "How scoring works", Gauge],
          ].map(([href, label, Icon]) => (
            <a key={String(href)} href={String(href)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#123d78]">
              <Icon className="size-4.5" aria-hidden="true" /> {String(label)}
            </a>
          ))}
        </nav>
        <div className="mx-4 mt-auto mb-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#123d78]"><ShieldCheck className="size-4" aria-hidden="true" /> Phase 2 · Controlled AI</div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">Scoring stays local. AI runs only after an explicit one-lead request.</p>
        </div>
      </aside>

      <main className="app-grid min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:hidden">
          <div className="flex items-center gap-2.5"><span className="flex size-9 items-center justify-center rounded-xl bg-[#123d78] text-white"><LifeBuoy className="size-4.5" aria-hidden="true" /></span><p className="text-sm font-extrabold text-slate-950">LeadRescue <span className="text-cyan-600">AI</span></p></div>
          <a href="#import" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-[#123d78]">Import</a>
        </header>

        <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6 sm:py-7 xl:px-9">
          <div className="flex items-start gap-3 rounded-2xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-xs leading-5 text-cyan-950">
            <Info className="mt-0.5 size-4 shrink-0 text-cyan-700" aria-hidden="true" />
            <p><strong>Privacy first:</strong> Use fictional or properly authorized lead data. Review every AI or automated recommendation before contacting a customer.</p>
          </div>

          <section id="overview" className="scroll-mt-20 pt-7 sm:pt-9">
            <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-cyan-700"><span className="h-px w-6 bg-cyan-500" /> Explainable recovery intelligence</div>
                <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">Find the leads your follow-up process is quietly losing.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">LeadRescue turns record-level evidence into a ranked recovery queue, a clear next action, and a message your team reviews before sending.</p>
              </div>
              {leads.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => loadSample(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-blue-200 hover:text-[#123d78]"><RefreshCw className="size-4" aria-hidden="true" /> Reset demo</button>
                  <button onClick={clearWorkspace} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-500 hover:border-red-200 hover:text-red-700">Clear workspace</button>
                </div>
              )}
            </div>

            <section id="import" className="mt-7 scroll-mt-20 rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/[0.035] sm:p-5">
              <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr] lg:items-center">
                <div className="p-2 sm:p-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#123d78]"><FileSpreadsheet className="size-4" aria-hidden="true" /> Import leads</div>
                  <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-950">Start with safe sample data or your CSV</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Common column variations are normalized automatically. Deterministic analysis stays in this browser; optional AI enhancement sends one lead only after an explicit request.</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button onClick={() => loadSample(false)} className="inline-flex items-center gap-2 rounded-xl bg-[#123d78] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-blue-950/10 hover:bg-[#0d2d5b]"><Sparkles className="size-4" aria-hidden="true" /> Load 14 fictional leads</button>
                    <a href="/sample-leads.csv" download className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:border-blue-200 hover:text-[#123d78]">Download sample CSV</a>
                  </div>
                </div>
                <div
                  onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }}
                  onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void handleCsvFile(file); }}
                  className={`flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-7 text-center transition ${isDragging ? "border-cyan-500 bg-cyan-50" : "border-slate-200 bg-slate-50/70 hover:border-blue-300"}`}
                >
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-[#123d78] shadow-sm"><Upload className="size-5" aria-hidden="true" /></span>
                  <p className="mt-3 text-sm font-bold text-slate-900">Drop a CSV here</p>
                  <p className="mt-1 text-xs text-slate-500">or choose a file up to 5 MB</p>
                  <button disabled={isProcessing} onClick={() => fileInputRef.current?.click()} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-[#123d78] hover:border-blue-200 disabled:cursor-wait disabled:opacity-60">
                    {isProcessing ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="size-4" aria-hidden="true" />} {isProcessing ? "Validating…" : "Choose CSV"}
                  </button>
                  <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleCsvFile(file); event.currentTarget.value = ""; }} />
                </div>
              </div>
              {(statusMessage || csvErrors.length > 0) && (
                <div aria-live="polite" className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  {statusMessage && <p className="flex items-start gap-2 text-xs font-semibold text-slate-600"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-cyan-600" aria-hidden="true" /> {statusMessage}</p>}
                  {csvErrors.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                      <p className="flex items-center gap-2 font-bold"><AlertCircle className="size-4" aria-hidden="true" /> CSV validation issues</p>
                      <ul className="mt-2 space-y-1.5 pl-6">
                        {csvErrors.slice(0, 4).map((error, index) => <li key={`${error.row}-${index}`}>{error.row ? `Row ${error.row}: ` : ""}{error.message}</li>)}
                      </ul>
                      {csvErrors.length > 4 && <p className="mt-2 pl-6 font-semibold">+ {csvErrors.length - 4} more issue{csvErrors.length - 4 === 1 ? "" : "s"}</p>}
                    </div>
                  )}
                </div>
              )}
            </section>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              <MetricCard label="Total leads" value={metrics.total} helper="Valid records loaded" icon={UsersRound} />
              <MetricCard label="Recover now" value={metrics.recoverNow} helper="Critical or high priority" icon={Target} accent="cyan" />
              <MetricCard label="Follow-ups overdue" value={metrics.overdue} helper="Action window has passed" icon={Clock3} accent="amber" />
              <MetricCard label="At risk" value={metrics.atRisk} helper="Callback, booking, or objection risk" icon={CircleAlert} accent="red" />
              <MetricCard label="Average score" value={`${metrics.averageScore}/100`} helper="Across current records" icon={BarChart3} />
            </div>
          </section>

          {!isReady ? (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-10 text-center" role="status">
              <LoaderCircle className="mx-auto size-6 animate-spin text-cyan-600" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-slate-600">Checking this browser for saved local data…</p>
            </section>
          ) : leads.length === 0 ? (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-xl shadow-slate-900/[0.03]">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-[#123d78]"><LifeBuoy className="size-7" aria-hidden="true" /></span>
              <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-950">Your rescue queue is ready for leads</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Load the fictional demo to explore the complete workflow, or import an authorized CSV above.</p>
              <button onClick={() => loadSample(false)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#123d78] px-5 py-3 text-sm font-bold text-white hover:bg-[#0d2d5b]">Explore the fictional demo <ArrowRight className="size-4" aria-hidden="true" /></button>
            </section>
          ) : (
            <>
              <section id="queue" className="mt-8 scroll-mt-20">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-700">Priority view</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Rescue queue</h2><p className="mt-1 text-sm text-slate-500">Ranked by urgency, intent, contact age, failure signals, and confidence.</p></div>
                  <span className="self-start rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 sm:self-auto">{analyses.length} analyzed</span>
                </div>
                <div className="mt-5 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                  {analyses.slice(0, 6).map((analysis) => <QueueCard key={analysis.lead.id} analysis={analysis} onReview={() => setSelectedId(analysis.lead.id)} />)}
                </div>
              </section>

              <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.03]">
                <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                  <div><h2 className="text-base font-bold text-slate-950">All analyzed leads</h2><p className="mt-1 text-xs text-slate-500">Open any record to review its evidence and draft.</p></div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search leads" placeholder="Search leads" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-9 text-xs text-slate-800 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white sm:w-56" /></div>
                    <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1" aria-label="Filter leads">
                      {(["All", "Recover now", "At risk"] as QueueFilter[]).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${filter === item ? "bg-white text-[#123d78] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{item}</button>)}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse text-left">
                    <thead><tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500"><th className="px-6 py-3.5">Lead</th><th className="px-4 py-3.5">Priority</th><th className="px-4 py-3.5">Score</th><th className="px-4 py-3.5">Diagnosis</th><th className="px-4 py-3.5">Next deadline</th><th className="px-6 py-3.5 text-right">Review</th></tr></thead>
                    <tbody>
                      {visibleAnalyses.map((analysis) => (
                        <tr key={analysis.lead.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/30">
                          <td className="px-6 py-4"><p className="text-sm font-bold text-slate-900">{analysis.lead.name}</p><p className="mt-1 max-w-52 truncate text-xs text-slate-500">{analysis.lead.serviceInterest || "Service not recorded"}</p></td>
                          <td className="px-4 py-4"><PriorityBadge priority={analysis.recoveryPriority} /></td>
                          <td className="px-4 py-4"><span className="text-sm font-bold text-slate-900">{analysis.recoveryScore}</span><span className="text-xs text-slate-400">/100</span></td>
                          <td className="px-4 py-4"><p className="max-w-64 text-xs font-semibold text-slate-700">{analysis.leakageType}</p><p className="mt-1 text-[11px] text-slate-500">{analysis.confidence} confidence · {analysis.intentLevel} intent</p></td>
                          <td className="px-4 py-4 text-xs font-semibold text-slate-600">{analysis.actionDeadline}</td>
                          <td className="px-6 py-4 text-right"><button onClick={() => setSelectedId(analysis.lead.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-bold text-[#123d78] hover:bg-blue-50">Open <ChevronRight className="size-3.5" aria-hidden="true" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {visibleAnalyses.length === 0 && <div className="px-6 py-12 text-center"><Search className="mx-auto size-6 text-slate-300" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-slate-700">No leads match this view.</p><button onClick={() => { setSearch(""); setFilter("All"); }} className="mt-2 text-xs font-bold text-cyan-700">Clear filters</button></div>}
              </section>
            </>
          )}

          <section id="methodology" className="mt-10 scroll-mt-20 rounded-3xl bg-[#0f2f5d] px-5 py-7 text-white sm:px-8 sm:py-9">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-cyan-300"><Gauge className="size-4" aria-hidden="true" /> Transparent by design</div><h2 className="mt-3 text-2xl font-bold tracking-tight">How scoring works</h2><p className="mt-3 max-w-md text-sm leading-7 text-blue-100">The deterministic engine remains authoritative. Priority rises when intent and a clear follow-up failure occur together, and falls when contact is recent or evidence is weak; optional GPT enhancement never changes those results.</p><a href="/sample-leads.csv" download className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-cyan-300 hover:text-white">Inspect the sample input <ArrowRight className="size-4" aria-hidden="true" /></a></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  [Target, "Intent signals", "Specific services and price, availability, appointment, consultation, booking, or quote language."],
                  [CalendarClock, "Recovery urgency", "Older contact dates, overdue callbacks, missed appointments, and unbooked requests raise urgency."],
                  [ShieldCheck, "Evidence & confidence", "Only facts in the record are shown. Missing contact or context lowers confidence."],
                  [RefreshCw, "Response fatigue", "Repeated unsuccessful follow-ups can reduce priority unless buying intent remains strong."],
                ].map(([Icon, title, copy]) => (
                  <article key={String(title)} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><Icon className="size-5 text-cyan-300" aria-hidden="true" /><h3 className="mt-3 text-sm font-bold">{String(title)}</h3><p className="mt-2 text-xs leading-5 text-blue-100">{String(copy)}</p></article>
                ))}
              </div>
            </div>
          </section>

          <footer className="flex flex-col gap-3 px-1 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>LeadRescue AI · Build Week Phase 2 · Deterministic scoring with optional AI enhancement</p><p className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-cyan-700" aria-hidden="true" /> Human review required before outreach</p></footer>
        </div>
      </main>

      {selectedAnalysis && <LeadDrawer analysis={selectedAnalysis} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
