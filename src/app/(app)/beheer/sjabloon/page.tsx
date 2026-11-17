import type { Metadata } from "next";
import Link from "next/link";
import { BevestigKnop } from "@/components/formulier";
import { tijdenTekst } from "@/components/kalender";
import { Kaart, KleurBolletje, knopKlassen, Melding, PaginaTitel } from "@/components/ui";
import { haalSjablonen, haalZorgverleners } from "@/lib/data";
import { huidigeMaand, maandNaam, verschuifMaand, WEEKDAG_NAMEN } from "@/lib/datum";
import { typeLabel } from "@/lib/types";
import { verwijderSjabloon, voegSjabloonToe } from "../actions";
import { SjabloonFormulier } from "./sjabloon-formulier";

export const metadata: Metadata = { title: "Weeksjabloon" };

export default async function SjabloonPagina({ searchParams }: PageProps<"/beheer/sjabloon">) {
  const sp = await searchParams;
  const [sjablonen, zorgverleners] = await Promise.all([haalSjablonen(), haalZorgverleners()]);
  const zvMap = new Map(zorgverleners.map((z) => [z.id, z]));
  const deze = huidigeMaand();
  const volgende = verschuifMaand(deze, 1);

  return (
    <div className="flex flex-col gap-6">
      {sp.melding === "toegevoegd" && <Melding soort="succes">Toegevoegd aan het sjabloon.</Melding>}
      {sp.melding === "verwijderd" && <Melding soort="succes">Verwijderd uit het sjabloon.</Melding>}
      <PaginaTitel sub="Het vaste weekpatroon. Hiermee vul je in één keer een hele maand; daarna pas je alleen de uitzonderingen aan.">
        Weeksjabloon
      </PaginaTitel>

      <Kaart titel="Maand vullen vanuit sjabloon">
        <div className="flex flex-wrap gap-4">
          <Link href={`/beheer/plannen?soort=sjabloon&doel=${deze}`} className={knopKlassen("primair", true)}>
            Vul {maandNaam(deze)}
          </Link>
          <Link href={`/beheer/plannen?soort=sjabloon&doel=${volgende}`} className={knopKlassen("primair", true)}>
            Vul {maandNaam(volgende)}
          </Link>
        </div>
        <p className="mt-3 text-gray-700">Je krijgt eerst een voorbeeld te zien.</p>
      </Kaart>

      <Kaart titel="Huidig patroon">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {WEEKDAG_NAMEN.map((naam, i) => {
            const items = sjablonen.filter((s) => s.weekdag === i + 1);
            return (
              <section key={naam} className="rounded-xl border-2 border-gray-200 p-3">
                <h3 className="mb-2 text-lg font-bold capitalize">{naam}</h3>
                {items.length === 0 && <p className="text-amber-900">Nog niets ingesteld</p>}
                <ul className="flex flex-col gap-3">
                  {items.map((s) => {
                    const zv = zvMap.get(s.zorgverlener_id);
                    return (
                      <li key={s.id} className="flex flex-col gap-2 rounded-lg bg-gray-50 p-2">
                        <span className="flex items-center gap-2 font-semibold">
                          <KleurBolletje kleur={zv?.kleur ?? "#999"} /> {zv?.naam}
                        </span>
                        <span>
                          {typeLabel(s.type)} {tijdenTekst(s)}
                        </span>
                        <form action={verwijderSjabloon}>
                          <input type="hidden" name="id" value={s.id} />
                          <BevestigKnop label="Verwijderen" bevestigLabel="Ja, verwijderen" />
                        </form>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </Kaart>

      <Kaart titel="Dienst aan het sjabloon toevoegen">
        <SjabloonFormulier actie={voegSjabloonToe} zorgverleners={zorgverleners} />
      </Kaart>
    </div>
  );
}
