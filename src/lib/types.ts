export type RecoveryPriority = "Critical" | "High" | "Medium" | "Low";
export type IntentLevel = "High" | "Medium" | "Low";
export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface Lead {
  id: string;
  name: string;
  businessType: string;
  phone?: string;
  email?: string;
  serviceInterest: string;
  source: string;
  sourceStage?: string;
  status: string;
  enquiryText: string;
  lastContactDate?: string;
  followUpCount: number;
  appointmentStatus: string;
  quotedPrice?: number;
  budgetSignal: string;
  notes: string;
}

export interface LeadAnalysis {
  lead: Lead;
  recoveryPriority: RecoveryPriority;
  intentLevel: IntentLevel;
  recoveryScore: number;
  leakageType: string;
  evidence: string[];
  confidence: ConfidenceLevel;
  recommendedNextAction: string;
  actionDeadline: string;
  likelyObjection: string;
  missingInformation: string[];
  recoveryMessage: string;
  humanReviewRequired: true;
  daysSinceLastContact: number | null;
  isFollowUpOverdue: boolean;
  isAtRisk: boolean;
}

export interface CsvRowError {
  row: number;
  message: string;
}

export interface CsvNormalizedRow {
  rowNumber: number;
  lead: Lead;
}

export interface CsvNormalizationResult {
  leads: Lead[];
  validRows: CsvNormalizedRow[];
  errors: CsvRowError[];
  totalRows: number;
}
