import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActieFormulier, VerzendKnop } from "@/components/formulier";
import { Kaart, Melding, Veld, invoerKlassen } from "@/components/ui";
import { huidigeSessie } from "@/lib/auth";
import { inloggenMetCode, stuurInloglink } from "./actions";

export const metadata: Metadata = { title: "Inloggen" };

const FOUTEN: Record<string, string> = {
  "geen-toegang": "Je account is niet (meer) gekoppeld aan het zorgteam. Neem contact op met de beheerder.",
  "link-ongeldig": "Deze inloglink is verlopen of al gebruikt. Vraag hieronder een nieuwe aan.",
};

export default async function LoginPagina({ searchParams }: PageProps<"/login">) {
  const { fout } = await searchParams;
  const sessie = await huidigeSessie();
  if (sessie?.zorgverlener) redirect("/rooster");

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 p-4">
      <h1 className="text-center text-3xl font-bold">Zorgrooster</h1>
      {typeof fout === "string" && FOUTEN[fout] && <Melding soort="fout">{FOUTEN[fout]}</Melding>}
      <Kaart titel="Inloggen">
        <ActieFormulier actie={stuurInloglink} className="flex flex-col gap-5">
          <Veld label="E-mailadres" htmlFor="email">
            <input id="email" name="email" type="email" autoComplete="email" required className={invoerKlassen} />
          </Veld>
          <VerzendKnop>Stuur mij een inloglink</VerzendKnop>
        </ActieFormulier>
      </Kaart>
      <details className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <summary className="flex min-h-14 cursor-pointer items-center text-lg font-semibold">
          Ik heb een code uit de e-mail
        </summary>
        <ActieFormulier actie={inloggenMetCode} className="mt-4 flex flex-col gap-5">
          <Veld label="E-mailadres" htmlFor="email2">
            <input id="email2" name="email" type="email" autoComplete="email" required className={invoerKlassen} />
          </Veld>
          <Veld label="Code" htmlFor="code">
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              className={`${invoerKlassen} text-2xl tracking-widest`}
            />
          </Veld>
          <VerzendKnop>Inloggen met code</VerzendKnop>
        </ActieFormulier>
      </details>
    </main>
  );
}
