// Guardado de turnos.
// Si hay credenciales de Upstash Redis, usa Redis (sirve en Vercel y cualquier hosting serverless).
// Si no, usa un archivo JSON local (sirve para desarrollo o un servidor Node propio, por ejemplo un VPS de DonWeb).
import { promises as fs } from "fs";
import path from "path";
import { proximosDiasAbiertos } from "./agenda";

export type EstadoTurno = "confirmado" | "atendido" | "cancelado";
import type { Canal } from "./negocio";
export type { Canal };

export type Turno = {
  id: string;
  nombre: string;
  telefono: string;
  servicioId: string;
  profesionalId: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  duracionMin: number;
  notas?: string;
  estado: EstadoTurno;
  canal: Canal;
  creadoEn: string;
};

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const REDIS_KEY = "turnos";

const ARCHIVO = process.env.VERCEL
  ? path.join("/tmp", "turnos.json")
  : path.join(process.cwd(), "data", "turnos.json");

async function redis(command: (string | number)[]) {
  const res = await fetch(REDIS_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis respondió ${res.status}`);
  const json = await res.json();
  return json.result;
}

async function leerCrudo(): Promise<Turno[] | null> {
  if (REDIS_URL && REDIS_TOKEN) {
    const v = await redis(["GET", REDIS_KEY]);
    return v ? (JSON.parse(v) as Turno[]) : null;
  }
  try {
    return JSON.parse(await fs.readFile(ARCHIVO, "utf8")) as Turno[];
  } catch {
    return null;
  }
}

async function escribir(turnos: Turno[]) {
  if (REDIS_URL && REDIS_TOKEN) {
    await redis(["SET", REDIS_KEY, JSON.stringify(turnos)]);
    return;
  }
  await fs.mkdir(path.dirname(ARCHIVO), { recursive: true });
  await fs.writeFile(ARCHIVO, JSON.stringify(turnos, null, 2));
}

// Guardado genérico de un valor JSON (lo usan las conexiones de calendario).
export async function leerValor<T>(clave: string): Promise<T | null> {
  if (REDIS_URL && REDIS_TOKEN) {
    const v = await redis(["GET", clave]);
    return v ? (JSON.parse(v) as T) : null;
  }
  try {
    return JSON.parse(await fs.readFile(path.join(path.dirname(ARCHIVO), `${clave}.json`), "utf8")) as T;
  } catch {
    return null;
  }
}

export async function guardarValor(clave: string, valor: unknown) {
  if (REDIS_URL && REDIS_TOKEN) {
    await redis(["SET", clave, JSON.stringify(valor)]);
    return;
  }
  await fs.mkdir(path.dirname(ARCHIVO), { recursive: true });
  await fs.writeFile(path.join(path.dirname(ARCHIVO), `${clave}.json`), JSON.stringify(valor, null, 2));
}

export async function listarTurnos(): Promise<Turno[]> {
  const t = await leerCrudo();
  if (t) return t;
  const demo = turnosDemo();
  await escribir(demo);
  return demo;
}

export async function agregarTurno(t: Turno) {
  const turnos = await listarTurnos();
  turnos.push(t);
  await escribir(turnos);
}

export async function actualizarEstado(id: string, estado: EstadoTurno) {
  const turnos = await listarTurnos();
  const t = turnos.find((x) => x.id === id);
  if (!t) return null;
  t.estado = estado;
  await escribir(turnos);
  return t;
}

export function nuevoId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Algunos turnos de ejemplo para que la agenda no arranque vacía en la demo.
function turnosDemo(): Turno[] {
  const [d1, d2] = proximosDiasAbiertos(2);
  const base = { estado: "confirmado" as const, creadoEn: new Date().toISOString() };
  return [
    { ...base, id: nuevoId(), nombre: "Carla Gómez", telefono: "5491155550001", canal: "whatsapp", servicioId: "balayage", profesionalId: "lucia", fecha: d1, hora: "10:00", duracionMin: 180 },
    { ...base, id: nuevoId(), nombre: "Diego Ruiz", telefono: "5491155550002", canal: "telefono", servicioId: "corte-hombre", profesionalId: "martin", fecha: d1, hora: "11:00", duracionMin: 30 },
    { ...base, id: nuevoId(), nombre: "Ana Pérez", telefono: "5491155550003", canal: "web", servicioId: "keratina", profesionalId: "sofi", fecha: d1, hora: "15:00", duracionMin: 150 },
    { ...base, id: nuevoId(), nombre: "Julián Sosa", telefono: "5491155550004", canal: "mostrador", servicioId: "barba", profesionalId: "martin", fecha: d2, hora: "17:30", duracionMin: 30 },
  ];
}
