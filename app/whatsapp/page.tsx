"use client";

// Simulador de WhatsApp para la demo: manda los mensajes al MISMO webhook que usa Twilio
// (/api/whatsapp, con el mismo formato), así se ve el flujo real sin depender del sandbox.
import { useEffect, useRef, useState } from "react";
import { NEGOCIO } from "@/lib/negocio";

type Msg = { de: "yo" | "bot"; texto: string; hora: string };
const ahora = () => new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

export default function WhatsAppDemo() {
  const [telefono, setTelefono] = useState("+5491155559876");
  const [nombre, setNombre] = useState("Caro");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, escribiendo]);

  async function enviar(t: string) {
    const contenido = t.trim();
    if (!contenido || escribiendo) return;
    setMsgs((m) => [...m, { de: "yo", texto: contenido, hora: ahora() }]);
    setTexto("");
    setEscribiendo(true);
    try {
      const body = new URLSearchParams({ From: `whatsapp:${telefono}`, Body: contenido, ProfileName: nombre });
      const res = await fetch("/api/whatsapp", { method: "POST", body });
      const xml = await res.text();
      const doc = new DOMParser().parseFromString(xml, "text/xml");
      const respuesta = doc.querySelector("Message")?.textContent ?? "(sin respuesta)";
      setMsgs((m) => [...m, { de: "bot", texto: respuesta, hora: ahora() }]);
    } catch {
      setMsgs((m) => [...m, { de: "bot", texto: "No se pudo enviar. Probá de nuevo.", hora: ahora() }]);
    } finally {
      setEscribiendo(false);
    }
  }

  return (
    <div className="wa-pagina">
      <div className="wa-lado">
        <a href="/" className="logo">
          {NEGOCIO.nombre}
        </a>
        <h1>Reservas por WhatsApp</h1>
        <p className="meta">
          Este simulador usa el mismo webhook que Twilio (<code>/api/whatsapp</code>). La IA responde con la agenda real y el turno cae en el panel
          con la etiqueta WhatsApp.
        </p>
        <label className="campo">
          <span>Número del cliente</span>
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </label>
        <label className="campo">
          <span>Nombre en WhatsApp</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <div className="hero-cta">
          <button className="btn btn-ghost btn-sm" onClick={() => {
              setMsgs([]);
              fetch("/api/whatsapp", { method: "POST", body: new URLSearchParams({ From: `whatsapp:${telefono}`, Body: "reiniciar" }) });
            }}>
            Nueva conversación
          </button>
          <a className="btn btn-ghost btn-sm" href="/panel" target="_blank">
            Abrir panel ↗
          </a>
        </div>
      </div>

      <div className="wa-tel">
        <div className="wa-head">
          <div className="wa-avatar">{NEGOCIO.nombre[0]}</div>
          <div>
            <strong>{NEGOCIO.nombre}</strong>
            <small>{escribiendo ? "escribiendo…" : "en línea"}</small>
          </div>
        </div>
        <div className="wa-body">
          {msgs.length === 0 && <div className="wa-aviso">Escribí como si fueras un cliente. Ej: "hola, ¿tenés lugar el sábado para corte?"</div>}
          {msgs.map((m, i) => (
            <div key={i} className={`wa-msg ${m.de}`}>
              {m.texto}
              <span>{m.hora}{m.de === "yo" ? " ✓✓" : ""}</span>
            </div>
          ))}
          <div ref={fin} />
        </div>
        <form
          className="wa-form"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
        >
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Mensaje" aria-label="Mensaje" />
          <button aria-label="Enviar" disabled={!texto.trim() || escribiendo}>
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
