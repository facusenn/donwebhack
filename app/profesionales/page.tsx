"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NEGOCIO, PROFESIONALES, CANALES, servicioPorId, profesionalPorId } from "@/lib/negocio";
import { proximosDiasAbiertos, ahoraAR } from "@/lib/agenda";
import { linkGoogleCalendar } from "@/lib/gcal";
import { fechaLarga } from "../components/Calendario";
import type { Turno } from "@/lib/store";

type Bloqueo = { profesionalId: string; fecha: string; inicio: number; fin: number; titulo?: string };
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default function Profesionales() {
  const [clave, setClave] = useState("");
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [proId, setProId] = useState("");
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [conectado, setConectado] = useState(false);
  const [urlIcs, setUrlIcs] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [verGcal, setVerGcal] = useState(false);
  const [origen, setOrigen] = useState("");

  const fechas = useMemo(() => proximosDiasAbiertos(7), []);

  const cargar = useCallback(
    async (c: string, pro: string) => {
      const res = await fetch("/api/turnos", { headers: { "x-clave": c }, cache: "no-store" });
      if (res.status === 401) {
        setAutorizado(false);
        return;
      }
      setAutorizado(true);
      try {
        sessionStorage.setItem("clave-panel", c);
      } catch {}
      setTurnos((await res.json()).turnos);
      if (pro) {
        const q = new URLSearchParams({ profesional: pro, fechas: fechas.join(",") });
        const cal = await fetch(`/api/calendario?${q}`, { headers: { "x-clave": c } }).then((r) => r.json());
        setBloqueos(cal.bloqueos ?? []);
        setConectado(Boolean(cal.conectado));
      }
    },
    [fechas],
  );

  useEffect(() => {
    let c = "";
    let p = "";
    try {
      const qs = new URLSearchParams(location.search);
      c = qs.get("clave") ?? sessionStorage.getItem("clave-panel") ?? "";
      p = qs.get("pro") ?? localStorage.getItem("pro-elegido") ?? "";
    } catch {}
    setOrigen(location.origin);
    setClave(c);
    if (p && profesionalPorId(p)) setProId(p);
    cargar(c, p && profesionalPorId(p) ? p : "");
  }, [cargar]);

  useEffect(() => {
    if (!autorizado || !proId) return;
    try {
      localStorage.setItem("pro-elegido", proId);
    } catch {}
    cargar(clave, proId);
    const id = setInterval(() => cargar(clave, proId), 15000);
    return () => clearInterval(id);
  }, [proId, autorizado, clave, cargar]);

  async function guardarGcal(url: string) {
    setGuardando(true);
    setAviso("");
    const res = await fetch("/api/calendario", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-clave": clave },
      body: JSON.stringify({ profesionalId: proId, url }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      setAviso(data.error);
      return;
    }
    setUrlIcs("");
    setAviso(data.conectado ? "¡Listo! Tus eventos de Google ya bloquean horarios en la agenda." : "Desconectado.");
    cargar(clave, proId);
  }

  async function marcar(id: string, estado: string) {
    await fetch("/api/turnos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-clave": clave },
      body: JSON.stringify({ id, estado }),
    });
    cargar(clave, proId);
  }

  if (autorizado === false) {
    return (
      <form
        className="login wrap"
        onSubmit={(e) => {
          e.preventDefault();
          cargar(clave, proId);
        }}
      >
        <h1>Acceso profesionales</h1>
        <input type="password" placeholder="Clave del equipo" value={clave} onChange={(e) => setClave(e.target.value)} />
        <button className="btn btn-primary">Entrar</button>
      </form>
    );
  }

  const pro = profesionalPorId(proId);
  const mios = turnos.filter((t) => t.profesionalId === proId && t.estado !== "cancelado");
  const hoy = fechas[0]; // próximo día de trabajo
  const hoyReal = ahoraAR().fecha;
  const titulo = (f: string) => {
    const t = fechaLarga(f);
    return (f === hoyReal ? "Hoy · " : "") + t.charAt(0).toUpperCase() + t.slice(1);
  };
  const deHoy = mios.filter((t) => t.fecha === hoy && t.estado === "confirmado");
  const feed = `${origen}/api/calendario/${proId}.ics${clave ? `?k=${encodeURIComponent(clave)}` : ""}`;

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <h1>Mi agenda</h1>
      <p className="sub">Elegí quién sos para ver tus turnos y a quién atendés.</p>

      <div className="pros-selector">
        {PROFESIONALES.map((p) => (
          <button key={p.id} className={`card ${p.id === proId ? "activo" : ""}`} onClick={() => setProId(p.id)}>
            <strong>{p.nombre}</strong>
            <div className="meta">{p.especialidad}</div>
          </button>
        ))}
      </div>

      {pro && (
        <>
          <div className="stats">
            <div className="stat">
              <b>{deHoy.length}</b>
              <span>{hoy === hoyReal ? "clientes hoy" : `clientes el ${fechaLarga(hoy)} (próximo día)`}</span>
            </div>
            <div className="stat">
              <b>{mios.filter((t) => fechas.includes(t.fecha) && t.estado === "confirmado").length}</b>
              <span>turnos en los próximos 7 días</span>
            </div>
            <div className="stat">
              <span className={`estado-gcal ${conectado ? "on" : ""}`}>{conectado ? "Google Calendar conectado" : "Google Calendar sin conectar"}</span>
              <div style={{ marginTop: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setVerGcal((v) => !v)}>
                  {conectado ? "Configurar" : "Conectar"}
                </button>
              </div>
            </div>
          </div>

          {verGcal && (
            <div className="card gcal-box" style={{ marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Conectar mi Google Calendar</h2>
              <strong>1. Que tus eventos personales bloqueen horarios</strong>
              <ol>
                <li>
                  Abrí <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noreferrer">Configuración de Google Calendar</a> en la compu.
                </li>
                <li>A la izquierda, elegí tu calendario y bajá hasta “Integrar el calendario”.</li>
                <li>Copiá la “Dirección secreta en formato iCal” y pegala acá.</li>
              </ol>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  className="campo-input"
                  style={{ flex: 1, minWidth: 220, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", borderRadius: 10, padding: "9px 11px", font: "inherit" }}
                  placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
                  value={urlIcs}
                  onChange={(e) => setUrlIcs(e.target.value)}
                />
                <button className="btn btn-primary btn-sm" disabled={guardando || !urlIcs.trim()} onClick={() => guardarGcal(urlIcs)}>
                  {guardando ? "Probando…" : "Conectar"}
                </button>
                {conectado && (
                  <button className="btn btn-ghost btn-sm" onClick={() => guardarGcal("")}>
                    Desconectar
                  </button>
                )}
              </div>
              {aviso && <p className="meta">{aviso}</p>}
              <strong>2. Ver tus turnos de {NEGOCIO.nombre} dentro de Google Calendar</strong>
              <ol>
                <li>
                  En Google Calendar, a la izquierda: “Otros calendarios” → “+” → <a href="https://calendar.google.com/calendar/r/settings/addbyurl" target="_blank" rel="noreferrer">Desde URL</a>.
                </li>
                <li>
                  Pegá este link: <code>{feed}</code>
                </li>
              </ol>
              <p className="meta">Google actualiza los calendarios suscriptos cada algunas horas. Para verlo al instante, usá “Agregar a Google” en cada turno.</p>
            </div>
          )}

          {fechas.map((f) => {
            const delDia = mios.filter((t) => t.fecha === f);
            const bl = bloqueos.filter((b) => b.fecha === f);
            const items = [
              ...delDia.map((t) => ({ tipo: "turno" as const, min: Number(t.hora.slice(0, 2)) * 60 + Number(t.hora.slice(3)), t })),
              ...bl.map((b) => ({ tipo: "bloqueo" as const, min: b.inicio, b })),
            ].sort((a, b) => a.min - b.min);
            return (
              <div className="dia" key={f}>
                <h2 style={{ textTransform: "none" }}>{titulo(f)}</h2>
                {items.length === 0 && <p className="meta">Sin turnos.</p>}
                {items.map((it) =>
                  it.tipo === "bloqueo" ? (
                    <div className="bloqueo" key={`b${it.b.inicio}${it.b.titulo}`}>
                      <div className="hora">{hhmm(it.b.inicio)}</div>
                      <div>
                        {it.b.titulo || "Ocupado"} · hasta {hhmm(Math.min(it.b.fin, 1440))} <span className="meta">(Google Calendar)</span>
                      </div>
                    </div>
                  ) : (
                    <div className={`turno ${it.t.estado}`} key={it.t.id}>
                      <div className="hora">{it.t.hora}</div>
                      <div>
                        <strong>{it.t.nombre}</strong>
                        <span className={`badge ${it.t.estado}`}>{it.t.estado}</span>
                        <span className={`badge canal-${it.t.canal}`}>{CANALES[it.t.canal]}</span>
                        <div className="meta">
                          {servicioPorId(it.t.servicioId)?.nombre} · {it.t.duracionMin} min · +{it.t.telefono}
                        </div>
                        {it.t.notas && <div className="meta">📝 {it.t.notas}</div>}
                      </div>
                      <div className="acciones">
                        <a
                          className="btn btn-ghost btn-sm"
                          target="_blank"
                          rel="noreferrer"
                          href={linkGoogleCalendar({
                            titulo: `${servicioPorId(it.t.servicioId)?.nombre} · ${it.t.nombre}`,
                            fecha: it.t.fecha,
                            hora: it.t.hora,
                            duracionMin: it.t.duracionMin,
                            detalles: `Tel: +${it.t.telefono}${it.t.notas ? `\nNotas: ${it.t.notas}` : ""}\nCódigo: ${it.t.id}`,
                          })}
                        >
                          Agregar a Google
                        </a>
                        <a className="btn btn-sm wa" href={`https://wa.me/${it.t.telefono}`} target="_blank" rel="noreferrer">
                          WhatsApp
                        </a>
                        {it.t.estado === "confirmado" && (
                          <button className="btn btn-ghost btn-sm" onClick={() => marcar(it.t.id, "atendido")}>
                            Atendido
                          </button>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
