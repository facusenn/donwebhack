import { NextResponse } from "next/server";
import { responder, type MensajeChat } from "@/lib/asistente";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const historial: MensajeChat[] = Array.isArray(body?.mensajes)
      ? body.mensajes
          .filter((m: MensajeChat) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .map((m: MensajeChat) => ({ role: m.role, content: m.content }))
      : [];
    if (!historial.length || historial[historial.length - 1].role !== "user") {
      return NextResponse.json({ error: "Falta el mensaje del usuario." }, { status: 400 });
    }
    const { respuesta, turno, calendario } = await responder(historial);
    return NextResponse.json({ respuesta, turno: turno ? { id: turno.id } : null, calendario: calendario ?? null });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "El asistente no está disponible ahora.", detalle: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
