import { dagenVanMaand, datumKort, naarDatum, periodesOverlappen, tijd } from "./datum";
import type { Dienst, VerlofPeriode, ZorgverlenerPubliek } from "./types";
import { duurMinuten, minuten, minutenNaarTijd } from "./uren";

/** Tijdvakken die altijd gedekt moeten zijn: dag 09:00–21:00 en nacht 21:00–09:00 */
export const ZORG_DAG_START = "09:00";
export const ZORG_NACHT_START = "21:00";

export type WaarschuwingSoort = "overlap" | "verlof" | "gat";

export interface Waarschuwing {
  soort: WaarschuwingSoort;
  datum: string;
  tekst: string;
  dienstIds: string[];
}

const dagIndex = (datum: string) => Math.round(naarDatum(datum).getTime() / 86_400_000);

/** Absoluut interval [van, tot) in minuten sinds 1970-01-01 (wandtijd) */
export function dienstInterval(d: Pick<Dienst, "datum" | "start_tijd" | "eind_tijd">): [number, number] {
  const van = dagIndex(d.datum) * 1440 + minuten(d.start_tijd);
  return [van, van + duurMinuten(d.start_tijd, d.eind_tijd)];
}

export function overlappendeDiensten(diensten: Dienst[], namen: Map<string, string>): Waarschuwing[] {
  const perZv = new Map<string, Dienst[]>();
  for (const d of diensten) {
    const lijst = perZv.get(d.zorgverlener_id) ?? [];
    lijst.push(d);
    perZv.set(d.zorgverlener_id, lijst);
  }
  const uit: Waarschuwing[] = [];
  for (const [zvId, lijst] of perZv) {
    const gesorteerd = [...lijst].sort((a, b) => dienstInterval(a)[0] - dienstInterval(b)[0]);
    for (let i = 0; i < gesorteerd.length; i++) {
      for (let j = i + 1; j < gesorteerd.length; j++) {
        const [, eindA] = dienstInterval(gesorteerd[i]);
        const [startB] = dienstInterval(gesorteerd[j]);
        if (startB >= eindA) break;
        const a = gesorteerd[i];
        const b = gesorteerd[j];
        const dubbel = a.datum === b.datum && a.start_tijd === b.start_tijd && a.eind_tijd === b.eind_tijd;
        uit.push({
          soort: "overlap",
          datum: a.datum,
          tekst: `${namen.get(zvId) ?? "Onbekend"} heeft ${dubbel ? "een dubbele dienst" : "overlappende diensten"}: ${datumKort(a.datum)} ${tijd(a.start_tijd)}–${tijd(a.eind_tijd)} en ${datumKort(b.datum)} ${tijd(b.start_tijd)}–${tijd(b.eind_tijd)}`,
          dienstIds: [a.id, b.id],
        });
      }
    }
  }
  return uit;
}

export function dienstenTijdensVerlof(
  diensten: Dienst[],
  verlof: VerlofPeriode[],
  namen: Map<string, string>,
): Waarschuwing[] {
  const uit: Waarschuwing[] = [];
  for (const d of diensten) {
    const v = verlof.find(
      (v) => v.zorgverlener_id === d.zorgverlener_id && periodesOverlappen(d.datum, d.datum, v.start_datum, v.eind_datum),
    );
    if (v) {
      uit.push({
        soort: "verlof",
        datum: d.datum,
        tekst: `${namen.get(d.zorgverlener_id) ?? "Onbekend"} heeft verlof, maar staat ingeroosterd op ${datumKort(d.datum)} ${tijd(d.start_tijd)}–${tijd(d.eind_tijd)}`,
        dienstIds: [d.id],
      });
    }
  }
  return uit;
}

/** Ongedekte stukken van [van, tot) gegeven een lijst intervallen */
function ongedekt(van: number, tot: number, intervallen: [number, number][]): [number, number][] {
  const relevant = intervallen.filter(([a, b]) => b > van && a < tot).sort((x, y) => x[0] - y[0]);
  const gaten: [number, number][] = [];
  let cursor = van;
  for (const [a, b] of relevant) {
    if (a > cursor) gaten.push([cursor, Math.min(a, tot)]);
    cursor = Math.max(cursor, b);
    if (cursor >= tot) break;
  }
  if (cursor < tot) gaten.push([cursor, tot]);
  return gaten;
}

/**
 * Gaten in de zorg: per datum moeten de dag (09:00–21:00) en de nacht (21:00–09:00 volgende dag)
 * volledig gedekt zijn. Geef diensten mee van de dag vóór t/m de dag na de maand.
 */
export function gatenInZorg(diensten: Dienst[], datums: string[]): Waarschuwing[] {
  const intervallen = diensten.map(dienstInterval);
  const dagStart = minuten(ZORG_DAG_START);
  const nachtStart = minuten(ZORG_NACHT_START);
  const uit: Waarschuwing[] = [];
  for (const datum of datums) {
    const basis = dagIndex(datum) * 1440;
    const delen: [string, number, number][] = [
      ["dag", basis + dagStart, basis + nachtStart],
      ["nacht", basis + nachtStart, basis + 1440 + dagStart],
    ];
    for (const [deel, van, tot] of delen) {
      const gaten = ongedekt(van, tot, intervallen);
      if (gaten.length === 0) continue;
      const geheel = gaten.length === 1 && gaten[0][0] === van && gaten[0][1] === tot;
      const tekst = geheel
        ? `${datumKort(datum)}: geen ${deel}dienst`
        : `${datumKort(datum)}: ${deel} niet helemaal gedekt (${gaten
            .map(([a, b]) => `${minutenNaarTijd(a)}–${minutenNaarTijd(b)}`)
            .join(", ")})`;
      uit.push({ soort: "gat", datum, tekst, dienstIds: [] });
    }
  }
  return uit;
}

export function alleControles(opts: {
  maand: string;
  diensten: Dienst[]; // diensten van de dag vóór t/m de dag na de maand
  verlof: VerlofPeriode[];
  zorgverleners: ZorgverlenerPubliek[];
}): Waarschuwing[] {
  const namen = new Map(opts.zorgverleners.map((z) => [z.id, z.naam]));
  const inMaand = opts.diensten.filter((d) => d.datum.startsWith(opts.maand));
  return [
    ...overlappendeDiensten(opts.diensten, namen).filter((w) => w.datum.startsWith(opts.maand)),
    ...dienstenTijdensVerlof(inMaand, opts.verlof, namen),
    ...gatenInZorg(opts.diensten, dagenVanMaand(opts.maand)),
  ].sort((a, b) => a.datum.localeCompare(b.datum));
}
