import type { Dienst, DienstType, ZorgverlenerPubliek } from "./types";

/** 'HH:MM' of 'HH:MM:SS' → minuten sinds middernacht */
export function minuten(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutenNaarTijd(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function isGeldigeTijd(t: unknown): t is string {
  return typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(t);
}

/**
 * Duur in minuten. Is de eindtijd gelijk aan of eerder dan de starttijd,
 * dan loopt de dienst door tot de volgende dag (21:00–09:00 = 12 uur).
 * Gerekend op de klok (wandtijd): ook in de nacht van de zomer-/wintertijdwissel telt
 * een nachtdienst 21:00–09:00 als 12 uur.
 */
export function duurMinuten(start: string, eind: string): number {
  const d = minuten(eind) - minuten(start);
  return d <= 0 ? d + 1440 : d;
}

export function afrondenKwartier(min: number): number {
  return Math.round(min / 15) * 15;
}

export function heeftAfwijking(d: Pick<Dienst, "werkelijke_start" | "werkelijke_eind">): boolean {
  return Boolean(d.werkelijke_start || d.werkelijke_eind);
}

/** Te declareren minuten van één dienst: werkelijke tijden indien ingevuld, afgerond op kwartieren */
export function dienstMinuten(d: Pick<Dienst, "start_tijd" | "eind_tijd" | "werkelijke_start" | "werkelijke_eind">): number {
  const start = d.werkelijke_start ?? d.start_tijd;
  const eind = d.werkelijke_eind ?? d.eind_tijd;
  return afrondenKwartier(duurMinuten(start, eind));
}

/** 750 → "12:30" */
export function urenTekst(min: number): string {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
}

/** 750 → 12.5 (voor Excel) */
export function urenDecimaal(min: number): number {
  return Math.round((min / 60) * 100) / 100;
}

/** 750 → "12,5 uur" */
export function urenKort(min: number): string {
  const u = urenDecimaal(min);
  return `${u.toLocaleString("nl-NL", { maximumFractionDigits: 2 })} uur`;
}

export interface UrenRegel {
  zorgverlener: ZorgverlenerPubliek;
  aantal: number;
  perType: Record<DienstType, number>;
  minuten: number;
  afwijkingen: number;
}

/** Urenoverzicht per zorgverlener. Een dienst telt mee in de maand van zijn startdatum. */
export function urenOverzicht(diensten: Dienst[], zorgverleners: ZorgverlenerPubliek[]): UrenRegel[] {
  const regels = new Map<string, UrenRegel>();
  for (const zv of zorgverleners) {
    regels.set(zv.id, {
      zorgverlener: zv,
      aantal: 0,
      perType: { dag: 0, avond: 0, nacht: 0, overig: 0 },
      minuten: 0,
      afwijkingen: 0,
    });
  }
  for (const d of diensten) {
    const r = regels.get(d.zorgverlener_id);
    if (!r) continue;
    r.aantal++;
    r.perType[d.type]++;
    r.minuten += dienstMinuten(d);
    if (heeftAfwijking(d)) r.afwijkingen++;
  }
  return [...regels.values()].filter((r) => r.aantal > 0 || r.zorgverlener.actief);
}
