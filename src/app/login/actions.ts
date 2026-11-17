"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ActieStatus } from "@/components/formulier";
import { createClient } from "@/lib/supabase/server";

const NEUTRAAL =
  "Als dit e-mailadres toegang heeft, ontvang je binnen een paar minuten een e-mail met een inloglink en een code. Kijk ook in je spam.";

async function siteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function stuurInloglink(_: ActieStatus, data: FormData): Promise<ActieStatus> {
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { fout: "Vul een geldig e-mailadres in." };

  const supabase = await createClient();
  const { data: toegestaan, error } = await supabase.rpc("email_toegestaan", { p_email: email });
  if (error) return { fout: "Er ging iets mis. Probeer het later opnieuw." };
  if (!toegestaan) return { melding: NEUTRAAL }; // geen open registratie; zeg niet of het adres bestaat

  const { error: otpFout } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${await siteUrl()}/auth/confirm` },
  });
  if (otpFout) {
    if (otpFout.status === 429) return { fout: "Er is net al een e-mail gestuurd. Wacht een minuut en probeer het opnieuw." };
    return { fout: "Versturen lukte niet. Probeer het later opnieuw." };
  }
  return { melding: NEUTRAAL };
}

export async function inloggenMetCode(_: ActieStatus, data: FormData): Promise<ActieStatus> {
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  const code = String(data.get("code") ?? "").replace(/\s/g, "");
  if (!email || !/^\d{6,10}$/.test(code)) return { fout: "Vul je e-mailadres en de code uit de e-mail in." };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) return { fout: "Deze code klopt niet of is verlopen. Vraag een nieuwe aan." };
  redirect("/rooster");
}
