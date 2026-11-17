import { dagenTussen, dagenVanMaand, eersteDag, plusDagen, weekdag } from "./datum";
import type { Dienst, DienstSjabloon, NieuweDienst } from "./types";

const tijd5 = (t: string) => t.slice(0, 5);

export function dienstSleutel(d: Pick<NieuweDienst, "zorgverlener_id" | "datum" | "start_tijd" | "eind_tijd">): string {
  return `${d.zorgverlener_id}|${d.datum}|${tijd5(d.start_tijd)}|${tijd5(d.eind_tijd)}`;
}

/** Alle diensten voor een maand volgens het weeksjabloon */
export function dienstenUitSjabloon(sjablonen: DienstSjabloon[], maand: string): NieuweDienst[] {
  const uit: NieuweDienst[] = [];
  for (const datum of dagenVanMaand(maand)) {
    const wd = weekdag(datum);
    for (const s of sjablonen.filter((s) => s.weekdag === wd).sort((a, b) => a.start_tijd.localeCompare(b.start_tijd))) {
      uit.push({
        zorgverlener_id: s.zorgverlener_id,
        datum,
        type: s.type,
        start_tijd: tijd5(s.start_tijd),
        eind_tijd: tijd5(s.eind_tijd),
      });
    }
  }
  return uit;
}

/** Kopieer de week vóór `doelMaandag` naar de week die op `doelMaandag` begint */
export function kopieerWeek(bron: Dienst[], doelMaandag: string): NieuweDienst[] {
  const bronStart = plusDagen(doelMaandag, -7);
  const bronEind = plusDagen(doelMaandag, -1);
  return bron
    .filter((d) => d.datum >= bronStart && d.datum <= bronEind)
    .map((d) => ({ ...naarNieuw(d), datum: plusDagen(d.datum, 7) }));
}

/**
 * Bron-datum voor een doeldatum bij "kopieer vorige maand": dezelfde weekdag
 * 4 weken eerder, of 5 weken als dat nog in dezelfde maand valt.
 * Zo blijft het weekpatroon (ma/di/...) behouden.
 */
export function bronDatumVorigeMaand(doel: string): string {
  const vier = plusDagen(doel, -28);
  return vier >= eersteDag(doel.slice(0, 7)) ? plusDagen(doel, -35) : vier;
}

export function kopieerMaand(bron: Dienst[], doelMaand: string): NieuweDienst[] {
  const perDatum = new Map<string, Dienst[]>();
  for (const d of bron) perDatum.set(d.datum, [...(perDatum.get(d.datum) ?? []), d]);
  const uit: NieuweDienst[] = [];
  for (const doel of dagenVanMaand(doelMaand)) {
    for (const d of perDatum.get(bronDatumVorigeMaand(doel)) ?? []) {
      uit.push({ ...naarNieuw(d), datum: doel });
    }
  }
  return uit;
}

export function bronPeriodeVorigeMaand(doelMaand: string): [string, string] {
  const dagen = dagenVanMaand(doelMaand).map(bronDatumVorigeMaand).sort();
  return [dagen[0], dagen[dagen.length - 1]];
}

function naarNieuw(d: Dienst): NieuweDienst {
  return {
    zorgverlener_id: d.zorgverlener_id,
    datum: d.datum,
    type: d.type,
    start_tijd: tijd5(d.start_tijd),
    eind_tijd: tijd5(d.eind_tijd),
    notitie: d.notitie,
  };
}

/** Markeer welke voorgestelde diensten al precies zo bestaan */
export function splitsBestaand(voorstel: NieuweDienst[], bestaand: Dienst[]) {
  const sleutels = new Set(bestaand.map(dienstSleutel));
  const nieuw: NieuweDienst[] = [];
  const alAanwezig: NieuweDienst[] = [];
  for (const v of voorstel) (sleutels.has(dienstSleutel(v)) ? alAanwezig : nieuw).push(v);
  return { nieuw, alAanwezig };
}

export function periodeDagen(start: string, eind: string): string[] {
  return dagenTussen(start, eind);
}
