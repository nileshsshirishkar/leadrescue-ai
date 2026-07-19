import Papa from "papaparse";
import { leadSchema } from "@/lib/schemas";
import type { CsvNormalizationResult, Lead } from "@/lib/types";

const FIELD_ALIASES: Record<keyof Lead, string[]> = {
  id: ["id", "leadid", "recordid", "leadnumber", "reference"],
  name: ["name", "leadname", "fullname", "contactname", "customername"],
  businessType: ["businesstype", "business", "companytype", "industry", "vertical"],
  phone: ["phone", "phonenumber", "mobile", "mobilenumber", "contactnumber", "telephone"],
  email: ["email", "emailaddress", "contactemail", "mail"],
  serviceInterest: ["serviceinterest", "service", "interestedin", "productinterest", "offering"],
  source: ["source", "leadsource", "channel", "acquisitionchannel", "origin"],
  status: ["status", "leadstatus", "pipelinestatus", "stage"],
  enquiryText: ["enquirytext", "inquirytext", "enquiry", "inquiry", "message", "leadmessage"],
  lastContactDate: ["lastcontactdate", "lastcontact", "contactedat", "lasttouch", "lastactivitydate"],
  followUpCount: ["followupcount", "followups", "numberoffollowups", "followupattempts", "attempts"],
  appointmentStatus: ["appointmentstatus", "appointment", "bookingstatus", "consultationstatus"],
  quotedPrice: ["quotedprice", "quote", "pricequoted", "estimate", "quotedamount"],
  budgetSignal: ["budgetsignal", "budget", "budgetnotes", "pricefeedback"],
  notes: ["notes", "internalnotes", "comments", "activitynotes", "followupnotes"],
};

function normalizeHeading(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const HEADING_LOOKUP = new Map<string, keyof Lead>(
  Object.entries(FIELD_ALIASES).flatMap(([field, aliases]) =>
    aliases.map((alias) => [normalizeHeading(alias), field as keyof Lead]),
  ),
);

export function canonicalFieldFor(header: string): keyof Lead | undefined {
  return HEADING_LOOKUP.get(normalizeHeading(header));
}

function cleanText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function parseCount(value: unknown): number {
  const parsed = Number.parseInt(cleanText(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function parsePrice(value: unknown): number | undefined {
  const cleaned = cleanText(value).replace(/[^0-9.-]/g, "");
  if (!cleaned) return undefined;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function normalizeDate(value: unknown): string {
  const raw = cleanText(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readableIssues(issues: { path: PropertyKey[]; message: string }[]): string {
  return issues.map((issue) => `${issue.path.join(".") || "record"}: ${issue.message}`).join("; ");
}

export function normalizeCsvRows(rows: Record<string, unknown>[]): CsvNormalizationResult {
  const leads: Lead[] = [];
  const errors: CsvNormalizationResult["errors"] = [];
  const usedIds = new Set<string>();

  rows.forEach((row, index) => {
    const normalized: Record<string, unknown> = {};
    Object.entries(row).forEach(([heading, value]) => {
      const field = canonicalFieldFor(heading);
      if (field) normalized[field] = value;
    });

    if (!Object.values(normalized).some((value) => cleanText(value))) return;

    const baseId = cleanText(normalized.id) || `CSV-${String(index + 1).padStart(3, "0")}`;
    let uniqueId = baseId;
    let suffix = 2;
    while (usedIds.has(uniqueId)) {
      uniqueId = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const candidate = {
      id: uniqueId,
      name: cleanText(normalized.name),
      businessType: cleanText(normalized.businessType),
      phone: cleanText(normalized.phone),
      email: cleanText(normalized.email),
      serviceInterest: cleanText(normalized.serviceInterest),
      source: cleanText(normalized.source),
      status: cleanText(normalized.status),
      enquiryText: cleanText(normalized.enquiryText),
      lastContactDate: normalizeDate(normalized.lastContactDate),
      followUpCount: parseCount(normalized.followUpCount),
      appointmentStatus: cleanText(normalized.appointmentStatus),
      quotedPrice: parsePrice(normalized.quotedPrice),
      budgetSignal: cleanText(normalized.budgetSignal),
      notes: cleanText(normalized.notes),
    };

    const result = leadSchema.safeParse(candidate);
    if (!result.success) {
      errors.push({ row: index + 2, message: readableIssues(result.error.issues) });
      return;
    }

    usedIds.add(uniqueId);
    leads.push(result.data);
  });

  return { leads, errors, totalRows: rows.length };
}

export function parseLeadCsv(csvText: string): CsvNormalizationResult {
  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
  });
  const normalized = normalizeCsvRows(parsed.data);
  const parseErrors = parsed.errors.map((error) => ({
    row: (error.row ?? 0) + 2,
    message: error.message,
  }));
  return { ...normalized, errors: [...parseErrors, ...normalized.errors] };
}
