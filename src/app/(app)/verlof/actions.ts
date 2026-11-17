"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActieStatus } from "@/components/formulier";
import { vereisAdmin, vereisLid } from "@/lib/auth";
import { isGeldigeDatum } from "@/lib/datum";
import { createClient } from "@/lib/supabase/server";

export async function vraagVerlofAan(_: ActieStatus, data: FormData): Promise<ActieStatus> {
  const sessie = await vereisLid();
  const start = String(data.get("start_datum") ?? "");
  const eind = String(data.get("eind_datum") ?? "");
  const reden = String(data.get("reden") ?? "").trim().slice(0, 500) || null;
  if (!isGeldigeDatum(start) || !isGeldigeDatum(eind)) return { fout: "Kies een geldige start- en einddatum." };
  if (eind < start) return { fout: "De einddatum mag niet vóór de startdatum liggen." };

  const supabase = await createClient();
  const { error } = await supabase.from("verlof_aanvragen").insert({
    zorgverlener_id: sessie.zorgverlener.id,
    start_datum: start,
    eind_datum: eind,
    reden,
  });
  if (error) return { fout: `Opslaan lukte niet: ${error.message}` };
  revalidatePath("/verlof");
  redirect("/verlof?melding=aangevraagd");
}

export async function annuleerVerlof(data: FormData) {
  await vereisLid();
  const id = String(data.get("id") ?? "");
  const supabase = await createClient();
  const { data: rij, error } = await supabase
    .from("verlof_aanvragen")
    .update({ status: "geannuleerd" })
    .eq("id", id)
    .eq("status", "aangevraagd")
    .select("id")
    .maybeSingle();
  revalidatePath("/verlof");
  redirect(error || !rij ? "/verlof?fout=annuleren" : "/verlof?melding=geannuleerd");
}

export async function beoordeelVerlof(data: FormData) {
  await vereisAdmin();
  const id = String(data.get("id") ?? "");
  const besluit = String(data.get("besluit") ?? "");
  if (besluit !== "goedgekeurd" && besluit !== "afgekeurd") redirect("/verlof?fout=besluit");
  const opmerking = String(data.get("opmerking_admin") ?? "").trim().slice(0, 500) || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("verlof_aanvragen")
    .update({ status: besluit, opmerking_admin: opmerking })
    .eq("id", id);
  revalidatePath("/", "layout");
  if (error) redirect("/verlof?fout=besluit");
  // Na goedkeuring meteen de diensten tonen die vervangen moeten worden
  redirect(besluit === "goedgekeurd" ? `/beheer/vervanging?verlof=${id}` : "/verlof?melding=afgekeurd");
}
