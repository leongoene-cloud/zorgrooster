"use server";

import { redirect } from "next/navigation";
import type { ActieStatus } from "@/components/formulier";
import { createClient } from "@/lib/supabase/server";

/** Beheerder logt in met alleen een wachtwoord; het e-mailadres staat in ADMIN_EMAIL */
export async function inloggenBeheer(_: ActieStatus, data: FormData): Promise<ActieStatus> {
  const wachtwoord = String(data.get("wachtwoord") ?? "");
  const email = process.env.ADMIN_EMAIL;
  if (!email) return { fout: "ADMIN_EMAIL is niet ingesteld op de server (zie README)." };
  if (!wachtwoord) return { fout: "Vul het wachtwoord in." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord });
  if (error) {
    if (error.status === 429) return { fout: "Te veel pogingen. Wacht een paar minuten en probeer het opnieuw." };
    return { fout: "Dit wachtwoord klopt niet." };
  }
  redirect("/beheer");
}
