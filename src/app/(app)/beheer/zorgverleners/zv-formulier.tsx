import { ActieFormulier, VerzendKnop } from "@/components/formulier";
import { KeuzeTegels, Veld, invoerKlassen } from "@/components/ui";
import type { Zorgverlener } from "@/lib/types";
import { bewaarZorgverlener } from "../actions";

/** Goed te onderscheiden kleuren met voldoende contrast op wit */
export const KLEUREN = [
  { waarde: "#1d4ed8", label: "Blauw" },
  { waarde: "#be185d", label: "Roze" },
  { waarde: "#047857", label: "Groen" },
  { waarde: "#b45309", label: "Oranje" },
  { waarde: "#7c3aed", label: "Paars" },
  { waarde: "#0e7490", label: "Turquoise" },
  { waarde: "#b91c1c", label: "Rood" },
  { waarde: "#4d7c0f", label: "Olijf" },
  { waarde: "#374151", label: "Grijs" },
  { waarde: "#a21caf", label: "Magenta" },
];

export function ZorgverlenerFormulier({ zv }: { zv?: Zorgverlener }) {
  const kleuren = zv && !KLEUREN.some((k) => k.waarde === zv.kleur) ? [...KLEUREN, { waarde: zv.kleur, label: "Huidig" }] : KLEUREN;
  return (
    <ActieFormulier actie={bewaarZorgverlener} className="flex flex-col gap-6">
      {zv && <input type="hidden" name="id" value={zv.id} />}
      <Veld label="Naam" htmlFor="naam">
        <input id="naam" name="naam" required maxLength={80} defaultValue={zv?.naam} className={invoerKlassen} />
      </Veld>
      <Veld label="E-mailadres (niet verplicht)" htmlFor="email" hint="Alleen nodig voor de beheerder. Zorgverleners openen de app met hun persoonlijke link.">
        <input id="email" name="email" type="email" defaultValue={zv?.email ?? ""} className={invoerKlassen} />
      </Veld>
      <KeuzeTegels
        name="kleur"
        legend="Kleur in het rooster"
        standaard={zv?.kleur ?? KLEUREN[0].waarde}
        opties={kleuren.map((k) => ({ waarde: k.waarde, label: k.label, kleur: k.waarde }))}
        kolommen="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      />
      <KeuzeTegels
        name="rol"
        legend="Rol"
        standaard={zv?.rol ?? "zorgverlener"}
        opties={[
          { waarde: "zorgverlener", label: "Zorgverlener" },
          { waarde: "admin", label: "Beheerder" },
        ]}
        kolommen="grid-cols-2"
      />
      <KeuzeTegels
        name="actief"
        legend="Status"
        standaard={zv && !zv.actief ? "nee" : "ja"}
        opties={[
          { waarde: "ja", label: "Actief (link werkt)" },
          { waarde: "nee", label: "Gedeactiveerd (geen toegang)" },
        ]}
        kolommen="grid-cols-1 sm:grid-cols-2"
      />
      <VerzendKnop className="self-start min-w-56">Opslaan</VerzendKnop>
    </ActieFormulier>
  );
}
