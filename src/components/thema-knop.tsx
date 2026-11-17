"use client";

import { useState } from "react";

/** Wissel tussen licht en donker (standaard donker); de keuze wordt per apparaat onthouden. */
export function ThemaKnop({ start }: { start: "licht" | "donker" }) {
  const [keuze, setKeuze] = useState(start);
  const donker = keuze === "donker";

  function wissel() {
    const nieuw = donker ? "licht" : "donker";
    setKeuze(nieuw);
    document.documentElement.classList.remove("licht", "donker");
    document.documentElement.classList.add(nieuw);
    document.cookie = `thema=${nieuw}; path=/; max-age=${400 * 24 * 3600}; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={wissel}
      className="min-h-12 rounded-xl border-2 border-white/50 px-4 text-base font-semibold text-white hover:bg-blue-600"
      aria-label={donker ? "Lichte modus aanzetten" : "Donkere modus aanzetten"}
    >
      {donker ? "☀️ Licht" : "🌙 Donker"}
    </button>
  );
}
