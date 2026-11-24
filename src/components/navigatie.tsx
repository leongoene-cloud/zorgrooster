"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";

export function Navigatie({ isAdmin }: { isAdmin: boolean }) {
  const pad = usePathname();
  const tabs = [
    { href: "/rooster", label: "Rooster" },
    { href: "/verlof", label: "Verlof" },
    { href: "/werkbeschrijving", label: "Werkbeschrijving" },
    ...(isAdmin ? [{ href: "/beheer", label: "Beheer" }] : []),
  ];
  return (
    <nav aria-label="Hoofdmenu" className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const actief = pad.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={actief ? "page" : undefined}
            className={cn(
              "flex min-h-14 min-w-24 flex-auto items-center justify-center rounded-xl border-2 px-3 text-lg font-bold sm:flex-none sm:px-4",
              actief ? "border-oppervlak bg-oppervlak text-blue-800" : "border-white/50 text-white hover:bg-blue-600",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
