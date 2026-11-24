import type { Metadata } from "next";
import Link from "next/link";
import { cn, Kaart, knopKlassen, LegeStaat, PaginaTitel } from "@/components/ui";
import { haalZorgverlenersVolledig } from "@/lib/data";
import { datumKort, tijd, tijdstipTekst } from "@/lib/datum";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Wijzigingslog" };

const PER_PAGINA = 50;

const TABELLEN: Record<string, string> = {
  diensten: "Diensten",
  verlof_aanvragen: "Verlof",
  zorgverleners: "Zorgverleners",
  dienst_sjablonen: "Sjabloon",
  schoolvakanties: "Vakanties",
  werkbeschrijvingen: "Werkbeschrijving",
};
const ACTIES: Record<string, string> = { insert: "toegevoegd", update: "gewijzigd", delete: "verwijderd" };

const VELDNAMEN: Record<string, string> = {
  zorgverlener_id: "zorgverlener",
  datum: "datum",
  type: "type",
  start_tijd: "begintijd",
  eind_tijd: "eindtijd",
  werkelijke_start: "werkelijke begintijd",
  werkelijke_eind: "werkelijke eindtijd",
  vervanging_nodig: "vervanging nodig",
  notitie: "notitie",
  status: "status",
  start_datum: "startdatum",
  eind_datum: "einddatum",
  opmerking_admin: "opmerking",
  naam: "naam",
  email: "e-mail",
  kleur: "kleur",
  actief: "actief",
  rol: "rol",
  weekdag: "weekdag",
  reden: "reden",
  regio: "regio",
  titel: "titel",
  inhoud: "tekst",
  volgorde: "volgorde",
  opmerking: "opmerking",
};
const NEGEER = new Set(["id", "created_at", "bijgewerkt_op", "aangevraagd_op", "beoordeeld_op", "user_id", "bron", "toegang_hash", "toegang_aangemaakt"]);

type Rij = Record<string, unknown> | null;
interface LogRegel {
  id: number;
  user_id: string | null;
  zorgverlener_id: string | null;
  tabel: string;
  actie: string;
  oud: Rij;
  nieuw: Rij;
  tijd: string;
}

export default async function LogPagina({ searchParams }: PageProps<"/beheer/log">) {
  const sp = await searchParams;
  const tabel = typeof sp.tabel === "string" && sp.tabel in TABELLEN ? sp.tabel : undefined;
  const pagina = Math.max(0, Number(sp.pagina) || 0);
  const supabase = await createClient();
  let q = supabase.from("audit_log").select("*").order("id", { ascending: false }).range(pagina * PER_PAGINA, pagina * PER_PAGINA + PER_PAGINA);
  if (tabel) q = q.eq("tabel", tabel);
  const [{ data }, zorgverleners] = await Promise.all([q, haalZorgverlenersVolledig()]);
  const regels = ((data ?? []) as LogRegel[]).slice(0, PER_PAGINA);
  const meer = (data ?? []).length > PER_PAGINA;
  const naamVanUser = new Map(zorgverleners.filter((z) => z.user_id).map((z) => [z.user_id!, z.naam]));
  const naamVanZv = new Map(zorgverleners.map((z) => [z.id, z.naam]));

  const waarde = (veld: string, w: unknown): string => {
    if (w === null || w === undefined || w === "") return "—";
    if (veld === "zorgverlener_id") return naamVanZv.get(String(w)) ?? "?";
    if (typeof w === "boolean") return w ? "ja" : "nee";
    if (/tijd|werkelijke/.test(veld)) return tijd(String(w));
    if (/datum/.test(veld)) return datumKort(String(w));
    return String(w);
  };

  const samenvatting = (r: LogRegel): string => {
    const rij = (r.nieuw ?? r.oud ?? {}) as Record<string, unknown>;
    if (r.tabel === "diensten" || r.tabel === "dienst_sjablonen") {
      const wie = naamVanZv.get(String(rij.zorgverlener_id)) ?? "?";
      const wanneer = r.tabel === "diensten" ? datumKort(String(rij.datum)) : `weekdag ${rij.weekdag}`;
      return `${wie} · ${rij.type} · ${wanneer} ${tijd(String(rij.start_tijd))}–${tijd(String(rij.eind_tijd))}`;
    }
    if (r.tabel === "verlof_aanvragen") {
      return `${naamVanZv.get(String(rij.zorgverlener_id)) ?? "?"} · ${datumKort(String(rij.start_datum))} t/m ${datumKort(String(rij.eind_datum))}`;
    }
    return String(rij.naam ?? rij.titel ?? "");
  };

  const wijzigingen = (r: LogRegel): string[] => {
    if (r.actie !== "update" || !r.oud || !r.nieuw) return [];
    return Object.keys(r.nieuw)
      .filter((k) => !NEGEER.has(k) && JSON.stringify(r.oud![k]) !== JSON.stringify(r.nieuw![k]))
      .map((k) => `${VELDNAMEN[k] ?? k}: ${waarde(k, r.oud![k])} → ${waarde(k, r.nieuw![k])}`);
  };

  const link = (t?: string, p = 0) => {
    const s = new URLSearchParams();
    if (t) s.set("tabel", t);
    if (p) s.set("pagina", String(p));
    return `/beheer/log?${s}`;
  };
  const chip = (actief: boolean) =>
    cn(
      "inline-flex min-h-14 items-center rounded-full border-2 px-5 text-lg font-semibold",
      actief ? "border-blue-700 bg-blue-700 text-white" : "border-gray-300 bg-oppervlak hover:bg-gray-100",
    );

  return (
    <div className="flex flex-col gap-5">
      <PaginaTitel sub="Wie heeft wat gewijzigd, en wanneer. Nieuwste bovenaan.">Wijzigingslog</PaginaTitel>
      <div className="flex flex-wrap gap-2">
        <Link href={link()} className={chip(!tabel)}>
          Alles
        </Link>
        {Object.entries(TABELLEN).map(([k, label]) => (
          <Link key={k} href={link(k)} className={chip(tabel === k)}>
            {label}
          </Link>
        ))}
      </div>
      <Kaart>
        {regels.length === 0 ? (
          <LegeStaat>Nog geen wijzigingen.</LegeStaat>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-200">
            {regels.map((r) => (
              <li key={r.id} className="flex flex-col gap-0.5 py-3">
                <span className="text-sm text-gray-700">
                  {tijdstipTekst(r.tijd)} · {r.user_id
                    ? (naamVanUser.get(r.user_id) ?? "onbekende gebruiker")
                    : r.zorgverlener_id
                      ? `${naamVanZv.get(r.zorgverlener_id) ?? "zorgverlener"} (via persoonlijke link)`
                      : "systeem"}
                </span>
                <span className="text-lg">
                  <strong>
                    {TABELLEN[r.tabel] ?? r.tabel} {ACTIES[r.actie] ?? r.actie}
                  </strong>
                  : {samenvatting(r)}
                </span>
                {wijzigingen(r).map((w) => (
                  <span key={w} className="pl-4 text-gray-800">
                    {w}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}
      </Kaart>
      <div className="flex gap-4">
        {pagina > 0 && (
          <Link href={link(tabel, pagina - 1)} className={knopKlassen("secundair", true)}>
            ← Nieuwer
          </Link>
        )}
        {meer && (
          <Link href={link(tabel, pagina + 1)} className={knopKlassen("secundair", true)}>
            Ouder →
          </Link>
        )}
      </div>
    </div>
  );
}
