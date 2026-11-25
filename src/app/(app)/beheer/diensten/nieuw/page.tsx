import type { Metadata } from "next";
import { PaginaTitel, KnopLink, Kaart } from "@/components/ui";
import { haalZorgverleners } from "@/lib/data";
import { datumLang, isGeldigeDatum, maandVan, vandaag } from "@/lib/datum";
import { DIENST_TYPES } from "@/lib/types";
import { bewaarDienst } from "../../actions";
import { DienstFormulier } from "../dienst-formulier";

export const metadata: Metadata = { title: "Nieuwe dienst" };

export default async function NieuweDienstPagina({ searchParams }: PageProps<"/beheer/diensten/nieuw">) {
  const sp = await searchParams;
  const datum = isGeldigeDatum(sp.datum) ? sp.datum : vandaag();
  const type = DIENST_TYPES.find((t) => t.type === sp.type)?.type;
  const terug = typeof sp.terug === "string" && sp.terug.startsWith("/beheer") ? sp.terug : undefined;
  const zorgverleners = await haalZorgverleners();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <KnopLink href={terug?.replace(/&melding=opgeslagen$/, "") ?? `/beheer/rooster?maand=${maandVan(datum)}`} className="self-start">
        ← Terug naar rooster
      </KnopLink>
      <PaginaTitel sub={datumLang(datum)}>Nieuwe dienst</PaginaTitel>
      <Kaart>
        <DienstFormulier actie={bewaarDienst} zorgverleners={zorgverleners} datum={datum} standaardType={type} terug={terug} />
      </Kaart>
    </div>
  );
}
