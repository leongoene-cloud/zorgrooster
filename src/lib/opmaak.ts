/**
 * Eenvoudige opmaak voor werkbeschrijvingen (geen HTML, dus veilig):
 *   ## Kopje            → tussenkopje
 *   - punt / * / •      → opsomming
 *   1. stap / 1) stap   → genummerde lijst
 *   **vet**             → vetgedrukt
 *   lege regel          → nieuwe alinea
 */
export type Blok =
  | { soort: "kop"; tekst: string }
  | { soort: "alinea"; regels: string[] }
  | { soort: "lijst"; genummerd: boolean; items: string[] };

export function parseOpmaak(tekst: string): Blok[] {
  const blokken: Blok[] = [];
  const laatste = () => blokken[blokken.length - 1];
  for (const ruw of tekst.replace(/\r\n?/g, "\n").split("\n")) {
    const regel = ruw.trim();
    if (!regel) {
      blokken.push({ soort: "alinea", regels: [] }); // scheiding; lege blokken worden hieronder weggefilterd
      continue;
    }
    const kop = regel.match(/^#{1,3}\s+(.*)$/);
    const punt = regel.match(/^[-*•]\s+(.*)$/);
    const nummer = regel.match(/^\d+[.)]\s+(.*)$/);
    if (kop) blokken.push({ soort: "kop", tekst: kop[1] });
    else if (punt || nummer) {
      const genummerd = Boolean(nummer);
      const item = (punt ?? nummer)![1];
      const l = laatste();
      if (l?.soort === "lijst" && l.genummerd === genummerd) l.items.push(item);
      else blokken.push({ soort: "lijst", genummerd, items: [item] });
    } else {
      const l = laatste();
      if (l?.soort === "alinea" && l.regels.length > 0) l.regels.push(regel);
      else blokken.push({ soort: "alinea", regels: [regel] });
    }
  }
  return blokken.filter((b) => b.soort !== "alinea" || b.regels.length > 0);
}

/** Splitst tekst in stukken; oneven indexen staan tussen ** ** (vet) */
export function vetStukken(tekst: string): string[] {
  return tekst.split(/\*\*(.+?)\*\*/g);
}
