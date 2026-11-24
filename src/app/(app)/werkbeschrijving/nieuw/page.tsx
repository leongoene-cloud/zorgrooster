import type { Metadata } from "next";
import { Kaart, KnopLink, PaginaTitel } from "@/components/ui";
import { vereisAdmin } from "@/lib/auth";
import { WerkbeschrijvingFormulier } from "../formulier";

export const metadata: Metadata = { title: "Nieuwe werkbeschrijving" };

export default async function NieuweWerkbeschrijving() {
  await vereisAdmin();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <KnopLink href="/werkbeschrijving" className="self-start">← Terug</KnopLink>
      <PaginaTitel>Nieuwe werkbeschrijving</PaginaTitel>
      <Kaart>
        <WerkbeschrijvingFormulier />
      </Kaart>
    </div>
  );
}
