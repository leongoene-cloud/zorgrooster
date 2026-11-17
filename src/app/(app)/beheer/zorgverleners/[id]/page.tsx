import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BevestigKnop } from "@/components/formulier";
import { Kaart, KnopLink, Melding, PaginaTitel } from "@/components/ui";
import { haalZorgverlenersVolledig } from "@/lib/data";
import { tijdstipTekst } from "@/lib/datum";
import { maakToegangslink, trekToegangslinkIn } from "../../actions";
import { LinkBeheer } from "../link-beheer";
import { ZorgverlenerFormulier } from "../zv-formulier";

export const metadata: Metadata = { title: "Zorgverlener bewerken" };

export default async function ZorgverlenerPagina({ params, searchParams }: PageProps<"/beheer/zorgverleners/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const zv = (await haalZorgverlenersVolledig()).find((z) => z.id === id);
  if (!zv) notFound();
  const heeftLink = Boolean(zv.toegang_aangemaakt);
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <KnopLink href="/beheer/zorgverleners" className="self-start">← Terug</KnopLink>
      <PaginaTitel sub="Deactiveren in plaats van verwijderen: oude diensten en uren blijven zo bewaard.">{zv.naam} bewerken</PaginaTitel>
      {sp.melding === "ingetrokken" && <Melding soort="succes">De link is ingetrokken en werkt niet meer.</Melding>}

      {zv.rol !== "admin" && (
        <Kaart titel="Persoonlijke link">
          <p className="mb-4 text-lg">
            Met deze link opent {zv.naam} het rooster en vraagt verlof aan, zonder wachtwoord of e-mail.{" "}
            {heeftLink ? `Huidige link gemaakt op ${tijdstipTekst(zv.toegang_aangemaakt!)}.` : "Er is nog geen link."}
          </p>
          <LinkBeheer id={zv.id} naam={zv.naam} heeftLink={heeftLink} maakLink={maakToegangslink} />
          {heeftLink && (
            <form action={trekToegangslinkIn} className="mt-6">
              <input type="hidden" name="id" value={zv.id} />
              <BevestigKnop label="Link intrekken" bevestigLabel="Ja, link intrekken" vraag={`${zv.naam} kan het rooster dan niet meer openen tot je een nieuwe link maakt.`} />
            </form>
          )}
        </Kaart>
      )}

      <Kaart titel="Gegevens">
        <ZorgverlenerFormulier zv={zv} />
      </Kaart>
    </div>
  );
}
