import type { Metadata } from "next";
import Link from "next/link";
import { VerzendKnop } from "@/components/formulier";
import { knopKlassen, LegeStaat, Melding, PaginaTitel } from "@/components/ui";
import { vereisLid } from "@/lib/auth";
import { haalWerkbeschrijvingen } from "@/lib/data";
import { tijdstipTekst } from "@/lib/datum";
import { verplaatsWerkbeschrijving } from "./actions";

export const metadata: Metadata = { title: "Werkbeschrijving" };

export default async function WerkbeschrijvingPagina({ searchParams }: PageProps<"/werkbeschrijving">) {
  const sessie = await vereisLid();
  const sp = await searchParams;
  const lijst = await haalWerkbeschrijvingen();

  return (
    <div className="flex flex-col gap-5">
      {sp.melding === "verwijderd" && <Melding soort="succes">De werkbeschrijving is verwijderd.</Melding>}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PaginaTitel sub="Hoe we de zorg doen. Kies een onderwerp om het te lezen.">Werkbeschrijving</PaginaTitel>
        {sessie.isAdmin && (
          <Link href="/werkbeschrijving/nieuw" className={knopKlassen("succes", true)}>
            + Nieuwe werkbeschrijving
          </Link>
        )}
      </div>

      {lijst.length === 0 ? (
        <LegeStaat>{sessie.isAdmin ? "Nog geen werkbeschrijvingen. Klik op “+ Nieuwe werkbeschrijving”." : "Er zijn nog geen werkbeschrijvingen."}</LegeStaat>
      ) : (
        <ul className="flex flex-col gap-3">
          {lijst.map((w, i) => (
            <li key={w.id} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <Link
                href={`/werkbeschrijving/${w.id}`}
                className="flex min-h-20 flex-1 flex-col justify-center rounded-2xl border-2 border-gray-200 bg-oppervlak px-5 py-3 hover:border-blue-500 hover:bg-blue-50"
              >
                <span className="text-xl font-bold">{w.titel}</span>
                <span className="text-sm text-gray-700">Bijgewerkt {tijdstipTekst(w.bijgewerkt_op)}</span>
              </Link>
              {sessie.isAdmin && lijst.length > 1 && (
                <div className="flex gap-3">
                  <form action={verplaatsWerkbeschrijving} className="flex">
                    <input type="hidden" name="id" value={w.id} />
                    <input type="hidden" name="richting" value="omhoog" />
                    <VerzendKnop variant="secundair" className={i === 0 ? "invisible" : ""}>
                      ↑ Omhoog
                    </VerzendKnop>
                  </form>
                  <form action={verplaatsWerkbeschrijving} className="flex">
                    <input type="hidden" name="id" value={w.id} />
                    <input type="hidden" name="richting" value="omlaag" />
                    <VerzendKnop variant="secundair" className={i === lijst.length - 1 ? "invisible" : ""}>
                      ↓ Omlaag
                    </VerzendKnop>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
