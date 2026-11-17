import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { huidigeSessie } from "@/lib/auth";
import { haalDiensten, haalZorgverleners } from "@/lib/data";
import { eersteDag, huidigeMaand, isGeldigeMaand, laatsteDag } from "@/lib/datum";
import { maakWerkboek } from "@/lib/excel";

export async function GET(request: NextRequest) {
  const sessie = await huidigeSessie();
  if (!sessie?.isAdmin) return new NextResponse("Geen toegang", { status: 403 });
  const m = request.nextUrl.searchParams.get("maand");
  const maand = isGeldigeMaand(m) ? m : huidigeMaand();
  const [diensten, zorgverleners] = await Promise.all([haalDiensten(eersteDag(maand), laatsteDag(maand)), haalZorgverleners()]);
  const buffer = XLSX.write(maakWerkboek(maand, diensten, zorgverleners), { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="zorgrooster-${maand}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
