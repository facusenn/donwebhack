// Lee un mensaje que entró por WhatsApp o una nota de llamada y lo convierte en un turno estructurado.
import { NEGOCIO, SERVICIOS, PROFESIONALES } from "./negocio";
import { ahoraAR, proximosDiasAbiertos } from "./agenda";
import { llamarModelo, limpiarRazonamiento } from "./asistente";

export type Interpretacion = {
  nombre: string;
  telefono: string;
  servicioId: string;
  profesionalId: string;
  fecha: string;
  hora: string;
  notas: string;
  faltantes: string[];
  respuestaSugerida: string;
  profesionalPedido: boolean; // true si el cliente nombró a alguien del equipo
};

const CONVERSACION = `
ES UNA CONVERSACIÓN GRABADA: es la transcripción automática de una charla entre alguien del local y un cliente
(por teléfono o en el mostrador). No dice quién habla: deducilo por el contexto. Puede tener errores de transcripción.
- Lo que vale son los datos del CLIENTE y lo que quedó acordado al final (si cambian de idea, tomá lo último).
- Convertí fechas relativas ("mañana", "el jueves", "el sábado que viene") a YYYY-MM-DD usando la fecha de hoy.
- Si dicen solo una franja ("a la tarde"), dejá "hora" vacía y anotá la franja en "notas".
- El celular puede venir dictado en partes ("once, cuatro cuatro..."): pasalo a dígitos.
- "respuestaSugerida": es el PRIMER mensaje que le va a mandar el asistente por WhatsApp para terminar la reserva.
  Saludalo por el nombre si lo sabés, recordale qué pidió ("por lo que hablamos por teléfono / en el local")
  y preguntale SOLO lo que falta. No confirmes un turno: eso lo hace el sistema.`;

export async function interpretarMensaje(texto: string, canal: string, op: { conversacion?: boolean } = {}): Promise<Interpretacion> {
  const hoy = ahoraAR();
  const sistema = `Sos quien organiza la agenda de ${NEGOCIO.nombre} (${NEGOCIO.rubro.toLowerCase()}).
Te pasan un mensaje que llegó por ${canal} (puede ser un chat de WhatsApp copiado o una nota de una llamada).
Extraé los datos del turno pedido. Hoy es ${hoy.dia} ${hoy.fecha}, ${hoy.hora} hs. Días abiertos próximos: ${proximosDiasAbiertos(6).join(", ")}.
Horario: ${NEGOCIO.horarioTexto}

Servicios (id: nombre): ${SERVICIOS.map((s) => `${s.id}: ${s.nombre}`).join("; ")}
Profesionales (id: nombre, servicios): ${PROFESIONALES.map((p) => `${p.id}: ${p.nombre} (${p.servicios.join(", ")})`).join("; ")}

Respondé SOLO con un JSON con estas claves:
{"nombre": "", "telefono": "", "servicioId": "", "profesionalId": "", "profesionalPedido": false, "fecha": "YYYY-MM-DD", "hora": "HH:MM", "notas": "", "faltantes": [], "respuestaSugerida": ""}
- Dejá "" lo que no esté en el mensaje. No inventes datos.
- Si no nombra profesional, elegí uno que haga ese servicio y poné "profesionalPedido": false. Si lo nombra, true.
- Redondeá la hora a la media hora más cercana.
- "faltantes": lista en castellano de lo que falta para confirmar (ej. "horario", "celular").
- "respuestaSugerida": un mensaje corto y cálido en español rioplatense para contestarle al cliente por WhatsApp (confirmando o pidiendo lo que falta).${op.conversacion ? CONVERSACION : ""}`;

  const mensajes = [
    { role: "system" as const, content: sistema },
    { role: "user" as const, content: texto.slice(0, op.conversacion ? 12000 : 4000) },
  ];
  let msg;
  try {
    msg = await llamarModelo(mensajes, { response_format: { type: "json_object" }, temperature: 0.1 });
  } catch {
    // Algunos proveedores no aceptan response_format: reintentar sin eso.
    msg = await llamarModelo(mensajes, { temperature: 0.1 });
  }
  const crudo = limpiarRazonamiento(msg?.content ?? "").replace(/^```(json)?|```$/g, "").trim();
  const inicio = crudo.indexOf("{");
  const fin = crudo.lastIndexOf("}");
  const j = JSON.parse(crudo.slice(inicio, fin + 1));
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    nombre: str(j.nombre),
    telefono: str(j.telefono),
    servicioId: SERVICIOS.some((s) => s.id === j.servicioId) ? j.servicioId : "",
    profesionalId: PROFESIONALES.some((p) => p.id === j.profesionalId) ? j.profesionalId : "",
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(str(j.fecha)) ? j.fecha : "",
    hora: /^\d{2}:\d{2}$/.test(str(j.hora)) ? j.hora : "",
    notas: str(j.notas),
    faltantes: Array.isArray(j.faltantes) ? j.faltantes.map(String) : [],
    respuestaSugerida: str(j.respuestaSugerida),
    profesionalPedido: j.profesionalPedido === true,
  };
}
