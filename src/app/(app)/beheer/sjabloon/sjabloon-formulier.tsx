"use client";

import { useState } from "react";
import { ActieFormulier, TijdKiezer, VerzendKnop, type Actie } from "@/components/formulier";
import { cn, KeuzeTegels } from "@/components/ui";
import { WEEKDAG_NAMEN } from "@/lib/datum";
import { DIENST_TYPES, type DienstType, type ZorgverlenerPubliek } from "@/lib/types";

export function SjabloonFormulier({
  actie,
  zorgverleners,
  ritmeOpties,
}: {
  actie: Actie;
  zorgverleners: ZorgverlenerPubliek[];
  ritmeOpties: { waarde: string; label: string }[];
}) {
  const [type, setType] = useState<DienstType>("dag");
  const [start, setStart] = useState(DIENST_TYPES[0].start);
  const [eind, setEind] = useState(DIENST_TYPES[0].eind);
  const tegel =
    "flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 text-lg font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-amber-500";

  return (
    <ActieFormulier actie={actie} className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-2 text-lg font-semibold">Op welke dagen? (meerdere mogelijk)</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {WEEKDAG_NAMEN.map((n, i) => (
            <label key={n} className={cn(tegel, "border-gray-300 bg-white has-[:checked]:border-blue-700 has-[:checked]:bg-blue-50")}>
              <input type="checkbox" name="weekdag" value={i + 1} className="h-6 w-6 accent-blue-700" />
              <span className="capitalize">{n}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <KeuzeTegels
        name="zorgverlener_id"
        legend="Zorgverlener"
        opties={zorgverleners.filter((z) => z.actief).map((z) => ({ waarde: z.id, label: z.naam, kleur: z.kleur }))}
      />
      <fieldset>
        <legend className="mb-2 text-lg font-semibold">Soort dienst</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DIENST_TYPES.map((t) => (
            <label key={t.type} className={cn(tegel, type === t.type ? "border-blue-700 bg-blue-50 ring-2 ring-blue-700" : "border-gray-300 bg-white")}>
              <input
                type="radio"
                name="type"
                value={t.type}
                checked={type === t.type}
                onChange={() => {
                  setType(t.type);
                  setStart(t.start);
                  setEind(t.eind);
                }}
                className="h-6 w-6 accent-blue-700"
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <KeuzeTegels name="ritme" legend="Hoe vaak?" standaard="elke" opties={ritmeOpties} kolommen="grid-cols-1 lg:grid-cols-3" />
      <TijdKiezer name="start_tijd" label="Begintijd" waarde={start} onChange={setStart} />
      <TijdKiezer name="eind_tijd" label="Eindtijd" waarde={eind} onChange={setEind} />
      <VerzendKnop className="self-start min-w-56">Toevoegen aan sjabloon</VerzendKnop>
    </ActieFormulier>
  );
}
