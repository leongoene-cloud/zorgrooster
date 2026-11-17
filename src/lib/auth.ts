import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { Zorgverlener } from "./types";

export interface Sessie {
  userId: string;
  email: string;
  zorgverlener: Zorgverlener | null;
  isAdmin: boolean;
}

/** De ingelogde gebruiker plus de gekoppelde zorgverlener (één keer per request) */
export const huidigeSessie = cache(async (): Promise<Sessie | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: zv } = await supabase
    .from("zorgverleners")
    .select("id, naam, email, kleur, actief, rol, user_id")
    .eq("user_id", claims.sub)
    .maybeSingle<Zorgverlener>();
  const actief = zv && zv.actief ? zv : null;
  return {
    userId: claims.sub,
    email: String(claims.email ?? ""),
    zorgverlener: actief,
    isAdmin: actief?.rol === "admin",
  };
});

/** Ingelogd én gekoppeld aan een actieve zorgverlener; anders naar /login */
export async function vereisLid(): Promise<Sessie & { zorgverlener: Zorgverlener }> {
  const s = await huidigeSessie();
  if (!s) redirect("/login");
  if (!s.zorgverlener) redirect("/login?fout=geen-toegang");
  return s as Sessie & { zorgverlener: Zorgverlener };
}

export async function vereisAdmin(): Promise<Sessie & { zorgverlener: Zorgverlener }> {
  const s = await vereisLid();
  if (!s.isAdmin) redirect("/rooster");
  return s;
}
