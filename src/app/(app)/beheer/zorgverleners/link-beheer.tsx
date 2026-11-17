"use client";

import { useActionState, useState } from "react";
import { VerzendKnop } from "@/components/formulier";
import { Knop, knopKlassen, Melding, invoerKlassen } from "@/components/ui";

type Status = { fout?: string; link?: string } | undefined;

export function LinkBeheer({
  id,
  naam,
  heeftLink,
  maakLink,
}: {
  id: string;
  naam: string;
  heeftLink: boolean;
  maakLink: (s: Status, d: FormData) => Promise<Status>;
}) {
  const [status, actie] = useActionState(maakLink, undefined);
  const [gekopieerd, setGekopieerd] = useState(false);
  const link = status?.link;
  const bericht = `Hoi ${naam}, met deze link open je het zorgrooster (bewaar hem goed en deel hem niet): ${link}`;

  return (
    <div className="flex flex-col gap-4">
      {status?.fout && <Melding soort="fout">{status.fout}</Melding>}
      {link ? (
        <>
          <Melding soort="succes">
            Nieuwe link gemaakt. <strong>Stuur hem nu door:</strong> om veiligheidsredenen kun je deze link later niet meer bekijken
            (wel een nieuwe maken).
          </Melding>
          <input readOnly value={link} className={`${invoerKlassen} font-mono text-base`} aria-label="Persoonlijke link" onFocus={(e) => e.currentTarget.select()} />
          <div className="flex flex-wrap gap-4">
            <Knop
              groot
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setGekopieerd(true);
              }}
            >
              {gekopieerd ? "✓ Gekopieerd" : "Kopieer link"}
            </Knop>
            <a href={`https://wa.me/?text=${encodeURIComponent(bericht)}`} target="_blank" rel="noopener noreferrer" className={knopKlassen("succes", true)}>
              Stuur via WhatsApp
            </a>
            <a href={`mailto:?subject=${encodeURIComponent("Je link naar het zorgrooster")}&body=${encodeURIComponent(bericht)}`} className={knopKlassen("secundair", true)}>
              Stuur via e-mail
            </a>
          </div>
        </>
      ) : (
        <form action={actie} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={id} />
          {heeftLink && <p className="text-lg">Er is al een link. Maak je een nieuwe, dan werkt de oude meteen niet meer.</p>}
          <VerzendKnop className="self-start">{heeftLink ? "Nieuwe link maken (oude stopt)" : "Persoonlijke link maken"}</VerzendKnop>
        </form>
      )}
    </div>
  );
}
