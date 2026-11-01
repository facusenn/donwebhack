"use client";

import { useEffect, useState } from "react";
import { SERVICIOS, PROFESIONALES, CANALES, type Canal } from "@/lib/negocio";
import { proximosDiasAbiertos } from "@/lib/agenda";

type Form = {
  canal: Canal;
  nombre: string;
  telefono: string;
  servicioId: string;
  profesionalId: string;
  fecha: string;
  hora: string;
  notas: string;
};

const vacio = (): Form => ({
  canal: "whatsapp",
  nombre: "",
  telefono: "",
  servicioId: "",
  profesionalId: "",
  fecha: proximosDiasAbiertos(1)[0],
  hora: "",
  notas: "",
});

export default function NuevoTurno({ clave, onCreado }: { clave: string; onCreado: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState<Form>(vacio);
  const [pegado, setPegado] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [sugerida, setSugerida] = useState("");
  const [faltantes, setFaltantes] = useState<string[]>([]);
  const [horarios, setHorarios] = useState<{ profesionalId: string; profesional: string; horarios: string[] }[]>([]);
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  // Buscar horarios libres cuando cambian servicio / fecha / profesional
  useEffect(() => {
    if (!f.servicioId || !f.fecha) {
      setHorarios([]);
      return;
    }
    const q = new URLSearchParams({ fecha: f.fecha, servicio: f.servicioId, profesional: f.profesionalId });
    fetch(`/api/disponibilidad?${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setHorarios(d.opciones);
          setAviso("");
        } else {
          setHorarios([]);
          setAviso(d.error);
        }
      });
  }, [f.servicioId, f.fecha, f.profesionalId]);

  async function interpretar() {
    if (!pegado.trim()) return;
    setLeyendo(true);
    setAviso("");
    try {
      const res = await fetch("/api/interpretar", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-clave": clave },
        body: JSON.stringify({ texto: pegado, canal: CANALES[f.canal] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const d = data.datos;
      setF((x) => ({
        ...x,
        nombre: d.nombre || x.nombre,
        telefono: d.telefono || x.telefono,
        servicioId: d.servicioId || x.servicioId,
        profesionalId: d.profesionalId || x.profesionalId,
        fecha: d.fecha || x.fecha,
        hora: d.hora || x.hora,
        notas: d.notas || x.notas,
      }));
      setSugerida(d.respuestaSugerida);
      setFaltantes(d.faltantes);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No pude leer el mensaje.");
    } finally {
      setLeyendo(false);
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setAviso("");
    const res = await fetch("/api/turnos", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-clave": clave },
      body: JSON.stringify(f),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) {
      setAviso(data.error);
      return;
    }
    setF(vacio());
    setPegado("");
    setSugerida("");
    setFaltantes([]);
    setAbierto(false);
    onCreado();
  }

  if (!abierto) {
    return (
      <button className="btn btn-primary" onClick={() => setAbierto(true)}>
        + Cargar turno de WhatsApp / teléfono
      </button>
    );
  }

  const elegido = horarios.find((h) => h.profesionalId === f.profesionalId);
  const pros = PROFESIONALES.filter((p) => !f.servicioId || p.servicios.includes(f.servicioId));

  return (
    <div className="card nuevo">
      <div className="nuevo-head">
        <h2>Cargar turno</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => setAbierto(false)}>
          Cerrar
        </button>
      </div>

      <label className="campo">
        <span>¿Por dónde entró?</span>
        <div className="segmentos">
          {(Object.keys(CANALES) as Canal[])
            .filter((c) => c !== "web")
            .map((c) => (
              <button type="button" key={c} className={`chip ${f.canal === c ? "activo" : ""}`} onClick={() => set("canal", c)}>
                {CANALES[c]}
              </button>
            ))}
        </div>
      </label>

      <label className="campo">
        <span>Pegá el chat de WhatsApp o anotá lo que dijo por teléfono (opcional)</span>
        <textarea
          rows={3}
          value={pegado}
          onChange={(e) => setPegado(e.target.value)}
          placeholder={'Ej: "hola soy Caro, quería turno para color de raíz el jueves a la tarde, mi cel es 11 4444 5555"'}
        />
      </label>
      <button type="button" className="btn btn-ghost btn-sm" onClick={interpretar} disabled={leyendo || !pegado.trim()}>
        {leyendo ? "Leyendo…" : "✨ Completar con IA"}
      </button>
      {faltantes.length > 0 && <p className="meta">Falta: {faltantes.join(", ")}</p>}
      {sugerida && (
        <div className="sugerida">
          <span className="meta">Respuesta sugerida para el cliente:</span>
          <p>{sugerida}</p>
          {f.telefono && (
            <a
              className="btn btn-sm wa"
              target="_blank"
              rel="noreferrer"
              href={`https://wa.me/${f.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(sugerida)}`}
            >
              Responder por WhatsApp
            </a>
          )}
        </div>
      )}

      <form onSubmit={guardar} className="form-grid">
        <label className="campo">
          <span>Nombre</span>
          <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} required />
        </label>
        <label className="campo">
          <span>Celular</span>
          <input value={f.telefono} onChange={(e) => set("telefono", e.target.value)} required inputMode="tel" />
        </label>
        <label className="campo">
          <span>Servicio</span>
          <select value={f.servicioId} onChange={(e) => set("servicioId", e.target.value)} required>
            <option value="">Elegí…</option>
            {SERVICIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} ({s.duracionMin} min)
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Profesional</span>
          <select value={f.profesionalId} onChange={(e) => set("profesionalId", e.target.value)} required>
            <option value="">Elegí…</option>
            {pros.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Fecha</span>
          <input type="date" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} required />
        </label>
        <label className="campo">
          <span>Hora</span>
          <input value={f.hora} onChange={(e) => set("hora", e.target.value)} placeholder="HH:MM" required pattern="\d{2}:\d{2}" />
        </label>
        <label className="campo ancho">
          <span>Notas</span>
          <input value={f.notas} onChange={(e) => set("notas", e.target.value)} />
        </label>

        {f.servicioId && (
          <div className="ancho">
            <span className="meta">Horarios libres {f.profesionalId ? "" : "(elegí profesional)"}</span>
            <div className="segmentos">
              {(elegido ? [elegido] : horarios).flatMap((o) =>
                o.horarios.slice(0, 12).map((h) => (
                  <button
                    type="button"
                    key={o.profesionalId + h}
                    className={`chip ${f.hora === h && f.profesionalId === o.profesionalId ? "activo" : ""}`}
                    onClick={() => setF((x) => ({ ...x, hora: h, profesionalId: o.profesionalId }))}
                  >
                    {h}
                    {elegido ? "" : ` · ${o.profesional}`}
                  </button>
                )),
              )}
            </div>
          </div>
        )}

        {aviso && <p className="ancho" style={{ color: "var(--bad)" }}>{aviso}</p>}
        <div className="ancho">
          <button className="btn btn-primary" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar turno"}
          </button>
        </div>
      </form>
    </div>
  );
}
