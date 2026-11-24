import { ActieFormulier, VerzendKnop } from "@/components/formulier";
import { Veld, invoerKlassen } from "@/components/ui";
import type { Werkbeschrijving } from "@/lib/types";
import { bewaarWerkbeschrijving } from "./actions";

export function WerkbeschrijvingFormulier({ w }: { w?: Werkbeschrijving }) {
  return (
    <ActieFormulier actie={bewaarWerkbeschrijving} className="flex flex-col gap-6">
      {w && <input type="hidden" name="id" value={w.id} />}
      <Veld label="Titel" htmlFor="titel" hint="Bijvoorbeeld: Ochtendzorg, Nachtdienst, Medicatie, Wat te doen bij koorts">
        <input id="titel" name="titel" required maxLength={120} defaultValue={w?.titel} className={invoerKlassen} />
      </Veld>
      <Veld
        label="Tekst"
        htmlFor="inhoud"
        hint={
          <>
            Plakken uit Word of een notitie kan. Opmaak: begin een regel met <strong>- </strong> voor een opsommingsteken,{" "}
            <strong>1. </strong> voor een genummerde stap, <strong>## </strong> voor een tussenkopje. Zet woorden tussen{" "}
            <strong>**sterretjes**</strong> voor vet. Een lege regel begint een nieuwe alinea.
          </>
        }
      >
        <textarea id="inhoud" name="inhoud" rows={18} defaultValue={w?.inhoud} className={`${invoerKlassen} py-3 font-mono text-base`} />
      </Veld>
      <VerzendKnop className="self-start min-w-56">Opslaan</VerzendKnop>
    </ActieFormulier>
  );
}
