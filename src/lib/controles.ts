import { dagenVanMaand, datumKort, naarDatum, periodesOverlappen, tijd } from "./datum";
import type { Dienst, VerlofPeriode, ZorgverlenerPubliek } from "./types";
import { duurMinuten, minuten } from "./uren";

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

/**
 * Gaten in de zorg: elke datum hoort minstens één dagdienst (dag, avond of overig)
 * en één nachtdienst te hebben. Hoe lang die duren maakt niet uit (dagzorg wisselt).
 */
export function gatenInZorg(diensten: Dienst[], datums: string[]): Waarschuwing[] {
  const uit: Waarschuwing[] = [];
  for (const datum of datums) {
    const opDag = diensten.filter((d) => d.datum === datum);
    if (!opDag.some((d) => d.type !== "nacht"))
      uit.push({ soort: "gat", datum, tekst: `${datumKort(datum)}: geen dagdienst`, dienstIds: [] });
    if (!opDag.some((d) => d.type === "nacht"))
      uit.push({ soort: "gat", datum, tekst: `${datumKort(datum)}: geen nachtdienst`, dienstIds: [] });
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
