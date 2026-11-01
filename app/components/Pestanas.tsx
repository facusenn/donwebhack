"use client";

import { usePathname } from "next/navigation";

const PESTANAS = [
  { href: "/", texto: "Inicio" },
  { href: "/reservar", texto: "Reservar" },
  { href: "/whatsapp", texto: "WhatsApp" },
  { href: "/profesionales", texto: "Equipo" },
  { href: "/panel", texto: "Panel" },
];

export default function Pestanas() {
  const ruta = usePathname();
  return (
    <nav className="pestanas" aria-label="Secciones">
      <div className="pestanas-in">
        {PESTANAS.map((p) => {
          const activa = p.href === "/" ? ruta === "/" : ruta?.startsWith(p.href);
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
