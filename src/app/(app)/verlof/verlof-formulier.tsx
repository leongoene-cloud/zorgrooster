"use client";

import { useState } from "react";
import { ActieFormulier, DatumKiezer, VerzendKnop, type Actie } from "@/components/formulier";
import { Melding, Veld, invoerKlassen } from "@/components/ui";
import { aantalDagen, datumKort, periodesOverlappen, periodeTekst } from "@/lib/datum";

export function VerlofFormulier({
  actie,
  vandaag,
  mijnDiensten,
  vakanties,
}: {
  actie: Actie;
  vandaag: string;
  mijnDiensten: { datum: string; tekst: string }[];
  vakanties: { naam: string; start_datum: string; eind_datum: string }[];
}) {
  const [start, setStart] = useState(vandaag);
  const [eind, setEind] = useState(vandaag);
  const geldig = /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(eind);
  const verkeerdeVolgorde = geldig && eind < start;
  const overlapDiensten = geldig && !verkeerdeVolgorde ? mijnDiensten.filter((d) => d.datum >= start && d.datum <= eind) : [];
  const overlapVakanties =
    geldig && !verkeerdeVolgorde ? vakanties.filter((v) => periodesOverlappen(start, eind, v.start_datum, v.eind_datum)) : [];

  return (
    <ActieFormulier actie={actie} className="flex flex-col gap-5">
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
      {geldig && !verkeerdeVolgorde && (
        <p className="text-lg">
          Periode: <strong>{periodeTekst(start, eind)}</strong> ({aantalDagen(start, eind)} {aantalDagen(start, eind) === 1 ? "dag" : "dagen"})
        </p>
      )}
      {verkeerdeVolgorde && <Melding soort="fout">De laatste verlofdag mag niet vóór de eerste liggen.</Melding>}
      {overlapDiensten.length > 0 && (
        <Melding soort="waarschuwing">
          <p className="font-bold">Je staat in deze periode ingeroosterd ({overlapDiensten.length}×):</p>
          <ul className="mt-1 list-disc pl-6">
            {overlapDiensten.slice(0, 8).map((d) => (
              <li key={d.datum + d.tekst}>
                {datumKort(d.datum)}: {d.tekst}
              </li>
            ))}
            {overlapDiensten.length > 8 && <li>en nog {overlapDiensten.length - 8} meer</li>}
          </ul>
        </Melding>
      )}
      {overlapVakanties.length > 0 && (
        <Melding soort="waarschuwing">
          Let op: deze periode valt (deels) in de {overlapVakanties.map((v) => v.naam).join(" en ")}.
        </Melding>
      )}
      <Veld label="Reden (niet verplicht)" htmlFor="reden">
        <textarea id="reden" name="reden" rows={3} maxLength={500} className={`${invoerKlassen} py-3`} />
      </Veld>
      <VerzendKnop className="self-start">Verlof aanvragen</VerzendKnop>
    </ActieFormulier>
  );
}
