import type { Metadata } from "next";
import Link from "next/link";
import { tijdenTekst } from "@/components/kalender";
import { Kaart, KleurBolletje, knopKlassen, LegeStaat, Melding, PaginaTitel } from "@/components/ui";
import { haalDiensten, haalDienstenVervangingNodig, haalZorgverleners } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { datumLang, periodeTekst } from "@/lib/datum";
import { typeLabel, type Dienst, type VerlofAanvraag } from "@/lib/types";

export const metadata: Metadata = { title: "Vervanging" };

export default async function VervangingPagina({ searchParams }: PageProps<"/beheer/vervanging">) {
  const sp = await searchParams;
  const verlofId = typeof sp.verlof === "string" && /^[0-9a-f-]{36}$/i.test(sp.verlof) ? sp.verlof : undefined;
  const zorgverleners = await haalZorgverleners();
  const zvMap = new Map(zorgverleners.map((z) => [z.id, z]));

  let verlof: VerlofAanvraag | null = null;
  let diensten: Dienst[];
  if (verlofId) {
    const supabase = await createClient();
    const { data } = await supabase.from("verlof_aanvragen").select("*").eq("id", verlofId).maybeSingle<VerlofAanvraag>();
    verlof = data;
  }
  if (verlof) {
    diensten = await haalDiensten(verlof.start_datum, verlof.eind_datum, verlof.zorgverlener_id);
  } else {
    diensten = await haalDienstenVervangingNodig();
  }
  const terug = verlof ? `/beheer/vervanging?verlof=${verlof.id}` : "/beheer/vervanging";

  return (
    <div className="flex flex-col gap-5">
      {sp.melding === "toegewezen" && <Melding soort="succes">De dienst is toegewezen.</Melding>}
      {sp.melding === "fout" && <Melding soort="fout">Toewijzen lukte niet. Probeer het opnieuw.</Melding>}
      {verlof ? (
        <>
          <PaginaTitel sub={periodeTekst(verlof.start_datum, verlof.eind_datum)}>
            Verlof {verlof.status === "goedgekeurd" ? "goedgekeurd" : verlof.status}: {zvMap.get(verlof.zorgverlener_id)?.naam}
          </PaginaTitel>
          <p className="text-lg">
            {diensten.length === 0
              ? "Er vallen geen diensten in deze periode. Er hoeft niets vervangen te worden."
              : `Deze ${diensten.length} ${diensten.length === 1 ? "dienst valt" : "diensten vallen"} in de verlofperiode. Wijs per dienst iemand anders toe.`}
          </p>
        </>
      ) : (
        <PaginaTitel sub="Diensten die in goedgekeurd verlof vallen en nog geen andere zorgverlener hebben.">Vervanging nodig</PaginaTitel>
      )}

      {diensten.length === 0 && !verlof ? (
        <LegeStaat>Alle diensten zijn vervangen. 🎉</LegeStaat>
      ) : (
        <ul className="flex flex-col gap-3">
          {diensten.map((d) => {
            const zv = zvMap.get(d.zorgverlener_id);
            return (
              <li key={d.id}>
                <Kaart className={d.vervanging_nodig ? "border-2 border-red-400" : ""}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-lg">
                      <p className="font-bold">{datumLang(d.datum)}</p>
                      <p className="flex items-center gap-2">
                        <KleurBolletje kleur={zv?.kleur ?? "#999"} /> {zv?.naam} · {typeLabel(d.type)} {tijdenTekst(d)}
                      </p>
                      {d.vervanging_nodig ? (
                        <span className="mt-1 inline-block rounded-md bg-red-700 px-2 py-0.5 text-sm font-bold text-white">Vervanging nodig</span>
                      ) : (
                        <span className="mt-1 inline-block rounded-md bg-green-100 px-2 py-0.5 text-sm font-bold text-green-900">Geregeld</span>
                      )}
                    </div>
                    {d.vervanging_nodig && (
                      <Link href={`/beheer/vervanging/${d.id}?terug=${encodeURIComponent(terug)}`} className={knopKlassen("primair", true)}>
                        Wijs andere zorgverlener toe
                      </Link>
                    )}
                  </div>
                </Kaart>
              </li>
            );
          })}
        </ul>
      )}
      {verlof && (
        <Link href="/verlof" className={knopKlassen("secundair", true, "self-start")}>
          ← Terug naar verlof
        </Link>
      )}
    </div>
  );
}
