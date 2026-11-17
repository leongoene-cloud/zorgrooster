import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { VerlofStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";

export function cn(...klassen: (string | false | null | undefined)[]): string {
  return klassen.filter(Boolean).join(" ");
}

export type KnopVariant = "primair" | "secundair" | "gevaar" | "succes" | "rustig";

const VARIANTEN: Record<KnopVariant, string> = {
  primair: "bg-blue-700 text-white hover:bg-blue-600 border-blue-700",
  secundair: "bg-oppervlak text-gray-900 hover:bg-gray-100 border-gray-400",
  gevaar: "bg-red-700 text-white hover:bg-red-600 border-red-700",
  succes: "bg-green-700 text-white hover:bg-green-600 border-green-700",
  rustig: "bg-gray-100 text-gray-900 hover:bg-gray-200 border-gray-300",
};

/** Groot klikdoel: minimaal 56 px hoog (beheer: 64 px), ruime tekst, altijd met tekstlabel */
export function knopKlassen(variant: KnopVariant = "primair", groot = false, extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl border-2 px-5 font-semibold text-center",
    "select-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    groot ? "min-h-16 min-w-16 text-xl" : "min-h-14 min-w-14 text-lg",
    VARIANTEN[variant],
    extra,
  );
}

export function Knop({
  variant = "primair",
  groot = false,
  className,
  ...rest
}: ComponentProps<"button"> & { variant?: KnopVariant; groot?: boolean }) {
  return <button type="button" className={knopKlassen(variant, groot, className)} {...rest} />;
}

export function KnopLink({
  variant = "secundair",
  groot = false,
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: KnopVariant; groot?: boolean }) {
  return <Link className={knopKlassen(variant, groot, className)} {...rest} />;
}

export function Kaart({ children, className, titel, actie }: { children: ReactNode; className?: string; titel?: ReactNode; actie?: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-gray-200 bg-oppervlak p-4 shadow-sm sm:p-6", className)}>
      {(titel || actie) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {titel && <h2 className="text-xl font-bold">{titel}</h2>}
          {actie}
        </div>
      )}
      {children}
    </section>
  );
}

export function PaginaTitel({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold sm:text-3xl">{children}</h1>
      {sub && <p className="mt-1 text-gray-700">{sub}</p>}
    </div>
  );
}

const MELDING_STIJL = {
  info: "border-blue-300 bg-blue-50 text-blue-950",
  succes: "border-green-400 bg-green-50 text-green-950",
  waarschuwing: "border-amber-400 bg-amber-50 text-amber-950",
  fout: "border-red-400 bg-red-50 text-red-950",
};

export function Melding({
  soort = "info",
  children,
  className,
}: {
  soort?: keyof typeof MELDING_STIJL;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={soort === "fout" ? "alert" : "status"}
      className={cn("rounded-xl border-2 px-4 py-3 text-base", MELDING_STIJL[soort], className)}
    >
      {children}
    </div>
  );
}

const STATUS_STIJL: Record<VerlofStatus, string> = {
  aangevraagd: "bg-amber-100 text-amber-950 border-amber-400",
  goedgekeurd: "bg-green-100 text-green-950 border-green-500",
  afgekeurd: "bg-red-100 text-red-950 border-red-400",
  geannuleerd: "bg-gray-100 text-gray-800 border-gray-400",
};

export function StatusBadge({ status }: { status: VerlofStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border-2 px-3 py-1 text-sm font-bold", STATUS_STIJL[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function KleurBolletje({ kleur, groot = false }: { kleur: string; groot?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full border border-black/20", groot ? "h-5 w-5" : "h-3.5 w-3.5")}
      style={{ backgroundColor: kleur }}
    />
  );
}

export function Veld({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-lg font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="text-sm text-gray-700">{hint}</p>}
    </div>
  );
}

export const invoerKlassen =
  "min-h-14 w-full rounded-xl border-2 border-gray-400 bg-oppervlak px-4 text-lg text-gray-900 focus:border-blue-700";

/** Een groep keuzes als grote, aanklikbare tegels (radio-knoppen; geen dropdown) */
export function KeuzeTegels({
  name,
  opties,
  standaard,
  legend,
  kolommen = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  verplicht = true,
}: {
  name: string;
  opties: { waarde: string; label: ReactNode; kleur?: string }[];
  standaard?: string;
  legend: string;
  kolommen?: string;
  verplicht?: boolean;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-lg font-semibold">{legend}</legend>
      <div className={cn("grid gap-3", kolommen)}>
        {opties.map((o) => (
          <label
            key={o.waarde}
            className={cn(
              "flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border-2 border-gray-300 bg-oppervlak px-4 text-lg font-semibold",
              "has-[:checked]:border-blue-700 has-[:checked]:bg-blue-50 has-[:checked]:ring-2 has-[:checked]:ring-blue-700",
              "has-[:focus-visible]:outline has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-amber-500",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.waarde}
              defaultChecked={standaard === o.waarde}
              required={verplicht}
              className="h-6 w-6 shrink-0 accent-blue-700"
            />
            {o.kleur && <KleurBolletje kleur={o.kleur} groot />}
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function LegeStaat({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-center text-lg text-gray-700">{children}</p>;
}
