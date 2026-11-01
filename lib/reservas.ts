// Alta de turnos compartida por todos los canales (asistente web, WhatsApp, teléfono, mostrador).
import { servicioPorId, type Canal } from "./negocio";
import { validarReserva } from "./agenda";
import { listarTurnos, agregarTurno, nuevoId, type Turno } from "./store";
import { bloqueosPara } from "./calendario";

export type DatosTurno = {
  nombre: string;
  telefono: string;
  servicioId: string;
  profesionalId: string;
  fecha: string;
  hora: string;
  notas?: string;
};

export function normalizarTelefono(t: string) {
  let d = (t ?? "").replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length && !d.startsWith("54")) d = "549" + d;
  return d;
}

export async function crearTurno(datos: DatosTurno, canal: Canal): Promise<{ ok: true; turno: Turno } | { ok: false; error: string }> {
  if (!datos.nombre?.trim()) return { ok: false, error: "Falta el nombre." };
  if ((datos.telefono ?? "").replace(/\D/g, "").length < 8) return { ok: false, error: "Falta un celular válido." };
  const turnos = await listarTurnos();
  const bloqueos = await bloqueosPara([datos.fecha], datos.profesionalId);
  const error = validarReserva(turnos, datos.fecha, datos.hora, datos.servicioId, datos.profesionalId, bloqueos);
  if (error) return { ok: false, error };
  const servicio = servicioPorId(datos.servicioId)!;
  const turno: Turno = {
    id: nuevoId(),
    nombre: datos.nombre.trim(),
    telefono: normalizarTelefono(datos.telefono),
    servicioId: servicio.id,
    profesionalId: datos.profesionalId,
    fecha: datos.fecha,
    hora: datos.hora,
    duracionMin: servicio.duracionMin,
    notas: datos.notas?.trim() || undefined,
    estado: "confirmado",
    canal,
    creadoEn: new Date().toISOString(),
  };
  await agregarTurno(turno);
  return { ok: true, turno };
}
