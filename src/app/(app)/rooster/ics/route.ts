import { NextResponse, type NextRequest } from "next/server";
import { huidigeSessie } from "@/lib/auth";
import { haalDiensten, haalZorgverleners } from "@/lib/data";
import { eersteDag, huidigeMaand, isGeldigeMaand, laatsteDag } from "@/lib/datum";
import { maakIcs } from "@/lib/ics";

export async function GET(request: NextRequest) {
  const sessie = await huidigeSessie();
  if (!sessie?.zorgverlener) return new NextResponse("Niet ingelogd", { status: 401 });
  const p = request.nextUrl.searchParams;
  const maand = isGeldigeMaand(p.get("maand")) ? p.get("maand")! : huidigeMaand();
  const zv = p.get("zv") ?? undefined;
  const [diensten, zorgverleners] = await Promise.all([
    haalDiensten(eersteDag(maand), laatsteDag(maand), zv),
    haalZorgverleners(),
  ]);
  const namen = new Map(zorgverleners.map((z) => [z.id, z.naam]));
  const naam = zv ? (namen.get(zv) ?? "rooster").normalize("NFD").replace(/[^a-zA-Z0-9]+/g, "-") : "iedereen";
  return new NextResponse(maakIcs(diensten, namen), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="diensten-${naam}-${maand}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
