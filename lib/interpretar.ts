// Lee un mensaje que entró por WhatsApp o una nota de llamada y lo convierte en un turno estructurado.
import { NEGOCIO, SERVICIOS, PROFESIONALES } from "./negocio";
import { ahoraAR, proximosDiasAbiertos } from "./agenda";
import { llamarModelo } from "./asistente";

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
};

export async function interpretarMensaje(texto: string, canal: string): Promise<Interpretacion> {
  const hoy = ahoraAR();
  const sistema = `Sos quien organiza la agenda de ${NEGOCIO.nombre} (${NEGOCIO.rubro.toLowerCase()}).
Te pasan un mensaje que llegó por ${canal} (puede ser un chat de WhatsApp copiado o una nota de una llamada).
Extraé los datos del turno pedido. Hoy es ${hoy.dia} ${hoy.fecha}, ${hoy.hora} hs. Días abiertos próximos: ${proximosDiasAbiertos(6).join(", ")}.
Horario: ${NEGOCIO.horarioTexto}

Servicios (id: nombre): ${SERVICIOS.map((s) => `${s.id}: ${s.nombre}`).join("; ")}
Profesionales (id: nombre, servicios): ${PROFESIONALES.map((p) => `${p.id}: ${p.nombre} (${p.servicios.join(", ")})`).join("; ")}

Respondé SOLO con un JSON con estas claves:
{"nombre": "", "telefono": "", "servicioId": "", "profesionalId": "", "fecha": "YYYY-MM-DD", "hora": "HH:MM", "notas": "", "faltantes": [], "respuestaSugerida": ""}
- Dejá "" lo que no esté en el mensaje. No inventes datos.
- Si no nombra profesional, elegí uno que haga ese servicio.
- Redondeá la hora a la media hora más cercana.
- "faltantes": lista en castellano de lo que falta para confirmar (ej. "horario", "celular").
- "respuestaSugerida": un mensaje corto y cálido en español rioplatense para contestarle al cliente por WhatsApp (confirmando o pidiendo lo que falta).`;

  const msg = await llamarModelo(
    [
      { role: "system", content: sistema },
      { role: "user", content: texto.slice(0, 4000) },
    ],
    { response_format: { type: "json_object" }, temperature: 0.1 },
  );
  const crudo = (msg?.content ?? "").replace(/^```(json)?|```$/g, "").trim();
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
  };
}
