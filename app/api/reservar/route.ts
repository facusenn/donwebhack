import { NextResponse } from "next/server";
import { crearTurno, type DatosTurno } from "@/lib/reservas";

export const dynamic = "force-dynamic";

// Reserva pública desde el calendario de la web.
export async function POST(req: Request) {
  const b = (await req.json()) as DatosTurno;
  const r = await crearTurno(
    {
      nombre: String(b.nombre ?? "").slice(0, 80),
      telefono: String(b.telefono ?? "").slice(0, 30),
      servicioId: String(b.servicioId ?? ""),
      profesionalId: String(b.profesionalId ?? ""),
      fecha: String(b.fecha ?? ""),
      hora: String(b.hora ?? ""),
      notas: b.notas ? String(b.notas).slice(0, 300) : undefined,
    },
    "web",
  );
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  const t = r.turno;
  return NextResponse.json({ turno: { id: t.id, fecha: t.fecha, hora: t.hora, servicioId: t.servicioId, profesionalId: t.profesionalId, duracionMin: t.duracionMin } });
}
