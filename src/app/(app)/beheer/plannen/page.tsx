import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BevestigKnop, VerzendKnop } from "@/components/formulier";
import { tijdenTekst } from "@/components/kalender";
import { Kaart, KleurBolletje, KnopLink, knopKlassen, LegeStaat, Melding, PaginaTitel } from "@/components/ui";
import { haalZorgverleners } from "@/lib/data";
import { datumKort, isGeldigeDatum, isGeldigeMaand, maandNaam, maandVan, periodeTekst, plusDagen } from "@/lib/datum";
import { berekenPlan, type PlanSoort } from "@/lib/plan-server";
import { dienstSleutel } from "@/lib/plannen";
import { typeLabel } from "@/lib/types";
import { voerPlanUit } from "../actions";

export const metadata: Metadata = { title: "Plannen" };

export default async function PlannenPagina({ searchParams }: PageProps<"/beheer/plannen">) {
  const sp = await searchParams;
  const soort = (["sjabloon", "maand", "week"] as const).find((s) => s === sp.soort) as PlanSoort | undefined;
  const doel = typeof sp.doel === "string" ? sp.doel : "";
  if (!soort || (soort === "week" ? !isGeldigeDatum(doel) : !isGeldigeMaand(doel))) redirect("/beheer/rooster");

  const [plan, zorgverleners] = await Promise.all([berekenPlan(soort, doel), haalZorgverleners()]);
  const zvMap = new Map(zorgverleners.map((z) => [z.id, z]));
  const nieuwSleutels = new Set(plan.nieuw.map(dienstSleutel));
  const perDatum = new Map<string, typeof plan.voorstel>();
  for (const d of plan.voorstel) perDatum.set(d.datum, [...(perDatum.get(d.datum) ?? []), d]);

  const titel =
    soort === "sjabloon"
      ? `Vul ${maandNaam(doel)} vanuit het weeksjabloon`
      : soort === "maand"
        ? `Kopieer vorige maand naar ${maandNaam(doel)}`
        : `Kopieer vorige week naar ${periodeTekst(plan.van, plan.tot)}`;
  const uitleg =
    soort === "maand"
      ? "Elke dag krijgt de diensten van dezelfde weekdag 4 of 5 weken eerder, zodat het weekpatroon gelijk blijft."
      : soort === "week"
        ? `Bron: ${periodeTekst(plusDagen(plan.van, -7), plusDagen(plan.van, -1))}.`
        : "Op basis van het vaste weekpatroon.";

  return (
    <div className="flex flex-col gap-5">
      <KnopLink href={`/beheer/rooster?maand=${maandVan(plan.van)}`} className="self-start">
        ← Terug naar rooster
      </KnopLink>
      <PaginaTitel sub={uitleg}>{titel}</PaginaTitel>

      {soort === "week" && (
        <div className="flex flex-wrap gap-3">
          <Link href={`/beheer/plannen?soort=week&doel=${plusDagen(plan.van, -7)}`} className={knopKlassen("secundair")}>
            ← Week eerder
          </Link>
          <Link href={`/beheer/plannen?soort=week&doel=${plusDagen(plan.van, 7)}`} className={knopKlassen("secundair")}>
            Week later →
          </Link>
        </div>
      )}

      {plan.voorstel.length === 0 ? (
        <LegeStaat>
          Er is niets om te {soort === "sjabloon" ? "vullen" : "kopiëren"}.{" "}
          {soort === "sjabloon" && (
            <Link href="/beheer/sjabloon" className="font-semibold text-blue-800 underline">
              Stel eerst het weeksjabloon in.
            </Link>
          )}
        </LegeStaat>
      ) : (
        <>
          <Kaart titel="Wat gaat er gebeuren?">
            <ul className="mb-5 flex flex-col gap-1 text-lg">
              <li>
                <strong>{plan.nieuw.length}</strong> nieuwe diensten
              </li>
              <li>
                <strong>{plan.alAanwezig.length}</strong> diensten bestaan al precies zo (worden overgeslagen)
              </li>
              <li>
                <strong>{plan.bestaand.length}</strong> diensten staan nu al in deze periode
              </li>
            </ul>
            <div className="flex flex-col gap-4">
              <form action={voerPlanUit}>
                <input type="hidden" name="soort" value={soort} />
                <input type="hidden" name="doel" value={doel} />
                <input type="hidden" name="modus" value="toevoegen" />
                <VerzendKnop variant="succes">
                  {plan.nieuw.length} diensten toevoegen (bestaande blijven staan)
                </VerzendKnop>
              </form>
              {plan.bestaand.length > 0 && (
                <form action={voerPlanUit}>
                  <input type="hidden" name="soort" value={soort} />
                  <input type="hidden" name="doel" value={doel} />
                  <input type="hidden" name="modus" value="vervangen" />
                  <BevestigKnop
                    label={`Alles vervangen (${plan.bestaand.length} bestaande diensten eerst verwijderen)`}
                    bevestigLabel="Ja, vervang de hele periode"
                    vraag={`Alle ${plan.bestaand.length} diensten van ${periodeTekst(plan.van, plan.tot)} worden verwijderd en vervangen door ${plan.voorstel.length} diensten uit dit voorbeeld.`}
                  />
                </form>
              )}
            </div>
          </Kaart>

          <Kaart titel="Voorbeeld">
            {plan.nieuw.length === 0 && <Melding soort="info" className="mb-4">Alle diensten bestaan al.</Melding>}
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...perDatum.entries()].map(([datum, lijst]) => (
                <li key={datum} className="rounded-xl border-2 border-gray-200 p-3">
                  <p className="mb-1 font-bold">{datumKort(datum)}</p>
                  <ul className="flex flex-col gap-1">
                    {lijst.map((d, i) => {
                      const zv = zvMap.get(d.zorgverlener_id);
                      const isNieuw = nieuwSleutels.has(dienstSleutel(d));
                      return (
                        <li key={i} className={`flex items-center gap-2 ${isNieuw ? "" : "text-gray-500 line-through"}`}>
                          <KleurBolletje kleur={zv?.kleur ?? "#999"} />
                          {zv?.naam ?? "?"} · {typeLabel(d.type)} {tijdenTekst(d)}
                          {!isNieuw && <span className="sr-only">(bestaat al)</span>}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </Kaart>
        </>
      )}
    </div>
  );
}
