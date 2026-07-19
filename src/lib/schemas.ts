import { z } from "zod";

const optionalText = z.string().trim().max(2_000, "Must be 2,000 characters or fewer").optional().default("");
const optionalContact = z.string().trim().max(240, "Contact value is too long").optional().default("");

export const leadSchema = z.object({
  id: z.string().trim().min(1, "Lead ID is required").max(120),
  name: z.string().trim().min(1, "Lead name is required").max(160),
  businessType: optionalText,
  phone: optionalContact,
  email: optionalContact.refine(
    (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "Email address is not valid",
  ),
  serviceInterest: optionalText,
  source: optionalText,
  status: optionalText,
  enquiryText: optionalText,
  lastContactDate: z.string().trim().optional().default("").refine(
    (value) => value === "" || !Number.isNaN(Date.parse(value)),
    "Last contact date is not valid",
  ),
  followUpCount: z.number().int().min(0).max(999).default(0),
  appointmentStatus: optionalText,
  quotedPrice: z.number().finite().min(0).optional(),
  budgetSignal: optionalText,
  notes: optionalText,
});

export const leadArraySchema = z.array(leadSchema).max(5_000);
