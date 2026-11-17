/** Naam van de cookie waarin de persoonlijke link-code van een zorgverlener staat */
export const ZV_COOKIE = "zv_toegang";

export const ZV_COOKIE_OPTIES = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 400 * 24 * 60 * 60, // maximum dat browsers toestaan; elk bezoek van de link verlengt dit
};

export function isTokenVorm(t: unknown): t is string {
  return typeof t === "string" && /^[0-9a-f]{64}$/.test(t);
}
