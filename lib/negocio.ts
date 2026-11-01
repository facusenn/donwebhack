// Datos del negocio. Editá este archivo para cambiar nombre, servicios, precios y horarios.

export type Servicio = {
  id: string;
  nombre: string;
  precio: string;
  duracionMin: number;
  descripcion: string;
};

export type Profesional = {
  id: string;
  nombre: string;
  especialidad: string;
  servicios: string[]; // ids de servicios que hace
};

export const NEGOCIO = {
  nombre: "Peloco",
  rubro: "Peluquería",
  slogan: "Tu pelo, sin vueltas. Reservá en un minuto, a cualquier hora.",
  direccion: "Av. Corrientes 1234, CABA",
  telefono: "+54 9 11 5555-1234",
  instagram: "@peloco.peluqueria",
  horarioTexto: "Martes a sábado de 10 a 20 hs. Domingo y lunes cerrado.",
  // 0 = domingo ... 6 = sábado
  diasAbiertos: [2, 3, 4, 5, 6],
  apertura: "10:00",
  cierre: "20:00",
  zonaHoraria: "America/Argentina/Buenos_Aires",
};

export const SERVICIOS: Servicio[] = [
  { id: "corte-mujer", nombre: "Corte mujer", precio: "$15.000", duracionMin: 45, descripcion: "Lavado, corte y secado." },
  { id: "corte-hombre", nombre: "Corte hombre", precio: "$10.000", duracionMin: 30, descripcion: "Corte a tijera o máquina, con lavado." },
  { id: "corte-nino", nombre: "Corte niño/a (hasta 12)", precio: "$8.000", duracionMin: 30, descripcion: "Corte rápido y sin llanto (o casi)." },
  { id: "barba", nombre: "Perfilado de barba", precio: "$6.000", duracionMin: 30, descripcion: "Perfilado con navaja y toalla caliente." },
  { id: "brushing", nombre: "Brushing", precio: "$9.000", duracionMin: 30, descripcion: "Lavado y brushing con cepillo." },
  { id: "color-raiz", nombre: "Color de raíz", precio: "$25.000", duracionMin: 90, descripcion: "Retoque de raíz con tintura sin amoníaco." },
  { id: "color-completo", nombre: "Color completo", precio: "desde $35.000", duracionMin: 120, descripcion: "Color global. El precio final depende del largo." },
  { id: "balayage", nombre: "Mechas / Balayage", precio: "desde $55.000", duracionMin: 180, descripcion: "Iluminación a mano alzada. Incluye matizador." },
  { id: "keratina", nombre: "Alisado con keratina", precio: "desde $45.000", duracionMin: 150, descripcion: "Alisado y nutrición, dura de 3 a 4 meses." },
  { id: "hidratacion", nombre: "Tratamiento de hidratación", precio: "$12.000", duracionMin: 30, descripcion: "Ampolla y masaje capilar." },
  { id: "peinado", nombre: "Peinado para evento", precio: "$20.000", duracionMin: 60, descripcion: "Recogidos, ondas y peinados de fiesta." },
];

export const PROFESIONALES: Profesional[] = [
  {
    id: "lucia",
    nombre: "Lucía",
    especialidad: "Colorista",
    servicios: ["corte-mujer", "brushing", "color-raiz", "color-completo", "balayage", "hidratacion"],
  },
  {
    id: "martin",
    nombre: "Martín",
    especialidad: "Barbería y cortes masculinos",
    servicios: ["corte-hombre", "corte-nino", "barba"],
  },
  {
    id: "sofi",
    nombre: "Sofi",
    especialidad: "Cortes, alisados y peinados",
    servicios: ["corte-mujer", "corte-nino", "brushing", "keratina", "hidratacion", "peinado"],
  },
];

export const FAQ: { p: string; r: string }[] = [
  { p: "¿Necesito seña para reservar?", r: "Solo para color, balayage y keratina: 30% por transferencia o Mercado Pago. El resto de los servicios no lleva seña." },
  { p: "¿Qué medios de pago aceptan?", r: "Efectivo, transferencia, Mercado Pago y tarjetas de débito y crédito (hasta 3 cuotas sin interés en servicios de más de $40.000)." },
  { p: "¿Puedo cancelar o cambiar el turno?", r: "Sí, avisando con al menos 24 hs. Si avisás después, la seña no se devuelve pero se puede usar en otro turno dentro de los 30 días." },
  { p: "¿Atienden sin turno?", r: "Si hay un hueco libre, sí. Igual te recomendamos reservar para no esperar." },
  { p: "¿Hacen diagnóstico antes del color?", r: "Sí, siempre. Para cambios grandes de color ofrecemos una consulta gratuita de 15 minutos." },
  { p: "¿Qué productos usan?", r: "Línea profesional sin parabenos y tinturas sin amoníaco. También vendemos shampoo, acondicionador y matizadores en el local." },
];

export function servicioPorId(id: string) {
  return SERVICIOS.find((s) => s.id === id);
}

export function profesionalPorId(id: string) {
  return PROFESIONALES.find((p) => p.id === id);
}

// Canales por donde entran los turnos. Todos terminan en la misma agenda.
export type Canal = "web" | "whatsapp" | "telefono" | "mostrador";
export const CANALES: Record<Canal, string> = {
  web: "Web · IA",
  whatsapp: "WhatsApp",
  telefono: "Teléfono",
  mostrador: "Mostrador",
};
