"use client";

import { useState } from "react";
import { ActieFormulier, VerzendKnop, type Actie } from "@/components/formulier";
import { cn, Knop, Melding } from "@/components/ui";
import { tijdenTekst } from "@/components/kalender";
import { datumKort } from "@/lib/datum";
import { parseImport, type ImportResultaat } from "@/lib/importeren";
import { typeLabel, type ZorgverlenerPubliek } from "@/lib/types";

type Blad = { naam: string; rijen: Record<string, unknown>[] };

export function ImportScherm({ actie, zorgverleners }: { actie: Actie; zorgverleners: ZorgverlenerPubliek[] }) {
  const [bestand, setBestand] = useState<string>("");
  const [bladen, setBladen] = useState<Blad[]>([]);
  const [gekozen, setGekozen] = useState<string[]>([]);
  const [leesFout, setLeesFout] = useState<string>("");

  async function lees(f: File) {
    setLeesFout("");
    setBladen([]);
    try {
      const XLSX = await import("xlsx");
      const isCsv = /\.csv$/i.test(f.name);
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array", raw: isCsv });
      const lijst = wb.SheetNames.map((naam) => ({
        naam,
        rijen: XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[naam], { defval: "" }),
      })).filter((b) => b.rijen.length > 0);
      if (!lijst.length) throw new Error("leeg");
      setBestand(f.name);
      setBladen(lijst);
      setGekozen(lijst.map((b) => b.naam));
    } catch {
      setLeesFout("Dit bestand kon niet worden gelezen. Gebruik .xlsx of .csv met de kolommen datum, naam, type, start, eind.");
    }
  }

  const resultaten: (ImportResultaat & { blad: string })[] = bladen
    .filter((b) => gekozen.includes(b.naam))
    .map((b) => ({ blad: b.naam, ...parseImport(b.rijen as never, zorgverleners) }));
  const diensten = resultaten.flatMap((r) => r.diensten);
  const fouten = resultaten.flatMap((r) => r.fouten.map((f) => ({ ...f, blad: r.blad })));

  return (
    <div className="flex flex-col gap-6">
      <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-4 border-dashed border-blue-400 bg-blue-50 p-6 text-center text-xl font-semibold text-blue-900 hover:bg-blue-100 has-[:focus-visible]:outline has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-amber-500">
        {bestand ? `Gekozen: ${bestand} (klik om een ander bestand te kiezen)` : "Kies een Excel- of CSV-bestand"}
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(e) => e.target.files?.[0] && lees(e.target.files[0])}
        />
      </label>
      {leesFout && <Melding soort="fout">{leesFout}</Melding>}

      {bladen.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-lg font-semibold">Welke tabbladen importeren?</legend>
          <div className="flex flex-wrap gap-3">
            {bladen.map((b) => {
              const aan = gekozen.includes(b.naam);
              return (
                <Knop
                  key={b.naam}
                  variant={aan ? "primair" : "secundair"}
                  aria-pressed={aan}
                  onClick={() => setGekozen(aan ? gekozen.filter((n) => n !== b.naam) : [...gekozen, b.naam])}
                >
                  {aan ? "✓ " : ""}
                  {b.naam} ({b.rijen.length})
                </Knop>
              );
            })}
          </div>
        </fieldset>
      )}

      {bladen.length > 0 && (
        <>
          <Melding soort={fouten.length ? "waarschuwing" : "info"}>
            <strong>{diensten.length}</strong> diensten gevonden
            {fouten.length > 0 && (
              <>
                , <strong>{fouten.length}</strong> regels met fouten (die worden niet geïmporteerd)
              </>
            )}
            . Diensten die al precies zo bestaan, worden overgeslagen.
          </Melding>
          {fouten.length > 0 && (
            <div className="rounded-xl border-2 border-amber-300 bg-oppervlak p-4">
              <p className="mb-2 font-bold">Regels met fouten</p>
              <ul className="list-disc pl-6">
                {fouten.slice(0, 50).map((f, i) => (
                  <li key={i}>
                    {bladen.length > 1 && `${f.blad}, `}rij {f.rij}: {f.melding}
                  </li>
                ))}
                {fouten.length > 50 && <li>… en nog {fouten.length - 50}</li>}
              </ul>
            </div>
          )}
          {diensten.length > 0 && (
            <>
              <div className="max-h-[28rem] overflow-auto rounded-xl border-2 border-gray-200 bg-oppervlak">
                <table className="w-full text-left text-base">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr>
                      <th className="p-2">Datum</th>
                      <th className="p-2">Naam</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Tijd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diensten.map((d, i) => (
                      <tr key={i} className={cn("border-t border-gray-200")}>
                        <td className="p-2">{datumKort(d.datum)} {d.datum.slice(0, 4)}</td>
                        <td className="p-2">{d.naam}</td>
                        <td className="p-2">{typeLabel(d.type)}</td>
                        <td className="p-2 tabular-nums">{tijdenTekst(d)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ActieFormulier actie={actie}>
                <input
                  type="hidden"
                  name="diensten"
                  value={JSON.stringify(diensten.map(({ zorgverlener_id, datum, type, start_tijd, eind_tijd }) => ({ zorgverlener_id, datum, type, start_tijd, eind_tijd })))}
                />
                <VerzendKnop variant="succes">{diensten.length} diensten importeren</VerzendKnop>
              </ActieFormulier>
            </>
          )}
        </>
      )}
    </div>
  );
}
