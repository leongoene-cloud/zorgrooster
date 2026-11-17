import * as XLSX from "xlsx";
import { datumLang, tijd } from "./datum";
import type { Dienst, ZorgverlenerPubliek } from "./types";
import { typeLabel } from "./types";
import { dienstMinuten, urenDecimaal, urenOverzicht, urenTekst } from "./uren";

/** Werkboek met twee tabbladen: het maandrooster en het urenoverzicht */
export function maakWerkboek(maand: string, diensten: Dienst[], zorgverleners: ZorgverlenerPubliek[]): XLSX.WorkBook {
  const namen = new Map(zorgverleners.map((z) => [z.id, z.naam]));
  const gesorteerd = [...diensten].sort((a, b) => (a.datum + a.start_tijd).localeCompare(b.datum + b.start_tijd));

  const rooster = [
    ["Datum", "Dag", "Naam", "Type", "Start", "Eind", "Werkelijk start", "Werkelijk eind", "Uren", "Notitie"],
    ...gesorteerd.map((d) => [
      d.datum,
      datumLang(d.datum).split(" ")[0],
      namen.get(d.zorgverlener_id) ?? "",
      typeLabel(d.type),
      tijd(d.start_tijd),
      tijd(d.eind_tijd),
      tijd(d.werkelijke_start),
      tijd(d.werkelijke_eind),
      urenDecimaal(dienstMinuten(d)),
      d.notitie ?? "",
    ]),
  ];

  const regels = urenOverzicht(gesorteerd, zorgverleners);
  const totaal = regels.reduce((s, r) => s + r.minuten, 0);
  const uren = [
    ["Maand", maand],
    [],
    ["Naam", "Diensten", "Dag", "Avond", "Nacht", "Overig", "Uren (decimaal)", "Uren (u:mm)"],
    ...regels.map((r) => [
      r.zorgverlener.naam,
      r.aantal,
      r.perType.dag,
      r.perType.avond,
      r.perType.nacht,
      r.perType.overig,
      urenDecimaal(r.minuten),
      urenTekst(r.minuten),
    ]),
    ["Totaal", regels.reduce((s, r) => s + r.aantal, 0), "", "", "", "", urenDecimaal(totaal), urenTekst(totaal)],
    [],
    ["Uren per dienst zijn afgerond op kwartieren. Een nachtdienst 21:00–09:00 telt als 12 uur."],
    ["Diensten tellen mee in de maand waarin ze beginnen."],
  ];

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet(rooster);
  ws1["!cols"] = [12, 11, 20, 9, 7, 7, 14, 14, 7, 30].map((wch) => ({ wch }));
  const ws2 = XLSX.utils.aoa_to_sheet(uren);
  ws2["!cols"] = [22, 9, 6, 6, 6, 7, 15, 12].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, ws1, `Rooster ${maand}`);
  XLSX.utils.book_append_sheet(wb, ws2, `Uren ${maand}`);
  return wb;
}
