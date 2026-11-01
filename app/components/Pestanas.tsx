"use client";

// Única barra de navegación del sitio (reemplaza los menús que tenía cada página).
import { useEffect, useState } from "react";
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
  { href: "/panel", texto: "Panel" },
];

export default function Pestanas() {
  const ruta = usePathname() ?? "/";
  const [oscuro, setOscuro] = useState(false);
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setOscuro(t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  function cambiarTema() {
    const nuevo = oscuro ? "light" : "dark";
    document.documentElement.dataset.theme = nuevo;
    setOscuro(!oscuro);
    try {
      localStorage.setItem("tema", nuevo);
    } catch {}
  }
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
        <button type="button" className="tema-btn" onClick={cambiarTema} aria-label={oscuro ? "Pasar a modo claro" : "Pasar a modo oscuro"} title={oscuro ? "Modo claro" : "Modo oscuro"}>
          {oscuro ? "☀️" : "🌙"}
        </button>
      </div>
    </nav>
  );
}
