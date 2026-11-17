"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";

const ITEMS = [
  { href: "/beheer", label: "Overzicht", exact: true },
  { href: "/beheer/rooster", label: "Rooster bewerken" },
  { href: "/beheer/vervanging", label: "Vervanging" },
  { href: "/beheer/zorgverleners", label: "Zorgverleners" },
  { href: "/beheer/sjabloon", label: "Weeksjabloon" },
  { href: "/beheer/uren", label: "Uren & export" },
  { href: "/beheer/import", label: "Import" },
  { href: "/beheer/vakanties", label: "Vakanties" },
  { href: "/beheer/log", label: "Wijzigingslog" },
];

export function BeheerNav() {
  const pad = usePathname();
  return (
    <nav aria-label="Beheermenu" className="mb-6 flex flex-wrap gap-3">
      {ITEMS.map((i) => {
        const actief = i.exact ? pad === i.href : pad.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={actief ? "page" : undefined}
            className={cn(
              "flex min-h-16 items-center justify-center rounded-xl border-2 px-5 text-lg font-semibold",
              actief ? "border-blue-700 bg-blue-700 text-white" : "border-gray-300 bg-white text-gray-900 hover:bg-gray-100",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
