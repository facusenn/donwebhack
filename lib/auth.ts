export function autorizado(req: Request) {
  const clave = process.env.PANEL_PASSWORD;
  return !clave || req.headers.get("x-clave") === clave;
}
