import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActieFormulier, VerzendKnop } from "@/components/formulier";
import { Kaart, Melding, Veld, invoerKlassen } from "@/components/ui";
import { huidigeSessie } from "@/lib/auth";
import { inloggenBeheer } from "./actions";

export const metadata: Metadata = { title: "Inloggen" };

export default async function LoginPagina({ searchParams }: PageProps<"/login">) {
  const { fout } = await searchParams;
  const sessie = await huidigeSessie();
  if (sessie?.soort === "admin") redirect("/beheer");
  const viaLink = sessie?.soort === "zorgverlener" ? sessie.zorgverlener.naam : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 p-4">
      <h1 className="text-center text-3xl font-bold">Zorgrooster</h1>
      {fout === "link-ongeldig" && (
        <Melding soort="fout">Deze link werkt niet (meer). Vraag de beheerder om een nieuwe persoonlijke link.</Melding>
      )}
      {viaLink && (
        <Melding soort="info">
          Dit apparaat gebruikt nu de persoonlijke link van <strong>{viaLink}</strong>. Log hieronder in als beheerder; de link wordt
          dan op dit apparaat vergeten.
        </Melding>
      )}
      <Kaart titel="Zorgverlener?">
        <p className="text-lg">
          Open de persoonlijke link die je van de beheerder hebt gekregen. Daarna kun je het rooster op dit apparaat altijd openen,
          zonder in te loggen.
        </p>
      </Kaart>
      <Kaart titel="Beheer">
        <ActieFormulier actie={inloggenBeheer} className="flex flex-col gap-5">
          {/* verborgen gebruikersnaam helpt wachtwoordmanagers het wachtwoord te onthouden */}
          <input type="text" name="username" autoComplete="username" value="beheer" readOnly hidden />
          <Veld label="Wachtwoord" htmlFor="wachtwoord">
            <input
              id="wachtwoord"
              name="wachtwoord"
              type="password"
              autoComplete="current-password"
              required
              className={invoerKlassen}
            />
          </Veld>
          <VerzendKnop>Inloggen</VerzendKnop>
        </ActieFormulier>
      </Kaart>
    </main>
  );
}
