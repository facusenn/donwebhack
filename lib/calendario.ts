// Conexión con Google Calendar (u otro calendario) usando el link iCal privado de cada profesional.
// No requiere credenciales de Google Cloud: el profesional copia su "Dirección secreta en formato iCal"
// y los eventos de ese calendario bloquean horarios en la agenda de la peluquería.
import { NEGOCIO, PROFESIONALES } from "./negocio";
import { aMin, diaSemana, sumarDias, type Bloqueo } from "./agenda";
import { leerValor, guardarValor } from "./store";

const CLAVE = "calendarios";
type Conexiones = Record<string, string>; // profesionalId -> URL iCal

export async function conexiones(): Promise<Conexiones> {
  const guardadas = (await leerValor<Conexiones>(CLAVE)) ?? {};
  const res: Conexiones = {};
  for (const p of PROFESIONALES) {
    const env = process.env[`GCAL_ICS_${p.id.toUpperCase()}`];
    const url = guardadas[p.id] || env;
    if (url) res[p.id] = url;
  }
  return res;
}

export async function conectar(profesionalId: string, url: string | null) {
  const guardadas = (await leerValor<Conexiones>(CLAVE)) ?? {};
  if (url) guardadas[profesionalId] = url;
  else delete guardadas[profesionalId];
  await guardarValor(CLAVE, guardadas);
  cache.delete(profesionalId);
}

// ---------- Lectura y parseo de iCal ----------

type Evento = {
  inicio: { fecha: string; min: number };
  fin: { fecha: string; min: number };
  todoElDia: boolean;
  titulo: string;
  rrule?: Record<string, string>;
};

const cache = new Map<string, { t: number; eventos: Evento[] }>();
const CACHE_MS = 60_000;

function aFechaLocal(valor: string, params: string): { fecha: string; min: number; todoElDia: boolean } {
  if (params.includes("VALUE=DATE") || /^\d{8}$/.test(valor)) {
    return { fecha: `${valor.slice(0, 4)}-${valor.slice(4, 6)}-${valor.slice(6, 8)}`, min: 0, todoElDia: true };
  }
  const m = valor.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) throw new Error("fecha iCal inválida");
  const [, y, mo, d, h, mi, , z] = m;
  if (z) {
    // UTC -> hora de Argentina
    const partes = new Intl.DateTimeFormat("en-CA", {
      timeZone: NEGOCIO.zonaHoraria,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi)));
    const g = (t: string) => partes.find((p) => p.type === t)!.value;
    const hh = g("hour") === "24" ? "00" : g("hour");
    return { fecha: `${g("year")}-${g("month")}-${g("day")}`, min: aMin(`${hh}:${g("minute")}`), todoElDia: false };
  }
  // Hora local (TZID o flotante): se toma como hora de Argentina.
  return { fecha: `${y}-${mo}-${d}`, min: +h * 60 + +mi, todoElDia: false };
}

export function parsearICS(texto: string): Evento[] {
  const lineas = texto.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const eventos: Evento[] = [];
  let actual: Record<string, { params: string; valor: string }> | null = null;
  for (const linea of lineas) {
    if (linea === "BEGIN:VEVENT") actual = {};
    else if (linea === "END:VEVENT" && actual) {
      try {
        const st = actual["DTSTART"];
        if (st && actual["STATUS"]?.valor !== "CANCELLED" && actual["TRANSP"]?.valor !== "TRANSPARENT") {
          const ini = aFechaLocal(st.valor, st.params);
          const en = actual["DTEND"]
            ? aFechaLocal(actual["DTEND"].valor, actual["DTEND"].params)
            : ini.todoElDia
              ? { fecha: sumarDias(ini.fecha, 1), min: 0, todoElDia: true }
              : { ...ini, min: ini.min + 60 };
          const rrule = actual["RRULE"]
            ? Object.fromEntries(actual["RRULE"].valor.split(";").map((kv) => kv.split("=") as [string, string]))
            : undefined;
          eventos.push({
            inicio: { fecha: ini.fecha, min: ini.min },
            fin: { fecha: en.fecha, min: en.min },
            todoElDia: ini.todoElDia,
            titulo: actual["SUMMARY"]?.valor ?? "Ocupado",
            rrule,
          });
        }
      } catch {}
      actual = null;
    } else if (actual) {
      const i = linea.indexOf(":");
      if (i < 0) continue;
      const [nombre, ...params] = linea.slice(0, i).split(";");
      actual[nombre] = { params: params.join(";"), valor: linea.slice(i + 1) };
    }
  }
  return eventos;
}

async function eventosDe(profesionalId: string, url: string): Promise<Evento[]> {
  const c = cache.get(profesionalId);
  if (c && Date.now() - c.t < CACHE_MS) return c.eventos;
  try {
    const res = await fetch(url.replace(/^webcal:/, "https:"), { cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(String(res.status));
    const eventos = parsearICS(await res.text());
    cache.set(profesionalId, { t: Date.now(), eventos });
    return eventos;
  } catch (e) {
    console.error(`No se pudo leer el calendario de ${profesionalId}:`, e);
    return c?.eventos ?? [];
  }
}

const DIAS_ICS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function diasEntre(a: string, b: string) {
  return Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000);
}

// ¿El evento (o una repetición) ocupa algo de "fecha"? Devuelve el rango en minutos de ese día.
function rangoEnFecha(e: Evento, fecha: string): { inicio: number; fin: number } | null {
  let desplazamiento = 0;
  if (e.rrule) {
    const r = e.rrule;
    const d = diasEntre(e.inicio.fecha, fecha);
    if (d < 0) return null;
    if (r.UNTIL && fecha.replace(/-/g, "") > r.UNTIL.slice(0, 8)) return null;
    const intervalo = Number(r.INTERVAL || 1);
    if (r.FREQ === "DAILY") {
      if (d % intervalo !== 0) return null;
    } else if (r.FREQ === "WEEKLY") {
      const dias = r.BYDAY ? r.BYDAY.split(",").map((x) => x.slice(-2)) : [DIAS_ICS[diaSemana(e.inicio.fecha)]];
      if (!dias.includes(DIAS_ICS[diaSemana(fecha)])) return null;
      if (Math.floor(d / 7) % intervalo !== 0) return null;
    } else {
      return null; // MONTHLY / YEARLY no se tienen en cuenta
    }
    if (r.COUNT && Math.floor(d / (r.FREQ === "DAILY" ? intervalo : 7 * intervalo)) >= Number(r.COUNT)) return null;
    desplazamiento = d;
  }
  const ini = { fecha: sumarDias(e.inicio.fecha, desplazamiento), min: e.inicio.min };
  const fin = { fecha: sumarDias(e.fin.fecha, desplazamiento), min: e.fin.min };
  if (e.todoElDia) return fecha >= ini.fecha && fecha < fin.fecha ? { inicio: 0, fin: 24 * 60 } : null;
  if (fecha < ini.fecha || fecha > fin.fecha) return null;
  const inicio = fecha === ini.fecha ? ini.min : 0;
  const finMin = fecha === fin.fecha ? fin.min : 24 * 60;
  return finMin > inicio ? { inicio, fin: finMin } : null;
}

// Bloqueos de todos los profesionales conectados para las fechas pedidas.
export async function bloqueosPara(fechas: string[], soloProfesional?: string): Promise<Bloqueo[]> {
  const con = await conexiones();
  const res: Bloqueo[] = [];
  await Promise.all(
    Object.entries(con)
      .filter(([id]) => !soloProfesional || id === soloProfesional)
      .map(async ([profesionalId, url]) => {
        const eventos = await eventosDe(profesionalId, url);
        for (const fecha of fechas) {
          for (const e of eventos) {
            const r = rangoEnFecha(e, fecha);
            if (r) res.push({ profesionalId, fecha, ...r, titulo: e.titulo });
          }
        }
      }),
  );
  return res;
}
