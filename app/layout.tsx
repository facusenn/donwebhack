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
    <html lang="es-AR">
      <body>
        <Pestanas />
        {children}
      </body>
    </html>
  );
}
