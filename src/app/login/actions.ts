"use server";

import { redirect } from "next/navigation";
import { parseLoginForm } from "@/lib/auth/login";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const parsed = parseLoginForm(formData);
  if (!parsed.success) redirect("/login?error=invalid");

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    redirect("/login?error=not-configured");
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/login?error=invalid");

  redirect("/");
}
