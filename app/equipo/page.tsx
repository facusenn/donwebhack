import { NEGOCIO, PROFESIONALES } from "@/lib/negocio";
import { PORTFOLIOS } from "@/lib/portfolio";

export const metadata = { title: `El equipo | ${NEGOCIO.nombre}` };

export default function Equipo() {
  return (
    <div className="wrap" style={{ paddingBottom: 80 }}>
      <h1>El equipo</h1>
      <p className="sub">Mirá los trabajos de cada profesional y agendá directo con quien más te guste.</p>
      <div className="grid equipo">
        {PROFESIONALES.map((p) => (
          <a className="card" key={p.id} href={`/equipo/${p.id}`}>
            <div className="avatar">{p.nombre[0]}</div>
            <h3>{p.nombre}</h3>
            <p className="meta">{p.especialidad}</p>
            {PORTFOLIOS[p.id] && <p className="meta" style={{ marginTop: 6 }}>{PORTFOLIOS[p.id].destacados.slice(0, 3).join(" · ")}</p>}
            <p className="meta" style={{ color: "var(--accent)", fontWeight: 600, marginTop: 8 }}>Ver trabajos y agendar →</p>
          </a>
        ))}
      </div>
    </div>
  );
}
