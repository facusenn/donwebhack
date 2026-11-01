# Peloco · Peluquería con asistente IA

Proyecto para la hackathon de DonWeb. Problema: un negocio local pierde ventas porque atiende consultas y turnos a mano por WhatsApp y teléfono.

**Solución:** una web con un asistente de IA que responde consultas y reserva turnos sobre la agenda real, 24/7, y un panel donde el equipo ve **todos los turnos en una sola bandeja**, sin importar por dónde entraron (web, WhatsApp, teléfono o mostrador).

## Qué hace

- **Landing** con servicios, precios, equipo, preguntas frecuentes y contacto.
- **Asistente IA** (chat en la web): responde precios, horarios y políticas, consulta horarios libres de verdad y deja el turno confirmado con código.
- **Panel del equipo** (`/panel`):
  - Bandeja única con turnos de todos los canales, agrupados por día y con etiqueta de canal.
  - **Cargar turno de WhatsApp o teléfono:** pegás el chat (o anotás la llamada), la IA completa el formulario, marca lo que falta y sugiere la respuesta para mandar por WhatsApp.
  - Muestra horarios libres y no deja superponer turnos.
  - Botón de WhatsApp con recordatorio armado, y estados atendido / cancelado.

## Correr local

```bash
npm install
cp .env.example .env.local   # completá OPENROUTER_API_KEY
npm run dev                  # http://localhost:3000 y http://localhost:3000/panel
```

## Variables de entorno

| Variable | Para qué |
| --- | --- |
| `OPENROUTER_API_KEY` | Obligatoria. Key de OpenRouter. |
| `OPENROUTER_MODEL` | Opcional. Modelo con tool calling. Default `openai/gpt-4o-mini`. |
| `PANEL_PASSWORD` | Opcional. Si está, el panel pide clave (o `/panel?clave=...`). |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Opcional. Guarda turnos en Redis. Sin esto se guardan en `data/turnos.json`. |

En un hosting serverless (Vercel) conviene configurar Upstash para que los turnos persistan. En un servidor Node propio (por ejemplo un VPS de DonWeb con `npm run build && npm start`) alcanza con el archivo local.

## Personalizar el negocio

Todo el contenido (nombre, dirección, servicios, precios, duraciones, equipo, horarios, FAQ) está en `lib/negocio.ts`.

## Stack

Next.js 16 (App Router) + TypeScript, OpenRouter (API compatible con OpenAI, tool calling), sin base de datos obligatoria.
