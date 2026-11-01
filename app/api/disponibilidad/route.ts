import { NextResponse } from "next/server";
import { listarTurnos } from "@/lib/store";
import { disponibilidad } from "@/lib/agenda";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const fecha = u.searchParams.get("fecha") ?? "";
  const servicio = u.searchParams.get("servicio") ?? "";
  const profesional = u.searchParams.get("profesional") || undefined;
  return NextResponse.json(disponibilidad(await listarTurnos(), fecha, servicio, profesional));
}
