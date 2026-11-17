import Link from "next/link";
import { huidigeMaand, maandNaam, verschuifMaand } from "@/lib/datum";
import { knopKlassen } from "./ui";

/** Vorige / volgende maand als grote links; overige queryparameters blijven behouden */
export function MaandKiezer({ maand, pad, params = {} }: { maand: string; pad: string; params?: Record<string, string | undefined> }) {
  const link = (m: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    q.set("maand", m);
    return `${pad}?${q.toString()}`;
  };
  const huidig = huidigeMaand();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href={link(verschuifMaand(maand, -1))} className={knopKlassen("secundair")} aria-label="Vorige maand">
        ← Vorige
      </Link>
      <h2 className="order-first w-full text-2xl font-bold capitalize sm:order-none sm:w-auto sm:min-w-48 sm:text-center" aria-live="polite">
        {maandNaam(maand)}
      </h2>
      <Link href={link(verschuifMaand(maand, 1))} className={knopKlassen("secundair")} aria-label="Volgende maand">
        Volgende →
      </Link>
      {maand !== huidig && (
        <Link href={link(huidig)} className={knopKlassen("rustig")}>
          Deze maand
        </Link>
      )}
    </div>
  );
}
