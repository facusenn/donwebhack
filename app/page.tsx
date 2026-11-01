import Chat from "./components/Chat";
import BotonChat from "./components/BotonChat";
import { NEGOCIO, SERVICIOS, PROFESIONALES, FAQ } from "@/lib/negocio";

export default function Home() {
  return (
    <>
      <section className="portada">
        <img src="/equipo.svg" alt="El equipo de Peloco: Lucía, Martín y Sofi" className="portada-img" />
        <div className="portada-pros">
          {PROFESIONALES.map((p) => (
            <a key={p.id} href={`/equipo/${p.id}`} aria-label={`Ver el trabajo de ${p.nombre}`} title={`Ver el trabajo de ${p.nombre}`} />
          ))}
        </div>
        <div className="portada-txt">
          <h1>{NEGOCIO.nombre}</h1>
          <p>Lucía, Martín y Sofi te esperan. Reservá en un minuto, a cualquier hora.</p>
          <div className="portada-btns">
            <a href="/reservar" className="btn btn-primary">📅 Agenda</a>
            <BotonChat className="btn btn-claro" texto="💬 Consulta" mensaje="Hola, tengo una consulta" />
            <a href="#servicios" className="btn btn-claro">💲 Ver precios</a>
          </div>
        </div>
      </section>

      <div className="wrap">

        <header className="hero">
          <div>
            <span className="etiqueta">{NEGOCIO.rubro} · {NEGOCIO.direccion}</span>
            <h1>Reservá tu turno sin esperar respuesta.</h1>
            <p>{NEGOCIO.slogan} Nuestro asistente te pasa precios, te muestra horarios libres reales y te deja el turno confirmado.</p>
            <div className="hero-cta">
              <a href="/reservar" className="btn btn-primary">
                Elegir día y hora
              </a>
              <BotonChat className="btn btn-ghost" texto="💬 Consultar al asistente" mensaje="Hola, quiero reservar un turno" />
            </div>
          </div>
          <div className="hero-card" aria-hidden>
            <span className="etiqueta">Así de fácil</span>
            <div className="burbuja yo" style={{ marginLeft: "auto" }}>¿Tenés lugar el viernes para corte y barba?</div>
            <div className="burbuja bot">¡Sí! 🙌 Con Martín tengo 11:30, 15:00 o 17:30. ¿Cuál te queda mejor?</div>
            <div className="burbuja yo" style={{ marginLeft: "auto" }}>17:30, soy Juan, 11 5555 0000</div>
            <div className="burbuja bot">Listo Juan, quedó reservado ✅ Código K7Q2PA. Te esperamos el viernes a las 17:30.</div>
          </div>
        </header>
      </div>

      <section id="servicios" className="alt">
        <div className="wrap">
          <h2>Servicios y precios</h2>
          <p className="sub">Precios de referencia. Para color y alisados el valor final depende del largo.</p>
          <div className="grid">
            {SERVICIOS.map((s) => (
              <div className="card" key={s.id}>
                <h3>{s.nombre}</h3>
                <div className="precio">{s.precio}</div>
                <p className="meta">
                  {s.descripcion} · {s.duracionMin} min
                </p>
                <a className="btn btn-ghost btn-sm" href={`/reservar?servicio=${s.id}`}>
                  Reservar
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="equipo">
        <div className="wrap">
          <h2>El equipo</h2>
          <p className="sub">Podés elegir con quién atenderte o dejar que te asignemos al primero libre.</p>
          <div className="grid equipo">
            {PROFESIONALES.map((p) => (
              <a className="card" key={p.id} href={`/equipo/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="avatar">{p.nombre[0]}</div>
                <h3>{p.nombre}</h3>
                <p className="meta">{p.especialidad} · Ver trabajos y agendar →</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="alt">
        <div className="wrap">
          <h2>Preguntas frecuentes</h2>
          <p className="sub">Y si no está acá, preguntale al asistente.</p>
          <div className="grid">
            {FAQ.map((f) => (
              <details className="card" key={f.p}>
                <summary>{f.p}</summary>
                <p>{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto">
        <div className="wrap">
          <h2>Dónde estamos</h2>
          <div className="grid">
            <div className="card">
              <h3>Dirección</h3>
              <p className="meta">{NEGOCIO.direccion}</p>
            </div>
            <div className="card">
              <h3>Horario</h3>
              <p className="meta">{NEGOCIO.horarioTexto}</p>
            </div>
            <div className="card">
              <h3>Contacto</h3>
              <p className="meta">
                {NEGOCIO.telefono} · {NEGOCIO.instagram}
              </p>
            </div>
          </div>
          <footer className="pie">
            <span>
              © {new Date().getFullYear()} {NEGOCIO.nombre}
            </span>
            <span>
              <a href="/profesionales">Profesionales</a> · <a href="/panel">Panel</a>
            </span>
          </footer>
        </div>
      </section>

      <Chat nombreNegocio={NEGOCIO.nombre} />
    </>
  );
}
