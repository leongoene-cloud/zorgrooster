import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isTokenVorm, ZV_COOKIE } from "@/lib/toegang";

const OPENBAAR = ["/login", "/z/"];

/**
 * Ververst de sessie van de beheerder, laat zorgverleners met een geldige link-cookie door
 * en stuurt verder iedereen naar /login. De echte controle zit in de database.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const pad = request.nextUrl.pathname;
  const doorsturen = (naar: string, zonderLink = false) => {
    const doel = request.nextUrl.clone();
    const [p, q] = naar.split("?");
    doel.pathname = p;
    doel.search = q ? `?${q}` : "";
    const r = NextResponse.redirect(doel);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    if (zonderLink) r.cookies.delete(ZV_COOKIE);
    return r;
  };

  if (OPENBAAR.some((p) => pad.startsWith(p))) return response;

  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) {
    // Ingelogd met wachtwoord = beheerder
    if (pad.startsWith("/beheer")) {
      const { data: admin } = await supabase.rpc("is_admin");
      if (!admin) return doorsturen("/rooster");
    }
    return response;
  }

  const token = request.cookies.get(ZV_COOKIE)?.value;
  if (!isTokenVorm(token)) return doorsturen("/login");
  const { data: zv } = await supabase.rpc("zv_sessie", { p_token: token });
  if (!Array.isArray(zv) || zv.length === 0) return doorsturen("/login?fout=link-ongeldig", true);
  if (pad.startsWith("/beheer")) return doorsturen("/rooster");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|csv)$).*)"],
};
