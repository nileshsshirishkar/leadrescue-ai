import type { Metadata } from "next";
import { CsvUploadFeedback } from "@/components/csv-upload-feedback";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadRescue AI — Explainable lead recovery",
  description: "Find follow-up leakage, understand the evidence, and prepare human-reviewed recovery actions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <CsvUploadFeedback />
      </body>
    </html>
  );
}
