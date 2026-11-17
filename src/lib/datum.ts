/**
 * Datumhulpjes. Alle datums zijn kalenderdatums als 'YYYY-MM-DD' (zonder tijdzone);
 * rekenen gebeurt in UTC zodat zomer-/wintertijd nooit een dag verschuift.
 * "Vandaag" wordt bepaald in Europe/Amsterdam.
 */

export const TIJDZONE = "Europe/Amsterdam";

const MAANDEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];
const DAGEN_KORT = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const DAGEN_LANG = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];

export const WEEKDAG_NAMEN = DAGEN_LANG;
export const WEEKDAG_KORT = DAGEN_KORT;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function naarDatum(s: string): Date {
  const [j, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, d));
}

export function vanDatum(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function isGeldigeDatum(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return vanDatum(naarDatum(s)) === s;
}

export function vandaag(nu: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIJDZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(nu);
}

export function plusDagen(datum: string, n: number): string {
  const d = naarDatum(datum);
  d.setUTCDate(d.getUTCDate() + n);
  return vanDatum(d);
}

/** Aantal dagen van a naar b (b - a) */
export function verschilDagen(a: string, b: string): number {
  return Math.round((naarDatum(b).getTime() - naarDatum(a).getTime()) / 86_400_000);
}

/** Aantal kalenderdagen inclusief begin en eind */
export function aantalDagen(start: string, eind: string): number {
  return verschilDagen(start, eind) + 1;
}

/** 1 = maandag ... 7 = zondag */
export function weekdag(datum: string): number {
  const d = naarDatum(datum).getUTCDay();
  return d === 0 ? 7 : d;
}

export function maandagVan(datum: string): string {
  return plusDagen(datum, 1 - weekdag(datum));
}

// ---- maanden ('YYYY-MM') ----

export function isGeldigeMaand(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function huidigeMaand(nu: Date = new Date()): string {
  return vandaag(nu).slice(0, 7);
}

export function maandVan(datum: string): string {
  return datum.slice(0, 7);
}

export function verschuifMaand(maand: string, n: number): string {
  const [j, m] = maand.split("-").map(Number);
  const d = new Date(Date.UTC(j, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function eersteDag(maand: string): string {
  return `${maand}-01`;
}

export function laatsteDag(maand: string): string {
  return plusDagen(eersteDag(verschuifMaand(maand, 1)), -1);
}

export function dagenVanMaand(maand: string): string[] {
  const dagen: string[] = [];
  for (let d = eersteDag(maand); d.startsWith(maand); d = plusDagen(d, 1)) dagen.push(d);
  return dagen;
}

export function dagenTussen(start: string, eind: string): string[] {
  const dagen: string[] = [];
  for (let d = start; d <= eind; d = plusDagen(d, 1)) dagen.push(d);
  return dagen;
}

/** Weken (ma t/m zo) die de maand bevatten, inclusief aanvullende dagen van buurmaanden */
export function kalenderWeken(maand: string): string[][] {
  const weken: string[][] = [];
  let d = maandagVan(eersteDag(maand));
  const eind = laatsteDag(maand);
  while (d <= eind) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) week.push(plusDagen(d, i));
    weken.push(week);
    d = plusDagen(d, 7);
  }
  return weken;
}

// ---- weergave ----

export function maandNaam(maand: string): string {
  const [j, m] = maand.split("-").map(Number);
  return `${MAANDEN[m - 1]} ${j}`;
}

export function datumKort(datum: string): string {
  const d = naarDatum(datum);
  return `${DAGEN_KORT[weekdag(datum) - 1]} ${d.getUTCDate()} ${MAANDEN[d.getUTCMonth()].slice(0, 3)}`;
}

export function datumLang(datum: string): string {
  const d = naarDatum(datum);
  return `${DAGEN_LANG[weekdag(datum) - 1]} ${d.getUTCDate()} ${MAANDEN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function datumMetJaar(datum: string): string {
  const d = naarDatum(datum);
  return `${d.getUTCDate()} ${MAANDEN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function periodeTekst(start: string, eind: string): string {
  if (start === eind) return datumMetJaar(start);
  return `${datumMetJaar(start)} t/m ${datumMetJaar(eind)}`;
}

export function tijd(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : "";
}

export function tijdstipTekst(iso: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: TIJDZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function periodesOverlappen(aStart: string, aEind: string, bStart: string, bEind: string): boolean {
  return aStart <= bEind && bStart <= aEind;
}

/** Zelfde dag n maanden later (afgekapt op de laatste dag van de maand) */
export function plusMaanden(datum: string, n: number): string {
  const doelMaand = verschuifMaand(datum.slice(0, 7), n);
  const dag = Number(datum.slice(8, 10));
  const laatste = Number(laatsteDag(doelMaand).slice(8, 10));
  return `${doelMaand}-${String(Math.min(dag, laatste)).padStart(2, "0")}`;
}
