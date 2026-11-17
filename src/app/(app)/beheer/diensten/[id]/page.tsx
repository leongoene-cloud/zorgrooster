import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BevestigKnop } from "@/components/formulier";
import { tijdenTekst } from "@/components/kalender";
import { Kaart, KnopLink, Melding, PaginaTitel } from "@/components/ui";
import { WaarschuwingLijst } from "@/components/waarschuwingen";
import { alleControles } from "@/lib/controles";
import { haalDienst, haalDiensten, haalGoedgekeurdVerlof, haalZorgverleners } from "@/lib/data";
import { datumLang, maandVan, plusDagen } from "@/lib/datum";
import { typeLabel } from "@/lib/types";
import { bewaarDienst, verwijderDienst } from "../../actions";
import { DienstFormulier } from "../dienst-formulier";

export const metadata: Metadata = { title: "Dienst wijzigen" };

export default async function DienstPagina({ params }: PageProps<"/beheer/diensten/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const dienst = await haalDienst(id);
  if (!dienst) notFound();
  const [zorgverleners, rondom, verlof] = await Promise.all([
    haalZorgverleners(),
    haalDiensten(plusDagen(dienst.datum, -1), plusDagen(dienst.datum, 1)),
    haalGoedgekeurdVerlof(dienst.datum, dienst.datum),
  ]);
  const zv = zorgverleners.find((z) => z.id === dienst.zorgverlener_id);
  const maand = maandVan(dienst.datum);
  // Waarschuwingen die over deze dienst gaan (overlap of verlof)
  const eigen = alleControles({ maand, diensten: rondom, verlof, zorgverleners }).filter((w) => w.dienstIds.includes(dienst.id));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <KnopLink href={`/beheer/rooster?maand=${maand}`} className="self-start">
        ← Terug naar rooster
      </KnopLink>
      <PaginaTitel sub={`${datumLang(dienst.datum)} · ${typeLabel(dienst.type)} ${tijdenTekst(dienst)} · ${zv?.naam ?? ""}`}>
        Dienst wijzigen
      </PaginaTitel>
      {dienst.vervanging_nodig && (
        <Melding soort="fout">
          Deze dienst valt in goedgekeurd verlof en moet vervangen worden. Kies hieronder een andere zorgverlener en sla op.
        </Melding>
      )}
      <Kaart>
        <DienstFormulier
          actie={bewaarDienst}
          zorgverleners={zorgverleners}
          dienst={dienst}
          datum={dienst.datum}
          waarschuwingen={eigen.length ? <WaarschuwingLijst lijst={eigen} /> : undefined}
        />
      </Kaart>
      <Kaart titel="Dienst verwijderen">
        <form action={verwijderDienst}>
          <input type="hidden" name="id" value={dienst.id} />
          <input type="hidden" name="maand" value={maand} />
          <BevestigKnop label="Dienst verwijderen" bevestigLabel="Ja, verwijder deze dienst" vraag="Weet je het zeker? Dit kan niet ongedaan worden gemaakt (wel terug te zien in het wijzigingslog)." />
        </form>
      </Kaart>
    </div>
  );
}
