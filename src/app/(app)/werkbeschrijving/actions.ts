"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActieStatus } from "@/components/formulier";
import { vereisAdmin } from "@/lib/auth";
import { haalWerkbeschrijvingen } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function bewaarWerkbeschrijving(_: ActieStatus, data: FormData): Promise<ActieStatus> {
  await vereisAdmin();
  const id = String(data.get("id") ?? "");
  const titel = String(data.get("titel") ?? "").trim().slice(0, 120);
  const inhoud = String(data.get("inhoud") ?? "").slice(0, 50_000);
  if (!titel) return { fout: "Vul een titel in." };

  const supabase = await createClient();
  let nieuwId = id;
  if (id) {
    const { error } = await supabase.from("werkbeschrijvingen").update({ titel, inhoud }).eq("id", id);
    if (error) return { fout: `Opslaan lukte niet: ${error.message}` };
  } else {
    const bestaand = await haalWerkbeschrijvingen();
    const volgorde = bestaand.reduce((m, w) => Math.max(m, w.volgorde), 0) + 1;
    const { data: rij, error } = await supabase.from("werkbeschrijvingen").insert({ titel, inhoud, volgorde }).select("id").single();
    if (error || !rij) return { fout: `Opslaan lukte niet${error ? `: ${error.message}` : ""}.` };
    nieuwId = rij.id;
  }
  revalidatePath("/werkbeschrijving", "layout");
  redirect(`/werkbeschrijving/${nieuwId}?melding=opgeslagen`);
}

export async function verwijderWerkbeschrijving(data: FormData) {
  await vereisAdmin();
  const supabase = await createClient();
  await supabase.from("werkbeschrijvingen").delete().eq("id", String(data.get("id") ?? ""));
  revalidatePath("/werkbeschrijving", "layout");
  redirect("/werkbeschrijving?melding=verwijderd");
}

/** Eén plek omhoog of omlaag in de lijst */
export async function verplaatsWerkbeschrijving(data: FormData) {
  await vereisAdmin();
  const id = String(data.get("id") ?? "");
  const richting = String(data.get("richting") ?? "");
  if (!UUID.test(id) || (richting !== "omhoog" && richting !== "omlaag")) redirect("/werkbeschrijving");
  const lijst = await haalWerkbeschrijvingen();
  const i = lijst.findIndex((w) => w.id === id);
  const j = richting === "omhoog" ? i - 1 : i + 1;
  if (i >= 0 && j >= 0 && j < lijst.length) {
    [lijst[i], lijst[j]] = [lijst[j], lijst[i]];
    const supabase = await createClient();
    // Nummer alles opnieuw 1..n, zodat gelijke volgordes nooit blijven hangen
    for (const [n, w] of lijst.entries()) {
      if (w.volgorde !== n + 1) await supabase.from("werkbeschrijvingen").update({ volgorde: n + 1 }).eq("id", w.id);
    }
  }
  revalidatePath("/werkbeschrijving", "layout");
  redirect("/werkbeschrijving");
}
