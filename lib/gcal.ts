// Link "Agregar a Google Calendar" (no requiere credenciales).
import { NEGOCIO } from "./negocio";

export function linkGoogleCalendar(o: { titulo: string; fecha: string; hora: string; duracionMin: number; detalles?: string }) {
  const [h, m] = o.hora.split(":").map(Number);
  const fin = h * 60 + m + o.duracionMin;
  const f = (min: number) =>
    `${o.fecha.replace(/-/g, "")}T${String(Math.floor(min / 60)).padStart(2, "0")}${String(min % 60).padStart(2, "0")}00`;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: o.titulo,
    dates: `${f(h * 60 + m)}/${f(fin)}`,
    ctz: NEGOCIO.zonaHoraria,
    location: NEGOCIO.direccion,
    details: o.detalles ?? "",
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}
