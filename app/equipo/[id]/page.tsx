import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NEGOCIO, PROFESIONALES, profesionalPorId, servicioPorId } from "@/lib/negocio";
import { PORTFOLIOS } from "@/lib/portfolio";

export function generateStaticParams() {
  return PROFESIONALES.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const pro = profesionalPorId((await params).id);
  return { title: pro ? `${pro.nombre} · ${pro.especialidad} | ${NEGOCIO.nombre}` : NEGOCIO.nombre };
}

export default async function PortfolioPro({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pro = profesionalPorId(id);
  const pf = PORTFOLIOS[id];
  if (!pro || !pf) notFound();

  return (
    <div className="wrap portfolio" style={{ paddingBottom: 80 }}>
      <p style={{ margin: "20px 0 0" }}>
        <a href="/equipo" className="meta">← Todo el equipo</a>
      </p>

      <header className="pf-head">
        <div className="avatar grande">{pro.nombre[0]}</div>
        <div>
          <span className="etiqueta">{pro.especialidad}</span>
          <h1>{pro.nombre}</h1>
          <p className="sub" style={{ marginBottom: 12 }}>{pf.bio}</p>
          <p className="meta">
            {pf.experiencia} de experiencia · {pf.instagram}
          </p>
          <div className="hero-cta" style={{ marginTop: 16 }}>
            <a className="btn btn-primary" href={`/reservar?pro=${pro.id}`}>
              Agendar con {pro.nombre}
            </a>
          </div>
        </div>
      </header>

      <section className="pf-bloque">
        <h2>Especialidades</h2>
        <div className="segmentos">
          {pf.destacados.map((d) => (
            <span key={d} className="chip">
              {d}
            </span>
          ))}
        </div>
      </section>

      <section className="pf-bloque">
        <h2>Trabajos</h2>
        <div className="pf-grid">
          {pf.trabajos.map((t) => (
            <figure key={t.titulo} className="pf-trabajo">
              <div className="pf-foto" style={{ background: `linear-gradient(135deg, ${t.colores[0]}, ${t.colores[1]})` }}>
                <span>{t.titulo}</span>
              </div>
              <figcaption>
                <strong>{t.titulo}</strong>
                <div className="meta">{t.detalle}</div>
                {t.servicioId && servicioPorId(t.servicioId) && (
                  <a className="meta pf-link" href={`/reservar?pro=${pro.id}&servicio=${t.servicioId}`}>
                    Quiero esto · {servicioPorId(t.servicioId)!.nombre} →
                  </a>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="pf-bloque">
        <h2>Servicios que hace</h2>
        <div className="grid">
          {pro.servicios.map((sid) => {
            const s = servicioPorId(sid);
            if (!s) return null;
            return (
              <a key={sid} className="card pf-serv" href={`/reservar?pro=${pro.id}&servicio=${sid}`}>
                <h3>{s.nombre}</h3>
                <p className="meta">
                  <span className="precio">{s.precio}</span> · {s.duracionMin} min
                </p>
              </a>
            );
          })}
        </div>
      </section>

      <div className="card pf-cta">
        <strong>¿Te gustó lo que viste?</strong>
        <a className="btn btn-primary" href={`/reservar?pro=${pro.id}`}>
          Agendar con {pro.nombre}
        </a>
      </div>
    </div>
  );
}
