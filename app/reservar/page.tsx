"use client";

import { useEffect, useState } from "react";
import { NEGOCIO, SERVICIOS, PROFESIONALES, servicioPorId, profesionalPorId } from "@/lib/negocio";
import { linkGoogleCalendar } from "@/lib/gcal";
import Calendario, { fechaLarga, type Slot } from "../components/Calendario";

export default function Reservar() {
  const [servicioId, setServicioId] = useState("");
  const [proId, setProId] = useState(""); // "" = cualquiera
  const [fecha, setFecha] = useState("");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [recargar, setRecargar] = useState(0);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<{ id: string } | null>(null);

  useEffect(() => {
    try {
      const s = new URLSearchParams(location.search).get("servicio");
      if (s && servicioPorId(s)) setServicioId(s);
    } catch {}
  }, []);

  async function reservar(e: React.FormEvent) {
    e.preventDefault();
    if (!slot) return;
    setEnviando(true);
    setError("");
    const res = await fetch("/api/reservar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, telefono, notas, servicioId, profesionalId: slot.profesionalId, fecha, hora: slot.hora }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) {
      setError(data.error || "No se pudo reservar.");
      setRecargar((n) => n + 1);
      return;
    }
    setListo({ id: data.turno.id });
  }

  const servicio = servicioPorId(servicioId);
  const pros = PROFESIONALES.filter((p) => !servicioId || p.servicios.includes(servicioId));

  if (listo && slot && servicio) {
    const gcal = linkGoogleCalendar({
      titulo: `${servicio.nombre} en ${NEGOCIO.nombre}`,
      fecha,
      hora: slot.hora,
      duracionMin: servicio.duracionMin,
      detalles: `Con ${slot.profesional}. Código de turno: ${listo.id}`,
    });
    return (
      <div className="wrap reservar">
        <a href="/" className="logo">
          {NEGOCIO.nombre}
        </a>
        <div className="card confirmado-card">
          <div className="check">✓</div>
          <h1>¡Turno reservado!</h1>
          <p>
            <strong>{servicio.nombre}</strong> con {slot.profesional}
            <br />
            {fechaLarga(fecha)} a las {slot.hora} hs
            <br />
            {NEGOCIO.direccion}
          </p>
          <p className="meta">Código de turno: {listo.id}</p>
          <div className="hero-cta" style={{ justifyContent: "center" }}>
            <a className="btn btn-primary" href={gcal} target="_blank" rel="noreferrer">
              Agregar a mi Google Calendar
            </a>
            <a className="btn btn-ghost" href="/">
              Volver al inicio
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap reservar">
      <nav className="nav">
        <a href="/" className="logo">
          {NEGOCIO.nombre}
        </a>
        <a href="/" className="meta">
          ← Volver
        </a>
      </nav>
      <h1>Reservá tu turno</h1>
      <p className="sub">Elegí servicio, día y horario. Solo te mostramos los horarios que están libres de verdad.</p>

      <section className="paso">
        <h2>
          <span className="num">1</span> ¿Qué te querés hacer?
        </h2>
        <div className="segmentos">
          {SERVICIOS.map((s) => (
            <button
              key={s.id}
              className={`chip grande ${servicioId === s.id ? "activo" : ""}`}
              onClick={() => {
                setServicioId(s.id);
                if (proId && !profesionalPorId(proId)?.servicios.includes(s.id)) setProId("");
              }}
            >
              {s.nombre}
              <small>
                {s.precio} · {s.duracionMin} min
              </small>
            </button>
          ))}
        </div>
      </section>

      {servicioId && (
        <section className="paso">
          <h2>
            <span className="num">2</span> ¿Con quién?
          </h2>
          <div className="segmentos">
            <button className={`chip grande ${proId === "" ? "activo" : ""}`} onClick={() => setProId("")}>
              Me da igual
              <small>el primero libre</small>
            </button>
            {pros.map((p) => (
              <button key={p.id} className={`chip grande ${proId === p.id ? "activo" : ""}`} onClick={() => setProId(p.id)}>
                {p.nombre}
                <small>{p.especialidad}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {servicioId && (
        <section className="paso">
          <h2>
            <span className="num">3</span> Elegí día y horario
          </h2>
          <p className="meta">Turno de {servicio?.duracionMin} min: solo aparecen los horarios donde entra completo.</p>
          <Calendario
            servicioId={servicioId}
            profesionalId={proId}
            recargar={recargar}
            onElegir={(f, s) => {
              setFecha(f);
              setSlot(s);
            }}
          />
        </section>
      )}

      {slot && servicio && (
        <section className="paso">
          <h2>
            <span className="num">4</span> Tus datos
          </h2>
          <p className="meta">
            {servicio.nombre} con {slot.profesional}, {fechaLarga(fecha)} a las {slot.hora} hs · {servicio.precio}
          </p>
          <form className="form-grid" onSubmit={reservar}>
            <label className="campo">
              <span>Nombre</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </label>
            <label className="campo">
              <span>Celular (WhatsApp)</span>
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} required inputMode="tel" placeholder="11 5555 5555" />
            </label>
            <label className="campo ancho">
              <span>Algo que tengamos que saber (opcional)</span>
              <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Largo de pelo, foto de referencia, etc." />
            </label>
            {error && (
              <p className="ancho" style={{ color: "var(--bad)" }}>
                {error}
              </p>
            )}
            <div className="ancho">
              <button className="btn btn-primary" disabled={enviando}>
                {enviando ? "Reservando…" : "Confirmar turno"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
