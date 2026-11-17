import { Navigatie } from "@/components/navigatie";
import { ThemaKnop } from "@/components/thema-knop";
import { vereisLid } from "@/lib/auth";
import { themaKeuze } from "@/lib/thema";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessie = await vereisLid();
  const thema = await themaKeuze();
  return (
    <>
      <header className="bg-blue-700 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xl font-bold">Zorgrooster</p>
            <div className="flex items-center gap-3 sm:hidden">
              <ThemaKnop start={thema} />
              {sessie.isAdmin && <UitlogKnop />}
            </div>
          </div>
          <Navigatie isAdmin={sessie.isAdmin} />
          <div className="hidden items-center gap-4 sm:flex">
            <span className="text-base">{sessie.zorgverlener.naam}</span>
            <ThemaKnop start={thema} />
            {sessie.isAdmin && <UitlogKnop />}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </>
  );
}

function UitlogKnop() {
  return (
    <form action="/auth/uitloggen" method="post">
      <button
        type="submit"
        className="min-h-12 rounded-xl border-2 border-white/50 px-4 text-base font-semibold text-white hover:bg-blue-600"
      >
        Uitloggen
      </button>
    </form>
  );
}
