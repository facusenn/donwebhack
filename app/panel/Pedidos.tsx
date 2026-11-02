"use client";

// Pedidos pendientes: consultas de teléfono / mostrador que no se pudieron agendar en el momento.
// Se terminan por WhatsApp con el asistente; cuando el cliente reserva, el pedido pasa solo a "agendado".
import { useCallback, useEffect, useState } from "react";
import { CANALES, servicioPorId, profesionalPorId } from "@/lib/negocio";
import type { Pedido } from "@/lib/store";
import { linkSimulador, Transcripcion } from "./Escuchar";

export default function Pedidos({ clave, refresco }: { clave: string; refresco: number }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [celulares, setCelulares] = useState<Record<string, string>>({});
  const [avisos, setAvisos] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    const res = await fetch("/api/pedidos", { headers: { "x-clave": clave }, cache: "no-store" });
    if (res.ok) setPedidos((await res.json()).pedidos);
  }, [clave]);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 8000);
    return () => clearInterval(id);
  }, [cargar, refresco]);

  async function accion(p: Pedido, accion: string, telefono?: string) {
    const res = await fetch("/api/pedidos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-clave": clave },
      body: JSON.stringify({ id: p.id, accion, telefono }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAvisos((a) => ({ ...a, [p.id]: data.error }));
      return;
    }
    setAvisos((a) => ({ ...a, [p.id]: data.whatsapp?.enviado ? "Listo, el asistente le escribió por WhatsApp." : data.whatsapp?.error ?? "" }));
    if (accion === "whatsapp" && !data.whatsapp?.enviado) window.open(linkSimulador(data.pedido), "_blank");
    cargar();
  }

  const pendientes = pedidos.filter((p) => p.estado === "pendiente");
  const recientes = pedidos.filter((p) => p.estado === "agendado").slice(0, 3);
  if (pendientes.length === 0 && recientes.length === 0) return null;

  return (
    <div className="pedidos">
      <h2>
        Pedidos por terminar <span className="badge pendiente">{pendientes.length}</span>
      </h2>
      {[...pendientes, ...recientes].map((p) => (
        <div className={`turno pedido ${p.estado}`} key={p.id}>
          <div className="hora">{p.hora || "—"}</div>
          <div>
            <strong>{p.nombre || "Cliente sin nombre"}</strong>
            <span className={`badge ${p.estado}`}>{p.estado}</span>
            <span className={`badge canal-${p.canal}`}>{CANALES[p.canal]}</span>
            <div className="meta">
              {[servicioPorId(p.servicioId)?.nombre ?? "Servicio a definir", p.profesionalId && `con ${profesionalPorId(p.profesionalId)?.nombre}`, p.fecha]
                .filter(Boolean)
                .join(" · ")}
              {p.turnoId && ` · turno #${p.turnoId}`}
            </div>
            {p.estado === "pendiente" && <div className="meta">⏳ {p.motivo}</div>}
            {p.notas && <div className="meta">📝 {p.notas}</div>}
            {p.estado === "pendiente" && !p.telefono && (
              <div className="pedido-cel">
                <input
                  placeholder="Celular del cliente"
                  inputMode="tel"
                  value={celulares[p.id] ?? ""}
                  onChange={(e) => setCelulares((c) => ({ ...c, [p.id]: e.target.value }))}
                />
                <button className="btn btn-sm wa" disabled={(celulares[p.id] ?? "").replace(/\D/g, "").length < 8} onClick={() => accion(p, "whatsapp", celulares[p.id])}>
                  Guardar y escribirle
                </button>
              </div>
            )}
            {avisos[p.id] && <div className="meta">{avisos[p.id]}</div>}
            <Transcripcion texto={p.transcripcion} />
          </div>
          {p.estado === "pendiente" && (
            <div className="acciones">
              {p.telefono && (
                <button className="btn btn-sm wa" onClick={() => accion(p, "whatsapp")}>
                  {p.whatsappEnviado ? "Reenviar WhatsApp" : "Seguir por WhatsApp"}
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => accion(p, "descartar")}>
                Descartar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
