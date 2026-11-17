import type { Metadata } from "next";
import Link from "next/link";
import { cn, Kaart, Melding, PaginaTitel } from "@/components/ui";
import { haalAlleVakanties } from "@/lib/data";
import { periodeTekst, vandaag } from "@/lib/datum";
import { VakantieFormulier } from "./vakantie-formulier";

export const metadata: Metadata = { title: "Schoolvakanties" };

export default async function VakantiesPagina({ searchParams }: PageProps<"/beheer/vakanties">) {
  const sp = await searchParams;
  const lijst = await haalAlleVakanties();
  const nu = vandaag();
  return (
    <div className="flex flex-col gap-5">
      {sp.melding === "opgeslagen" && <Melding soort="succes">Opgeslagen.</Melding>}
      {sp.melding === "verwijderd" && <Melding soort="succes">Verwijderd.</Melding>}
      <PaginaTitel sub="Er is geen gratis officiële koppeling; neem de data over van rijksoverheid.nl.">Schoolvakanties</PaginaTitel>
      <Kaart titel="Alle vakanties">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lijst.map((v) => (
            <li key={v.id}>
              <Link
                href={`/beheer/vakanties/${v.id}`}
                className={cn("flex min-h-20 flex-col justify-center rounded-xl border-2 border-gray-200 p-3 hover:bg-blue-50", v.eind_datum < nu && "opacity-60")}
              >
                <span className="text-lg font-bold">{v.naam}</span>
                <span>{periodeTekst(v.start_datum, v.eind_datum)} · regio {v.regio}</span>
                {v.opmerking && <span className="text-sm">{v.opmerking}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </Kaart>
      <Kaart titel="Vakantie toevoegen">
        <VakantieFormulier />
      </Kaart>
    </div>
  );
}
