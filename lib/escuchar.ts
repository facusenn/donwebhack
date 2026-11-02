// "Escuchar consulta": una conversación de teléfono o mostrador → transcripción → turno agendado,
// o pedido pendiente que se termina por WhatsApp con el asistente.
import { NEGOCIO, PROFESIONALES, servicioPorId, profesionalPorId, type Canal } from "./negocio";
import { disponibilidad, nombreDia, resumirHorarios } from "./agenda";
import { interpretarMensaje, type Interpretacion } from "./interpretar";
import { crearTurno, normalizarTelefono } from "./reservas";
import { listarTurnos, agregarPedido, actualizarPedido, nuevoId, leerValor, guardarValor, type Pedido, type Turno } from "./store";
import { bloqueosPara } from "./calendario";
import type { MensajeChat } from "./asistente";

// ---------- Transcripción ----------
// Usa la API de OpenAI (gpt-4o-transcribe, con whisper-1 de respaldo). Hace falta una key de OpenAI (sk-...);
// si la key configurada es de OpenRouter o NVIDIA, devolvemos null y se usa el texto que transcribió el navegador.
function keyOpenAI() {
  const candidatas = [process.env.OPENAI_API_KEY, process.env.OPENROUTER_API_KEY, process.env.AI_API_KEY];
  return candidatas.map((k) => (k ?? "").trim()).find((k) => k.startsWith("sk-") && !k.startsWith("sk-or-")) ?? "";
}

export function puedeTranscribir() {
  return Boolean(keyOpenAI());
}

export async function transcribir(audio: Blob, nombreArchivo: string): Promise<string | null> {
  const key = keyOpenAI();
  if (!key) return null;
  const pista = `Conversación en español rioplatense en ${NEGOCIO.nombre}, una peluquería. Servicios, nombres (${PROFESIONALES.map((p) => p.nombre).join(", ")}), días y horarios.`;
  const modelos = [process.env.TRANSCRIBE_MODEL || "gpt-4o-transcribe", "whisper-1"];
  let ultimoError = "";
  for (const modelo of [...new Set(modelos)]) {
    const form = new FormData();
    form.append("file", audio, nombreArchivo);
    form.append("model", modelo);
    form.append("language", "es");
    form.append("prompt", pista);
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (res.ok) {
      const j = (await res.json()) as { text?: string };
      return (j.text ?? "").trim();
    }
    ultimoError = `${modelo} respondió ${res.status}: ${(await res.text()).slice(0, 200)}`;
    console.error("Transcripción:", ultimoError);
  }
  throw new Error(`No pude transcribir el audio (${ultimoError}).`);
}

// ---------- WhatsApp ----------
// Deja preparada la conversación del asistente con ese número: cuando el cliente conteste,
// el bot ya tiene el primer mensaje en el historial y sigue desde ahí (ver /api/whatsapp).
async function sembrarConversacion(telefono: string, mensaje: string) {
  const clave = `wa-${telefono}`;
  const previa = await leerValor<{ mensajes: MensajeChat[]; actualizado: number }>(clave);
  const mensajes = [...(previa?.mensajes ?? []), { role: "assistant" as const, content: mensaje }].slice(-30);
  await guardarValor(clave, { mensajes, actualizado: Date.now() });
}

// Envío real por Twilio (opcional). Si no están las variables, el panel ofrece el link al simulador.
export function twilioConfigurado() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
}

async function enviarPorTwilio(telefono: string, texto: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const from = process.env.TWILIO_WHATSAPP_FROM!.replace(/^whatsapp:/, "");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: `whatsapp:${from}`, To: `whatsapp:+${telefono}`, Body: texto }),
  });
  if (!res.ok) throw new Error(`Twilio respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

// Arranca el seguimiento por WhatsApp de un pedido: siembra la charla del bot y, si hay Twilio, manda el mensaje.
export async function seguirPorWhatsApp(p: Pedido): Promise<{ enviado: boolean; error?: string }> {
  if (!p.telefono) return { enviado: false, error: "Falta el celular del cliente." };
  await sembrarConversacion(p.telefono, p.mensajeWhatsApp);
  if (!twilioConfigurado()) return { enviado: false };
  try {
    await enviarPorTwilio(p.telefono, p.mensajeWhatsApp);
    await actualizarPedido(p.id, { whatsappEnviado: true });
    return { enviado: true };
  } catch (e) {
    console.error("WhatsApp saliente:", e);
    return { enviado: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------- Procesar la consulta ----------
export type ResultadoEscucha =
  | { tipo: "turno"; transcripcion: string; datos: Interpretacion; turno: Turno; mensajeWhatsApp: string }
  | { tipo: "pedido"; transcripcion: string; datos: Interpretacion; pedido: Pedido; whatsapp: { enviado: boolean; error?: string } };

const fechaCorta = (f: string) => `${nombreDia(f)} ${Number(f.slice(8, 10))}/${Number(f.slice(5, 7))}`;

export async function procesarConsulta(transcripcion: string, canal: Canal): Promise<ResultadoEscucha> {
  const etiqueta = canal === "telefono" ? "una llamada telefónica" : "el mostrador del local";
  const d = await interpretarMensaje(transcripcion, etiqueta, { conversacion: true });
  const telefono = normalizarTelefono(d.telefono);
  const tieneCelular = telefono.length >= 10;
  const servicio = servicioPorId(d.servicioId);
  const faltantes: string[] = [];
  if (!servicio) faltantes.push("servicio");
  if (!d.fecha) faltantes.push("día");
  if (!d.hora) faltantes.push("horario");
  if (!tieneCelular) faltantes.push("celular");
  if (!d.nombre) faltantes.push("nombre");

  let motivo = "";
  let alternativas = "";
  let errorAgenda = "";

  // Con servicio, día, hora y celular intentamos agendar directo (el nombre no frena: se puede completar después).
  if (servicio && d.fecha && d.hora && tieneCelular) {
    // Si el cliente no pidió a nadie en particular, probamos con cualquiera del equipo que haga el servicio.
    const candidatos = d.profesionalPedido && d.profesionalId
      ? [d.profesionalId]
      : [...new Set([d.profesionalId, ...PROFESIONALES.filter((p) => p.servicios.includes(servicio.id)).map((p) => p.id)].filter(Boolean))];
    let ultimoError = "";
    for (const profesionalId of candidatos) {
      const r = await crearTurno(
        {
          nombre: d.nombre || (canal === "telefono" ? "Cliente (teléfono)" : "Cliente (mostrador)"),
          telefono,
          servicioId: servicio.id,
          profesionalId,
          fecha: d.fecha,
          hora: d.hora,
          notas: [d.notas, `Agendado escuchando la consulta (${canal === "telefono" ? "teléfono" : "mostrador"}).`].filter(Boolean).join(" · "),
        },
        canal,
      );
      if (r.ok) {
        const t = r.turno;
        const mensajeWhatsApp = `¡Hola${d.nombre ? ` ${d.nombre.split(" ")[0]}` : ""}! Te confirmamos tu turno de ${servicio.nombre} con ${profesionalPorId(t.profesionalId)?.nombre} el ${fechaCorta(t.fecha)} a las ${t.hora} en ${NEGOCIO.nombre} (${NEGOCIO.direccion}). Código #${t.id}. Si necesitás cambiarlo, escribinos por acá.`;
        return { tipo: "turno", transcripcion, datos: d, turno: t, mensajeWhatsApp };
      }
      ultimoError = r.error;
    }
    errorAgenda = ultimoError;
    motivo = `El horario pedido (${fechaCorta(d.fecha)} ${d.hora}) no se pudo agendar: ${ultimoError}`;
    // Buscamos otros horarios ese mismo día para ofrecerlos por WhatsApp.
    const disp = disponibilidad(await listarTurnos(), d.fecha, servicio.id, d.profesionalPedido ? d.profesionalId : undefined, await bloqueosPara([d.fecha]));
    if (disp.ok) {
      alternativas = disp.opciones
        .filter((o) => o.horarios.length)
        .map((o) => `con ${o.profesional} tengo ${resumirHorarios(o.horarios.slice(0, 6))}`)
        .join("; ");
    }
  } else {
    motivo = `Faltó: ${faltantes.join(", ")}.`;
  }

  // No se pudo agendar: queda como pedido y se sigue por WhatsApp.
  const nombre = d.nombre.split(" ")[0];
  let mensajeWhatsApp = d.respuestaSugerida.trim();
  if (alternativas) {
    mensajeWhatsApp = `¡Hola${nombre ? ` ${nombre}` : ""}! Te escribimos de ${NEGOCIO.nombre} por lo que hablamos ${canal === "telefono" ? "por teléfono" : "en el local"}: el ${fechaCorta(d.fecha)} a las ${d.hora} ya no nos queda lugar para ${servicio!.nombre} 😕. Ese día ${alternativas}. ¿Cuál te queda bien?`;
  } else if (errorAgenda) {
    mensajeWhatsApp = `¡Hola${nombre ? ` ${nombre}` : ""}! Te escribimos de ${NEGOCIO.nombre} por lo que hablamos ${canal === "telefono" ? "por teléfono" : "en el local"} para ${servicio!.nombre}: el ${fechaCorta(d.fecha)} a las ${d.hora} no lo podemos dar. ¿Qué otro día te queda bien? Te paso los horarios libres.`;
  } else if (!mensajeWhatsApp) {
    const pide = faltantes.filter((f) => f !== "celular").join(", ") || "lo que falta";
    mensajeWhatsApp = `¡Hola${nombre ? ` ${nombre}` : ""}! Te escribimos de ${NEGOCIO.nombre} por lo que hablamos ${canal === "telefono" ? "por teléfono" : "en el local"}${servicio ? ` para ${servicio.nombre}` : ""}. Para dejarte el turno agendado nos falta: ${pide}. ¿Me contás?`;
  }

  const pedido: Pedido = {
    id: nuevoId(),
    canal,
    nombre: d.nombre.slice(0, 80),
    telefono: tieneCelular ? telefono : "",
    servicioId: servicio?.id ?? "",
    profesionalId: d.profesionalPedido ? d.profesionalId : "",
    fecha: d.fecha,
    hora: d.hora,
    notas: d.notas.slice(0, 500) || undefined,
    transcripcion: transcripcion.slice(0, 12000),
    faltantes: alternativas ? ["otro horario"] : faltantes,
    motivo,
    mensajeWhatsApp: mensajeWhatsApp.slice(0, 1000),
    estado: "pendiente",
    creadoEn: new Date().toISOString(),
  };
  await agregarPedido(pedido);
  const whatsapp = pedido.telefono ? await seguirPorWhatsApp(pedido) : { enviado: false, error: "Falta el celular: cargalo en el pedido para seguir por WhatsApp." };
  if (whatsapp.enviado) pedido.whatsappEnviado = true;
  return { tipo: "pedido", transcripcion, datos: d, pedido, whatsapp };
}
