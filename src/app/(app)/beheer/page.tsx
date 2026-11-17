import type { Metadata } from "next";
import Link from "next/link";
import { Kaart, knopKlassen, PaginaTitel } from "@/components/ui";
import { WaarschuwingLijst } from "@/components/waarschuwingen";
import { haalControles } from "@/lib/controles-server";
import { haalDienstenVervangingNodig, haalVerlofAanvragen } from "@/lib/data";
import { huidigeMaand, maandNaam, verschuifMaand } from "@/lib/datum";

export const metadata: Metadata = { title: "Beheer" };

function Teller({ n, label, href, slecht }: { n: number; label: string; href: string; slecht: boolean }) {
  return (
    <Link
      href={href}
      className={`flex min-h-28 flex-col justify-center rounded-2xl border-2 p-4 hover:shadow ${slecht && n > 0 ? "border-red-400 bg-red-50" : "border-gray-200 bg-oppervlak"}`}
    >
      <span className="text-4xl font-bold">{n}</span>
      <span className="text-lg font-semibold">{label}</span>
    </Link>
  );
}

export default async function BeheerPagina() {
  const maand = huidigeMaand();
  const volgende = verschuifMaand(maand, 1);
  const [controles, controlesVolgende, vervanging, open] = await Promise.all([
    haalControles(maand),
    haalControles(volgende),
    haalDienstenVervangingNodig(),
    haalVerlofAanvragen({ status: "aangevraagd" }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PaginaTitel>Beheer</PaginaTitel>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Teller n={open.length} label="Verlofaanvragen te beoordelen" href="/verlof" slecht />
        <Teller n={vervanging.length} label="Diensten zonder vervanging" href="/beheer/vervanging" slecht />
        <Teller n={controles.length} label={`Waarschuwingen ${maandNaam(maand)}`} href={`/beheer/rooster?maand=${maand}`} slecht />
        <Teller n={controlesVolgende.length} label={`Waarschuwingen ${maandNaam(volgende)}`} href={`/beheer/rooster?maand=${volgende}`} slecht />
      </div>
      <Kaart
        titel={`Controles ${maandNaam(maand)}`}
        actie={
          <Link href={`/beheer/rooster?maand=${maand}`} className={knopKlassen("primair", true)}>
            Rooster bewerken
          </Link>
        }
      >
        <WaarschuwingLijst lijst={controles} />
      </Kaart>
    </div>
  );
}
