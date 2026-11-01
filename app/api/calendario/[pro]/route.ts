import { listarTurnos } from "@/lib/store";
import { NEGOCIO, profesionalPorId, servicioPorId } from "@/lib/negocio";
import { aMin, aHora, sumarDias } from "@/lib/agenda";

export const dynamic = "force-dynamic";

// Feed iCal con los turnos de un profesional, para suscribirse desde Google Calendar
// ("Otros calendarios" → "Desde URL"). Protegido con la clave del panel si está configurada.
export async function GET(req: Request, ctx: { params: Promise<{ pro: string }> }) {
  const { pro } = await ctx.params;
  const id = pro.replace(/\.ics$/, "");
  const clave = process.env.PANEL_PASSWORD;
  if (clave && new URL(req.url).searchParams.get("k") !== clave) return new Response("No autorizado", { status: 401 });
  const p = profesionalPorId(id);
  if (!p) return new Response("No existe", { status: 404 });

  const turnos = (await listarTurnos()).filter((t) => t.profesionalId === id && t.estado !== "cancelado");
  const f = (fecha: string, hora: string) => `${fecha.replace(/-/g, "")}T${hora.replace(":", "")}00`;
  const esc = (s: string) => s.replace(/[\;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  const eventos = turnos.map((t) => {
    const finMin = aMin(t.hora) + t.duracionMin;
    const finFecha = finMin >= 1440 ? sumarDias(t.fecha, 1) : t.fecha;
    return [
      "BEGIN:VEVENT",
      `UID:${t.id}@peloco`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
      `DTSTART;TZID=${NEGOCIO.zonaHoraria}:${f(t.fecha, t.hora)}`,
      `DTEND;TZID=${NEGOCIO.zonaHoraria}:${f(finFecha, aHora(finMin % 1440))}`,
      `SUMMARY:${esc(`${servicioPorId(t.servicioId)?.nombre ?? t.servicioId} · ${t.nombre}`)}`,
      `DESCRIPTION:${esc(`Cliente: ${t.nombre}\nTel: +${t.telefono}\nCódigo: ${t.id}${t.notas ? `\nNotas: ${t.notas}` : ""}`)}`,
      `LOCATION:${esc(NEGOCIO.direccion)}`,
      "END:VEVENT",
    ].join("\r\n");
  });
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${NEGOCIO.nombre}//Turnos//ES`,
    `X-WR-CALNAME:${NEGOCIO.nombre} · ${p.nombre}`,
    `X-WR-TIMEZONE:${NEGOCIO.zonaHoraria}`,
    ...eventos,
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" } });
}
