import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { alleControles, gatenInZorg, overlappendeDiensten } from "./controles";
import {
  aantalDagen,
  dagenVanMaand,
  kalenderWeken,
  laatsteDag,
  maandNaam,
  vandaag,
  verschuifMaand,
  weekdag,
} from "./datum";
import { maakWerkboek } from "./excel";
import { maakIcs } from "./ics";
import { parseDatum, parseImport, parseTijd } from "./importeren";
import { bronDatumVorigeMaand, dienstenUitSjabloon, kopieerMaand, kopieerWeek, splitsBestaand } from "./plannen";
import type { Dienst, ZorgverlenerPubliek } from "./types";
import { afrondenKwartier, dienstMinuten, duurMinuten, urenOverzicht } from "./uren";

let teller = 0;
function dienst(p: Partial<Dienst> & Pick<Dienst, "datum">): Dienst {
  return {
    id: `d${++teller}`,
    zorgverlener_id: "anna",
    type: "dag",
    start_tijd: "09:00:00",
    eind_tijd: "21:00:00",
    werkelijke_start: null,
    werkelijke_eind: null,
    vervanging_nodig: false,
    notitie: null,
    ...p,
  };
}
const zv: ZorgverlenerPubliek[] = [
  { id: "anna", naam: "Anna", kleur: "#be185d", actief: true },
  { id: "bram", naam: "Bram", kleur: "#047857", actief: true },
];
const namen = new Map(zv.map((z) => [z.id, z.naam]));

describe("datum", () => {
  it("weken beginnen op maandag", () => {
    expect(weekdag("2026-11-16")).toBe(1); // maandag
    expect(weekdag("2026-11-22")).toBe(7); // zondag
    const weken = kalenderWeken("2026-12");
    expect(weken[0][0]).toBe("2026-11-30");
    expect(weken.at(-1)!.at(-1)).toBe("2027-01-03");
    expect(weken.every((w) => w.length === 7)).toBe(true);
  });
  it("maanden en dagen", () => {
    expect(laatsteDag("2028-02")).toBe("2028-02-29");
    expect(dagenVanMaand("2026-02")).toHaveLength(28);
    expect(verschuifMaand("2026-12", 1)).toBe("2027-01");
    expect(verschuifMaand("2027-01", -1)).toBe("2026-12");
    expect(maandNaam("2026-12")).toBe("december 2026");
    expect(aantalDagen("2026-12-30", "2027-01-02")).toBe(4);
  });
  it("vandaag in Amsterdam", () => {
    // 23:30 UTC op 31 dec = 00:30 op 1 jan in Amsterdam
    expect(vandaag(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });
});

describe("uren", () => {
  it("nachtdienst 21:00–09:00 is 12 uur", () => {
    expect(duurMinuten("21:00", "09:00")).toBe(720);
    expect(dienstMinuten(dienst({ datum: "2026-10-24", type: "nacht", start_tijd: "21:00", eind_tijd: "09:00" }))).toBe(720);
  });
  it("afronden op kwartieren en werkelijke tijden", () => {
    expect(afrondenKwartier(52)).toBe(45);
    expect(afrondenKwartier(53)).toBe(60);
    const d = dienst({ datum: "2026-12-01", werkelijke_eind: "21:40" }); // 09:00–21:40 → 12:40 → 12:45
    expect(dienstMinuten(d)).toBe(765);
  });
  it("urenoverzicht per zorgverlener voor een maand met nachtdiensten", () => {
    const diensten = [
      dienst({ datum: "2026-12-01" }),
      dienst({ datum: "2026-12-01", zorgverlener_id: "bram", type: "nacht", start_tijd: "21:00", eind_tijd: "09:00" }),
      dienst({ datum: "2026-12-31", zorgverlener_id: "bram", type: "nacht", start_tijd: "21:00", eind_tijd: "09:00" }),
    ];
    const r = urenOverzicht(diensten, zv);
    expect(r.find((x) => x.zorgverlener.id === "anna")!.minuten).toBe(720);
    const bram = r.find((x) => x.zorgverlener.id === "bram")!;
    expect(bram.minuten).toBe(1440);
    expect(bram.perType.nacht).toBe(2);
  });
});

describe("controles", () => {
  it("vindt dubbele en overlappende diensten, ook over middernacht", () => {
    const w = overlappendeDiensten(
      [
        dienst({ datum: "2026-12-01" }),
        dienst({ datum: "2026-12-01" }),
        dienst({ datum: "2026-12-01", type: "nacht", start_tijd: "21:00", eind_tijd: "09:00" }),
        dienst({ datum: "2026-12-02", start_tijd: "08:00", eind_tijd: "12:00" }),
      ],
      namen,
    );
    expect(w).toHaveLength(2);
    expect(w[0].tekst).toContain("dubbele dienst");
    expect(w[1].tekst).toContain("overlappende");
  });
  it("aansluitende diensten overlappen niet", () => {
    expect(
      overlappendeDiensten(
        [
          dienst({ datum: "2026-12-01" }),
          dienst({ datum: "2026-12-01", type: "nacht", start_tijd: "21:00", eind_tijd: "09:00" }),
          dienst({ datum: "2026-12-02" }),
        ],
        namen,
      ),
    ).toHaveLength(0);
  });
  it("vindt dagen zonder dag- of nachtdienst", () => {
    const w = gatenInZorg(
      [
        dienst({ datum: "2026-12-01", start_tijd: "12:00", eind_tijd: "16:00" }),
        dienst({ datum: "2026-12-02", type: "nacht", start_tijd: "21:00", eind_tijd: "08:45" }),
      ],
      ["2026-12-01", "2026-12-02", "2026-12-03"],
    );
    expect(w.map((x) => x.tekst)).toEqual([
      "di 1 dec: geen nachtdienst",
      "wo 2 dec: geen dagdienst",
      "do 3 dec: geen dagdienst",
      "do 3 dec: geen nachtdienst",
    ]);
  });
  it("volledig gedekte maand geeft geen gaten; dienst tijdens verlof wel een waarschuwing", () => {
    const diensten = ["2026-11-30", ...dagenVanMaand("2026-12"), "2027-01-01"].flatMap((datum) => [
      dienst({ datum }),
      dienst({ datum, zorgverlener_id: "bram", type: "nacht", start_tijd: "21:00", eind_tijd: "09:00" }),
    ]);
    const w = alleControles({
      maand: "2026-12",
      diensten,
      verlof: [{ id: "v", zorgverlener_id: "bram", start_datum: "2026-12-24", eind_datum: "2026-12-25" }],
      zorgverleners: zv,
    });
    expect(w.filter((x) => x.soort === "gat")).toHaveLength(0);
    expect(w.filter((x) => x.soort === "verlof")).toHaveLength(2);
  });
});

describe("plannen", () => {
  it("vult een maand vanuit het weeksjabloon", () => {
    const sjablonen = [1, 2, 3, 4, 5, 6, 7].flatMap((weekdag) => [
      { id: `s${weekdag}`, weekdag, zorgverlener_id: "anna", type: "dag" as const, start_tijd: "09:00:00", eind_tijd: "21:00:00" },
      { id: `n${weekdag}`, weekdag, zorgverlener_id: weekdag <= 3 ? "bram" : "anna", type: "nacht" as const, start_tijd: "21:00:00", eind_tijd: "09:00:00" },
    ]);
    const d = dienstenUitSjabloon(sjablonen, "2026-12");
    expect(d).toHaveLength(62);
    expect(d[1]).toMatchObject({ datum: "2026-12-01", zorgverlener_id: "bram", type: "nacht", start_tijd: "21:00" }); // dinsdag
  });
  it("kopieert de vorige week en vorige maand met behoud van weekdag", () => {
    const bron = [dienst({ datum: "2026-11-23" }), dienst({ datum: "2026-11-29" }), dienst({ datum: "2026-11-30" })];
    expect(kopieerWeek(bron, "2026-11-30").map((d) => d.datum)).toEqual(["2026-11-30", "2026-12-06"]);

    expect(bronDatumVorigeMaand("2026-12-01")).toBe("2026-11-03");
    expect(bronDatumVorigeMaand("2026-12-31")).toBe("2026-11-26");
    for (const doel of dagenVanMaand("2027-03")) {
      expect(weekdag(bronDatumVorigeMaand(doel))).toBe(weekdag(doel));
      expect(bronDatumVorigeMaand(doel).slice(0, 7)).toBe("2027-02");
    }
    const k = kopieerMaand([dienst({ datum: "2026-11-03" })], "2026-12");
    expect(k.map((d) => d.datum)).toEqual(["2026-12-01"]);
  });
  it("herkent al bestaande diensten", () => {
    const { nieuw, alAanwezig } = splitsBestaand(
      [
        { zorgverlener_id: "anna", datum: "2026-12-01", type: "dag", start_tijd: "09:00", eind_tijd: "21:00" },
        { zorgverlener_id: "anna", datum: "2026-12-02", type: "dag", start_tijd: "09:00", eind_tijd: "21:00" },
      ],
      [dienst({ datum: "2026-12-01" })],
    );
    expect(nieuw).toHaveLength(1);
    expect(alAanwezig).toHaveLength(1);
  });
});

describe("import", () => {
  it("leest datums en tijden in verschillende vormen", () => {
    expect(parseDatum("2026-12-01")).toBe("2026-12-01");
    expect(parseDatum("1-12-2026")).toBe("2026-12-01");
    expect(parseDatum(46357)).toBe("2026-12-01");
    expect(parseTijd(0.875)).toBe("21:00");
    expect(parseTijd("9:00")).toBe("09:00");
    expect(parseTijd("21.30")).toBe("21:30");
  });
  it("zet rijen om en meldt fouten per rij", () => {
    const r = parseImport(
      [
        { Datum: "2026-12-01", Naam: "anna", Type: "Dag", Start: "09:00", Eind: "21:00" },
        { Datum: "2026-12-01", Naam: "Bram", Type: "nacht", Start: "", Eind: "" },
        { Datum: "31-02-2026", Naam: "Onbekend", Type: "x", Start: "9", Eind: "9" },
        { Datum: "", Naam: "", Type: "", Start: "", Eind: "" },
      ],
      zv,
    );
    expect(r.diensten).toHaveLength(2);
    expect(r.diensten[1]).toMatchObject({ zorgverlener_id: "bram", start_tijd: "21:00", eind_tijd: "09:00" });
    expect(r.fouten).toHaveLength(1);
    expect(r.fouten[0].rij).toBe(4);
  });
});

describe("export", () => {
  it("ics zet een nachtdienst op twee dagen", () => {
    const ics = maakIcs([dienst({ datum: "2026-12-31", type: "nacht", start_tijd: "21:00", eind_tijd: "09:00" })], namen);
    expect(ics).toContain("DTSTART;TZID=Europe/Amsterdam:20261231T210000");
    expect(ics).toContain("DTEND;TZID=Europe/Amsterdam:20270101T090000");
    expect(ics).toContain("SUMMARY:Nachtdienst Anna");
  });
  it("Excel-werkboek bevat rooster en uren met juiste nachturen", () => {
    const wb = maakWerkboek(
      "2026-12",
      [
        dienst({ datum: "2026-12-01", zorgverlener_id: "bram", type: "nacht", start_tijd: "21:00", eind_tijd: "09:00" }),
        dienst({ datum: "2026-12-02", zorgverlener_id: "bram", type: "nacht", start_tijd: "21:00", eind_tijd: "09:00" }),
      ],
      zv,
    );
    expect(wb.SheetNames).toEqual(["Rooster 2026-12", "Uren 2026-12"]);
    const uren = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Uren 2026-12"], { header: 1 });
    const bram = uren.find((r) => r[0] === "Bram")!;
    expect(bram[1]).toBe(2);
    expect(bram[6]).toBe(24);
    expect(bram[7]).toBe("24:00");
  });
});
