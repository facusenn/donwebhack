// Recibe una conversación grabada (audio) o ya transcripta por el navegador, y la convierte en turno o pedido.
import { NextResponse } from "next/server";
import { autorizado } from "@/lib/auth";
import { procesarConsulta, transcribir, puedeTranscribir, twilioConfigurado } from "@/lib/escuchar";
import type { Canal } from "@/lib/negocio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_AUDIO = 4 * 1024 * 1024; // Vercel corta los pedidos de más de ~4,5 MB

// Para que el panel sepa si el servidor transcribe audio o tiene que usar el reconocimiento del navegador.
export async function GET(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  return NextResponse.json({ transcribe: puedeTranscribir(), twilio: twilioConfigurado() });
}

export async function POST(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "No llegó la grabación." }, { status: 400 });
  }
  const canal: Canal = form.get("canal") === "telefono" ? "telefono" : "mostrador";
  const audio = form.get("audio");
  const textoNavegador = String(form.get("texto") ?? "").trim();

  let transcripcion = "";
  try {
    if (audio instanceof Blob && audio.size > 0) {
      if (audio.size > MAX_AUDIO) return NextResponse.json({ error: "La grabación es muy larga (máximo ~4 MB). Probá con una más corta." }, { status: 413 });
      const nombre = audio instanceof File && audio.name ? audio.name : "consulta.webm";
      transcripcion = (await transcribir(audio, nombre)) ?? "";
    }
  } catch (e) {
    // Si falla el servidor pero el navegador transcribió algo, seguimos con eso.
    if (!textoNavegador) {
      console.error(e);
      return NextResponse.json({ error: e instanceof Error ? e.message : "No pude transcribir el audio." }, { status: 502 });
    }
  }
  if (!transcripcion) transcripcion = textoNavegador;
  if (transcripcion.length < 8) {
    return NextResponse.json(
      { error: "No se entendió la conversación. Acercá el micrófono (o poné el teléfono en altavoz) y probá de nuevo, o escribila." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await procesarConsulta(transcripcion, canal));
  } catch (e) {
    console.error("Escuchar:", e);
    return NextResponse.json({ error: "La IA no pudo leer la conversación. Cargá el turno a mano.", transcripcion }, { status: 500 });
  }
}
