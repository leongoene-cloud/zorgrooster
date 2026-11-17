import type { Waarschuwing } from "@/lib/controles";
import { Melding } from "./ui";

const KOP: Record<Waarschuwing["soort"], string> = {
  overlap: "Dubbele of overlappende diensten",
  verlof: "Dienst tijdens goedgekeurd verlof",
  gat: "Gaten in de zorg",
};

export function WaarschuwingLijst({ lijst, leegTekst = "Geen waarschuwingen. Alle dagen en nachten zijn gedekt." }: { lijst: Waarschuwing[]; leegTekst?: string }) {
  if (!lijst.length) return <Melding soort="succes">{leegTekst}</Melding>;
  const groepen = (Object.keys(KOP) as Waarschuwing["soort"][])
    .map((s) => [s, lijst.filter((w) => w.soort === s)] as const)
    .filter(([, l]) => l.length);
  return (
    <div className="flex flex-col gap-3">
      {groepen.map(([soort, l]) => (
        <Melding key={soort} soort={soort === "gat" ? "waarschuwing" : "fout"}>
          <p className="font-bold">
            {KOP[soort]} ({l.length})
          </p>
          <ul className="mt-1 list-disc pl-6">
            {l.map((w, i) => (
              <li key={i}>{w.tekst}</li>
            ))}
          </ul>
        </Melding>
      ))}
    </div>
  );
}
