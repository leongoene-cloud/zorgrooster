import type { Metadata } from "next";
import Link from "next/link";
import { VerzendKnop } from "@/components/formulier";
import { tijdenTekst } from "@/components/kalender";
import { cn, Kaart, KleurBolletje, knopKlassen, LegeStaat, Melding, StatusBadge, invoerKlassen } from "@/components/ui";
import { vereisLid } from "@/lib/auth";
import { haalDiensten, haalVakanties, haalVerlofAanvragen, haalZorgverleners } from "@/lib/data";
import { aantalDagen, periodeTekst, plusDagen, plusMaanden, tijdstipTekst, vandaag as vandaagFn } from "@/lib/datum";
import { STATUS_LABEL, typeLabel, type VerlofAanvraag, type VerlofStatus } from "@/lib/types";
import { annuleerVerlof, beoordeelVerlof, vraagVerlofAan } from "./actions";
import { VerlofFormulier } from "./verlof-formulier";

export const metadata: Metadata = { title: "Verlof" };

const MELDINGEN: Record<string, string> = {
  aangevraagd: "Je verlofaanvraag is verstuurd. De status is nu “Aangevraagd”.",
  geannuleerd: "De aanvraag is geannuleerd.",
  afgekeurd: "De aanvraag is afgekeurd.",
};
const FOUTEN: Record<string, string> = {
  annuleren: "Annuleren lukte niet. Misschien is de aanvraag al beoordeeld.",
  besluit: "Het besluit kon niet worden opgeslagen.",
};

export default async function VerlofPagina({ searchParams }: PageProps<"/verlof">) {
  const sessie = await vereisLid();
  const sp = await searchParams;
  const vandaag = vandaagFn();
  const overTwaalfMaanden = plusMaanden(vandaag, 12);

  const [zorgverleners, eigen, vakanties, mijnDiensten] = await Promise.all([
    haalZorgverleners(),
    haalVerlofAanvragen({ zorgverlenerId: sessie.zorgverlener.id }),
    haalVakanties(vandaag, overTwaalfMaanden),
    haalDiensten(vandaag, plusDagen(vandaag, 400), sessie.zorgverlener.id),
  ]);
  const zvMap = new Map(zorgverleners.map((z) => [z.id, z]));

  return (
    <div className="flex flex-col gap-6">
      {typeof sp.melding === "string" && MELDINGEN[sp.melding] && <Melding soort="succes">{MELDINGEN[sp.melding]}</Melding>}
      {typeof sp.fout === "string" && FOUTEN[sp.fout] && <Melding soort="fout">{FOUTEN[sp.fout]}</Melding>}

      {sessie.isAdmin && <Beoordelen zvMap={zvMap} sp={sp} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <Kaart titel="Verlof aanvragen">
          <VerlofFormulier
            actie={vraagVerlofAan}
            vandaag={vandaag}
            mijnDiensten={mijnDiensten.map((d) => ({ datum: d.datum, tekst: `${typeLabel(d.type)} ${tijdenTekst(d)}` }))}
            vakanties={vakanties.map((v) => ({ naam: v.naam, start_datum: v.start_datum, eind_datum: v.eind_datum }))}
          />
        </Kaart>

        <Kaart titel="Mijn aanvragen">
          {eigen.length === 0 ? (
            <LegeStaat>Je hebt nog geen verlof aangevraagd.</LegeStaat>
          ) : (
            <ul className="flex flex-col gap-3">
              {eigen.map((a) => (
                <li key={a.id} className="flex flex-col gap-2 rounded-xl border-2 border-gray-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-lg font-bold">{periodeTekst(a.start_datum, a.eind_datum)}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <span className="text-gray-700">
                    {aantalDagen(a.start_datum, a.eind_datum)} dagen · aangevraagd {tijdstipTekst(a.aangevraagd_op)}
                  </span>
                  {a.reden && <span>Reden: {a.reden}</span>}
                  {a.opmerking_admin && <span className="font-semibold">Opmerking beheerder: {a.opmerking_admin}</span>}
                  {a.status === "aangevraagd" && (
                    <form action={annuleerVerlof}>
                      <input type="hidden" name="id" value={a.id} />
                      <VerzendKnop variant="secundair" groot={false}>
                        Aanvraag annuleren
                      </VerzendKnop>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Kaart>
      </div>

      <Kaart
        titel="Schoolvakanties regio Midden (komende 12 maanden)"
        actie={
          sessie.isAdmin && (
            <Link href="/beheer/vakanties" className={knopKlassen("secundair")}>
              Vakanties beheren
            </Link>
          )
        }
      >
        {vakanties.length === 0 ? (
          <LegeStaat>Geen schoolvakanties bekend voor de komende 12 maanden.</LegeStaat>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vakanties.map((v) => (
              <li key={v.id} className="vakantie-achtergrond rounded-xl border-2 border-amber-300 p-3">
                <p className="text-lg font-bold">{v.naam}</p>
                <p>{periodeTekst(v.start_datum, v.eind_datum)}</p>
                {v.opmerking && <p className="mt-1 text-sm font-semibold">Let op: {v.opmerking}</p>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-gray-700">Bron: rijksoverheid.nl. Voorjaars- en herfstvakantie zijn adviesdata; scholen kunnen afwijken.</p>
      </Kaart>
    </div>
  );
}

async function Beoordelen({
  zvMap,
  sp,
}: {
  zvMap: Map<string, { id: string; naam: string; kleur: string; actief: boolean }>;
  sp: Record<string, string | string[] | undefined>;
}) {
  const alle = await haalVerlofAanvragen();
  const open = alle.filter((a) => a.status === "aangevraagd").sort((a, b) => a.start_datum.localeCompare(b.start_datum));
  let dienstenPerAanvraag = new Map<string, number>();
  if (open.length) {
    const van = open.reduce((m, a) => (a.start_datum < m ? a.start_datum : m), open[0].start_datum);
    const tot = open.reduce((m, a) => (a.eind_datum > m ? a.eind_datum : m), open[0].eind_datum);
    const diensten = await haalDiensten(van, tot);
    dienstenPerAanvraag = new Map(
      open.map((a) => [
        a.id,
        diensten.filter((d) => d.zorgverlener_id === a.zorgverlener_id && d.datum >= a.start_datum && d.datum <= a.eind_datum).length,
      ]),
    );
  }

  const fStatus = typeof sp.hstatus === "string" && sp.hstatus in STATUS_LABEL ? (sp.hstatus as VerlofStatus) : undefined;
  const fZv = typeof sp.hzv === "string" && zvMap.has(sp.hzv) ? sp.hzv : undefined;
  const historie = alle.filter((a) => (!fStatus || a.status === fStatus) && (!fZv || a.zorgverlener_id === fZv));
  const filterLink = (s?: string, z?: string) => {
    const q = new URLSearchParams();
    if (s) q.set("hstatus", s);
    if (z) q.set("hzv", z);
    return `/verlof?${q}#historie`;
  };
  const chip = (actief: boolean) =>
    cn(
      "inline-flex min-h-14 items-center gap-2 rounded-full border-2 px-4 text-base font-semibold",
      actief ? "border-blue-700 bg-blue-700 text-white" : "border-gray-300 bg-white hover:bg-gray-100",
    );

  return (
    <>
      <Kaart titel={`Te beoordelen (${open.length})`}>
        {open.length === 0 ? (
          <LegeStaat>Er zijn geen openstaande aanvragen.</LegeStaat>
        ) : (
          <ul className="flex flex-col gap-4">
            {open.map((a) => {
              const zv = zvMap.get(a.zorgverlener_id);
              const n = dienstenPerAanvraag.get(a.id) ?? 0;
              return (
                <li key={a.id} className="rounded-xl border-2 border-amber-300 bg-amber-50/40 p-4">
                  <form action={beoordeelVerlof} className="flex flex-col gap-3">
                    <input type="hidden" name="id" value={a.id} />
                    <div className="flex flex-wrap items-center gap-3 text-lg">
                      {zv && <KleurBolletje kleur={zv.kleur} groot />}
                      <strong>{zv?.naam ?? "Onbekend"}</strong>
                      <span>{periodeTekst(a.start_datum, a.eind_datum)}</span>
                      <span className="text-gray-700">({aantalDagen(a.start_datum, a.eind_datum)} dagen)</span>
                    </div>
                    <p className={cn("text-lg", n > 0 && "font-bold text-red-800")}>
                      {n === 0 ? "Geen diensten in deze periode." : `${n} ${n === 1 ? "dienst valt" : "diensten vallen"} in deze periode.`}
                    </p>
                    {a.reden && <p>Reden: {a.reden}</p>}
                    <label className="flex flex-col gap-1">
                      <span className="font-semibold">Opmerking (niet verplicht)</span>
                      <textarea name="opmerking_admin" rows={2} maxLength={500} className={`${invoerKlassen} py-3`} />
                    </label>
                    <div className="flex flex-wrap gap-4">
                      <VerzendKnop variant="succes" name="besluit" value="goedgekeurd" className="min-w-48">
                        Goedkeuren
                      </VerzendKnop>
                      <VerzendKnop variant="gevaar" name="besluit" value="afgekeurd" className="min-w-48">
                        Afkeuren
                      </VerzendKnop>
                    </div>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Kaart>

      <Kaart titel={<span id="historie">Alle aanvragen</span>}>
        <div className="mb-3 flex flex-wrap gap-2" aria-label="Filter op status">
          <Link href={filterLink(undefined, fZv)} className={chip(!fStatus)}>
            Alle statussen
          </Link>
          {(Object.keys(STATUS_LABEL) as VerlofStatus[]).map((s) => (
            <Link key={s} href={filterLink(s, fZv)} className={chip(fStatus === s)}>
              {STATUS_LABEL[s]}
            </Link>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap gap-2" aria-label="Filter op persoon">
          <Link href={filterLink(fStatus)} className={chip(!fZv)}>
            Iedereen
          </Link>
          {[...zvMap.values()].map((z) => (
            <Link key={z.id} href={filterLink(fStatus, z.id)} className={chip(fZv === z.id)}>
              <KleurBolletje kleur={z.kleur} /> {z.naam}
            </Link>
          ))}
        </div>
        <HistorieTabel rijen={historie} zvMap={zvMap} />
      </Kaart>
    </>
  );
}

function HistorieTabel({ rijen, zvMap }: { rijen: VerlofAanvraag[]; zvMap: Map<string, { naam: string }> }) {
  if (!rijen.length) return <LegeStaat>Geen aanvragen gevonden.</LegeStaat>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-base">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="py-2 pr-3">Naam</th>
            <th className="py-2 pr-3">Periode</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Reden / opmerking</th>
            <th className="py-2">Beoordeeld</th>
          </tr>
        </thead>
        <tbody>
          {rijen.map((a) => (
            <tr key={a.id} className="border-b border-gray-200 align-top">
              <td className="py-2 pr-3 font-semibold">{zvMap.get(a.zorgverlener_id)?.naam ?? "?"}</td>
              <td className="py-2 pr-3">{periodeTekst(a.start_datum, a.eind_datum)}</td>
              <td className="py-2 pr-3">
                <StatusBadge status={a.status} />
              </td>
              <td className="py-2 pr-3">
                {a.reden}
                {a.opmerking_admin && <div className="text-gray-700">Beheerder: {a.opmerking_admin}</div>}
              </td>
              <td className="py-2">{a.beoordeeld_op ? tijdstipTekst(a.beoordeeld_op) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
