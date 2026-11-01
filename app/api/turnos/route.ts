import { NextResponse } from "next/server";
import { listarTurnos, actualizarEstado, type EstadoTurno } from "@/lib/store";
import { crearTurno, type DatosTurno } from "@/lib/reservas";
import { CANALES, type Canal } from "@/lib/negocio";
import { autorizado } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  const turnos = await listarTurnos();
  turnos.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  return NextResponse.json({ turnos });
}

// Alta manual desde el panel (pedidos que entraron por WhatsApp, teléfono o mostrador)
export async function POST(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  const body = (await req.json()) as DatosTurno & { canal: Canal };
  const canal: Canal = body.canal in CANALES ? body.canal : "mostrador";
  const r = await crearTurno(body, canal);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ turno: r.turno });
}

export async function PATCH(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  const { id, estado } = (await req.json()) as { id: string; estado: EstadoTurno };
  if (!["confirmado", "atendido", "cancelado"].includes(estado)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }
  const t = await actualizarEstado(id, estado);
  if (!t) return NextResponse.json({ error: "No existe el turno" }, { status: 404 });
  return NextResponse.json({ turno: t });
}
