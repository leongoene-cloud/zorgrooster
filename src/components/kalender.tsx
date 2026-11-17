import Link from "next/link";
import { datumLang, kalenderWeken, naarDatum, WEEKDAG_KORT, WEEKDAG_NAMEN, tijd } from "@/lib/datum";
import type { Dienst, Schoolvakantie, VerlofPeriode, ZorgverlenerPubliek } from "@/lib/types";
import { typeLabel } from "@/lib/types";
import { minuten } from "@/lib/uren";
import { cn, KleurBolletje } from "./ui";

interface Props {
  maand: string;
  diensten: Dienst[];
  zorgverleners: ZorgverlenerPubliek[];
  verlof: VerlofPeriode[];
  vakanties: Schoolvakantie[];
  vandaag: string;
  beheer?: boolean;
  /** Bij filter op één persoon: lege dagen in de lijstweergave overslaan */
  gefilterd?: boolean;
  /** Dagen met een waarschuwing (alleen beheer) */
  waarschuwingDagen?: Set<string>;
}

export function tijdenTekst(d: Pick<Dienst, "start_tijd" | "eind_tijd">): string {
  const volgendeDag = minuten(d.eind_tijd) <= minuten(d.start_tijd);
  return `${tijd(d.start_tijd)}–${tijd(d.eind_tijd)}${volgendeDag ? " (+1)" : ""}`;
}

function DienstKaartje({ d, zv, beheer }: { d: Dienst; zv?: ZorgverlenerPubliek; beheer?: boolean }) {
  const inhoud = (
    <>
      <span className="flex items-center gap-2 font-bold">
        <KleurBolletje kleur={zv?.kleur ?? "#6b7280"} />
        <span className="truncate">{zv?.naam ?? "Onbekend"}</span>
      </span>
      <span className="text-sm text-gray-800">
        {typeLabel(d.type)} · <span className="tabular-nums">{tijdenTekst(d)}</span>
      </span>
      {d.vervanging_nodig && (
        <span className="mt-1 inline-block rounded-md bg-red-700 px-2 py-0.5 text-xs font-bold text-white">
          Vervanging nodig
        </span>
      )}
      {d.notitie && <span className="mt-0.5 block text-xs text-gray-700">{d.notitie}</span>}
    </>
  );
  const stijl = cn(
    "flex flex-col rounded-lg border-2 border-l-[6px] bg-white px-2 py-1.5 text-left leading-snug",
    d.vervanging_nodig ? "border-red-600" : "border-gray-200",
  );
  if (beheer) {
    return (
      <Link
        href={`/beheer/diensten/${d.id}`}
        className={cn(stijl, "min-h-14 hover:bg-blue-50")}
        style={{ borderLeftColor: zv?.kleur }}
        aria-label={`Dienst ${zv?.naam ?? ""} ${typeLabel(d.type)} ${tijdenTekst(d)} bewerken`}
      >
        {inhoud}
      </Link>
    );
  }
  return (
    <div className={stijl} style={{ borderLeftColor: zv?.kleur }}>
      {inhoud}
    </div>
  );
}

export function MaandKalender(p: Props) {
  const weken = kalenderWeken(p.maand);
  const zvMap = new Map(p.zorgverleners.map((z) => [z.id, z]));
  const perDatum = new Map<string, Dienst[]>();
  for (const d of p.diensten) perDatum.set(d.datum, [...(perDatum.get(d.datum) ?? []), d]);
  const vakantieOp = (datum: string) => p.vakanties.find((v) => v.start_datum <= datum && datum <= v.eind_datum);
  const verlofOp = (datum: string) =>
    p.verlof.filter((v) => v.start_datum <= datum && datum <= v.eind_datum).map((v) => zvMap.get(v.zorgverlener_id)?.naam ?? "?");

  const dagLabels = (datum: string) => {
    const vak = vakantieOp(datum);
    const verlof = verlofOp(datum);
    return (
      <>
        {vak && <span className="block text-xs font-semibold text-amber-900">{vak.naam}</span>}
        {verlof.map((n) => (
          <span key={n} className="mt-0.5 inline-block rounded-md border border-purple-400 bg-purple-100 px-1.5 text-xs font-bold text-purple-950">
            Verlof: {n}
          </span>
        ))}
        {p.waarschuwingDagen?.has(datum) && (
          <span className="mt-0.5 inline-block rounded-md border border-amber-500 bg-amber-100 px-1.5 text-xs font-bold text-amber-950">
            Let op
          </span>
        )}
      </>
    );
  };

  const nieuwKnop = (datum: string, breed?: boolean) => (
    <Link
      href={`/beheer/diensten/nieuw?datum=${datum}`}
      className={cn(
        "flex min-h-14 items-center justify-center rounded-lg border-2 border-dashed border-blue-500 bg-blue-50 font-semibold text-blue-900 hover:bg-blue-100",
        breed ? "px-4 text-lg" : "text-base",
      )}
      aria-label={`Dienst toevoegen op ${datumLang(datum)}`}
    >
      + Dienst
    </Link>
  );

  return (
    <>
      {/* Raster voor tablet en desktop */}
      <div className="hidden md:block" role="table" aria-label="Maandrooster">
        <div className="grid grid-cols-7 gap-1.5" role="row">
          {WEEKDAG_NAMEN.map((n) => (
            <div key={n} role="columnheader" className="px-2 py-1 text-center text-sm font-bold uppercase text-gray-700">
              {n}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {weken.map((week) => (
            <div key={week[0]} className="grid grid-cols-7 gap-1.5" role="row">
              {week.map((datum) => {
                const inMaand = datum.startsWith(p.maand);
                const vak = vakantieOp(datum);
                const isVandaag = datum === p.vandaag;
                return (
                  <div
                    key={datum}
                    role="cell"
                    aria-label={datumLang(datum)}
                    className={cn(
                      "flex min-h-32 flex-col gap-1 rounded-xl border p-1.5",
                      inMaand ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60",
                      vak && inMaand && "vakantie-achtergrond",
                      isVandaag && "ring-4 ring-blue-600",
                    )}
                  >
                    <div className="flex flex-col">
                      <span className={cn("text-lg font-bold", isVandaag && "text-blue-800")}>
                        {naarDatum(datum).getUTCDate()}
                        {isVandaag && <span className="ml-1 text-xs font-semibold">vandaag</span>}
                      </span>
                      {inMaand && dagLabels(datum)}
                    </div>
                    {inMaand && (
                      <>
                        {(perDatum.get(datum) ?? []).map((d) => (
                          <DienstKaartje key={d.id} d={d} zv={zvMap.get(d.zorgverlener_id)} beheer={p.beheer} />
                        ))}
                        {p.beheer && nieuwKnop(datum)}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Lijst per dag voor de telefoon */}
      <ol className="flex flex-col gap-3 md:hidden" aria-label="Rooster per dag">
        {weken
          .flat()
          .filter((d) => d.startsWith(p.maand))
          .map((datum) => {
            const diensten = perDatum.get(datum) ?? [];
            const verlof = verlofOp(datum);
            if (p.gefilterd && diensten.length === 0 && verlof.length === 0) return null;
            const vak = vakantieOp(datum);
            const isVandaag = datum === p.vandaag;
            return (
              <li
                key={datum}
                id={`dag-${datum}`}
                className={cn(
                  "rounded-xl border border-gray-200 bg-white p-3",
                  vak && "vakantie-achtergrond",
                  isVandaag && "ring-4 ring-blue-600",
                )}
              >
                <h3 className="text-lg font-bold">
                  {WEEKDAG_KORT[(naarDatum(datum).getUTCDay() + 6) % 7]} {naarDatum(datum).getUTCDate()}
                  {isVandaag && <span className="ml-2 text-sm font-semibold text-blue-800">vandaag</span>}
                </h3>
                <div className="mb-1 flex flex-wrap gap-1">
                  {dagLabels(datum)}
                </div>
                <div className="flex flex-col gap-1.5">
                  {diensten.length === 0 && <p className="text-gray-600">Geen diensten</p>}
                  {diensten.map((d) => (
                    <DienstKaartje key={d.id} d={d} zv={zvMap.get(d.zorgverlener_id)} beheer={p.beheer} />
                  ))}
                  {p.beheer && nieuwKnop(datum, true)}
                </div>
              </li>
            );
          })}
      </ol>
    </>
  );
}
