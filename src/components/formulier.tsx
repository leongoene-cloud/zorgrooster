"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn, Knop, knopKlassen, Melding, type KnopVariant, invoerKlassen } from "./ui";
import { minuten, minutenNaarTijd } from "@/lib/uren";
import { plusDagen, datumLang } from "@/lib/datum";

export type ActieStatus = { fout?: string; melding?: string } | undefined;
export type Actie = (vorige: ActieStatus, data: FormData) => Promise<ActieStatus>;

/** Formulier dat een server action aanroept en een foutmelding toont zonder invoer te verliezen */
export function ActieFormulier({
  actie,
  children,
  className,
}: {
  actie: Actie;
  children: ReactNode;
  className?: string;
}) {
  const [status, formAction] = useActionState(actie, undefined);
  return (
    <form action={formAction} className={className}>
      {status?.fout && (
        <Melding soort="fout" className="mb-4">
          {status.fout}
        </Melding>
      )}
      {status?.melding && (
        <Melding soort="succes" className="mb-4">
          {status.melding}
        </Melding>
      )}
      {children}
    </form>
  );
}

export function VerzendKnop({
  children,
  variant = "primair",
  groot = true,
  name,
  value,
  className,
  formNoValidate,
}: {
  children: ReactNode;
  variant?: KnopVariant;
  groot?: boolean;
  name?: string;
  value?: string;
  className?: string;
  formNoValidate?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      formNoValidate={formNoValidate}
      className={knopKlassen(variant, groot, className)}
    >
      {pending ? "Bezig…" : children}
    </button>
  );
}

/** Verwijderknop in twee stappen (geen tijdslimiet, geen dubbelklik nodig) */
export function BevestigKnop({
  label,
  bevestigLabel,
  vraag,
  name,
  value,
}: {
  label: string;
  bevestigLabel: string;
  vraag?: string;
  name?: string;
  value?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Knop variant="secundair" groot className="border-red-700 text-red-800" onClick={() => setOpen(true)}>
        {label}
      </Knop>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-4">
      {vraag && <p className="text-lg font-semibold text-red-950">{vraag}</p>}
      <div className="flex flex-wrap gap-4">
        <VerzendKnop variant="gevaar" name={name} value={value} formNoValidate>
          {bevestigLabel}
        </VerzendKnop>
        <Knop variant="secundair" groot onClick={() => setOpen(false)}>
          Nee, terug
        </Knop>
      </div>
    </div>
  );
}

/** Tijd kiezen met grote plus/min-knoppen (handig met oogbesturing); typen kan ook */
export function TijdKiezer({
  name,
  label,
  waarde,
  onChange,
  standaard = "09:00",
  leegToegestaan = false,
}: {
  name: string;
  label: string;
  waarde?: string;
  onChange?: (t: string) => void;
  standaard?: string;
  leegToegestaan?: boolean;
}) {
  const [intern, setIntern] = useState(standaard);
  const t = waarde ?? intern;
  const zet = (nieuw: string) => (onChange ? onChange(nieuw) : setIntern(nieuw));
  const stap = (delta: number) => zet(minutenNaarTijd(minuten(t || standaard || "09:00") + delta));
  const knop = "min-h-14 min-w-16 text-lg";
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-lg font-semibold">{label}</legend>
      <div className="flex flex-wrap items-center gap-2">
        <Knop variant="secundair" className={knop} onClick={() => stap(-60)} aria-label={`${label}: 1 uur eerder`}>
          −1 uur
        </Knop>
        <Knop variant="secundair" className={knop} onClick={() => stap(-15)} aria-label={`${label}: 15 minuten eerder`}>
          −15 min
        </Knop>
        <input
          type="time"
          name={name}
          value={t}
          step={900}
          required={!leegToegestaan}
          onChange={(e) => zet(e.target.value)}
          className={cn(invoerKlassen.replace("w-full", ""), "w-40 text-center text-2xl font-bold tabular-nums")}
          aria-label={label}
        />
        <Knop variant="secundair" className={knop} onClick={() => stap(15)} aria-label={`${label}: 15 minuten later`}>
          +15 min
        </Knop>
        <Knop variant="secundair" className={knop} onClick={() => stap(60)} aria-label={`${label}: 1 uur later`}>
          +1 uur
        </Knop>
        {leegToegestaan && t && (
          <Knop variant="rustig" className={knop} onClick={() => zet("")}>
            Leegmaken
          </Knop>
        )}
      </div>
    </fieldset>
  );
}

/** Datum kiezen met 'vorige/volgende dag'-knoppen naast het datumveld */
export function DatumKiezer({
  name,
  label,
  standaard,
  min,
  onChange,
  metKnoppen = true,
  waarde,
}: {
  name: string;
  label: string;
  standaard: string;
  min?: string;
  onChange?: (d: string) => void;
  metKnoppen?: boolean;
  waarde?: string;
}) {
  const [intern, setD] = useState(standaard);
  const d = waarde ?? intern;
  const zet = (nieuw: string) => {
    setD(nieuw);
    onChange?.(nieuw);
  };
  const geldig = /^\d{4}-\d{2}-\d{2}$/.test(d);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-lg font-semibold">{label}</legend>
      <div className="flex flex-wrap items-center gap-2">
        {metKnoppen && (
          <Knop variant="secundair" onClick={() => geldig && zet(plusDagen(d, -1))} disabled={!geldig || (!!min && d <= min)}>
            ← Dag eerder
          </Knop>
        )}
        <input
          type="date"
          name={name}
          value={d}
          min={min}
          required
          onChange={(e) => zet(e.target.value)}
          className={cn(invoerKlassen.replace("w-full", ""), "w-auto text-xl")}
          aria-label={label}
        />
        {metKnoppen && (
          <Knop variant="secundair" onClick={() => geldig && zet(plusDagen(d, 1))} disabled={!geldig}>
            Dag later →
          </Knop>
        )}
      </div>
      {geldig && <p className="text-base text-gray-700">{datumLang(d)}</p>}
    </fieldset>
  );
}
