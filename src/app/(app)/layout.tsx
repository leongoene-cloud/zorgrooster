import { Navigatie } from "@/components/navigatie";
import { vereisLid } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessie = await vereisLid();
  return (
    <>
      <header className="bg-blue-700 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xl font-bold">Zorgrooster</p>
            {sessie.isAdmin && (
              <div className="flex items-center gap-3 sm:hidden">
                <UitlogKnop />
              </div>
            )}
          </div>
          <Navigatie isAdmin={sessie.isAdmin} />
          <div className="hidden items-center gap-4 sm:flex">
            <span className="text-base">{sessie.zorgverlener.naam}</span>
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
        className="min-h-12 rounded-xl border-2 border-blue-300/60 px-4 text-base font-semibold text-white hover:bg-blue-600"
      >
        Uitloggen
      </button>
    </form>
  );
}
