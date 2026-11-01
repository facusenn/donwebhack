"use client";

import { useEffect, useMemo, useState } from "react";
import { NEGOCIO } from "@/lib/negocio";
import { ahoraAR, diaSemana, sumarDias } from "@/lib/agenda";

export type Slot = { hora: string; profesionalId: string; profesional: string };
type Opcion = { profesionalId: string; profesional: string; horarios: string[] };

const DIAS_CORTOS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function fechaLarga(f: string) {
  const d = new Date(`${f}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

function aSlots(opciones: Opcion[]): Slot[] {
  // Por cada horario, el primer profesional libre.
  const m = new Map<string, Slot>();
  for (const o of opciones) for (const h of o.horarios) if (!m.has(h)) m.set(h, { hora: h, profesionalId: o.profesionalId, profesional: o.profesional });
  return [...m.values()].sort((a, b) => a.hora.localeCompare(b.hora));
}

// Calendario de días + horarios libres para un servicio. La duración del servicio
// la tiene en cuenta el servidor al calcular la disponibilidad.
export default function Calendario({
  servicioId,
  profesionalId = "",
  semanas = 4,
  compacto = false,
  onElegir,
  recargar = 0,
}: {
  servicioId: string;
  profesionalId?: string;
  semanas?: number;
  compacto?: boolean;
  onElegir: (fecha: string, slot: Slot | null) => void;
  recargar?: number;
}) {
  const hoy = useMemo(() => ahoraAR().fecha, []);
  const [fecha, setFecha] = useState("");
  const [libres, setLibres] = useState<Record<string, number>>({});
  const [cargandoDias, setCargandoDias] = useState(false);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);

  const dias = useMemo(() => {
    const offset = (diaSemana(hoy) + 6) % 7;
    const lunes = sumarDias(hoy, -offset);
    return Array.from({ length: semanas * 7 }, (_, i) => sumarDias(lunes, i));
  }, [hoy, semanas]);

  const abierto = (f: string) => f >= hoy && NEGOCIO.diasAbiertos.includes(diaSemana(f));

  useEffect(() => {
    if (!servicioId) return;
    let cancelado = false;
    setCargandoDias(true);
    setLibres({});
    const q = (f: string) => new URLSearchParams({ fecha: f, servicio: servicioId, profesional: profesionalId });
    Promise.all(
      dias.filter(abierto).map(async (f) => {
        const d = await fetch(`/api/disponibilidad?${q(f)}`).then((r) => r.json());
        return [f, d.ok ? aSlots(d.opciones).length : 0] as const;
      }),
    ).then((pares) => {
      if (cancelado) return;
      setLibres(Object.fromEntries(pares));
      setCargandoDias(false);
    });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicioId, profesionalId, dias, recargar]);

  useEffect(() => {
    if (!fecha || !servicioId) return;
    setSlots(null);
    setSlot(null);
    onElegir(fecha, null);
    const q = new URLSearchParams({ fecha, servicio: servicioId, profesional: profesionalId });
    fetch(`/api/disponibilidad?${q}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.ok ? aSlots(d.opciones) : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, servicioId, profesionalId, recargar]);

  return (
    <div className={compacto ? "cal-compacto" : ""}>
      {cargandoDias && <p className="meta">Buscando lugares…</p>}
      <div className="calendario">
        {DIAS_CORTOS.map((d) => (
          <div key={d} className="cal-head">
            {d}
          </div>
        ))}
        {dias.map((f) => {
          const ab = abierto(f);
          const n = libres[f];
          const sinLugar = ab && n === 0;
          const d = new Date(`${f}T12:00:00Z`);
          const etiqueta =
            d.getUTCDate() === 1 || f === dias[0]
              ? MESES[d.getUTCMonth()].slice(0, 3)
              : !ab
                ? compacto
                  ? ""
                  : "cerrado"
                : sinLugar
                  ? "lleno"
                  : n !== undefined
                    ? compacto
                      ? `${n}`
                      : `${n} libres`
                    : "";
          return (
            <button
              type="button"
              key={f}
              className={`cal-dia ${fecha === f ? "activo" : ""} ${f === hoy ? "hoy" : ""}`}
              disabled={!ab || sinLugar}
              onClick={() => setFecha(f)}
              title={!ab ? "Cerrado" : sinLugar ? "Sin lugar" : `${n ?? "…"} horarios libres`}
            >
              <b>{d.getUTCDate()}</b>
              <small>{etiqueta}</small>
            </button>
          );
        })}
      </div>

      {fecha && (
        <div style={{ marginTop: 12 }}>
          <div className="meta">Horarios libres el {fechaLarga(fecha)}</div>
          {slots === null && <p className="meta">Cargando…</p>}
          {slots?.length === 0 && <p className="meta">No quedan horarios ese día. Probá con otro.</p>}
          <div className="segmentos">
            {slots?.map((s) => (
              <button
                type="button"
                key={s.hora}
                className={`chip ${slot?.hora === s.hora ? "activo" : ""}`}
                onClick={() => {
                  setSlot(s);
                  onElegir(fecha, s);
                }}
              >
                {s.hora}
                {profesionalId === "" ? ` · ${s.profesional}` : ""}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
