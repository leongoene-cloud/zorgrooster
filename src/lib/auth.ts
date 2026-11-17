import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";
import { isTokenVorm, ZV_COOKIE } from "./toegang";
import type { Zorgverlener, ZorgverlenerPubliek } from "./types";

/**
 * Twee soorten bezoekers:
 * - de beheerder: ingelogd met wachtwoord (Supabase Auth); leest/schrijft tabellen via RLS;
 * - een zorgverlener: komt binnen via een persoonlijke link; de link-code staat in een cookie
 *   en elke databasevraag gaat via functies die die code controleren.
 */
export type Sessie =
  | { soort: "admin"; isAdmin: true; userId: string; zorgverlener: Zorgverlener }
  | { soort: "zorgverlener"; isAdmin: false; token: string; zorgverlener: ZorgverlenerPubliek };

export const huidigeSessie = cache(async (): Promise<Sessie | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (sub) {
    const { data: zv } = await supabase
      .from("zorgverleners")
      .select("id, naam, email, kleur, actief, rol, user_id, toegang_aangemaakt")
      .eq("user_id", sub)
      .maybeSingle<Zorgverlener>();
    if (zv?.actief && zv.rol === "admin") return { soort: "admin", isAdmin: true, userId: sub, zorgverlener: zv };
  }

  const token = (await cookies()).get(ZV_COOKIE)?.value;
  if (isTokenVorm(token)) {
    const { data: rijen } = await supabase.rpc("zv_sessie", { p_token: token });
    const zv = (rijen as { id: string; naam: string; kleur: string }[] | null)?.[0];
    if (zv) return { soort: "zorgverlener", isAdmin: false, token, zorgverlener: { ...zv, actief: true } };
  }
  return null;
});

/** Beheerder of zorgverlener met geldige link; anders naar de startpagina */
export async function vereisLid(): Promise<Sessie> {
  const s = await huidigeSessie();
  if (!s) redirect("/login");
  return s;
}

export async function vereisAdmin(): Promise<Extract<Sessie, { soort: "admin" }>> {
  const s = await vereisLid();
  if (s.soort !== "admin") redirect("/rooster");
  return s;
}
