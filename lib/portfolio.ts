// Portfolio público de cada profesional. Editá textos y trabajos acá.
// Las "fotos" son placas con degradé del color del trabajo (no dependen de imágenes externas).

export type Trabajo = { titulo: string; detalle: string; colores: [string, string]; servicioId?: string };

export type Portfolio = {
  bio: string;
  experiencia: string;
  instagram: string;
  destacados: string[];
  trabajos: Trabajo[];
};

export const PORTFOLIOS: Record<string, Portfolio> = {
  lucia: {
    bio: "Colorista hace más de 10 años. Le encantan los rubios luminosos y los cambios de look bien pensados: siempre arranca con un diagnóstico para cuidar el pelo.",
    experiencia: "10+ años",
    instagram: "@lucia.color.peloco",
    destacados: ["Balayage", "Rubios y matizados", "Color sin amoníaco", "Corrección de color"],
    trabajos: [
      { titulo: "Balayage miel", detalle: "Iluminación a mano alzada sobre base castaña.", colores: ["#5a3a22", "#e2b36b"], servicioId: "balayage" },
      { titulo: "Rubio platino", detalle: "Decoloración en dos sesiones + matizador.", colores: ["#d9cfc2", "#f7f2ea"], servicioId: "color-completo" },
      { titulo: "Cobrizo intenso", detalle: "Color global con brillo y reflejo cobre.", colores: ["#7a2e14", "#d96a32"], servicioId: "color-completo" },
      { titulo: "Retoque de raíz", detalle: "Raíz igualada a medios y puntas.", colores: ["#3b2a1f", "#8a6a4f"], servicioId: "color-raiz" },
      { titulo: "Babylights", detalle: "Mechas finitas para un rubio natural.", colores: ["#8c6b47", "#efd9a8"], servicioId: "balayage" },
      { titulo: "Castaño chocolate", detalle: "Cobertura de canas con brillo.", colores: ["#2a1a12", "#6b4630"], servicioId: "color-completo" },
    ],
  },
  martin: {
    bio: "Barbero de oficio. Fades prolijos, cortes clásicos y perfilado de barba con navaja y toalla caliente. También corta a los más chicos con paciencia infinita.",
    experiencia: "8 años",
    instagram: "@martin.barber.peloco",
    destacados: ["Fade / degradé", "Barba con navaja", "Cortes clásicos", "Niños"],
    trabajos: [
      { titulo: "Skin fade", detalle: "Degradé a cero con textura arriba.", colores: ["#1d1d1f", "#6d6d72"], servicioId: "corte-hombre" },
      { titulo: "Barba perfilada", detalle: "Líneas marcadas a navaja + aceite.", colores: ["#2b1d14", "#7d5a3c"], servicioId: "barba" },
      { titulo: "Clásico a tijera", detalle: "Raya al costado, look prolijo.", colores: ["#3a2f28", "#9a8573"], servicioId: "corte-hombre" },
      { titulo: "Crop texturizado", detalle: "Flequillo corto con mucho movimiento.", colores: ["#24201c", "#857163"], servicioId: "corte-hombre" },
      { titulo: "Corte infantil", detalle: "Rápido, cómodo y con dibujo si se anima.", colores: ["#2f4858", "#86bbd8"], servicioId: "corte-nino" },
      { titulo: "Mid fade + barba", detalle: "El combo completo.", colores: ["#151515", "#b5532f"], servicioId: "barba" },
    ],
  },
  sofi: {
    bio: "Especialista en cortes de mujer, alisados y peinados de fiesta. Si tenés casamiento, egresados o una sesión de fotos, Sofi te deja lista.",
    experiencia: "6 años",
    instagram: "@sofi.peinados.peloco",
    destacados: ["Bob y long bob", "Keratina", "Recogidos de fiesta", "Ondas al agua"],
    trabajos: [
      { titulo: "Long bob", detalle: "Corte recto con puntas livianas.", colores: ["#3c2a21", "#a07b62"], servicioId: "corte-mujer" },
      { titulo: "Alisado con keratina", detalle: "Pelo liso y sin frizz por meses.", colores: ["#2a1b14", "#c49a6c"], servicioId: "keratina" },
      { titulo: "Recogido de novia", detalle: "Rodete bajo con mechones sueltos.", colores: ["#c9b8a6", "#f4ebe1"], servicioId: "peinado" },
      { titulo: "Ondas al agua", detalle: "Estilo retro para evento.", colores: ["#4a2c2a", "#d08c7a"], servicioId: "peinado" },
      { titulo: "Capas en V", detalle: "Movimiento y volumen en pelo largo.", colores: ["#2e2420", "#8c6d5a"], servicioId: "corte-mujer" },
      { titulo: "Brushing con volumen", detalle: "Terminación de salón para el finde.", colores: ["#5b3b2b", "#e0b48c"], servicioId: "brushing" },
    ],
  },
};
