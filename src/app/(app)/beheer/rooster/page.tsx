import type { Metadata } from "next";
import Link from "next/link";
import { MaandKalender } from "@/components/kalender";
import { MaandKiezer } from "@/components/maandkiezer";
import { cn, Kaart, KleurBolletje, knopKlassen, LegeStaat, Melding } from "@/components/ui";
import { tijdenTekst } from "@/components/kalender";
import { WaarschuwingLijst } from "@/components/waarschuwingen";
import { alleControles, openPlekken, type DienstDeel, type OpenPlek } from "@/lib/controles";
import { haalDiensten, haalGoedgekeurdVerlof, haalVakanties, haalZorgverleners } from "@/lib/data";
import { dagenVanMaand, datumLang, eersteDag, huidigeMaand, isGeldigeMaand, kalenderWeken, maandagVan, maandNaam, plusDagen, vandaag } from "@/lib/datum";
import { typeLabel, type ZorgverlenerPubliek } from "@/lib/types";

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

  // Filter op open plekken: vanaf vandaag (een maand die helemaal voorbij is: alle dagen)
  const open: DienstDeel | undefined = sp.open === "dag" || sp.open === "nacht" ? sp.open : undefined;
  const nu = vandaag();
  const alleDagen = dagenVanMaand(maand);
  const relevanteDagen = alleDagen.at(-1)! < nu ? alleDagen : alleDagen.filter((d) => d >= nu);
  const openDag = openPlekken(diensten, relevanteDagen, "dag");
  const openNacht = openPlekken(diensten, relevanteDagen, "nacht");
  const filterLink = (o?: DienstDeel) => `/beheer/rooster?${new URLSearchParams({ maand, ...(o ? { open: o } : {}) })}`;
  const chip = (actief: boolean) =>
    cn(
      "inline-flex min-h-16 items-center gap-2 rounded-xl border-2 px-5 text-lg font-semibold",
      actief ? "border-blue-700 bg-blue-700 text-white" : "border-gray-300 bg-oppervlak hover:bg-gray-100",
    );

  return (
    <div className="flex flex-col gap-5">
      {melding && (
        <Melding soort={melding[1]}>
          {melding[0]}
          {sp.melding === "gepland" && typeof sp.aantal === "string" && ` (${sp.aantal} diensten)`}
        </Melding>
      )}
      <MaandKiezer maand={maand} pad="/beheer/rooster" params={{ open }} />

      <nav aria-label="Filter" className="flex flex-wrap gap-3">
        <Link href={filterLink()} className={chip(!open)} aria-current={!open ? "true" : undefined}>
          Alle diensten
        </Link>
        <Link href={filterLink("dag")} className={chip(open === "dag")} aria-current={open === "dag" ? "true" : undefined}>
          Open dagdiensten ({openDag.length})
        </Link>
        <Link href={filterLink("nacht")} className={chip(open === "nacht")} aria-current={open === "nacht" ? "true" : undefined}>
          Open nachtdiensten ({openNacht.length})
        </Link>
      </nav>

      {open ? (
        <OpenLijst
          plekken={open === "dag" ? openDag : openNacht}
          deel={open}
          zorgverleners={zorgverleners}
          terug={`${filterLink(open)}&melding=opgeslagen`}
          vanafVandaag={relevanteDagen.length !== alleDagen.length}
        />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

function OpenLijst({
  plekken,
  deel,
  zorgverleners,
  terug,
  vanafVandaag,
}: {
  plekken: OpenPlek[];
  deel: DienstDeel;
  zorgverleners: ZorgverlenerPubliek[];
  terug: string;
  vanafVandaag: boolean;
}) {
  const naam = deel === "dag" ? "dagdienst" : "nachtdienst";
  const zvMap = new Map(zorgverleners.map((z) => [z.id, z]));
  return (
    <Kaart titel={`Open ${naam}en${vanafVandaag ? " (vanaf vandaag)" : ""}`}>
      {plekken.length === 0 ? (
        <LegeStaat>Geen open {naam}en in deze maand. 🎉</LegeStaat>
      ) : (
        <ul className="flex flex-col gap-3">
          {plekken.map((o) => (
            <li
              key={o.datum}
              className="flex flex-col gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <span className="text-lg font-bold first-letter:uppercase">{datumLang(o.datum)}</span>
                {o.reden === "leeg" ? (
                  <span>Geen {naam} ingepland</span>
                ) : (
                  o.diensten.map((d) => (
                    <span key={d.id} className="flex flex-wrap items-center gap-2">
                      <KleurBolletje kleur={zvMap.get(d.zorgverlener_id)?.kleur ?? "#888888"} />
                      {zvMap.get(d.zorgverlener_id)?.naam} · {typeLabel(d.type)} {tijdenTekst(d)}
                      <span className="rounded-md bg-red-700 px-2 py-0.5 text-xs font-bold text-white">Vervanging nodig</span>
                    </span>
                  ))
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {o.reden === "leeg" ? (
                  <Link
                    href={`/beheer/diensten/nieuw?${new URLSearchParams({ datum: o.datum, type: deel, terug })}`}
                    className={knopKlassen("succes", true)}
                  >
                    + {deel === "dag" ? "Dagdienst" : "Nachtdienst"} invullen
                  </Link>
                ) : (
                  o.diensten.map((d) => (
                    <Link
                      key={d.id}
                      href={`/beheer/vervanging/${d.id}?${new URLSearchParams({ terug: terug.replace(/&melding=opgeslagen$/, "") })}`}
                      className={knopKlassen("primair", true)}
                    >
                      Wijs andere zorgverlener toe
                    </Link>
                  ))
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Kaart>
  );
}
