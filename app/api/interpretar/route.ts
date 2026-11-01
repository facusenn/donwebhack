import { NextResponse } from "next/server";
import { autorizado } from "@/lib/auth";
import { interpretarMensaje } from "@/lib/interpretar";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  const { texto, canal } = (await req.json()) as { texto?: string; canal?: string };
  if (!texto?.trim()) return NextResponse.json({ error: "Pegá el mensaje primero." }, { status: 400 });
  try {
    return NextResponse.json({ datos: await interpretarMensaje(texto, canal ?? "whatsapp") });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "No pude leer el mensaje. Cargalo a mano." }, { status: 500 });
  }
}
