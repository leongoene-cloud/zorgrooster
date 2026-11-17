import { plusDagen } from "./datum";
import type { Dienst } from "./types";
import { typeLabel } from "./types";
import { minuten } from "./uren";

const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Amsterdam",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function escape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function lokaal(datum: string, t: string): string {
  return `${datum.replace(/-/g, "")}T${t.slice(0, 2)}${t.slice(3, 5)}00`;
}

export function maakIcs(diensten: Dienst[], namen: Map<string, string>, nu: Date = new Date()): string {
  const stamp = nu.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const regels = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Zorgrooster//NL", "CALSCALE:GREGORIAN", ...VTIMEZONE];
  for (const d of diensten) {
    const eindDatum = minuten(d.eind_tijd) <= minuten(d.start_tijd) ? plusDagen(d.datum, 1) : d.datum;
    const naam = namen.get(d.zorgverlener_id) ?? "";
    regels.push(
      "BEGIN:VEVENT",
      `UID:${d.id}@zorgrooster`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Amsterdam:${lokaal(d.datum, d.start_tijd)}`,
      `DTEND;TZID=Europe/Amsterdam:${lokaal(eindDatum, d.eind_tijd)}`,
      `SUMMARY:${escape(`${typeLabel(d.type)}dienst ${naam}`.trim())}`,
      ...(d.notitie ? [`DESCRIPTION:${escape(d.notitie)}`] : []),
      "END:VEVENT",
    );
  }
  regels.push("END:VCALENDAR");
  return regels.join("\r\n") + "\r\n";
}
