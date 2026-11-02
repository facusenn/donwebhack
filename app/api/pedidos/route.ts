// Pedidos pendientes (consultas de teléfono / mostrador que se terminan de agendar por WhatsApp).
import { NextResponse } from "next/server";
import { autorizado } from "@/lib/auth";
import { listarPedidos, actualizarPedido } from "@/lib/store";
import { normalizarTelefono } from "@/lib/reservas";
import { seguirPorWhatsApp } from "@/lib/escuchar";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  const pedidos = (await listarPedidos()).filter((p) => p.estado !== "descartado").reverse();
  return NextResponse.json({ pedidos: pedidos.slice(0, 50) });
}

// { id, accion: "descartar" | "reabrir" | "whatsapp", telefono? }
export async function PATCH(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  const { id, accion, telefono } = (await req.json()) as { id?: string; accion?: string; telefono?: string };
  if (!id) return NextResponse.json({ error: "Falta el pedido" }, { status: 400 });

  if (accion === "descartar" || accion === "reabrir") {
    const p = await actualizarPedido(id, { estado: accion === "descartar" ? "descartado" : "pendiente" });
    if (!p) return NextResponse.json({ error: "No existe el pedido" }, { status: 404 });
    return NextResponse.json({ pedido: p });
  }

  if (accion === "whatsapp") {
    let p = (await listarPedidos()).find((x) => x.id === id);
    if (!p) return NextResponse.json({ error: "No existe el pedido" }, { status: 404 });
    if (telefono !== undefined) {
      const tel = normalizarTelefono(telefono);
      if (tel.length < 10) return NextResponse.json({ error: "Ese celular no parece válido." }, { status: 400 });
      p = (await actualizarPedido(id, { telefono: tel, faltantes: p.faltantes.filter((f) => f !== "celular") }))!;
    }
    const whatsapp = await seguirPorWhatsApp(p);
    if (whatsapp.error && !p.telefono) return NextResponse.json({ error: whatsapp.error }, { status: 400 });
    return NextResponse.json({ pedido: { ...p, whatsappEnviado: p.whatsappEnviado || whatsapp.enviado }, whatsapp });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
