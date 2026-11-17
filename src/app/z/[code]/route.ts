import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTokenVorm, ZV_COOKIE, ZV_COOKIE_OPTIES } from "@/lib/toegang";

/**
 * Persoonlijke link van een zorgverlener: /z/<code>.
 * Klopt de code, dan wordt hij in een cookie bewaard en ga je naar het rooster.
 * Daarna werkt de app op dit apparaat zonder de link opnieuw te openen.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const naar = (pad: string) => NextResponse.redirect(new URL(pad, request.url), { status: 303 });
  if (!isTokenVorm(code)) return naar("/login?fout=link-ongeldig");

  const supabase = await createClient();
  const { data } = await supabase.rpc("zv_sessie", { p_token: code });
  if (!Array.isArray(data) || data.length === 0) return naar("/login?fout=link-ongeldig");

  const res = naar(`/rooster?zv=${data[0].id}`);
  res.cookies.set(ZV_COOKIE, code, ZV_COOKIE_OPTIES);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
