import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VerzendKnop } from "@/components/formulier";
import { tijdenTekst } from "@/components/kalender";
import { Kaart, KleurBolletje, KnopLink, PaginaTitel } from "@/components/ui";
import { dienstInterval } from "@/lib/controles";
import { haalDienst, haalDiensten, haalGoedgekeurdVerlof, haalZorgverleners } from "@/lib/data";
import { datumLang, plusDagen } from "@/lib/datum";
import { typeLabel } from "@/lib/types";
import { geenVervangingNodig, wijsToe } from "../../actions";

export const metadata: Metadata = { title: "Andere zorgverlener toewijzen" };

export default async function ToewijzenPagina({ params, searchParams }: PageProps<"/beheer/vervanging/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const terug = typeof sp.terug === "string" && sp.terug.startsWith("/beheer") ? sp.terug : "/beheer/vervanging";
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const dienst = await haalDienst(id);
  if (!dienst) notFound();
  const [zorgverleners, rondom, verlof] = await Promise.all([
    haalZorgverleners(),
    haalDiensten(plusDagen(dienst.datum, -1), plusDagen(dienst.datum, 1)),
    haalGoedgekeurdVerlof(dienst.datum, dienst.datum),
  ]);
  const [van, tot] = dienstInterval(dienst);
  const huidige = zorgverleners.find((z) => z.id === dienst.zorgverlener_id);

  const kandidaten = zorgverleners
    .filter((z) => z.actief && z.id !== dienst.zorgverlener_id)
    .map((z) => {
      const opVerlof = verlof.some((v) => v.zorgverlener_id === z.id);
      const conflict = rondom.find((d) => {
        if (d.zorgverlener_id !== z.id) return false;
        const [a, b] = dienstInterval(d);
        return a < tot && van < b;
      });
      const status = opVerlof ? "Heeft verlof" : conflict ? `Werkt al ${typeLabel(conflict.type).toLowerCase()} ${tijdenTekst(conflict)}` : "Beschikbaar";
      return { z, status, ok: !opVerlof && !conflict };
    })
    .sort((a, b) => Number(b.ok) - Number(a.ok));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <KnopLink href={terug} className="self-start">
        ← Terug
      </KnopLink>
      <PaginaTitel sub={`${datumLang(dienst.datum)} · ${typeLabel(dienst.type)} ${tijdenTekst(dienst)} · nu: ${huidige?.naam ?? "?"}`}>
        Wie neemt deze dienst over?
      </PaginaTitel>
      <Kaart>
        <ul className="flex flex-col gap-4">
          {kandidaten.map(({ z, status, ok }) => (
            <li key={z.id}>
              <form action={wijsToe}>
                <input type="hidden" name="id" value={dienst.id} />
                <input type="hidden" name="zorgverlener_id" value={z.id} />
                <input type="hidden" name="terug" value={terug} />
                <VerzendKnop variant={ok ? "primair" : "secundair"} className="w-full justify-between text-left">
                  <span className="flex items-center gap-3">
                    <KleurBolletje kleur={z.kleur} groot />
                    {z.naam}
                  </span>
                  <span className={`text-base font-normal ${ok ? "" : "text-red-800"}`}>{status}</span>
                </VerzendKnop>
              </form>
            </li>
          ))}
          {kandidaten.length === 0 && <li>Er zijn geen andere actieve zorgverleners.</li>}
        </ul>
      </Kaart>
      <Kaart titel="Anders geregeld?">
        <form action={geenVervangingNodig}>
          <input type="hidden" name="id" value={dienst.id} />
          <input type="hidden" name="terug" value={terug} />
          <VerzendKnop variant="secundair">Markering “vervanging nodig” weghalen</VerzendKnop>
        </form>
      </Kaart>
    </div>
  );
}
