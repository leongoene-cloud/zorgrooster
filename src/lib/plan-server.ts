import "server-only";
import { haalDiensten, haalSjablonen } from "./data";
import { eersteDag, laatsteDag, plusDagen, weekdag } from "./datum";
import { bronPeriodeVorigeMaand, dienstenUitSjabloon, kopieerMaand, kopieerWeek, splitsBestaand } from "./plannen";
import type { NieuweDienst } from "./types";

export type PlanSoort = "sjabloon" | "maand" | "week";

/** Doelperiode en voorgestelde diensten voor sjabloon vullen / vorige maand of week kopiëren */
export async function berekenPlan(soort: PlanSoort, doel: string) {
  let van: string;
  let tot: string;
  let voorstel: NieuweDienst[];
  if (soort === "week") {
    const maandag = plusDagen(doel, 1 - weekdag(doel));
    van = maandag;
    tot = plusDagen(maandag, 6);
    voorstel = kopieerWeek(await haalDiensten(plusDagen(maandag, -7), plusDagen(maandag, -1)), maandag);
  } else {
    van = eersteDag(doel);
    tot = laatsteDag(doel);
    if (soort === "sjabloon") {
      voorstel = dienstenUitSjabloon(await haalSjablonen(), doel);
    } else {
      const [bVan, bTot] = bronPeriodeVorigeMaand(doel);
      voorstel = kopieerMaand(await haalDiensten(bVan, bTot), doel);
    }
  }
  const bestaand = await haalDiensten(van, tot);
  return { van, tot, voorstel, bestaand, ...splitsBestaand(voorstel, bestaand) };
}
