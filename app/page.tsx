import Chat from "./components/Chat";
import BotonChat from "./components/BotonChat";
import { NEGOCIO, SERVICIOS, PROFESIONALES, FAQ } from "@/lib/negocio";

export default function Home() {
  return (
    <>
      <div className="wrap">
        <nav className="nav">
          <a href="#" className="logo">
            {NEGOCIO.nombre}
          </a>
          <div className="nav-links">
            <a href="#servicios">Servicios</a>
            <a href="#equipo">Equipo</a>
            <a href="#faq">Preguntas</a>
            <a href="#contacto">Contacto</a>
          </div>
        </nav>

        <header className="hero">
          <div>
            <span className="etiqueta">{NEGOCIO.rubro} · {NEGOCIO.direccion}</span>
            <h1>Reservá tu turno sin esperar respuesta.</h1>
            <p>{NEGOCIO.slogan} Nuestro asistente te pasa precios, te muestra horarios libres reales y te deja el turno confirmado.</p>
            <div className="hero-cta">
              <BotonChat texto="Reservar turno ahora" mensaje="Hola, quiero reservar un turno" />
              <a href="#servicios" className="btn btn-ghost">
                Ver precios
              </a>
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
                <BotonChat className="btn btn-ghost btn-sm" texto="Reservar" mensaje={`Quiero reservar un turno para ${s.nombre.toLowerCase()}`} />
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
              <div className="card" key={p.id}>
                <div className="avatar">{p.nombre[0]}</div>
                <h3>{p.nombre}</h3>
                <p className="meta">{p.especialidad}</p>
              </div>
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
            <a href="/panel">Acceso equipo</a>
          </footer>
        </div>
      </section>

      <Chat nombreNegocio={NEGOCIO.nombre} />
    </>
  );
}
