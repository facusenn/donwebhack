"use client";

// Botón "Escuchar consulta": graba una conversación de teléfono (en altavoz) o de mostrador,
// la transcribe y la IA agenda el turno o lo deja como pedido para terminar por WhatsApp.
import { useEffect, useRef, useState } from "react";
import { servicioPorId, profesionalPorId } from "@/lib/negocio";
import type { Turno, Pedido } from "@/lib/store";

type Resultado =
  | { tipo: "turno"; transcripcion: string; turno: Turno; mensajeWhatsApp: string }
  | { tipo: "pedido"; transcripcion: string; pedido: Pedido; whatsapp: { enviado: boolean; error?: string } };

const MAX_SEG = 8 * 60;
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const fechaLarga = (f: string) => {
  const d = new Date(`${f}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
};

// Reconocimiento de voz del navegador (Chrome / Edge / Safari). Sirve de respaldo si el servidor no transcribe.
type Reconocedor = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
function crearReconocedor(): Reconocedor | null {
  const w = window as unknown as { SpeechRecognition?: new () => Reconocedor; webkitSpeechRecognition?: new () => Reconocedor };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return C ? new C() : null;
}

export function linkSimulador(p: { telefono: string; nombre: string; mensajeWhatsApp: string }) {
  const q = new URLSearchParams({ tel: `+${p.telefono}`, abre: p.mensajeWhatsApp });
  if (p.nombre) q.set("nombre", p.nombre.split(" ")[0]);
  return `/whatsapp?${q}`;
}

export default function Escuchar({ clave, onListo }: { clave: string; onListo: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [canal, setCanal] = useState<"telefono" | "mostrador">("mostrador");
  const [servidorTranscribe, setServidorTranscribe] = useState<boolean | null>(null);
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [vivo, setVivo] = useState("");
  const [texto, setTexto] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const reconocedor = useRef<Reconocedor | null>(null);
  const finales = useRef("");
  const grabandoRef = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!abierto || servidorTranscribe !== null) return;
    fetch("/api/escuchar", { headers: { "x-clave": clave } })
      .then((r) => r.json())
      .then((d) => setServidorTranscribe(Boolean(d.transcribe)))
      .catch(() => setServidorTranscribe(false));
  }, [abierto, clave, servidorTranscribe]);

  useEffect(() => () => detenerTodo(), []);

  // Corte automático para no pasarnos del tamaño máximo de audio.
  useEffect(() => {
    if (grabando && segundos >= MAX_SEG) terminar();
  }, [grabando, segundos]);

  function detenerTodo() {
    grabandoRef.current = false;
    if (timer.current) clearInterval(timer.current);
    try {
      reconocedor.current?.stop();
    } catch {}
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function enviar(audio: Blob | null, nombreArchivo: string, textoNavegador: string) {
    setProcesando(true);
    setError("");
    setResultado(null);
    try {
      const form = new FormData();
      form.append("canal", canal);
      if (audio) form.append("audio", audio, nombreArchivo);
      if (textoNavegador) form.append("texto", textoNavegador);
      const res = await fetch("/api/escuchar", { method: "POST", headers: { "x-clave": clave }, body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No pude procesar la consulta.");
      setResultado(data);
      setTexto("");
      onListo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pude procesar la consulta.");
    } finally {
      setProcesando(false);
    }
  }

  async function empezar() {
    setError("");
    setResultado(null);
    setVivo("");
    finales.current = "";
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("No tengo permiso para usar el micrófono. Habilitalo en el navegador, o escribí la conversación abajo.");
      return;
    }
    const tipo = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported?.(t)) ?? "";
    const rec = new MediaRecorder(stream, { ...(tipo ? { mimeType: tipo } : {}), audioBitsPerSecond: 32000 });
    const partes: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && partes.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const mime = rec.mimeType || tipo || "audio/webm";
      const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
      const audio = new Blob(partes, { type: mime });
      // Esperamos un instante a que el reconocedor del navegador entregue la última frase.
      setTimeout(() => enviar(servidorTranscribe === false ? null : audio, `consulta.${ext}`, finales.current.trim()), 400);
    };
    rec.start(1000);
    recorder.current = rec;

    const r = crearReconocedor();
    if (r) {
      r.lang = "es-AR";
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        let provisorio = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) finales.current += res[0].transcript + " ";
          else provisorio += res[0].transcript;
        }
        setVivo(finales.current + provisorio);
      };
      // Chrome corta solo tras un silencio: lo reiniciamos mientras sigamos grabando.
      r.onend = () => {
        if (grabandoRef.current) {
          try {
            r.start();
          } catch {}
        }
      };
      r.onerror = () => {};
      try {
        r.start();
      } catch {}
      reconocedor.current = r;
    } else if (servidorTranscribe === false) {
      setError("Este navegador no transcribe y el servidor no tiene key de OpenAI para hacerlo. Usá Chrome o escribí la conversación.");
    }

    grabandoRef.current = true;
    setGrabando(true);
    setSegundos(0);
    timer.current = setInterval(() => setSegundos((s) => s + 1), 1000);
  }

  function terminar() {
    setGrabando(false);
    detenerTodo();
  }

  function subirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (servidorTranscribe === false) {
      setError("Para transcribir grabaciones hace falta una key de OpenAI en el servidor. Probá grabando en vivo con Chrome.");
      return;
    }
    enviar(f, f.name, "");
  }

  if (!abierto) {
    return (
      <button className="btn btn-primary" onClick={() => setAbierto(true)}>
        🎙️ Escuchar consulta
      </button>
    );
  }

  const mmss = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;

  return (
    <div className="card nuevo escuchar">
      <div className="nuevo-head">
        <h2>Escuchar consulta</h2>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            terminar();
            setAbierto(false);
          }}
        >
          Cerrar
        </button>
      </div>
      <p className="meta">
        Grabá la charla con el cliente (si es por teléfono, ponelo en altavoz). La IA entiende qué se quiere hacer y, si dijo día y hora y hay
        lugar, lo agenda. Si falta algo, queda como pedido y el asistente le escribe por WhatsApp para terminarlo.
      </p>

      <div className="segmentos">
        {(["mostrador", "telefono"] as const).map((c) => (
          <button type="button" key={c} disabled={grabando} className={`chip ${canal === c ? "activo" : ""}`} onClick={() => setCanal(c)}>
            {c === "telefono" ? "📞 Teléfono" : "🏪 Mostrador"}
          </button>
        ))}
      </div>

      <div className="escuchar-acciones">
        {!grabando ? (
          <button className="btn btn-primary grabar" onClick={empezar} disabled={procesando}>
            ● Empezar a escuchar
          </button>
        ) : (
          <button className="btn grabar grabando" onClick={terminar}>
            ■ Terminar ({mmss})
          </button>
        )}
        <label className={`btn btn-ghost btn-sm ${grabando || procesando ? "deshabilitado" : ""}`}>
          Subir grabación
          <input type="file" accept="audio/*" hidden onChange={subirArchivo} disabled={grabando || procesando} />
        </label>
      </div>

      {(grabando || vivo) && (
        <div className="vivo">
          {grabando && <span className="punto" aria-hidden />}
          {vivo || (servidorTranscribe ? "Escuchando… (la transcripción completa se hace al terminar)" : "Escuchando…")}
        </div>
      )}

      {!grabando && (
        <details>
          <summary className="meta">¿Sin micrófono? Escribí o pegá la conversación</summary>
          <textarea
            rows={4}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={'Ej: "—Peloco, buenas. —Hola, quería sacar turno para un corte con Martín. —¿Para cuándo? —El sábado a las 11. —¿A nombre de? —Diego, mi cel es 11 5555 0101."'}
          />
          <button className="btn btn-ghost btn-sm" disabled={procesando || texto.trim().length < 8} onClick={() => enviar(null, "", texto.trim())}>
            ✨ Procesar conversación
          </button>
        </details>
      )}

      {procesando && <p className="meta">Escuchando lo que se habló y buscando lugar en la agenda…</p>}
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
      {resultado && <ResultadoEscucha r={resultado} />}
    </div>
  );
}

function ResultadoEscucha({ r }: { r: Resultado }) {
  if (r.tipo === "turno") {
    const t = r.turno;
    return (
      <div className="resultado ok">
        <strong>✅ Turno agendado #{t.id}</strong>
        <p>
          {t.nombre}: {servicioPorId(t.servicioId)?.nombre} con {profesionalPorId(t.profesionalId)?.nombre}, {fechaLarga(t.fecha)} a las {t.hora}.
        </p>
        <a className="btn btn-sm wa" target="_blank" rel="noreferrer" href={`https://wa.me/${t.telefono}?text=${encodeURIComponent(r.mensajeWhatsApp)}`}>
          Mandar confirmación por WhatsApp
        </a>
        <Transcripcion texto={r.transcripcion} />
      </div>
    );
  }
  const p = r.pedido;
  return (
    <div className="resultado pendiente">
      <strong>📝 Quedó como pedido pendiente</strong>
      <p>
        {[p.nombre, servicioPorId(p.servicioId)?.nombre, p.profesionalId && `con ${profesionalPorId(p.profesionalId)?.nombre}`, p.fecha && fechaLarga(p.fecha), p.hora]
          .filter(Boolean)
          .join(" · ") || "Sin datos claros del turno"}
      </p>
      <p className="meta">{p.motivo}</p>
      <div className="sugerida">
        <span className="meta">{r.whatsapp.enviado ? "El asistente ya le escribió por WhatsApp:" : "Mensaje para seguir por WhatsApp:"}</span>
        <p>{p.mensajeWhatsApp}</p>
        {p.telefono && !r.whatsapp.enviado && (
          <a className="btn btn-sm wa" target="_blank" rel="noreferrer" href={linkSimulador(p)}>
            Seguir en el WhatsApp del asistente ↗
          </a>
        )}
      </div>
      {r.whatsapp.error && <p className="meta">⚠️ {r.whatsapp.error}</p>}
      <Transcripcion texto={r.transcripcion} />
    </div>
  );
}

export function Transcripcion({ texto }: { texto: string }) {
  return (
    <details>
      <summary className="meta">Ver lo que se escuchó</summary>
      <p className="transcripcion">{texto}</p>
    </details>
  );
}
