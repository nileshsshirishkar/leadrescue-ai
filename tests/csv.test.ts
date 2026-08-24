import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { canonicalFieldFor, normalizeCsvRows, parseLeadCsv } from "@/lib/csv";

describe("CSV normalization", () => {
  it("maps common CRM-style headings", () => {
    expect(canonicalFieldFor("Full Name")).toBe("name");
    expect(canonicalFieldFor("Lead Source")).toBe("source");
    expect(canonicalFieldFor("Booking Status")).toBe("appointmentStatus");
    expect(canonicalFieldFor("Follow-up Attempts")).toBe("followUpCount");
  });

  it("normalizes text, dates, counts, and formatted prices", () => {
    const result = normalizeCsvRows([{
      "Lead ID": "L-9",
      "Full Name": "  Jordan Vale  ",
      Industry: "Digital agency",
      Mobile: "+1 202-555-0188",
      "Email Address": "jordan.vale@example.com",
      "Interested In": "Website audit",
      "Last Contact": "July 10, 2026",
      "Follow Ups": "3",
      "Quoted Amount": "$1,250",
    }]);
    expect(result.errors).toEqual([]);
    expect(result.leads[0]).toMatchObject({
      id: "L-9",
      name: "Jordan Vale",
      businessType: "Digital agency",
      lastContactDate: "2026-07-10",
      followUpCount: 3,
      quotedPrice: 1250,
    });
    expect(result.validRows[0]).toMatchObject({ rowNumber: 2, lead: { id: "L-9" } });
  });

  it("makes duplicate identifiers safe for rendering", () => {
    const result = normalizeCsvRows([
      { id: "DUP", name: "First Lead" },
      { id: "DUP", name: "Second Lead" },
    ]);
    expect(result.leads.map((lead) => lead.id)).toEqual(["DUP", "DUP-2"]);
  });

  it("keeps original source row numbers when invalid rows are skipped", () => {
    const csv = [
      "Lead Name,Email,Service,Last Touch",
      "First Lead,first@example.com,Consultation,2026-07-10",
      ",broken-email,Audit,not-a-date",
      "Third Lead,third@example.com,Audit,2026-07-12",
    ].join("\n");
    const result = parseLeadCsv(csv);
    expect(result.leads).toHaveLength(2);
    expect(result.validRows.map((row) => row.rowNumber)).toEqual([2, 4]);
    expect(result.validRows.map((row) => row.lead.name)).toEqual(["First Lead", "Third Lead"]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(3);
    expect(result.errors[0].message).toContain("Lead name is required");
  });

  it("ships a valid 14-row fictional sample CSV", () => {
    const sample = readFileSync(new URL("../public/sample-leads.csv", import.meta.url), "utf8");
    const result = parseLeadCsv(sample);
    expect(result.errors).toEqual([]);
    expect(result.leads).toHaveLength(14);
    expect(result.validRows).toHaveLength(14);
    expect(result.leads.find((lead) => lead.id === "CSV-DEMO-006")).toMatchObject({
      serviceInterest: "",
      source: "Website",
      status: "New",
    });
  });
});
