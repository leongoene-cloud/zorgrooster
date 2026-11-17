import { ActieFormulier, DatumKiezer, VerzendKnop } from "@/components/formulier";
import { KeuzeTegels, Veld, invoerKlassen } from "@/components/ui";
import { vandaag } from "@/lib/datum";
import type { Schoolvakantie } from "@/lib/types";
import { bewaarVakantie } from "../actions";

export function VakantieFormulier({ v }: { v?: Schoolvakantie }) {
  return (
    <ActieFormulier actie={bewaarVakantie} className="flex flex-col gap-6">
      {v && <input type="hidden" name="id" value={v.id} />}
      <Veld label="Naam" htmlFor="naam" hint="Bijvoorbeeld: Kerstvakantie 2028">
        <input id="naam" name="naam" required maxLength={80} defaultValue={v?.naam} className={invoerKlassen} />
      </Veld>
      <DatumKiezer name="start_datum" label="Eerste dag" standaard={v?.start_datum ?? vandaag()} metKnoppen={false} />
      <DatumKiezer name="eind_datum" label="Laatste dag" standaard={v?.eind_datum ?? vandaag()} metKnoppen={false} />
      <KeuzeTegels
        name="regio"
        legend="Regio"
        standaard={v?.regio ?? "midden"}
        opties={[
          { waarde: "noord", label: "Noord" },
          { waarde: "midden", label: "Midden" },
          { waarde: "zuid", label: "Zuid" },
        ]}
        kolommen="grid-cols-3"
      />
      <Veld label="Opmerking (niet verplicht)" htmlFor="opmerking">
        <input id="opmerking" name="opmerking" maxLength={200} defaultValue={v?.opmerking ?? ""} className={invoerKlassen} />
      </Veld>
      <Veld label="Bron (niet verplicht)" htmlFor="bron">
        <input id="bron" name="bron" maxLength={120} defaultValue={v?.bron ?? "rijksoverheid.nl"} className={invoerKlassen} />
      </Veld>
      <VerzendKnop className="self-start min-w-56">Opslaan</VerzendKnop>
    </ActieFormulier>
  );
}
