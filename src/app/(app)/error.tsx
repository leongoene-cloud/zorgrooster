"use client";

import Link from "next/link";
import { Knop, knopKlassen, Melding } from "@/components/ui";

/** Foutpagina binnen de app: begrijpelijke melding met grote knoppen */
export default function Fout({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = typeof error === "object" && error && "digest" in error ? String((error as { digest?: string }).digest) : null;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 py-6">
      <h1 className="text-2xl font-bold">Er ging iets mis bij het laden</h1>
      <Melding soort="fout">
        Deze pagina kon niet worden geladen. Probeer het opnieuw. Blijft het misgaan na een update van de app, dan is de database
        waarschijnlijk nog niet bijgewerkt (zie de README, “Database bijwerken”).
      </Melding>
      <div className="flex flex-wrap gap-4">
        <Knop groot onClick={() => retry()}>
          Opnieuw proberen
        </Knop>
        <Link href="/rooster" className={knopKlassen("secundair", true)}>
          Naar het rooster
        </Link>
      </div>
      {digest && <p className="text-sm text-gray-700">Foutcode: {digest}</p>}
    </div>
  );
}
