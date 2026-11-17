"use client";

import { useState } from "react";
import { ActieFormulier, DatumKiezer, TijdKiezer, VerzendKnop, type Actie } from "@/components/formulier";
import { cn, KeuzeTegels, Knop, Veld, invoerKlassen } from "@/components/ui";
import { DIENST_TYPES, type Dienst, type DienstType, type ZorgverlenerPubliek } from "@/lib/types";
import { dienstMinuten, duurMinuten, urenKort } from "@/lib/uren";

export function DienstFormulier({
  actie,
  zorgverleners,
  dienst,
  datum,
  terug,
  waarschuwingen,
}: {
  actie: Actie;
  zorgverleners: ZorgverlenerPubliek[];
  dienst?: Dienst;
  datum: string;
  terug?: string;
  waarschuwingen?: React.ReactNode;
}) {
  const [type, setType] = useState<DienstType>(dienst?.type ?? "dag");
  const std = DIENST_TYPES.find((t) => t.type === type)!;
  const [start, setStart] = useState(dienst?.start_tijd.slice(0, 5) ?? std.start);
  const [eind, setEind] = useState(dienst?.eind_tijd.slice(0, 5) ?? std.eind);
  const [afwijking, setAfwijking] = useState(Boolean(dienst?.werkelijke_start || dienst?.werkelijke_eind));
  const [wStart, setWStart] = useState(dienst?.werkelijke_start?.slice(0, 5) ?? start);
  const [wEind, setWEind] = useState(dienst?.werkelijke_eind?.slice(0, 5) ?? eind);

  const kiesType = (t: DienstType) => {
    setType(t);
    const d = DIENST_TYPES.find((x) => x.type === t)!;
    setStart(d.start);
    setEind(d.eind);
  };
  const geldig = /^\d\d:\d\d$/.test(start) && /^\d\d:\d\d$/.test(eind) && start !== eind;

  return (
    <ActieFormulier actie={actie} className="flex flex-col gap-6">
      {dienst && <input type="hidden" name="id" value={dienst.id} />}
      {terug && <input type="hidden" name="terug" value={terug} />}
      {waarschuwingen}

      <KeuzeTegels
        name="zorgverlener_id"
        legend="Zorgverlener"
        standaard={dienst?.zorgverlener_id}
        opties={zorgverleners
          .filter((z) => z.actief || z.id === dienst?.zorgverlener_id)
          .map((z) => ({ waarde: z.id, label: z.naam, kleur: z.kleur }))}
      />

      <DatumKiezer name="datum" label="Datum (startdag)" standaard={dienst?.datum ?? datum} />

      <fieldset>
        <legend className="mb-2 text-lg font-semibold">Soort dienst</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DIENST_TYPES.map((t) => (
            <label
              key={t.type}
              className={cn(
                "flex min-h-16 cursor-pointer flex-col justify-center rounded-xl border-2 px-4 text-lg font-semibold",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-amber-500",
                type === t.type ? "border-blue-700 bg-blue-50 ring-2 ring-blue-700" : "border-gray-300 bg-white",
              )}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="type"
                  value={t.type}
                  checked={type === t.type}
                  onChange={() => kiesType(t.type)}
                  className="h-6 w-6 accent-blue-700"
                />
                {t.label}
              </span>
              <span className="pl-9 text-sm font-normal text-gray-700">
                {t.start}–{t.eind}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <TijdKiezer name="start_tijd" label="Begintijd" waarde={start} onChange={setStart} />
      <TijdKiezer name="eind_tijd" label="Eindtijd" waarde={eind} onChange={setEind} />
      {geldig && (
        <p className="text-lg">
          Duur: <strong>{urenKort(dienstMinuten({ start_tijd: start, eind_tijd: eind, werkelijke_start: null, werkelijke_eind: null }))}</strong>
          {eind <= start && " — eindigt de volgende dag"}
        </p>
      )}

      {dienst && (
        <div className="flex flex-col gap-4 rounded-xl border-2 border-gray-200 p-4">
          <p className="text-lg font-semibold">Werkelijke tijd (voor de urendeclaratie)</p>
          {!afwijking ? (
            <Knop variant="secundair" className="self-start" onClick={() => setAfwijking(true)}>
              Afwijkende tijd invullen
            </Knop>
          ) : (
            <>
              <TijdKiezer name="werkelijke_start" label="Werkelijke begintijd" waarde={wStart} onChange={setWStart} />
              <TijdKiezer name="werkelijke_eind" label="Werkelijke eindtijd" waarde={wEind} onChange={setWEind} />
              {/^\d\d:\d\d$/.test(wStart) && /^\d\d:\d\d$/.test(wEind) && wStart !== wEind && (
                <p>Telt als {urenKort(Math.round(duurMinuten(wStart, wEind) / 15) * 15)} (afgerond op kwartieren)</p>
              )}
              <Knop variant="rustig" className="self-start" onClick={() => setAfwijking(false)}>
                Geen afwijking (geplande tijd gebruiken)
              </Knop>
            </>
          )}
        </div>
      )}

      <Veld label="Notitie (niet verplicht)" htmlFor="notitie">
        <input id="notitie" name="notitie" defaultValue={dienst?.notitie ?? ""} maxLength={300} className={invoerKlassen} />
      </Veld>

      <VerzendKnop className="self-start min-w-56">{dienst ? "Wijzigingen opslaan" : "Dienst opslaan"}</VerzendKnop>
    </ActieFormulier>
  );
}
