// Webhook de WhatsApp (Twilio). Twilio manda cada mensaje entrante acá y respondemos con TwiML.
// Configuración: en Twilio → Messaging → Try it out → WhatsApp sandbox → "When a message comes in"
// = https://TU-DOMINIO/api/whatsapp (método POST).
import { responder, type MensajeChat } from "@/lib/asistente";
import { leerValor, guardarValor } from "@/lib/store";
import { NEGOCIO } from "@/lib/negocio";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const twiml = (texto: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${esc(texto)}</Message></Response>`, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });

type Conversacion = { mensajes: MensajeChat[]; actualizado: number };
const VENCE_MS = 6 * 60 * 60 * 1000; // la charla se reinicia tras 6 h sin mensajes

export async function POST(req: Request) {
  const form = await req.formData();
  const de = String(form.get("From") ?? ""); // "whatsapp:+5491155551234"
  const texto = String(form.get("Body") ?? "").trim();
  const nombrePerfil = String(form.get("ProfileName") ?? "");
  if (!de || !texto) return twiml("¡Hola! Mandanos un mensaje de texto y te ayudamos.");

  const telefono = de.replace(/^whatsapp:/, "").replace(/\D/g, "");
  const clave = `wa-${telefono}`;
  const previa = await leerValor<Conversacion>(clave);
  const historial: MensajeChat[] =
    previa && Date.now() - previa.actualizado < VENCE_MS && !/^(reiniciar|reset)$/i.test(texto) ? previa.mensajes : [];
  if (/^(reiniciar|reset)$/i.test(texto)) {
    await guardarValor(clave, { mensajes: [], actualizado: Date.now() });
    return twiml(`Listo, empezamos de nuevo. ¿En qué te ayudo? Soy el asistente de ${NEGOCIO.nombre}.`);
  }

  const contenido = historial.length === 0 && nombrePerfil ? `(Mi nombre en WhatsApp es ${nombrePerfil}) ${texto}` : texto;
  historial.push({ role: "user", content: contenido });

  try {
    const { respuesta } = await responder(historial, { canal: "whatsapp", telefono });
    historial.push({ role: "assistant", content: respuesta });
    await guardarValor(clave, { mensajes: historial.slice(-30), actualizado: Date.now() });
    return twiml(respuesta || "¿Me repetís, por favor?");
  } catch (e) {
    console.error("WhatsApp:", e);
    return twiml(`Uy, tuve un problema para responder. Probá de nuevo en un ratito o llamanos al ${NEGOCIO.telefono}.`);
  }
}

// Para probar rápido que el webhook está publicado
export async function GET() {
  return new Response("Webhook de WhatsApp de Peloco activo. Configuralo en Twilio con método POST.");
}
