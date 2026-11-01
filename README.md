# Peloco · Peluquería con asistente IA

Proyecto para la hackathon de DonWeb. Problema: un negocio local pierde ventas porque atiende consultas y turnos a mano por WhatsApp y teléfono.

**Solución:** una web con un asistente de IA que responde consultas y reserva turnos sobre la agenda real, 24/7, y un panel donde el equipo ve **todos los turnos en una sola bandeja**, sin importar por dónde entraron (web, WhatsApp, teléfono o mostrador).

## Demo en vivo

| Qué | Link |
| --- | --- |
| Web de la peluquería (con chat IA) | https://errantes.online/ |
| Reservar con calendario | https://errantes.online/reservar |
| **WhatsApp simulado** (mismo webhook que Twilio) | https://errantes.online/whatsapp |
| Vista del equipo (profesionales) | https://errantes.online/profesionales |
| Panel con la bandeja única de turnos | https://errantes.online/panel |

Para probar WhatsApp: entrá al simulador, escribí como cliente (por ejemplo *"hola, ¿tenés lugar el sábado para corte?"*), elegí un horario y después mirá el turno en el Panel con la etiqueta **WhatsApp**.

## Qué hace

- **Landing** con servicios, precios, equipo, preguntas frecuentes y contacto.
- **Asistente IA** (chat en la web): responde precios, horarios y políticas, consulta horarios libres de verdad y deja el turno confirmado con código.
- **Panel del equipo** (`/panel`):
  - Bandeja única con turnos de todos los canales, agrupados por día y con etiqueta de canal.
  - **Cargar turno de WhatsApp o teléfono:** pegás el chat (o anotás la llamada), la IA completa el formulario, marca lo que falta y sugiere la respuesta para mandar por WhatsApp.
  - Muestra horarios libres y no deja superponer turnos.
  - Botón de WhatsApp con recordatorio armado, y estados atendido / cancelado.

- **Reservar con calendario** (`/reservar`): el cliente elige servicio, profesional, día y hora. Solo ve horarios donde el turno entra completo según la duración del servicio, y no puede reservar horarios ocupados.
- **Calendario dentro del chat:** cuando la IA identifica el servicio, muestra el calendario de horarios libres en la conversación.
- **Vista por profesional** (`/profesionales`): cada pro ve su agenda, a quién atiende y puede conectar su Google Calendar.

### WhatsApp

Los clientes pueden consultar y reservar por WhatsApp con el mismo asistente. Cada número tiene su conversación (se reinicia sola tras 6 horas o escribiendo "reiniciar"), no se le pide el celular, y los turnos caen en la bandeja con la etiqueta WhatsApp.

Para la demo, con el sandbox gratuito de Twilio:
1. Crear cuenta en twilio.com → Messaging → Try it out → Send a WhatsApp message.
2. Unirse al sandbox desde el celular mandando el código `join ...` que muestra Twilio.
3. En "Sandbox settings", "When a message comes in" = `https://TU-DOMINIO/api/whatsapp`, método POST.

Para producción se usa un número de WhatsApp Business aprobado con el mismo webhook.

### Google Calendar

Cada profesional conecta su calendario pegando la "Dirección secreta en formato iCal" (Google Calendar → Configuración → su calendario → Integrar el calendario). Sus eventos bloquean horarios en la agenda. A la vez, puede suscribirse a sus turnos de Peloco desde Google Calendar ("Otros calendarios" → "Desde URL") con el link que muestra la página, o agregar cada turno con un clic. No requiere credenciales de Google Cloud. También se puede configurar por variable: `GCAL_ICS_LUCIA`, `GCAL_ICS_MARTIN`, `GCAL_ICS_SOFI`.

## Correr local

```bash
npm install
cp .env.example .env.local   # completá OPENROUTER_API_KEY
npm run dev                  # http://localhost:3000 y http://localhost:3000/panel
```

## Correr con Docker

```bash
cp .env.example .env         # completá OPENROUTER_API_KEY
docker compose up -d --build # http://localhost:3000
```

Los turnos se guardan en el volumen `turnos`, así que sobreviven a reinicios sin necesidad de Redis. Sirve igual en cualquier servidor con Docker (por ejemplo un Cloud Server de DonWeb).

## Variables de entorno

| Variable | Para qué |
| --- | --- |
| `OPENROUTER_API_KEY` | Key de OpenRouter (esta o `NVIDIA_API_KEY`). |
| `NVIDIA_API_KEY` | Alternativa: key `nvapi-...` de build.nvidia.com. Usa Nemotron por defecto. |
| `OPENROUTER_MODEL` | Opcional. Modelo con tool calling. Default `openai/gpt-4o-mini` (OpenRouter) o `nvidia/llama-3.3-nemotron-super-49b-v1.5` (NVIDIA). |
| `PANEL_PASSWORD` | Opcional. Si está, el panel pide clave (o `/panel?clave=...`). |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Opcional. Guarda turnos en Redis. Sin esto se guardan en `data/turnos.json`. |

En un hosting serverless (Vercel) conviene configurar Upstash para que los turnos persistan. En un servidor Node propio (por ejemplo un VPS de DonWeb con `npm run build && npm start`) alcanza con el archivo local.

## Personalizar el negocio

Todo el contenido (nombre, dirección, servicios, precios, duraciones, equipo, horarios, FAQ) está en `lib/negocio.ts`.

## Stack

Next.js 16 (App Router) + TypeScript, OpenRouter (API compatible con OpenAI, tool calling), sin base de datos obligatoria.
