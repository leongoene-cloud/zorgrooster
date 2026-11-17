import { isGeldigeDatum, plusDagen } from "./datum";
import { DIENST_TYPES, type DienstType, type NieuweDienst, type ZorgverlenerPubliek } from "./types";
import { isGeldigeTijd, minutenNaarTijd } from "./uren";

export interface ImportFout {
  rij: number;
  melding: string;
}

export interface ImportResultaat {
  diensten: (NieuweDienst & { rij: number; naam: string })[];
  fouten: ImportFout[];
}

type Cel = string | number | boolean | Date | null | undefined;

/** Excel-serienummer (dagen sinds 1899-12-30) → YYYY-MM-DD */
function excelSerieNaarDatum(n: number): string {
  return plusDagen("1899-12-30", Math.floor(n));
}

export function parseDatum(c: Cel): string | null {
  if (c == null || c === "") return null;
  if (c instanceof Date) {
    if (isNaN(c.getTime())) return null;
    // SheetJS levert lokale middernacht; gebruik de lokale kalenderdatum
    const j = c.getFullYear();
    const m = String(c.getMonth() + 1).padStart(2, "0");
    const d = String(c.getDate()).padStart(2, "0");
    return `${j}-${m}-${d}`;
  }
  if (typeof c === "number") return c > 20000 && c < 80000 ? excelSerieNaarDatum(c) : null;
  const s = String(c).trim();
  if (isGeldigeDatum(s.slice(0, 10)) && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const nl = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (nl) {
    const iso = `${nl[3]}-${nl[2].padStart(2, "0")}-${nl[1].padStart(2, "0")}`;
    return isGeldigeDatum(iso) ? iso : null;
  }
  return null;
}

export function parseTijd(c: Cel): string | null {
  if (c == null || c === "") return null;
  if (c instanceof Date) {
    return `${String(c.getHours()).padStart(2, "0")}:${String(c.getMinutes()).padStart(2, "0")}`;
  }
  if (typeof c === "number") {
    if (c >= 0 && c < 1) return minutenNaarTijd(Math.round(c * 1440)); // Excel-tijd als dagfractie
    if (Number.isInteger(c) && c >= 0 && c <= 24) return minutenNaarTijd((c % 24) * 60);
    return null;
  }
  const s = String(c).trim().replace(".", ":").replace(/u$/i, "");
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?$/);
  if (!m) return null;
  const t = `${m[1].padStart(2, "0")}:${m[2] ?? "00"}`;
  if (t === "24:00") return "00:00";
  return isGeldigeTijd(t) ? t : null;
}

export function parseType(c: Cel, start: string | null): DienstType | null {
  const s = String(c ?? "").trim().toLowerCase();
  if (!s) {
    if (!start) return null;
    const uur = Number(start.slice(0, 2));
    return uur >= 20 || uur < 6 ? "nacht" : "dag";
  }
  if (s.startsWith("dag")) return "dag";
  if (s.startsWith("nacht")) return "nacht";
  if (s.startsWith("avond")) return "avond";
  if (s.startsWith("overig") || s === "anders") return "overig";
  return null;
}

const normaliseer = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/**
 * Zet rijen (objecten met kolomnamen) om naar diensten.
 * Verwachte kolommen: datum, naam, type, start, eind (hoofdletters maken niet uit).
 */
export function parseImport(rijen: Record<string, Cel>[], zorgverleners: ZorgverlenerPubliek[]): ImportResultaat {
  const perNaam = new Map(zorgverleners.map((z) => [normaliseer(z.naam), z]));
  const diensten: ImportResultaat["diensten"] = [];
  const fouten: ImportFout[] = [];

  rijen.forEach((ruw, i) => {
    const rij = i + 2; // kopregel is rij 1
    const r: Record<string, Cel> = {};
    for (const [k, v] of Object.entries(ruw)) r[normaliseer(k)] = v;
    if (Object.values(r).every((v) => v == null || String(v).trim() === "")) return;

    const meldingen: string[] = [];
    const datum = parseDatum(r["datum"]);
    if (!datum) meldingen.push("datum ontbreekt of is ongeldig");
    const naam = String(r["naam"] ?? "").trim();
    const zv = perNaam.get(normaliseer(naam));
    if (!naam) meldingen.push("naam ontbreekt");
    else if (!zv) meldingen.push(`zorgverlener "${naam}" bestaat niet`);
    let start = parseTijd(r["start"]);
    let eind = parseTijd(r["eind"]);
    const type = parseType(r["type"], start);
    if (!type) meldingen.push(`type "${r["type"]}" onbekend (dag, avond, nacht of overig)`);
    if (type && !start && !eind) {
      const std = DIENST_TYPES.find((d) => d.type === type)!;
      start = std.start;
      eind = std.eind;
    }
    if (!start) meldingen.push("starttijd ontbreekt of is ongeldig");
    if (!eind) meldingen.push("eindtijd ontbreekt of is ongeldig");
    if (start && eind && start === eind) meldingen.push("start- en eindtijd zijn gelijk");

    if (meldingen.length) {
      fouten.push({ rij, melding: meldingen.join("; ") });
      return;
    }
    diensten.push({
      rij,
      naam: zv!.naam,
      zorgverlener_id: zv!.id,
      datum: datum!,
      type: type!,
      start_tijd: start!,
      eind_tijd: eind!,
    });
  });
  return { diensten, fouten };
}
