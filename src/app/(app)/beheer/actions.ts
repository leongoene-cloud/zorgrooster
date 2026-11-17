"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActieStatus } from "@/components/formulier";
import { vereisAdmin } from "@/lib/auth";
import { haalDiensten } from "@/lib/data";
import { isGeldigeDatum, isGeldigeMaand, maandVan } from "@/lib/datum";
import { berekenPlan, type PlanSoort } from "@/lib/plan-server";
import { splitsBestaand } from "@/lib/plannen";
import { createClient } from "@/lib/supabase/server";
import type { DienstType, NieuweDienst } from "@/lib/types";
import { isGeldigeTijd } from "@/lib/uren";

const TYPES: DienstType[] = ["dag", "avond", "nacht", "overig"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const tekst = (data: FormData, k: string) => String(data.get(k) ?? "").trim();
const optTijd = (data: FormData, k: string) => {
  const t = tekst(data, k);
  return t ? t : null;
};

function vernieuw() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- diensten

function leesDienst(data: FormData): { fout: string } | { dienst: NieuweDienst & { werkelijke_start: string | null; werkelijke_eind: string | null } } {
  const zorgverlener_id = tekst(data, "zorgverlener_id");
  const datum = tekst(data, "datum");
  const type = tekst(data, "type") as DienstType;
  const start_tijd = tekst(data, "start_tijd");
  const eind_tijd = tekst(data, "eind_tijd");
  const werkelijke_start = optTijd(data, "werkelijke_start");
  const werkelijke_eind = optTijd(data, "werkelijke_eind");
  if (!UUID.test(zorgverlener_id)) return { fout: "Kies een zorgverlener." };
  if (!isGeldigeDatum(datum)) return { fout: "Kies een geldige datum." };
  if (!TYPES.includes(type)) return { fout: "Kies het soort dienst." };
  if (!isGeldigeTijd(start_tijd) || !isGeldigeTijd(eind_tijd)) return { fout: "Vul een geldige start- en eindtijd in." };
  if (start_tijd.slice(0, 5) === eind_tijd.slice(0, 5)) return { fout: "Start- en eindtijd mogen niet gelijk zijn." };
  if ((werkelijke_start && !isGeldigeTijd(werkelijke_start)) || (werkelijke_eind && !isGeldigeTijd(werkelijke_eind)))
    return { fout: "De werkelijke tijd is ongeldig." };
  return {
    dienst: {
      zorgverlener_id,
      datum,
      type,
      start_tijd,
      eind_tijd,
      werkelijke_start,
      werkelijke_eind,
      notitie: tekst(data, "notitie").slice(0, 300) || null,
    },
  };
}

export async function bewaarDienst(_: ActieStatus, data: FormData): Promise<ActieStatus> {
  await vereisAdmin();
  const r = leesDienst(data);
  if ("fout" in r) return r;
  const id = tekst(data, "id");
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("diensten").update(r.dienst).eq("id", id)
    : await supabase.from("diensten").insert(r.dienst);
  if (error) return { fout: `Opslaan lukte niet: ${error.message}` };
  vernieuw();
  const terug = tekst(data, "terug");
  redirect(terug.startsWith("/beheer") ? terug : `/beheer/rooster?maand=${maandVan(r.dienst.datum)}&melding=opgeslagen#dag-${r.dienst.datum}`);
}

export async function verwijderDienst(data: FormData) {
  await vereisAdmin();
  const id = tekst(data, "id");
  const maand = tekst(data, "maand");
  const supabase = await createClient();
  const { error } = await supabase.from("diensten").delete().eq("id", id);
  vernieuw();
  redirect(`/beheer/rooster?maand=${isGeldigeMaand(maand) ? maand : ""}&melding=${error ? "fout" : "verwijderd"}`);
}

export async function wijsToe(data: FormData) {
  await vereisAdmin();
  const id = tekst(data, "id");
  const zv = tekst(data, "zorgverlener_id");
  const terug = tekst(data, "terug") || "/beheer/vervanging";
  const supabase = await createClient();
  const { error } = await supabase.from("diensten").update({ zorgverlener_id: zv, vervanging_nodig: false }).eq("id", id);
  vernieuw();
  redirect(`${terug}${terug.includes("?") ? "&" : "?"}melding=${error ? "fout" : "toegewezen"}`);
}

export async function geenVervangingNodig(data: FormData) {
  await vereisAdmin();
  const id = tekst(data, "id");
  const terug = tekst(data, "terug") || "/beheer/vervanging";
  const supabase = await createClient();
  await supabase.from("diensten").update({ vervanging_nodig: false }).eq("id", id);
  vernieuw();
  redirect(terug);
}

// ---------------------------------------------------------------- zorgverleners

export async function bewaarZorgverlener(_: ActieStatus, data: FormData): Promise<ActieStatus> {
  const sessie = await vereisAdmin();
  const id = tekst(data, "id");
  const naam = tekst(data, "naam").slice(0, 80);
  const email = tekst(data, "email").toLowerCase();
  const kleur = tekst(data, "kleur");
  const rol = tekst(data, "rol") === "admin" ? "admin" : "zorgverlener";
  const actief = tekst(data, "actief") !== "nee";
  if (!naam) return { fout: "Vul een naam in." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { fout: "Vul een geldig e-mailadres in." };
  if (!/^#[0-9a-fA-F]{6}$/.test(kleur)) return { fout: "Kies een kleur." };
  if (id === sessie.zorgverlener.id && (!actief || rol !== "admin"))
    return { fout: "Je kunt jezelf niet deactiveren of je beheerrechten afnemen." };

  const supabase = await createClient();
  const rij = { naam, email, kleur, rol, actief };
  const { error } = id
    ? await supabase.from("zorgverleners").update(rij).eq("id", id)
    : await supabase.from("zorgverleners").insert(rij);
  if (error) {
    if (error.code === "23505") return { fout: "Dit e-mailadres is al in gebruik." };
    return { fout: `Opslaan lukte niet: ${error.message}` };
  }
  vernieuw();
  redirect("/beheer/zorgverleners?melding=opgeslagen");
}

// ---------------------------------------------------------------- sjabloon

export async function voegSjabloonToe(_: ActieStatus, data: FormData): Promise<ActieStatus> {
  await vereisAdmin();
  const dagen = data.getAll("weekdag").map(Number).filter((n) => n >= 1 && n <= 7);
  const zv = tekst(data, "zorgverlener_id");
  const type = tekst(data, "type") as DienstType;
  const start = tekst(data, "start_tijd");
  const eind = tekst(data, "eind_tijd");
  if (!dagen.length) return { fout: "Kies minstens één weekdag." };
  if (!UUID.test(zv)) return { fout: "Kies een zorgverlener." };
  if (!TYPES.includes(type)) return { fout: "Kies het soort dienst." };
  if (!isGeldigeTijd(start) || !isGeldigeTijd(eind) || start === eind) return { fout: "Vul geldige tijden in." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("dienst_sjablonen")
    .insert(dagen.map((weekdag) => ({ weekdag, zorgverlener_id: zv, type, start_tijd: start, eind_tijd: eind })));
  if (error) return { fout: `Opslaan lukte niet: ${error.message}` };
  vernieuw();
  redirect("/beheer/sjabloon?melding=toegevoegd");
}

export async function verwijderSjabloon(data: FormData) {
  await vereisAdmin();
  const supabase = await createClient();
  await supabase.from("dienst_sjablonen").delete().eq("id", tekst(data, "id"));
  vernieuw();
  redirect("/beheer/sjabloon?melding=verwijderd");
}

// ---------------------------------------------------------------- plannen (sjabloon / kopiëren)

export async function voerPlanUit(data: FormData) {
  await vereisAdmin();
  const soort = tekst(data, "soort") as PlanSoort;
  const doel = tekst(data, "doel");
  const modus = tekst(data, "modus"); // 'toevoegen' | 'vervangen'
  const geldig = soort === "week" ? isGeldigeDatum(doel) : (soort === "sjabloon" || soort === "maand") && isGeldigeMaand(doel);
  if (!geldig) redirect("/beheer?fout=plan");

  const plan = await berekenPlan(soort, doel);
  const supabase = await createClient();
  const rijen = modus === "vervangen" ? plan.voorstel : plan.nieuw;
  // Vervangen gebeurt in één databasetransactie: lukt het invoegen niet, dan blijft alles staan.
  const { error } =
    modus === "vervangen"
      ? await supabase.rpc("vervang_diensten", { p_van: plan.van, p_tot: plan.tot, p_diensten: rijen })
      : rijen.length
        ? await supabase.from("diensten").insert(rijen)
        : { error: null };
  if (error) redirect(`/beheer/rooster?maand=${maandVan(plan.van)}&melding=fout`);
  vernieuw();
  redirect(`/beheer/rooster?maand=${maandVan(plan.van)}&melding=gepland&aantal=${rijen.length}`);
}

// ---------------------------------------------------------------- import

export async function importeerDiensten(_: ActieStatus, data: FormData): Promise<ActieStatus> {
  await vereisAdmin();
  let rijen: NieuweDienst[];
  try {
    rijen = JSON.parse(tekst(data, "diensten"));
  } catch {
    return { fout: "De gegevens konden niet worden gelezen. Upload het bestand opnieuw." };
  }
  if (!Array.isArray(rijen) || rijen.length === 0) return { fout: "Er zijn geen diensten om te importeren." };
  if (rijen.length > 5000) return { fout: "Te veel regels in één keer (maximaal 5000)." };
  const schoon: NieuweDienst[] = [];
  for (const r of rijen) {
    if (
      !UUID.test(String(r.zorgverlener_id)) ||
      !isGeldigeDatum(r.datum) ||
      !TYPES.includes(r.type) ||
      !isGeldigeTijd(r.start_tijd) ||
      !isGeldigeTijd(r.eind_tijd)
    )
      return { fout: "Het bestand bevat ongeldige regels. Controleer de preview." };
    schoon.push({ zorgverlener_id: r.zorgverlener_id, datum: r.datum, type: r.type, start_tijd: r.start_tijd, eind_tijd: r.eind_tijd });
  }
  const van = schoon.reduce((m, r) => (r.datum < m ? r.datum : m), schoon[0].datum);
  const tot = schoon.reduce((m, r) => (r.datum > m ? r.datum : m), schoon[0].datum);
  const { nieuw, alAanwezig } = splitsBestaand(schoon, await haalDiensten(van, tot));
  const supabase = await createClient();
  if (nieuw.length) {
    const { error } = await supabase.from("diensten").insert(nieuw);
    if (error) return { fout: `Importeren lukte niet: ${error.message}` };
  }
  vernieuw();
  return {
    melding: `${nieuw.length} diensten geïmporteerd${alAanwezig.length ? `, ${alAanwezig.length} bestonden al en zijn overgeslagen` : ""}.`,
  };
}

// ---------------------------------------------------------------- schoolvakanties

export async function bewaarVakantie(_: ActieStatus, data: FormData): Promise<ActieStatus> {
  await vereisAdmin();
  const id = tekst(data, "id");
  const naam = tekst(data, "naam").slice(0, 80);
  const start = tekst(data, "start_datum");
  const eind = tekst(data, "eind_datum");
  const regio = ["noord", "midden", "zuid"].includes(tekst(data, "regio")) ? tekst(data, "regio") : "midden";
  if (!naam) return { fout: "Vul een naam in." };
  if (!isGeldigeDatum(start) || !isGeldigeDatum(eind)) return { fout: "Vul geldige datums in." };
  if (eind < start) return { fout: "De einddatum mag niet vóór de startdatum liggen." };
  const rij = {
    naam,
    start_datum: start,
    eind_datum: eind,
    regio,
    bron: tekst(data, "bron").slice(0, 120) || null,
    opmerking: tekst(data, "opmerking").slice(0, 200) || null,
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("schoolvakanties").update(rij).eq("id", id)
    : await supabase.from("schoolvakanties").insert(rij);
  if (error) return { fout: `Opslaan lukte niet: ${error.message}` };
  vernieuw();
  redirect("/beheer/vakanties?melding=opgeslagen");
}

export async function verwijderVakantie(data: FormData) {
  await vereisAdmin();
  const supabase = await createClient();
  await supabase.from("schoolvakanties").delete().eq("id", tekst(data, "id"));
  vernieuw();
  redirect("/beheer/vakanties?melding=verwijderd");
}
