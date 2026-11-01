// Asistente de IA: prompt del negocio + herramientas para consultar agenda y reservar turnos.
import { NEGOCIO, SERVICIOS, PROFESIONALES, FAQ, servicioPorId, profesionalPorId } from "./negocio";
import { ahoraAR, disponibilidad, proximosDiasAbiertos } from "./agenda";
import { listarTurnos, type Turno } from "./store";
import { crearTurno } from "./reservas";
import { bloqueosPara } from "./calendario";

export type MensajeChat = { role: "user" | "assistant"; content: string };

export type MensajeAPI = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

export function promptSistema() {
  const hoy = ahoraAR();
  const proximos = proximosDiasAbiertos(6)
    .map((f) => `${f}`)
    .join(", ");
  return `Sos el asistente virtual de ${NEGOCIO.nombre}, una ${NEGOCIO.rubro.toLowerCase()} en ${NEGOCIO.direccion}.
Hablás en español rioplatense, con calidez y frases cortas (como en WhatsApp). Usá emojis con moderación.

Tu objetivo: responder consultas y cerrar turnos sin que el cliente tenga que esperar a que alguien conteste.

Hoy es ${hoy.dia} ${hoy.fecha} y son las ${hoy.hora} (hora de Argentina). Próximos días abiertos: ${proximos}.
Horario: ${NEGOCIO.horarioTexto}
Teléfono: ${NEGOCIO.telefono}. Instagram: ${NEGOCIO.instagram}.

SERVICIOS (id | nombre | precio | duración):
${SERVICIOS.map((s) => `- ${s.id} | ${s.nombre} | ${s.precio} | ${s.duracionMin} min | ${s.descripcion}`).join("\n")}

EQUIPO (id | nombre | especialidad | servicios):
${PROFESIONALES.map((p) => `- ${p.id} | ${p.nombre} | ${p.especialidad} | ${p.servicios.join(", ")}`).join("\n")}

PREGUNTAS FRECUENTES:
${FAQ.map((f) => `- ${f.p} ${f.r}`).join("\n")}

CÓMO RESERVAR UN TURNO:
1. Averiguá qué servicio quiere. Cada servicio dura distinto, así que el servicio va primero.
2. Apenas sepas el servicio, llamá a mostrar_calendario: el cliente ve un calendario con los días y horarios libres para ese servicio y elige ahí. Decile en una frase corta que elija día y hora en el calendario.
   Si el cliente ya nombró un día concreto, podés además usar consultar_disponibilidad y ofrecerle hasta 4 horarios por texto.
3. Cuando elija horario, pedí nombre y celular (WhatsApp) si todavía no los tenés.
4. Llamá a reservar_turno. Recién cuando la herramienta confirme, decile que quedó reservado con el código del turno.
Si el servicio lleva seña (color, balayage, keratina), avisale que le van a escribir por WhatsApp para coordinarla.

REGLAS:
- Nunca inventes horarios libres: siempre consultá la herramienta.
- Nunca inventes precios ni servicios que no estén en la lista. Si preguntan algo que no sabés, decí que lo consultás con el equipo y ofrecé el teléfono.
- No pidas datos que no hacen falta.
- Si el cliente está indeciso con el color o un cambio grande, ofrecé la consulta gratuita de diagnóstico.`;
}

const HERRAMIENTAS = [
  {
    type: "function",
    function: {
      name: "mostrar_calendario",
      description: "Le muestra al cliente, dentro del chat, un calendario con días y horarios libres para el servicio (ya tiene en cuenta cuánto dura). Usala apenas sepas qué servicio quiere.",
      parameters: {
        type: "object",
        properties: {
          servicio_id: { type: "string", enum: SERVICIOS.map((s) => s.id) },
          profesional_id: { type: "string", enum: PROFESIONALES.map((p) => p.id), description: "Opcional, solo si el cliente pidió a alguien" },
        },
        required: ["servicio_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_disponibilidad",
      description: "Devuelve los horarios libres para un servicio en una fecha. Usala siempre antes de ofrecer horarios.",
      parameters: {
        type: "object",
        properties: {
          fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
          servicio_id: { type: "string", enum: SERVICIOS.map((s) => s.id) },
          profesional_id: { type: "string", enum: PROFESIONALES.map((p) => p.id), description: "Opcional, solo si el cliente pidió a alguien" },
        },
        required: ["fecha", "servicio_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reservar_turno",
      description: "Reserva un turno. Solo usala cuando el cliente eligió horario y te dio nombre y celular.",
      parameters: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          telefono: { type: "string", description: "Celular / WhatsApp del cliente" },
          servicio_id: { type: "string", enum: SERVICIOS.map((s) => s.id) },
          profesional_id: { type: "string", enum: PROFESIONALES.map((p) => p.id) },
          fecha: { type: "string", description: "YYYY-MM-DD" },
          hora: { type: "string", description: "HH:MM" },
          notas: { type: "string", description: "Detalles útiles para el profesional (largo de pelo, referencia, etc.)" },
        },
        required: ["nombre", "telefono", "servicio_id", "profesional_id", "fecha", "hora"],
      },
    },
  },
];

export type PedidoCalendario = { servicioId: string; profesionalId?: string };

export type OpcionesCanal = { canal: "web" | "whatsapp"; telefono?: string };

async function ejecutarHerramienta(
  nombre: string,
  args: Record<string, string>,
  op: OpcionesCanal = { canal: "web" },
): Promise<{ resultado: unknown; turno?: Turno; calendario?: PedidoCalendario }> {
  if (nombre === "mostrar_calendario") {
    const servicio = servicioPorId(args.servicio_id);
    if (!servicio) return { resultado: { ok: false, error: "Servicio inexistente" } };
    const pro = args.profesional_id && profesionalPorId(args.profesional_id) ? args.profesional_id : undefined;
    return {
      resultado: {
        ok: true,
        mensaje: `El cliente ya está viendo un calendario con los horarios libres para ${servicio.nombre} (${servicio.duracionMin} min). Cuando elija, te va a escribir el día, la hora y el profesional.`,
      },
      calendario: { servicioId: servicio.id, profesionalId: pro },
    };
  }
  if (nombre === "consultar_disponibilidad") {
    const turnos = await listarTurnos();
    const bloqueos = await bloqueosPara([args.fecha]);
    return { resultado: disponibilidad(turnos, args.fecha, args.servicio_id, args.profesional_id, bloqueos) };
  }
  if (nombre === "reservar_turno") {
    const r = await crearTurno(
      {
        nombre: args.nombre,
        telefono: args.telefono,
        servicioId: args.servicio_id,
        profesionalId: args.profesional_id,
        fecha: args.fecha,
        hora: args.hora,
        notas: args.notas,
      },
      op.canal,
    );
    if (!r.ok) return { resultado: r };
    const t = r.turno;
    const servicio = servicioPorId(t.servicioId)!;
    return {
      resultado: {
        ok: true,
        codigo: t.id,
        servicio: servicio.nombre,
        profesional: profesionalPorId(t.profesionalId)?.nombre,
        fecha: t.fecha,
        hora: t.hora,
        precio: servicio.precio,
      },
      turno: t,
    };
  }
  return { resultado: { ok: false, error: `Herramienta desconocida: ${nombre}` } };
}

export async function llamarModelo(mensajes: MensajeAPI[], extra: Record<string, unknown> = { tools: HERRAMIENTAS }) {
  const key = (process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.NVIDIA_API_KEY || "").trim();
  if (!key) throw new Error("Falta configurar OPENROUTER_API_KEY (o OPENAI_API_KEY / NVIDIA_API_KEY).");
  // Detecta el proveedor por el formato de la key: sk-or-... OpenRouter, nvapi-... NVIDIA, sk-... OpenAI.
  const proveedor = key.startsWith("sk-or-") ? "openrouter" : key.startsWith("nvapi-") ? "nvidia" : key.startsWith("sk-") ? "openai" : "openrouter";
  const base =
    process.env.OPENROUTER_BASE_URL ||
    { openrouter: "https://openrouter.ai/api/v1", nvidia: "https://integrate.api.nvidia.com/v1", openai: "https://api.openai.com/v1" }[proveedor];
  const modeloPorDefecto = { openrouter: "openai/gpt-4o-mini", nvidia: "nvidia/llama-3.3-nemotron-super-49b-v1.5", openai: "gpt-4o-mini" }[proveedor];
  let modelo = (process.env.OPENROUTER_MODEL || process.env.AI_MODEL || modeloPorDefecto).trim();
  if (proveedor === "openai") modelo = modelo.replace(/^openai\//, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.SITE_URL ?? "https://donwebhack.local",
      "X-Title": NEGOCIO.nombre,
    },
    body: JSON.stringify({
      model: modelo,
      messages: mensajes,
      temperature: 0.4,
      ...extra,
    }),
  });
  if (!res.ok) throw new Error(`La IA (${proveedor}, ${modelo}) respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return json.choices?.[0]?.message as MensajeAPI;
}

// Algunos modelos (por ejemplo Nemotron) devuelven su razonamiento entre <think></think>.
export function limpiarRazonamiento(texto: string) {
  return texto.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^[\s\S]*<\/think>/i, "").trim();
}

function extraWhatsApp(telefono?: string) {
  return `

ESTÁS RESPONDIENDO POR WHATSAPP:
- No podés mostrar el calendario: ofrecé horarios por texto usando consultar_disponibilidad (máximo 4 opciones).
- El celular del cliente es ${telefono ?? "el de este chat"}: usalo en reservar_turno y no se lo pidas.
- Escribí texto plano, sin markdown ni asteriscos dobles. Mensajes cortos.`;
}

export async function responder(historial: MensajeChat[], op: OpcionesCanal = { canal: "web" }) {
  const herramientas = op.canal === "whatsapp" ? HERRAMIENTAS.filter((h) => h.function.name !== "mostrar_calendario") : HERRAMIENTAS;
  const mensajes: MensajeAPI[] = [
    { role: "system", content: promptSistema() + (op.canal === "whatsapp" ? extraWhatsApp(op.telefono) : "") },
    ...historial.slice(-20).map((m) => ({ role: m.role, content: m.content.slice(0, 2000) })),
  ];
  let turnoReservado: Turno | undefined;
  let calendario: PedidoCalendario | undefined;

  for (let i = 0; i < 6; i++) {
    const msg = await llamarModelo(mensajes, { tools: herramientas });
    if (!msg) throw new Error("El modelo no devolvió respuesta.");
    if (!msg.tool_calls?.length) {
      return { respuesta: limpiarRazonamiento(msg.content ?? ""), turno: turnoReservado, calendario };
    }
    mensajes.push({ role: "assistant", content: msg.content ?? "", tool_calls: msg.tool_calls });
    for (const call of msg.tool_calls) {
      let args: Record<string, string> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {}
      const { resultado, turno, calendario: cal } = await ejecutarHerramienta(call.function.name, args, op);
      if (turno) turnoReservado = turno;
      if (cal) calendario = cal;
      mensajes.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(resultado) });
    }
  }
  return { respuesta: "Perdón, me trabé un poco. ¿Me repetís qué necesitás?", turno: turnoReservado, calendario };
}
