import type { Metadata } from "next";
import Link from "next/link";
import { tijdenTekst } from "@/components/kalender";
import { MaandKiezer } from "@/components/maandkiezer";
import { Kaart, KleurBolletje, knopKlassen, LegeStaat, PaginaTitel } from "@/components/ui";
import { haalDiensten, haalZorgverleners } from "@/lib/data";
import { datumKort, eersteDag, huidigeMaand, isGeldigeMaand, laatsteDag, tijd } from "@/lib/datum";
import { typeLabel } from "@/lib/types";
import { dienstMinuten, heeftAfwijking, urenOverzicht, urenTekst } from "@/lib/uren";

export const metadata: Metadata = { title: "Uren" };

export default async function UrenPagina({ searchParams }: PageProps<"/beheer/uren">) {
  const sp = await searchParams;
  const maand = isGeldigeMaand(sp.maand) ? sp.maand : huidigeMaand();
  const [diensten, zorgverleners] = await Promise.all([haalDiensten(eersteDag(maand), laatsteDag(maand)), haalZorgverleners()]);
  const regels = urenOverzicht(diensten, zorgverleners);
  const totaal = regels.reduce((s, r) => s + r.minuten, 0);
  const afwijkingen = diensten.filter(heeftAfwijking);
  const zvMap = new Map(zorgverleners.map((z) => [z.id, z]));

  return (
    <div className="flex flex-col gap-5">
      <PaginaTitel sub="Voor de PGB-declaratie. Uren per dienst afgerond op kwartieren; een nachtdienst 21:00–09:00 telt als 12 uur. Een dienst telt mee in de maand waarin hij begint.">
        Urenoverzicht
      </PaginaTitel>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <MaandKiezer maand={maand} pad="/beheer/uren" />
        <a href={`/beheer/export?maand=${maand}`} className={knopKlassen("succes", true)} download>
          Download Excel (rooster + uren)
        </a>
      </div>

      <Kaart>
        {regels.length === 0 ? (
          <LegeStaat>Geen diensten in deze maand.</LegeStaat>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-lg">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="py-2 pr-3">Naam</th>
                  <th className="py-2 pr-3 text-right">Diensten</th>
                  <th className="py-2 pr-3 text-right">Dag</th>
                  <th className="py-2 pr-3 text-right">Avond</th>
                  <th className="py-2 pr-3 text-right">Nacht</th>
                  <th className="py-2 pr-3 text-right">Overig</th>
                  <th className="py-2 text-right">Uren</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {regels.map((r) => (
                  <tr key={r.zorgverlener.id} className="border-b border-gray-200">
                    <td className="py-3 pr-3 font-semibold">
                      <span className="flex items-center gap-2">
                        <KleurBolletje kleur={r.zorgverlener.kleur} /> {r.zorgverlener.naam}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-right">{r.aantal}</td>
                    <td className="py-3 pr-3 text-right">{r.perType.dag}</td>
                    <td className="py-3 pr-3 text-right">{r.perType.avond}</td>
                    <td className="py-3 pr-3 text-right">{r.perType.nacht}</td>
                    <td className="py-3 pr-3 text-right">{r.perType.overig}</td>
                    <td className="py-3 text-right font-bold">{urenTekst(r.minuten)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-400 font-bold">
                  <td className="py-3 pr-3">Totaal</td>
                  <td className="py-3 pr-3 text-right">{regels.reduce((s, r) => s + r.aantal, 0)}</td>
                  <td colSpan={4} />
                  <td className="py-3 text-right">{urenTekst(totaal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Kaart>

      <Kaart titel={`Diensten met afwijkende werkelijke tijd (${afwijkingen.length})`}>
        {afwijkingen.length === 0 ? (
          <p className="text-gray-700">Geen. Een afwijking vul je in bij de dienst zelf (Rooster bewerken → dienst aanklikken).</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {afwijkingen.map((d) => (
              <li key={d.id}>
                <Link href={`/beheer/diensten/${d.id}`} className="flex min-h-14 flex-wrap items-center gap-x-4 rounded-xl border-2 border-gray-200 px-4 py-2 hover:bg-blue-50">
                  <strong>{datumKort(d.datum)}</strong>
                  <span>{zvMap.get(d.zorgverlener_id)?.naam}</span>
                  <span>
                    {typeLabel(d.type)} gepland {tijdenTekst(d)}
                  </span>
                  <span className="font-semibold">
                    werkelijk {tijd(d.werkelijke_start ?? d.start_tijd)}–{tijd(d.werkelijke_eind ?? d.eind_tijd)} = {urenTekst(dienstMinuten(d))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Kaart>
    </div>
  );
}
