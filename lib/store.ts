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

// Candado para las operaciones "leer lista → modificar → guardar lista".
// Sin esto, dos reservas al mismo tiempo pueden pisarse (una se pierde o se agenda dos veces el mismo horario).
// En Redis usa SET NX con vencimiento (sirve entre instancias serverless); en archivo local, una cola en memoria.
const colasLocales = new Map<string, Promise<unknown>>();

export async function conCandado<T>(nombre: string, fn: () => Promise<T>): Promise<T> {
  if (REDIS_URL && REDIS_TOKEN) {
    const clave = `candado-${nombre}`;
    const dueño = Math.random().toString(36).slice(2);
    const limite = Date.now() + 8000;
    while (!(await redis(["SET", clave, dueño, "NX", "PX", 10000]))) {
      if (Date.now() > limite) throw new Error("La agenda está ocupada, probá de nuevo en un momento.");
      await new Promise((r) => setTimeout(r, 80 + Math.random() * 120));
    }
    try {
      return await fn();
    } finally {
      // Solo lo libera quien lo tomó (si venció y lo tomó otro, no lo borramos).
      if ((await redis(["GET", clave])) === dueño) await redis(["DEL", clave]);
    }
  }
  const previa = colasLocales.get(nombre) ?? Promise.resolve();
  const actual = previa.catch(() => {}).then(fn);
  colasLocales.set(nombre, actual);
  try {
    return await actual;
  } finally {
    if (colasLocales.get(nombre) === actual) colasLocales.delete(nombre);
  }
}

export async function listarTurnos(): Promise<Turno[]> {
  const t = await leerCrudo();
  if (t) return t;
  const demo = turnosDemo();
  await escribir(demo);
  return demo;
}

// Llamar siempre dentro de conCandado("turnos", ...): ver crearTurno en reservas.ts.
export async function agregarTurno(t: Turno) {
  const turnos = await listarTurnos();
  turnos.push(t);
  await escribir(turnos);
}

export async function actualizarEstado(id: string, estado: EstadoTurno) {
  return conCandado("turnos", async () => {
    const turnos = await listarTurnos();
    const t = turnos.find((x) => x.id === id);
    if (!t) return null;
    t.estado = estado;
    await escribir(turnos);
    return t;
  });
}

// ---- Pedidos pendientes ----
// Consultas que entraron por teléfono o mostrador y no se pudieron agendar en el momento
// (faltó el horario, el celular, o el horario pedido estaba ocupado). Se terminan por WhatsApp.
export type EstadoPedido = "pendiente" | "agendado" | "descartado";

export type Pedido = {
  id: string;
  canal: Canal;
  nombre: string;
  telefono: string;
  servicioId: string;
  profesionalId: string;
  fecha: string;
  hora: string;
  notas?: string;
  transcripcion: string;
  faltantes: string[];
  motivo: string; // por qué no se agendó directo
  mensajeWhatsApp: string; // primer mensaje para seguir por WhatsApp
  estado: EstadoPedido;
  turnoId?: string;
  whatsappEnviado?: boolean;
  creadoEn: string;
};

const PEDIDOS_KEY = "pedidos";

export async function listarPedidos(): Promise<Pedido[]> {
  return (await leerValor<Pedido[]>(PEDIDOS_KEY)) ?? [];
}

export async function agregarPedido(p: Pedido) {
  await conCandado(PEDIDOS_KEY, async () => {
    const lista = await listarPedidos();
    lista.push(p);
    // Guardamos los últimos 200 para que la clave no crezca sin límite.
    await guardarValor(PEDIDOS_KEY, lista.slice(-200));
  });
}

export async function actualizarPedido(id: string, cambios: Partial<Pick<Pedido, "estado" | "telefono" | "faltantes" | "turnoId" | "whatsappEnviado" | "mensajeWhatsApp">>) {
  return conCandado(PEDIDOS_KEY, async () => {
    const lista = await listarPedidos();
    const p = lista.find((x) => x.id === id);
    if (!p) return null;
    Object.assign(p, cambios);
    await guardarValor(PEDIDOS_KEY, lista);
    return p;
  });
}

export async function pedidoPendienteDe(telefono: string): Promise<Pedido | undefined> {
  if (!telefono) return undefined;
  const lista = await listarPedidos();
  return lista.filter((p) => p.estado === "pendiente" && p.telefono === telefono).pop();
}

// Cuando un cliente con pedido pendiente termina reservando (por WhatsApp o por donde sea), el pedido se cierra solo.
export async function cerrarPedidosDe(telefono: string, turnoId: string) {
  if (!telefono || !(await pedidoPendienteDe(telefono))) return;
  await conCandado(PEDIDOS_KEY, async () => {
    const lista = await listarPedidos();
    for (const p of lista) if (p.estado === "pendiente" && p.telefono === telefono) Object.assign(p, { estado: "agendado", turnoId });
    await guardarValor(PEDIDOS_KEY, lista);
  });
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
