// Diagnóstico rápido para producción: qué IA y qué almacenamiento detecta la app, y si responden.
// No muestra las keys, solo su prefijo.
import { llamarModelo } from "@/lib/asistente";
import { leerValor, guardarValor } from "@/lib/store";
import { autorizado } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const pref = (v?: string) => (v ? `${v.trim().slice(0, 7)}… (${v.trim().length} caracteres)` : "no configurada");

export async function GET(req: Request) {
  // Hace una llamada paga a la IA y muestra datos de configuración: solo con la clave del panel
  if (!autorizado(req) && new URL(req.url).searchParams.get("clave") !== process.env.PANEL_PASSWORD) {
    return Response.json({ error: "Clave incorrecta" }, { status: 401 });
  }
  const env = process.env;
  const variables = {
    OPENROUTER_API_KEY: pref(env.OPENROUTER_API_KEY),
    OPENAI_API_KEY: pref(env.OPENAI_API_KEY),
    NVIDIA_API_KEY: pref(env.NVIDIA_API_KEY),
    OPENROUTER_BASE_URL: env.OPENROUTER_BASE_URL || "(por defecto)",
    OPENROUTER_MODEL: env.OPENROUTER_MODEL || env.AI_MODEL || "(por defecto)",
    almacenamiento: env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL ? "Upstash Redis" : "archivo temporal",
  };
  let ia = "ok";
  try {
    const m = await llamarModelo([{ role: "user", content: "Respondé solo: ok" }], {});
    ia = `ok: ${String(m?.content ?? "").slice(0, 40)}`;
  } catch (e) {
    ia = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }
  let datos = "ok";
  try {
    await guardarValor("estado-prueba", { t: Date.now() });
    await leerValor("estado-prueba");
  } catch (e) {
    datos = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }
  return Response.json({ variables, ia, datos });
}
