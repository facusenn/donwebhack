"use client";

// Única barra de navegación del sitio (reemplaza los menús que tenía cada página).
import { usePathname } from "next/navigation";
import { NEGOCIO } from "@/lib/negocio";

const PESTANAS = [
  { href: "/", texto: "Inicio" },
  { href: "/#servicios", texto: "Servicios y precios" },
  { href: "/equipo", texto: "Equipo" },
  { href: "/reservar", texto: "Reservar" },
  { href: "/#faq", texto: "Preguntas" },
  { href: "/#contacto", texto: "Contacto" },
  { href: "/whatsapp", texto: "WhatsApp" },
  { href: "/profesionales", texto: "Profesionales" },
  { href: "/panel", texto: "Panel" },
];

export default function Pestanas() {
  const ruta = usePathname() ?? "/";
  return (
    <nav className="pestanas" aria-label="Secciones">
      <div className="pestanas-in">
        <a href="/" className="pestanas-logo">
          {NEGOCIO.nombre}
        </a>
        {PESTANAS.map((p) => {
          const activa = p.href.includes("#") ? false : p.href === "/" ? ruta === "/" : ruta.startsWith(p.href);
          return (
            <a key={p.href} href={p.href} className={activa ? "activa" : ""} aria-current={activa ? "page" : undefined}>
              {p.texto}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
