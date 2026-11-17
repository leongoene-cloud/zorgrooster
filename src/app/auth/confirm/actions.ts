"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function bevestigInloggen(data: FormData) {
  const tokenHash = String(data.get("token_hash") ?? "");
  const type = String(data.get("type") ?? "email") as EmailOtpType;
  const code = String(data.get("code") ?? "");
  const supabase = await createClient();

  let ok = false;
  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }
  redirect(ok ? "/rooster" : "/login?fout=link-ongeldig");
}
