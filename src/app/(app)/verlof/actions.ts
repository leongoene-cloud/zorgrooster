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
  const { error } =
    sessie.soort === "zorgverlener"
      ? await supabase.rpc("zv_verlof_aanvragen", { p_token: sessie.token, p_start: start, p_eind: eind, p_reden: reden })
      : await supabase.from("verlof_aanvragen").insert({ zorgverlener_id: sessie.zorgverlener.id, start_datum: start, eind_datum: eind, reden });
  if (error) return { fout: `Opslaan lukte niet: ${error.message}` };
  revalidatePath("/verlof");
  redirect("/verlof?melding=aangevraagd");
}

export async function annuleerVerlof(data: FormData) {
  const sessie = await vereisLid();
  const id = String(data.get("id") ?? "");
  const supabase = await createClient();
  let gelukt: boolean;
  if (sessie.soort === "zorgverlener") {
    const { data: ok, error } = await supabase.rpc("zv_verlof_annuleren", { p_token: sessie.token, p_id: id });
    gelukt = !error && ok === true;
  } else {
    const { data: rij, error } = await supabase
      .from("verlof_aanvragen")
      .update({ status: "geannuleerd" })
      .eq("id", id)
      .eq("status", "aangevraagd")
      .select("id")
      .maybeSingle();
    gelukt = !error && Boolean(rij);
  }
  revalidatePath("/verlof");
  redirect(gelukt ? "/verlof?melding=geannuleerd" : "/verlof?fout=annuleren");
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

/** Beheerder plant verlof in voor een zorgverlener; meteen goedgekeurd */
export async function verlofInplannen(_: ActieStatus, data: FormData): Promise<ActieStatus> {
  await vereisAdmin();
  const zv = String(data.get("zorgverlener_id") ?? "");
  const start = String(data.get("start_datum") ?? "");
  const eind = String(data.get("eind_datum") ?? "");
  const reden = String(data.get("reden") ?? "").trim().slice(0, 500) || null;
  if (!/^[0-9a-f-]{36}$/i.test(zv)) return { fout: "Kies een zorgverlener." };
  if (!isGeldigeDatum(start) || !isGeldigeDatum(eind)) return { fout: "Kies een geldige start- en einddatum." };
  if (eind < start) return { fout: "De laatste verlofdag mag niet vóór de eerste liggen." };

  const supabase = await createClient();
  const { data: rij, error } = await supabase
    .from("verlof_aanvragen")
    .insert({
      zorgverlener_id: zv,
      start_datum: start,
      eind_datum: eind,
      reden,
      status: "goedgekeurd",
      opmerking_admin: "Ingepland door de beheerder",
      beoordeeld_op: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !rij) return { fout: `Opslaan lukte niet${error ? `: ${error.message}` : ""}.` };
  revalidatePath("/", "layout");
  // Meteen laten zien welke diensten in die periode vervangen moeten worden
  redirect(`/beheer/vervanging?verlof=${rij.id}`);
}

/** Beheerder trekt verlof in (open of goedgekeurd); markeringen 'vervanging nodig' verdwijnen */
export async function verlofIntrekken(data: FormData) {
  await vereisAdmin();
  const id = String(data.get("id") ?? "");
  const supabase = await createClient();
  const { data: rij, error } = await supabase
    .from("verlof_aanvragen")
    .update({ status: "geannuleerd" })
    .eq("id", id)
    .in("status", ["aangevraagd", "goedgekeurd"])
    .select("id")
    .maybeSingle();
  revalidatePath("/", "layout");
  redirect(error || !rij ? "/verlof?fout=intrekken#historie" : "/verlof?melding=ingetrokken#historie");
}
