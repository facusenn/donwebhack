"use client";

import { useEffect, useRef, useState } from "react";
import Calendario, { fechaLarga } from "./Calendario";
import { servicioPorId } from "@/lib/negocio";

type Msg = {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  turnoId?: string;
  calendario?: { servicioId: string; profesionalId?: string };
  calendarioUsado?: boolean;
  mostrar?: string;
};

const SUGERENCIAS = ["Quiero un turno para corte", "¿Cuánto sale un balayage?", "¿Qué días atienden?", "¿Tienen lugar mañana?"];

export default function Chat({ nombreNegocio }: { nombreNegocio: string }) {
  const [abierto, setAbierto] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content: `¡Hola! 👋 Soy el asistente de ${nombreNegocio}. Te puedo pasar precios, contarte de los servicios o reservarte un turno ahora mismo. ¿Qué necesitás?`,
    },
  ]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const abrir = (e: Event) => {
      setAbierto(true);
      const t = (e as CustomEvent<string | undefined>).detail;
      if (t) enviar(t);
    };
    window.addEventListener("abrir-chat", abrir);
    return () => window.removeEventListener("abrir-chat", abrir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs, cargando]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, cargando, abierto]);

  useEffect(() => {
    if (abierto) inputRef.current?.focus();
  }, [abierto]);

  async function enviar(contenido: string, mostrar?: string) {
    const t = contenido.trim();
    if (!t || cargando) return;
    const nuevos: Msg[] = [...msgs, { role: "user", content: t, mostrar }];
    setMsgs(nuevos);
    setTexto("");
    setCargando(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensajes: nuevos.filter((m) => !m.error).map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detalle || data.error);
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: data.respuesta, turnoId: data.turno?.id, calendario: data.calendario ?? undefined },
      ]);
    } catch (e) {
      console.error(e);
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: `Uy, tuve un problema para responder. Probá de nuevo en un ratito.\n\n(Detalle técnico: ${e instanceof Error ? e.message : String(e)})`,
          error: true,
        },
      ]);
    } finally {
      setCargando(false);
    }
  }

  if (!abierto) {
    return (
      <button className="btn btn-primary chat-fab" onClick={() => setAbierto(true)} aria-label="Abrir chat">
        💬 Reservá o consultá
      </button>
    );
  }

  return (
    <div className="chat" role="dialog" aria-label={`Chat con ${nombreNegocio}`}>
      <div className="chat-head">
        <div>
          <strong>{nombreNegocio}</strong>
          <small>Asistente virtual · responde al instante</small>
        </div>
        <button onClick={() => setAbierto(false)} aria-label="Cerrar chat">
          ×
        </button>
      </div>
      <div className="chat-body">
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "contents" }}>
            <div className={`burbuja ${m.role === "user" ? "yo" : "bot"} ${m.error ? "error" : ""}`}>{m.mostrar ?? m.content}</div>
            {m.turnoId && <div className="reservado">✓ Turno {m.turnoId} reservado</div>}
            {m.calendario && !m.calendarioUsado && i === msgs.length - 1 && (
              <div className="burbuja bot cal-en-chat">
                <div className="meta">
                  {servicioPorId(m.calendario.servicioId)?.nombre} · {servicioPorId(m.calendario.servicioId)?.duracionMin} min
                </div>
                <Calendario
                  servicioId={m.calendario.servicioId}
                  profesionalId={m.calendario.profesionalId ?? ""}
                  semanas={3}
                  compacto
                  onElegir={(fecha, slot) => {
                    if (!slot) return;
                    const texto = `Elijo el ${fechaLarga(fecha)} a las ${slot.hora} con ${slot.profesional}`;
                    enviar(`${texto} (fecha ${fecha}, hora ${slot.hora}, profesional_id ${slot.profesionalId}).`, `${texto} 📅`);
                  }}
                />
              </div>
            )}
          </div>
        ))}
        {cargando && <div className="escribiendo">Escribiendo…</div>}
        <div ref={finRef} />
      </div>
      {msgs.length <= 1 && (
        <div className="chips">
          {SUGERENCIAS.map((s) => (
            <button key={s} className="chip" onClick={() => enviar(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
      >
        <input
          ref={inputRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribí tu mensaje…"
          aria-label="Mensaje"
        />
        <button className="btn btn-primary" disabled={cargando || !texto.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}

export function abrirChat(texto?: string) {
  window.dispatchEvent(new CustomEvent("abrir-chat", { detail: texto }));
}
