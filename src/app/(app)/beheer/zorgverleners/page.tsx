import type { Metadata } from "next";
import Link from "next/link";
import { cn, KleurBolletje, knopKlassen, Melding, PaginaTitel } from "@/components/ui";
import { haalZorgverlenersVolledig } from "@/lib/data";

export const metadata: Metadata = { title: "Zorgverleners" };

export default async function ZorgverlenersPagina({ searchParams }: PageProps<"/beheer/zorgverleners">) {
  const sp = await searchParams;
  const lijst = await haalZorgverlenersVolledig();
  return (
    <div className="flex flex-col gap-5">
      {sp.melding === "opgeslagen" && <Melding soort="succes">Opgeslagen.</Melding>}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PaginaTitel>Zorgverleners</PaginaTitel>
        <Link href="/beheer/zorgverleners/nieuw" className={knopKlassen("succes", true)}>
          + Zorgverlener toevoegen
        </Link>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lijst.map((z) => (
          <li key={z.id}>
            <Link
              href={`/beheer/zorgverleners/${z.id}`}
              className={cn(
                "flex min-h-28 flex-col justify-center gap-1 rounded-2xl border-2 border-l-8 bg-white p-4 hover:bg-blue-50",
                !z.actief && "opacity-70",
              )}
              style={{ borderLeftColor: z.kleur }}
            >
              <span className="flex items-center gap-2 text-xl font-bold">
                <KleurBolletje kleur={z.kleur} groot /> {z.naam}
              </span>
              <span className="break-all text-gray-700">{z.email}</span>
              <span className="text-sm font-semibold">
                {z.rol === "admin" ? "Beheerder" : "Zorgverlener"} · {z.actief ? "actief" : "gedeactiveerd"} ·{" "}
                {z.user_id ? "heeft ingelogd" : "nog niet ingelogd"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
