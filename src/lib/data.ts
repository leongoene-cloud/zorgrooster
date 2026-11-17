import "server-only";
import { huidigeSessie } from "./auth";
import { createClient } from "./supabase/server";
import type {
  Dienst,
  DienstSjabloon,
  Schoolvakantie,
  VerlofAanvraag,
  VerlofPeriode,
  Zorgverlener,
  ZorgverlenerPubliek,
} from "./types";

const DIENST_KOLOMMEN =
  "id, zorgverlener_id, datum, type, start_tijd, eind_tijd, werkelijke_start, werkelijke_eind, vervanging_nodig, notitie";

/** Link-code als de bezoeker een zorgverlener is (dan gaan vragen via de zv_-functies) */
async function linkToken(): Promise<string | null> {
  const s = await huidigeSessie();
  return s?.soort === "zorgverlener" ? s.token : null;
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Databasefout: ${res.error.message}`);
  return res.data as T;
}

export async function haalZorgverleners(): Promise<ZorgverlenerPubliek[]> {
  const sb = await createClient();
  const token = await linkToken();
  if (token) return check(await sb.rpc("zv_zorgverleners", { p_token: token }));
  return check(await sb.from("zorgverleners_publiek").select("id, naam, kleur, actief").order("naam"));
}

/** Volledige gegevens (incl. e-mail en rol); alleen voor de admin zichtbaar via RLS */
export async function haalZorgverlenersVolledig(): Promise<Zorgverlener[]> {
  const sb = await createClient();
  return check(
    await sb.from("zorgverleners").select("id, naam, email, kleur, actief, rol, user_id, toegang_aangemaakt").order("actief", { ascending: false }).order("naam"),
  );
}

export async function haalDiensten(van: string, tot: string, zorgverlenerId?: string): Promise<Dienst[]> {
  const sb = await createClient();
  const token = await linkToken();
  if (token)
    return check(await sb.rpc("zv_diensten", { p_token: token, p_van: van, p_tot: tot, p_zorgverlener_id: zorgverlenerId ?? null }));
  let q = sb.from("diensten").select(DIENST_KOLOMMEN).gte("datum", van).lte("datum", tot);
  if (zorgverlenerId) q = q.eq("zorgverlener_id", zorgverlenerId);
  return check(await q.order("datum").order("start_tijd"));
}

export async function haalDienst(id: string): Promise<Dienst | null> {
  const sb = await createClient();
  return check(await sb.from("diensten").select(DIENST_KOLOMMEN).eq("id", id).maybeSingle());
}

export async function haalDienstenVervangingNodig(): Promise<Dienst[]> {
  const sb = await createClient();
  return check(await sb.from("diensten").select(DIENST_KOLOMMEN).eq("vervanging_nodig", true).order("datum").order("start_tijd"));
}

export async function haalGoedgekeurdVerlof(van: string, tot: string): Promise<VerlofPeriode[]> {
  const sb = await createClient();
  const token = await linkToken();
  if (token) return check(await sb.rpc("zv_verlof_goedgekeurd", { p_token: token, p_van: van, p_tot: tot }));
  return check(
    await sb
      .from("verlof_goedgekeurd")
      .select("id, zorgverlener_id, start_datum, eind_datum")
      .lte("start_datum", tot)
      .gte("eind_datum", van),
  );
}

/** Beheerder: alle (gefilterde) aanvragen. Zorgverlener: altijd alleen de eigen aanvragen. */
export async function haalVerlofAanvragen(opties: { zorgverlenerId?: string; status?: string } = {}): Promise<VerlofAanvraag[]> {
  const sb = await createClient();
  const token = await linkToken();
  if (token) {
    const eigen: VerlofAanvraag[] = check(await sb.rpc("zv_mijn_verlof", { p_token: token }));
    return opties.status ? eigen.filter((a) => a.status === opties.status) : eigen;
  }
  let q = sb
    .from("verlof_aanvragen")
    .select("id, zorgverlener_id, start_datum, eind_datum, reden, status, opmerking_admin, aangevraagd_op, beoordeeld_op");
  if (opties.zorgverlenerId) q = q.eq("zorgverlener_id", opties.zorgverlenerId);
  if (opties.status) q = q.eq("status", opties.status);
  return check(await q.order("start_datum", { ascending: false }));
}

export type TeamVerlof = Pick<VerlofAanvraag, "id" | "zorgverlener_id" | "start_datum" | "eind_datum" | "status">;

/** Openstaand en goedgekeurd verlof van iedereen, van vandaag en later (zonder reden) */
export async function haalTeamVerlof(vanaf: string): Promise<TeamVerlof[]> {
  const sb = await createClient();
  const token = await linkToken();
  if (token) return check(await sb.rpc("zv_verlof_team", { p_token: token }));
  return check(
    await sb
      .from("verlof_aanvragen")
      .select("id, zorgverlener_id, start_datum, eind_datum, status")
      .in("status", ["aangevraagd", "goedgekeurd"])
      .gte("eind_datum", vanaf)
      .order("start_datum"),
  );
}

export async function haalVakanties(van: string, tot: string, regio = "midden"): Promise<Schoolvakantie[]> {
  const sb = await createClient();
  const token = await linkToken();
  if (token) return check(await sb.rpc("zv_vakanties", { p_token: token, p_van: van, p_tot: tot, p_regio: regio }));
  return check(
    await sb
      .from("schoolvakanties")
      .select("id, naam, start_datum, eind_datum, regio, bron, opmerking")
      .eq("regio", regio)
      .lte("start_datum", tot)
      .gte("eind_datum", van)
      .order("start_datum"),
  );
}

export async function haalAlleVakanties(): Promise<Schoolvakantie[]> {
  const sb = await createClient();
  return check(
    await sb.from("schoolvakanties").select("id, naam, start_datum, eind_datum, regio, bron, opmerking").order("start_datum"),
  );
}

export async function haalSjablonen(): Promise<DienstSjabloon[]> {
  const sb = await createClient();
  return check(
    await sb.from("dienst_sjablonen").select("id, weekdag, ritme, zorgverlener_id, type, start_tijd, eind_tijd").order("weekdag").order("start_tijd"),
  );
}
