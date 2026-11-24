import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BevestigKnop } from "@/components/formulier";
import { OpgemaakteTekst } from "@/components/opgemaakte-tekst";
import { Kaart, KnopLink, knopKlassen, Melding } from "@/components/ui";
import { vereisLid } from "@/lib/auth";
import { haalWerkbeschrijvingen } from "@/lib/data";
import { tijdstipTekst } from "@/lib/datum";
import { verwijderWerkbeschrijving } from "../actions";

export const metadata: Metadata = { title: "Werkbeschrijving" };

export default async function WerkbeschrijvingDetail({ params, searchParams }: PageProps<"/werkbeschrijving/[id]">) {
  const sessie = await vereisLid();
  const { id } = await params;
  const sp = await searchParams;
  const lijst = await haalWerkbeschrijvingen();
  const i = lijst.findIndex((w) => w.id === id);
  if (i < 0) notFound();
  const w = lijst[i];
  const volgende = lijst[i + 1];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-3">
        <KnopLink href="/werkbeschrijving">← Alle werkbeschrijvingen</KnopLink>
        {sessie.isAdmin && (
          <Link href={`/werkbeschrijving/${w.id}/bewerken`} className={knopKlassen("primair")}>
            Bewerken
          </Link>
        )}
      </div>
      {sp.melding === "opgeslagen" && <Melding soort="succes">Opgeslagen.</Melding>}
      <Kaart>
        <h1 className="text-2xl font-bold sm:text-3xl">{w.titel}</h1>
        <p className="mb-5 mt-1 text-sm text-gray-700">Bijgewerkt {tijdstipTekst(w.bijgewerkt_op)}</p>
        {w.inhoud.trim() ? <OpgemaakteTekst tekst={w.inhoud} /> : <p className="text-gray-700">Nog geen tekst.</p>}
      </Kaart>
      {volgende && (
        <Link href={`/werkbeschrijving/${volgende.id}`} className={knopKlassen("secundair", true, "self-start")}>
          Volgende: {volgende.titel} →
        </Link>
      )}
      {sessie.isAdmin && (
        <Kaart titel="Verwijderen">
          <form action={verwijderWerkbeschrijving}>
            <input type="hidden" name="id" value={w.id} />
            <BevestigKnop label="Werkbeschrijving verwijderen" bevestigLabel="Ja, verwijderen" vraag={`“${w.titel}” verwijderen?`} />
          </form>
        </Kaart>
      )}
    </div>
  );
}
