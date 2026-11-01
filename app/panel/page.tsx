"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NEGOCIO, CANALES, servicioPorId, profesionalPorId } from "@/lib/negocio";
import NuevoTurno from "./NuevoTurno";
import type { Turno, EstadoTurno } from "@/lib/store";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const fechaLarga = (f: string) => {
  const d = new Date(`${f}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
};

function linkWhatsApp(t: Turno) {
  const s = servicioPorId(t.servicioId)?.nombre ?? t.servicioId;
  const p = profesionalPorId(t.profesionalId)?.nombre ?? "";
  const msg = `¡Hola ${t.nombre.split(" ")[0]}! Te recordamos tu turno de ${s} con ${p} el ${fechaLarga(t.fecha)} a las ${t.hora} en ${NEGOCIO.nombre} (${NEGOCIO.direccion}). Si no podés venir, avisanos por acá. ¡Gracias!`;
  return `https://wa.me/${t.telefono}?text=${encodeURIComponent(msg)}`;
}

export default function Panel() {
  const [clave, setClave] = useState("");
  const [turnos, setTurnos] = useState<Turno[] | null>(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<string>("todos");

  const cargar = useCallback(async (c: string) => {
    const res = await fetch("/api/turnos", { headers: { "x-clave": c }, cache: "no-store" });
    if (res.status === 401) {
      setError("Clave incorrecta");
      setTurnos(null);
      return;
    }
    const data = await res.json();
    setError("");
    setTurnos(data.turnos);
    try {
      sessionStorage.setItem("clave-panel", c);
    } catch {}
  }, []);

  useEffect(() => {
    let c = "";
    try {
      c = new URLSearchParams(location.search).get("clave") ?? sessionStorage.getItem("clave-panel") ?? "";
    } catch {}
    setClave(c);
    cargar(c);
  }, [cargar]);

  // Refresco automático para ver entrar los turnos del asistente durante la demo
  useEffect(() => {
    if (!turnos) return;
    const id = setInterval(() => cargar(clave), 8000);
    return () => clearInterval(id);
  }, [turnos, clave, cargar]);

  async function cambiarEstado(id: string, estado: EstadoTurno) {
    await fetch("/api/turnos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-clave": clave },
      body: JSON.stringify({ id, estado }),
    });
    cargar(clave);
  }

  const visibles = useMemo(
    () => (turnos ?? []).filter((t) => filtro === "todos" || t.profesionalId === filtro),
    [turnos, filtro],
  );
  const porDia = useMemo(() => {
    const m = new Map<string, Turno[]>();
    for (const t of visibles) m.set(t.fecha, [...(m.get(t.fecha) ?? []), t]);
    return [...m.entries()];
  }, [visibles]);

  if (!turnos) {
    return (
      <form
        className="login wrap"
        onSubmit={(e) => {
          e.preventDefault();
          cargar(clave);
        }}
      >
        <h1>Panel del equipo</h1>
        <input type="password" placeholder="Clave" value={clave} onChange={(e) => setClave(e.target.value)} />
        {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
        <button className="btn btn-primary">Entrar</button>
      </form>
    );
  }

  const activos = turnos.filter((t) => t.estado !== "cancelado");
  const porCanal = (Object.keys(CANALES) as (keyof typeof CANALES)[]).map((c) => ({
    c,
    n: activos.filter((t) => t.canal === c).length,
  }));
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: NEGOCIO.zonaHoraria });
  const deHoy = activos.filter((t) => t.fecha === hoy).length;

  return (
    <div className="wrap">
      <div className="panel-top">
        <div>
          <a href="/" className="logo">
            {NEGOCIO.nombre}
          </a>
          <div className="meta">Bandeja única de turnos: web, WhatsApp, teléfono y mostrador</div>
        </div>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="btn btn-ghost"
          aria-label="Filtrar por profesional"
        >
          <option value="todos">Todo el equipo</option>
          <option value="lucia">Lucía</option>
          <option value="martin">Martín</option>
          <option value="sofi">Sofi</option>
        </select>
      </div>

      <div style={{ marginBottom: 20 }}>
        <NuevoTurno clave={clave} onCreado={() => cargar(clave)} />
      </div>

      <div className="stats">
        <div className="stat">
          <b>{activos.length}</b>
          <span>turnos activos</span>
        </div>
        <div className="stat">
          <b>{deHoy}</b>
          <span>para hoy</span>
        </div>
        {porCanal.map(({ c, n }) => (
          <div className="stat" key={c}>
            <b>{n}</b>
            <span>
              <span className={`badge canal-${c}`}>{CANALES[c]}</span>
            </span>
          </div>
        ))}
      </div>

      {porDia.length === 0 && <p className="meta">No hay turnos todavía.</p>}
      {porDia.map(([fecha, lista]) => (
        <div className="dia" key={fecha}>
          <h2>{fechaLarga(fecha)}</h2>
          {lista.map((t) => (
            <div className={`turno ${t.estado}`} key={t.id}>
              <div className="hora">{t.hora}</div>
              <div>
                <strong>{t.nombre}</strong>
                <span className={`badge ${t.estado}`}>{t.estado}</span>
                <span className={`badge canal-${t.canal}`}>{CANALES[t.canal]}</span>
                <div className="meta">
                  {servicioPorId(t.servicioId)?.nombre} con {profesionalPorId(t.profesionalId)?.nombre} · {t.duracionMin} min · #{t.id}
                </div>
                {t.notas && <div className="meta">📝 {t.notas}</div>}
              </div>
              <div className="acciones">
                <a className="btn btn-sm wa" href={linkWhatsApp(t)} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
                {t.estado === "confirmado" && (
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={() => cambiarEstado(t.id, "atendido")}>
                      Atendido
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => cambiarEstado(t.id, "cancelado")}>
                      Cancelar
                    </button>
                  </>
                )}
                {t.estado !== "confirmado" && (
                  <button className="btn btn-ghost btn-sm" onClick={() => cambiarEstado(t.id, "confirmado")}>
                    Reabrir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
