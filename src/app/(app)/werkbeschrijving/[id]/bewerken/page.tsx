import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Kaart, KnopLink, PaginaTitel } from "@/components/ui";
import { vereisAdmin } from "@/lib/auth";
import { haalWerkbeschrijvingen } from "@/lib/data";
import { WerkbeschrijvingFormulier } from "../../formulier";

export const metadata: Metadata = { title: "Werkbeschrijving bewerken" };

export default async function WerkbeschrijvingBewerken({ params }: PageProps<"/werkbeschrijving/[id]/bewerken">) {
  await vereisAdmin();
  const { id } = await params;
  const w = (await haalWerkbeschrijvingen()).find((x) => x.id === id);
  if (!w) notFound();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <KnopLink href={`/werkbeschrijving/${w.id}`} className="self-start">← Terug</KnopLink>
      <PaginaTitel>{w.titel} bewerken</PaginaTitel>
      <Kaart>
        <WerkbeschrijvingFormulier w={w} />
      </Kaart>
    </div>
  );
}
