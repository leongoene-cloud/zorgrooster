import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Kaart, KnopLink, PaginaTitel } from "@/components/ui";
import { haalZorgverlenersVolledig } from "@/lib/data";
import { ZorgverlenerFormulier } from "../zv-formulier";

export const metadata: Metadata = { title: "Zorgverlener bewerken" };

export default async function ZorgverlenerPagina({ params }: PageProps<"/beheer/zorgverleners/[id]">) {
  const { id } = await params;
  const zv = (await haalZorgverlenersVolledig()).find((z) => z.id === id);
  if (!zv) notFound();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <KnopLink href="/beheer/zorgverleners" className="self-start">← Terug</KnopLink>
      <PaginaTitel sub="Deactiveren in plaats van verwijderen: oude diensten en uren blijven zo bewaard.">{zv.naam} bewerken</PaginaTitel>
      <Kaart>
        <ZorgverlenerFormulier zv={zv} />
      </Kaart>
    </div>
  );
}
