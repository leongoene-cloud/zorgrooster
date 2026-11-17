import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BevestigKnop } from "@/components/formulier";
import { Kaart, KnopLink, PaginaTitel } from "@/components/ui";
import { haalAlleVakanties } from "@/lib/data";
import { verwijderVakantie } from "../../actions";
import { VakantieFormulier } from "../vakantie-formulier";

export const metadata: Metadata = { title: "Vakantie bewerken" };

export default async function VakantiePagina({ params }: PageProps<"/beheer/vakanties/[id]">) {
  const { id } = await params;
  const v = (await haalAlleVakanties()).find((x) => x.id === id);
  if (!v) notFound();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <KnopLink href="/beheer/vakanties" className="self-start">← Terug</KnopLink>
      <PaginaTitel>{v.naam}</PaginaTitel>
      <Kaart>
        <VakantieFormulier v={v} />
      </Kaart>
      <Kaart titel="Verwijderen">
        <form action={verwijderVakantie}>
          <input type="hidden" name="id" value={v.id} />
          <BevestigKnop label="Vakantie verwijderen" bevestigLabel="Ja, verwijderen" />
        </form>
      </Kaart>
    </div>
  );
}
