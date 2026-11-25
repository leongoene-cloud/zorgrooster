import { describe, expect, it } from "vitest";
import { parseOpmaak, vetStukken } from "./opmaak";

describe("opmaak werkbeschrijving", () => {
  it("herkent kopjes, lijsten en alinea's", () => {
    const b = parseOpmaak(
      "Inleiding regel 1\nregel 2\n\n## Ochtend\n- wassen\n- **medicatie** geven\n1. eerst dit\n2) dan dat\n\n\nSlot",
    );
    expect(b).toEqual([
      { soort: "alinea", regels: ["Inleiding regel 1", "regel 2"] },
      { soort: "kop", tekst: "Ochtend" },
      { soort: "lijst", genummerd: false, items: ["wassen", "**medicatie** geven"] },
      { soort: "lijst", genummerd: true, items: ["eerst dit", "dan dat"] },
      { soort: "alinea", regels: ["Slot"] },
    ]);
  });
  it("genummerde lijst loopt door na tussenliggende opsomming", () => {
    expect(parseOpmaak("1. eerst\n   - detail\n2. dan")).toEqual([
      { soort: "lijst", genummerd: true, items: ["eerst"] },
      { soort: "lijst", genummerd: false, items: ["detail"] },
      { soort: "lijst", genummerd: true, items: ["dan"], start: 2 },
    ]);
  });
  it("vet en geen HTML", () => {
    expect(vetStukken("a **b** c")).toEqual(["a ", "b", " c"]);
    expect(parseOpmaak("<script>x</script>")).toEqual([{ soort: "alinea", regels: ["<script>x</script>"] }]);
  });
});
