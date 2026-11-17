import type { Metadata } from "next";
import { Kaart, KnopLink, PaginaTitel } from "@/components/ui";
import { ZorgverlenerFormulier } from "../zv-formulier";

export const metadata: Metadata = { title: "Zorgverlener toevoegen" };

export default function NieuweZorgverlenerPagina() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <KnopLink href="/beheer/zorgverleners" className="self-start">← Terug</KnopLink>
      <PaginaTitel sub="Na het opslaan kan deze persoon inloggen met een inloglink op dit e-mailadres.">Zorgverlener toevoegen</PaginaTitel>
      <Kaart>
        <ZorgverlenerFormulier />
      </Kaart>
    </div>
  );
}
