// Cálculo de horarios libres. Funciones puras: reciben la lista de turnos.
import { NEGOCIO, PROFESIONALES, servicioPorId, profesionalPorId } from "./negocio";
import type { Turno } from "./store";

const PASO_MIN = 30;
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function ahoraAR() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: NEGOCIO.zonaHoraria,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => partes.find((p) => p.type === t)!.value;
  const fecha = `${g("year")}-${g("month")}-${g("day")}`;
  const hora = `${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}`;
  return { fecha, hora, dia: nombreDia(fecha) };
}

export function diaSemana(fecha: string) {
  return new Date(`${fecha}T12:00:00Z`).getUTCDay();
}

export function nombreDia(fecha: string) {
  return DIAS[diaSemana(fecha)];
}

export function sumarDias(fecha: string, n: number) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function proximosDiasAbiertos(n: number) {
  const res: string[] = [];
  let f = ahoraAR().fecha;
  while (res.length < n) {
    if (NEGOCIO.diasAbiertos.includes(diaSemana(f))) res.push(f);
    f = sumarDias(f, 1);
  }
  return res;
}

export const aMin = (h: string) => {
  const [a, b] = h.split(":").map(Number);
  return a * 60 + b;
};
export const aHora = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function ocupado(turnos: Turno[], profesionalId: string, fecha: string, inicio: number, dur: number) {
  return turnos.some(
    (t) =>
      t.estado !== "cancelado" &&
      t.profesionalId === profesionalId &&
      t.fecha === fecha &&
      aMin(t.hora) < inicio + dur &&
      inicio < aMin(t.hora) + t.duracionMin,
  );
}

export type Disponibilidad =
  | { ok: true; fecha: string; dia: string; servicio: string; duracionMin: number; opciones: { profesionalId: string; profesional: string; horarios: string[] }[] }
  | { ok: false; error: string };

export function disponibilidad(turnos: Turno[], fecha: string, servicioId: string, profesionalId?: string): Disponibilidad {
  const servicio = servicioPorId(servicioId);
  if (!servicio) return { ok: false, error: `No existe el servicio "${servicioId}".` };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: "La fecha tiene que tener formato YYYY-MM-DD." };
  const ahora = ahoraAR();
  if (fecha < ahora.fecha) return { ok: false, error: "Esa fecha ya pasó." };
  if (!NEGOCIO.diasAbiertos.includes(diaSemana(fecha)))
    return { ok: false, error: `El ${nombreDia(fecha)} el local está cerrado. ${NEGOCIO.horarioTexto}` };

  const pros = PROFESIONALES.filter((p) => p.servicios.includes(servicioId) && (!profesionalId || p.id === profesionalId));
  if (pros.length === 0) return { ok: false, error: "Ese profesional no hace ese servicio." };

  const desde = Math.max(aMin(NEGOCIO.apertura), fecha === ahora.fecha ? Math.ceil((aMin(ahora.hora) + 30) / PASO_MIN) * PASO_MIN : 0);
  const hasta = aMin(NEGOCIO.cierre) - servicio.duracionMin;

  const opciones = pros.map((p) => {
    const horarios: string[] = [];
    for (let m = desde; m <= hasta; m += PASO_MIN) {
      if (!ocupado(turnos, p.id, fecha, m, servicio.duracionMin)) horarios.push(aHora(m));
    }
    return { profesionalId: p.id, profesional: p.nombre, horarios };
  });

  return { ok: true, fecha, dia: nombreDia(fecha), servicio: servicio.nombre, duracionMin: servicio.duracionMin, opciones };
}

export function validarReserva(turnos: Turno[], fecha: string, hora: string, servicioId: string, profesionalId: string): string | null {
  if (!profesionalPorId(profesionalId)) return `No existe el profesional "${profesionalId}".`;
  const d = disponibilidad(turnos, fecha, servicioId, profesionalId);
  if (!d.ok) return d.error;
  if (!d.opciones[0]?.horarios.includes(hora)) return `El horario ${hora} no está libre con ese profesional. Consultá la disponibilidad de nuevo.`;
  return null;
}
