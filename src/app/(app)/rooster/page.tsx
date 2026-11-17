import type { Metadata } from "next";
import Link from "next/link";
import { MaandKalender } from "@/components/kalender";
import { MaandKiezer } from "@/components/maandkiezer";
import { cn, KleurBolletje, knopKlassen, LegeStaat } from "@/components/ui";
import { vereisLid } from "@/lib/auth";
import { haalDiensten, haalGoedgekeurdVerlof, haalVakanties, haalZorgverleners } from "@/lib/data";
import { huidigeMaand, isGeldigeMaand, kalenderWeken, vandaag } from "@/lib/datum";
import { dienstMinuten, urenKort } from "@/lib/uren";

export const metadata: Metadata = { title: "Rooster" };

export default async function RoosterPagina({ searchParams }: PageProps<"/rooster">) {
  const sessie = await vereisLid();
  const sp = await searchParams;
  const maand = isGeldigeMaand(sp.maand) ? sp.maand : huidigeMaand();
  const zorgverleners = await haalZorgverleners();
  const zvFilter = typeof sp.zv === "string" && zorgverleners.some((z) => z.id === sp.zv) ? sp.zv : undefined;

  const weken = kalenderWeken(maand);
  const van = weken[0][0];
  const tot = weken.at(-1)!.at(-1)!;
  const [alleDiensten, verlof, vakanties] = await Promise.all([
    haalDiensten(van, tot, zvFilter),
    haalGoedgekeurdVerlof(van, tot),
    haalVakanties(van, tot),
  ]);
  const zichtbaarVerlof = zvFilter ? verlof.filter((v) => v.zorgverlener_id === zvFilter) : verlof;
  const inMaand = alleDiensten.filter((d) => d.datum.startsWith(maand));
  const totaalMinuten = inMaand.reduce((s, d) => s + dienstMinuten(d), 0);
  const gekozen = zorgverleners.find((z) => z.id === zvFilter);
  const mijnId = sessie.zorgverlener.id;
  const ikHebDiensten = zorgverleners.some((z) => z.id === mijnId);

  const filterLink = (zv?: string) => `/rooster?${new URLSearchParams({ maand, ...(zv ? { zv } : {}) })}`;
  const chip = (actief: boolean) =>
    cn(
      "inline-flex min-h-14 items-center gap-2 rounded-full border-2 px-5 text-lg font-semibold",
      actief ? "border-blue-700 bg-blue-700 text-white" : "border-gray-300 bg-oppervlak text-gray-900 hover:bg-gray-100",
    );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <MaandKiezer maand={maand} pad="/rooster" params={{ zv: zvFilter }} />
        {ikHebDiensten && (
          <Link href={filterLink(mijnId)} className={knopKlassen(zvFilter === mijnId ? "primair" : "succes", false, "self-start")}>
            Mijn diensten
          </Link>
        )}
      </div>

      <nav aria-label="Filter op zorgverlener" className="flex flex-wrap gap-2">
        <Link href={filterLink()} className={chip(!zvFilter)} aria-current={!zvFilter ? "true" : undefined}>
          Iedereen
        </Link>
        {zorgverleners
          .filter((z) => z.actief || z.id === zvFilter)
          .map((z) => (
            <Link key={z.id} href={filterLink(z.id)} className={chip(z.id === zvFilter)} aria-current={z.id === zvFilter ? "true" : undefined}>
              <KleurBolletje kleur={z.kleur} groot />
              {z.naam}
            </Link>
          ))}
      </nav>

      {gekozen && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border-2 border-blue-200 bg-blue-50 px-4 py-3 text-lg">
          <span className="font-bold">{gekozen.naam}</span>
          <span>
            <strong>{inMaand.length}</strong> {inMaand.length === 1 ? "dienst" : "diensten"}
          </span>
          <span>
            <strong>{urenKort(totaalMinuten)}</strong> deze maand
          </span>
          <a href={`/rooster/ics?${new URLSearchParams({ maand, zv: gekozen.id })}`} className={knopKlassen("secundair", false, "ml-auto")}>
            Zet in agenda (.ics)
          </a>
        </div>
      )}

      {zvFilter && inMaand.length === 0 && zichtbaarVerlof.length === 0 ? (
        <LegeStaat>Geen diensten in deze maand.</LegeStaat>
      ) : (
        <MaandKalender
          maand={maand}
          diensten={alleDiensten}
          zorgverleners={zorgverleners}
          verlof={zichtbaarVerlof}
          vakanties={vakanties}
          vandaag={vandaag()}
          gefilterd={Boolean(zvFilter)}
        />
      )}

      <p className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
        <span className="inline-flex items-center gap-2">
          <span className="vakantie-achtergrond inline-block h-5 w-8 rounded border border-amber-300" /> Schoolvakantie (regio Midden)
        </span>
        <span>(+1) = eindigt de volgende dag</span>
      </p>
    </div>
  );
}
