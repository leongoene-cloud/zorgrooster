import { Fragment } from "react";
import { parseOpmaak, vetStukken } from "@/lib/opmaak";

function Inline({ tekst }: { tekst: string }) {
  return (
    <>
      {vetStukken(tekst).map((stuk, i) => (i % 2 === 1 ? <strong key={i}>{stuk}</strong> : <Fragment key={i}>{stuk}</Fragment>))}
    </>
  );
}

/** Toont een werkbeschrijving met kopjes, lijsten en alinea's; groot en goed leesbaar */
export function OpgemaakteTekst({ tekst }: { tekst: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-4 text-lg leading-relaxed">
      {parseOpmaak(tekst).map((b, i) => {
        if (b.soort === "kop")
          return (
            <h2 key={i} className="mt-2 text-xl font-bold">
              <Inline tekst={b.tekst} />
            </h2>
          );
        if (b.soort === "lijst") {
          const Lijst = b.genummerd ? "ol" : "ul";
          return (
            <Lijst
              key={i}
              start={b.genummerd ? b.start : undefined}
              className={`flex flex-col gap-1.5 pl-7 ${b.genummerd ? "list-decimal" : "list-disc"}`}
            >
              {b.items.map((item, j) => (
                <li key={j}>
                  <Inline tekst={item} />
                </li>
              ))}
            </Lijst>
          );
        }
        return (
          <p key={i}>
            {b.regels.map((r, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <Inline tekst={r} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
