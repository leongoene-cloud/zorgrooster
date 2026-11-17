import type { Metadata } from "next";
import Link from "next/link";
import { VerzendKnop } from "@/components/formulier";
import { Kaart } from "@/components/ui";
import { bevestigInloggen } from "./actions";

export const metadata: Metadata = { title: "Inloggen bevestigen" };

/**
 * De inloglink uit de e-mail komt hier binnen. Inloggen gebeurt pas na een klik op de knop,
 * zodat virusscanners die links in e-mails 'openen' de link niet onbruikbaar maken.
 */
export default async function BevestigPagina({ searchParams }: PageProps<"/auth/confirm">) {
  const sp = await searchParams;
  const waarde = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const heeftToken = Boolean(waarde("token_hash") || waarde("code"));

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 p-4">
      <h1 className="text-center text-3xl font-bold">Zorgrooster</h1>
      <Kaart titel={heeftToken ? "Bijna ingelogd" : "Ongeldige link"}>
        {heeftToken ? (
          <form action={bevestigInloggen} className="flex flex-col gap-4">
            <input type="hidden" name="token_hash" value={waarde("token_hash")} />
            <input type="hidden" name="type" value={waarde("type") || "email"} />
            <input type="hidden" name="code" value={waarde("code")} />
            <p className="text-lg">Klik op de knop om in te loggen.</p>
            <VerzendKnop>Inloggen</VerzendKnop>
          </form>
        ) : (
          <p className="text-lg">
            Deze link is niet compleet. <Link className="font-semibold text-blue-800 underline" href="/login">Vraag een nieuwe inloglink aan</Link>.
          </p>
        )}
      </Kaart>
    </main>
  );
}
