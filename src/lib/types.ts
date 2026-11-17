export type DienstType = "dag" | "avond" | "nacht" | "overig";
export type VerlofStatus = "aangevraagd" | "goedgekeurd" | "afgekeurd" | "geannuleerd";
export type Rol = "admin" | "zorgverlener";

export interface ZorgverlenerPubliek {
  id: string;
  naam: string;
  kleur: string;
  actief: boolean;
}

export interface Zorgverlener extends ZorgverlenerPubliek {
  email: string | null;
  rol: Rol;
  user_id: string | null;
  toegang_aangemaakt: string | null;
}

export interface Dienst {
  id: string;
  zorgverlener_id: string;
  datum: string; // YYYY-MM-DD (startdatum)
  type: DienstType;
  start_tijd: string; // HH:MM[:SS]
  eind_tijd: string; // eind <= start betekent volgende dag
  werkelijke_start: string | null;
  werkelijke_eind: string | null;
  vervanging_nodig: boolean;
  notitie: string | null;
}

export type NieuweDienst = Pick<Dienst, "zorgverlener_id" | "datum" | "type" | "start_tijd" | "eind_tijd"> & {
  notitie?: string | null;
};

export interface VerlofAanvraag {
  id: string;
  zorgverlener_id: string;
  start_datum: string;
  eind_datum: string;
  reden: string | null;
  status: VerlofStatus;
  opmerking_admin: string | null;
  aangevraagd_op: string;
  beoordeeld_op: string | null;
}

export interface VerlofPeriode {
  id: string;
  zorgverlener_id: string;
  start_datum: string;
  eind_datum: string;
}

export interface Schoolvakantie {
  id: string;
  naam: string;
  start_datum: string;
  eind_datum: string;
  regio: string;
  bron: string | null;
  opmerking: string | null;
}

export interface DienstSjabloon {
  id: string;
  weekdag: number; // 1 = maandag ... 7 = zondag
  zorgverlener_id: string;
  type: DienstType;
  start_tijd: string;
  eind_tijd: string;
}

export const DIENST_TYPES: { type: DienstType; label: string; start: string; eind: string }[] = [
  { type: "dag", label: "Dag", start: "09:00", eind: "21:00" },
  { type: "nacht", label: "Nacht", start: "21:00", eind: "09:00" },
  { type: "avond", label: "Avond", start: "17:00", eind: "21:00" },
  { type: "overig", label: "Overig", start: "09:00", eind: "13:00" },
];

export function typeLabel(t: DienstType): string {
  return DIENST_TYPES.find((d) => d.type === t)?.label ?? t;
}

export const STATUS_LABEL: Record<VerlofStatus, string> = {
  aangevraagd: "Aangevraagd",
  goedgekeurd: "Goedgekeurd",
  afgekeurd: "Afgekeurd",
  geannuleerd: "Geannuleerd",
};
