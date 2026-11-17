import type { Metadata } from "next";
import { Kaart, PaginaTitel } from "@/components/ui";
import { haalZorgverleners } from "@/lib/data";
import { importeerDiensten } from "../actions";
import { ImportScherm } from "./import-scherm";

export const metadata: Metadata = { title: "Importeren" };

export default async function ImportPagina() {
  const zorgverleners = await haalZorgverleners();
  return (
    <div className="flex flex-col gap-5">
      <PaginaTitel sub="Eenmalig het huidige rooster uit Excel overzetten. Je ziet eerst een voorbeeld; er wordt pas iets opgeslagen als je op ‘importeren’ klikt.">
        Importeren uit Excel
      </PaginaTitel>
      <Kaart titel="Zo moet het bestand eruitzien">
        <p className="text-lg">
          Eén regel per dienst, met bovenaan de kolommen <strong>datum, naam, type, start, eind</strong>. Meerdere tabbladen (bijvoorbeeld één per
          maand) mag.
        </p>
        <ul className="mt-2 list-disc pl-6 text-lg">
          <li>datum: 2026-12-01 of 1-12-2026 (of een Excel-datum)</li>
          <li>naam: precies zoals bij Zorgverleners: {zorgverleners.map((z) => z.naam).join(", ")}</li>
          <li>type: dag, avond, nacht of overig (leeg = afgeleid uit de starttijd)</li>
          <li>start en eind: 09:00, 21:00 (een nacht 21:00–09:00 eindigt vanzelf de volgende dag)</li>
        </ul>
        <a href="/import-voorbeeld.csv" download className="mt-3 inline-flex min-h-14 items-center font-semibold text-blue-800 underline">
          Voorbeeldbestand downloaden
        </a>
      </Kaart>
      <Kaart>
        <ImportScherm actie={importeerDiensten} zorgverleners={zorgverleners} />
      </Kaart>
    </div>
  );
}
