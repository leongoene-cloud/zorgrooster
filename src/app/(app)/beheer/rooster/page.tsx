import type { Metadata } from "next";
import Link from "next/link";
import { MaandKalender } from "@/components/kalender";
import { MaandKiezer } from "@/components/maandkiezer";
import { Kaart, knopKlassen, Melding } from "@/components/ui";
import { WaarschuwingLijst } from "@/components/waarschuwingen";
import { alleControles } from "@/lib/controles";
import { haalDiensten, haalGoedgekeurdVerlof, haalVakanties, haalZorgverleners } from "@/lib/data";
import { eersteDag, huidigeMaand, isGeldigeMaand, kalenderWeken, maandagVan, maandNaam, plusDagen, vandaag } from "@/lib/datum";

export const metadata: Metadata = { title: "Rooster bewerken" };

const MELDINGEN: Record<string, [string, "succes" | "fout"]> = {
  opgeslagen: ["De dienst is opgeslagen.", "succes"],
  verwijderd: ["De dienst is verwijderd.", "succes"],
  gepland: ["De diensten zijn aangemaakt.", "succes"],
  fout: ["Er ging iets mis bij het opslaan. Probeer het opnieuw.", "fout"],
};

export default async function BeheerRoosterPagina({ searchParams }: PageProps<"/beheer/rooster">) {
  const sp = await searchParams;
  const maand = isGeldigeMaand(sp.maand) ? sp.maand : huidigeMaand();
  const weken = kalenderWeken(maand);
  const van = plusDagen(weken[0][0], -1);
  const tot = plusDagen(weken.at(-1)!.at(-1)!, 1);
  const [diensten, verlof, vakanties, zorgverleners] = await Promise.all([
    haalDiensten(van, tot),
    haalGoedgekeurdVerlof(van, tot),
    haalVakanties(van, tot),
    haalZorgverleners(),
  ]);
  const controles = alleControles({ maand, diensten, verlof, zorgverleners });
  const melding = typeof sp.melding === "string" ? MELDINGEN[sp.melding] : undefined;
  const huidigeWeek = maandagVan(maand === huidigeMaand() ? vandaag() : eersteDag(maand));

  return (
    <div className="flex flex-col gap-5">
      {melding && (
        <Melding soort={melding[1]}>
          {melding[0]}
          {sp.melding === "gepland" && typeof sp.aantal === "string" && ` (${sp.aantal} diensten)`}
        </Melding>
      )}
      <MaandKiezer maand={maand} pad="/beheer/rooster" />

      <Kaart titel="Snel plannen">
        <div className="flex flex-wrap gap-4">
          <Link href={`/beheer/plannen?soort=sjabloon&doel=${maand}`} className={knopKlassen("primair", true)}>
            Vul {maandNaam(maand)} vanuit sjabloon
          </Link>
          <Link href={`/beheer/plannen?soort=maand&doel=${maand}`} className={knopKlassen("secundair", true)}>
            Kopieer vorige maand
          </Link>
          <Link href={`/beheer/plannen?soort=week&doel=${huidigeWeek}`} className={knopKlassen("secundair", true)}>
            Kopieer vorige week
          </Link>
          <Link href={`/beheer/diensten/nieuw?datum=${maand === huidigeMaand() ? vandaag() : eersteDag(maand)}`} className={knopKlassen("succes", true)}>
            + Nieuwe dienst
          </Link>
        </div>
        <p className="mt-3 text-gray-700">Je ziet altijd eerst een voorbeeld voordat er iets wordt opgeslagen.</p>
      </Kaart>

      <Kaart titel={`Controles (${controles.length})`}>
        <WaarschuwingLijst lijst={controles} />
      </Kaart>

      <p className="text-lg text-gray-800">Klik op een dienst om die te wijzigen, of op “+ Dienst” om er een toe te voegen op die dag.</p>
      <MaandKalender
        maand={maand}
        diensten={diensten}
        zorgverleners={zorgverleners}
        verlof={verlof}
        vakanties={vakanties}
        vandaag={vandaag()}
        beheer
        waarschuwingDagen={new Set(controles.map((c) => c.datum))}
      />
    </div>
  );
}
