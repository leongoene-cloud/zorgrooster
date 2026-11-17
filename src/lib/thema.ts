import "server-only";
import { cookies } from "next/headers";

export async function themaKeuze(): Promise<"licht" | "donker" | null> {
  const t = (await cookies()).get("thema")?.value;
  return t === "licht" || t === "donker" ? t : null;
}
