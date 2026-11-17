"use client";

import { useState } from "react";
import { ActieFormulier, DatumKiezer, VerzendKnop, type Actie } from "@/components/formulier";
import { cn, KleurBolletje, Melding, Veld, invoerKlassen } from "@/components/ui";
import { aantalDagen, datumKort, periodesOverlappen, periodeTekst } from "@/lib/datum";
import type { ZorgverlenerPubliek } from "@/lib/types";

/** Beheerder: verlof inplannen voor een zorgverlener (direct goedgekeurd) */
export function VerlofInplannen({
  actie,
  vandaag,
  zorgverleners,
  diensten,
  vakanties,
}: {
  actie: Actie;
  vandaag: string;
  zorgverleners: ZorgverlenerPubliek[];
  diensten: { datum: string; zorgverlener_id: string; tekst: string }[];
  vakanties: { naam: string; start_datum: string; eind_datum: string }[];
}) {
  const [zv, setZv] = useState<string>("");
  const [start, setStart] = useState(vandaag);
  const [eind, setEind] = useState(vandaag);
  const geldig = /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(eind) && eind >= start;
  const naam = zorgverleners.find((z) => z.id === zv)?.naam;
  const geraakt = geldig && zv ? diensten.filter((d) => d.zorgverlener_id === zv && d.datum >= start && d.datum <= eind) : [];
  const inVakantie = geldig ? vakanties.filter((v) => periodesOverlappen(start, eind, v.start_datum, v.eind_datum)) : [];

  return (
    <ActieFormulier actie={actie} className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2 text-lg font-semibold">Voor wie?</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {zorgverleners
            .filter((z) => z.actief)
            .map((z) => (
              <label
                key={z.id}
                className={cn(
                  "flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 text-lg font-semibold",
                  "has-[:focus-visible]:outline has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-amber-500",
                  zv === z.id ? "border-blue-700 bg-blue-50 ring-2 ring-blue-700" : "border-gray-300 bg-oppervlak",
                )}
              >
                <input
                  type="radio"
                  name="zorgverlener_id"
                  value={z.id}
                  checked={zv === z.id}
                  onChange={() => setZv(z.id)}
                  required
                  className="h-6 w-6 shrink-0 accent-blue-700"
                />
                <KleurBolletje kleur={z.kleur} groot />
                {z.naam}
              </label>
            ))}
        </div>
      </fieldset>

      <DatumKiezer
        name="start_datum"
        label="Eerste verlofdag"
        standaard={vandaag}
        waarde={start}
        onChange={(d) => {
          setStart(d);
          if (eind < d) setEind(d);
        }}
      />
      <DatumKiezer name="eind_datum" label="Laatste verlofdag" standaard={vandaag} waarde={eind} min={start} onChange={setEind} />
      {geldig && (
        <p className="text-lg">
          Periode: <strong>{periodeTekst(start, eind)}</strong> ({aantalDagen(start, eind)} {aantalDagen(start, eind) === 1 ? "dag" : "dagen"})
        </p>
      )}

      {zv && geldig && (
        <Melding soort={geraakt.length ? "waarschuwing" : "info"}>
          {geraakt.length === 0 ? (
            <>{naam} staat in deze periode niet ingeroosterd.</>
          ) : (
            <>
              <p className="font-bold">
                {naam} staat {geraakt.length}× ingeroosterd. Na het opslaan zie je deze diensten meteen, om iemand anders toe te wijzen:
              </p>
              <ul className="mt-1 list-disc pl-6">
                {geraakt.slice(0, 10).map((d) => (
                  <li key={d.datum + d.tekst}>
                    {datumKort(d.datum)}: {d.tekst}
                  </li>
                ))}
                {geraakt.length > 10 && <li>en nog {geraakt.length - 10} meer</li>}
              </ul>
            </>
          )}
        </Melding>
      )}
      {inVakantie.length > 0 && (
        <Melding soort="info">Deze periode valt (deels) in de {inVakantie.map((v) => v.naam).join(" en ")}.</Melding>
      )}

      <Veld label="Reden of notitie (niet verplicht)" htmlFor="reden-inplannen">
        <input id="reden-inplannen" name="reden" maxLength={500} className={invoerKlassen} />
      </Veld>
      <VerzendKnop variant="succes" className="self-start">
        Verlof inplannen (direct goedgekeurd)
      </VerzendKnop>
    </ActieFormulier>
  );
}
