import { NextResponse } from "next/server";
import { autorizado } from "@/lib/auth";
import { conexiones, conectar, bloqueosPara } from "@/lib/calendario";
import { profesionalPorId } from "@/lib/negocio";

export const dynamic = "force-dynamic";

// GET ?profesional=lucia&fechas=2026-11-03,2026-11-04 -> estado de conexión y bloqueos
export async function GET(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  const u = new URL(req.url);
  const pro = u.searchParams.get("profesional") ?? "";
  const fechas = (u.searchParams.get("fechas") ?? "").split(",").filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f)).slice(0, 31);
  const con = await conexiones();
  return NextResponse.json({ conectado: Boolean(con[pro]), bloqueos: await bloqueosPara(fechas, pro) });
}

// POST { profesionalId, url } -> conecta (url vacía desconecta)
export async function POST(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  const { profesionalId, url } = (await req.json()) as { profesionalId: string; url?: string };
  if (!profesionalPorId(profesionalId)) return NextResponse.json({ error: "Profesional inexistente" }, { status: 400 });
  const limpia = (url ?? "").trim();
  if (limpia && !/^(https|webcal):\/\/\S+$/i.test(limpia)) {
    return NextResponse.json({ error: "Pegá el link que empieza con https:// (Dirección secreta en formato iCal)." }, { status: 400 });
  }
  if (limpia) {
    try {
      const res = await fetch(limpia.replace(/^webcal:/i, "https:"), { cache: "no-store", signal: AbortSignal.timeout(6000) });
      const txt = await res.text();
      if (!res.ok || !txt.includes("BEGIN:VCALENDAR")) throw new Error();
    } catch {
      return NextResponse.json({ error: "No pude leer ese calendario. Revisá que sea la dirección secreta en formato iCal." }, { status: 400 });
    }
  }
  await conectar(profesionalId, limpia || null);
  return NextResponse.json({ ok: true, conectado: Boolean(limpia) });
}
