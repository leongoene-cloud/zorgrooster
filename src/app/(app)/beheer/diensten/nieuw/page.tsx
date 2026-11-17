import type { Metadata } from "next";
import { PaginaTitel, KnopLink, Kaart } from "@/components/ui";
import { haalZorgverleners } from "@/lib/data";
import { datumLang, isGeldigeDatum, maandVan, vandaag } from "@/lib/datum";
import { bewaarDienst } from "../../actions";
import { DienstFormulier } from "../dienst-formulier";

export const metadata: Metadata = { title: "Nieuwe dienst" };

export default async function NieuweDienstPagina({ searchParams }: PageProps<"/beheer/diensten/nieuw">) {
  const sp = await searchParams;
  const datum = isGeldigeDatum(sp.datum) ? sp.datum : vandaag();
  const zorgverleners = await haalZorgverleners();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <KnopLink href={`/beheer/rooster?maand=${maandVan(datum)}`} className="self-start">
        ← Terug naar rooster
      </KnopLink>
      <PaginaTitel sub={datumLang(datum)}>Nieuwe dienst</PaginaTitel>
      <Kaart>
        <DienstFormulier actie={bewaarDienst} zorgverleners={zorgverleners} datum={datum} />
      </Kaart>
    </div>
  );
}
