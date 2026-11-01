"use client";

import { abrirChat } from "./Chat";

export default function BotonChat({ texto, mensaje, className = "btn btn-primary" }: { texto: string; mensaje?: string; className?: string }) {
  return (
    <button className={className} onClick={() => abrirChat(mensaje)}>
      {texto}
    </button>
  );
}
