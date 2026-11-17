import "server-only";
import { cookies } from "next/headers";

/** Thema van deze bezoeker: eigen keuze uit de cookie, anders standaard donker */
export async function themaKeuze(): Promise<"licht" | "donker"> {
  return (await cookies()).get("thema")?.value === "licht" ? "licht" : "donker";
}
