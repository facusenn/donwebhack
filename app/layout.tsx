import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NEGOCIO } from "@/lib/negocio";
import Pestanas from "./components/Pestanas";

export const metadata: Metadata = {
  title: `${NEGOCIO.nombre} | ${NEGOCIO.rubro}`,
  description: NEGOCIO.slogan,
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <head>
        {/* Aplica el tema guardado antes de pintar, para que no parpadee */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("tema");if(t)document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body>
        <Pestanas />
        {children}
      </body>
    </html>
  );
}
