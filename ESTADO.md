# ESTADO — NOI boceto

_Resumen operativo a 15/11/2026. Máximo 100 líneas: lo viejo pasa entero a `docs/historico/ESTADO-AAAA-MM.md` y se enlaza desde aquí. «No consta» quiere decir que no está escrito ni en este repo ni en Lince._

## Objetivo

Boceto de web para el restaurante NOI, con sus dos salas: NOI Ristorante y NOI Bar e Cucina. Enseña tres propuestas de portada, la página de cada sala, la carta, la reserva y «Regala NOI».

Quién lo encargó, a quién se enseñó y qué propuesta se eligió: no consta.

## Hito en curso

Ninguno. El repo se conserva tal como está (ver «Bloqueos»).

- Último cambio de código: 10/10/2026, commit `d0e00ed`.
- El boceto está publicado en GitHub Pages desde `main`: `https://aclaborda1010101.github.io/noi-boceto/`. GitHub lo da por construido a 15/11/2026; la página no se ha abierto en un navegador hoy.

## Decisiones

- 2026-10-09 — Web estática sin dependencias, compuesta con `build.mjs` a partir de parciales — motivo: no consta.
- 2026-10-09 — Todas las páginas llevan `noindex, nofollow` — porque es un boceto; se quita al publicar la web definitiva (`src/partials/head.html`).
- 2026-10-09 — La reserva abre CoverManager en un modal, con una pestaña por sala (`src/partials/modal.html`) — motivo: no consta.
- 2026-10-09 — «Regala NOI» es solo una vista previa: no envía ni guarda datos (`assets/js/gift.js`) — motivo: no consta.
- 2026-10-09 — Tres propuestas en vez de dos: sencilla, sencilla en dos filas y editorial (commit `95e353d`) — motivo: no consta.
- 2026-10-10 — La propuesta 2 va sin botón Reservar, con los iconos en 3+2; Ristorante y Bar sencillas pasan a tener scroll con texto, fotos y reserva (commit `d0e00ed`) — motivo: no consta.
- 2026-11-15 — Se añade el mini cerebro: `AGENTS.md`, `CLAUDE.md` y `ESTADO.md` — para que cualquier agente o persona retome el repo sin depender de un chat.
- 2026-11-15 — Desde hoy se trabaja en rama y PR, como pide la plantilla de proyectos (`MANIAS-DEV/plantilla-proyecto`) — hasta hoy los 14 commits fueron directos a `main`, y `main` es lo que se publica.
- 2026-11-15 — El repo se conserva — porque aún no hay acceso al alojamiento del cliente para publicar la web. Es un dato del encargo de hoy: no estaba escrito en el repo.

## Rama y PR en curso

- Rama `claude/mini-cerebro`, con el PR «Mini cerebro: AGENTS, CLAUDE y ESTADO con tope». Solo documentación; no toca código.
- No hay más ramas ni más PRs: en GitHub solo existen `main` y esta rama, y este PR es el único (comprobado el 15/11/2026).

## Pruebas

- No hay pruebas automáticas, ni CI, ni `package.json`.
- Única orden: `node build.mjs`. **No se ha ejecutado el 15/11/2026**: el encargo de hoy era solo documentación.
- Último resultado conocido: las 11 páginas de la raíz llevan la misma marca de generación (`?v=mv23kaw5`). Esa marca es la hora del build y corresponde al 10/10/2026, segundos antes del último commit.
- No se ha comprobado hoy que lo generado coincida con `src/`.
- Comprobaciones en navegador o en móvil: no consta ninguna.

## Bloqueos

- **Publicar la web definitiva:** falta el acceso al alojamiento del cliente (dato del encargo del 15/11/2026). Dominio, proveedor y quién tiene que dar el acceso: no consta.
- **Pendiente antes de publicar**, visto en el código:
  - quitar `noindex, nofollow` de `src/partials/head.html`;
  - los enlaces legales del pie apuntan a `#`: no hay aviso legal, privacidad ni cookies;
  - «Regala NOI» no cobra ni emite bonos: no hay pasarela de pago.
- Qué propuesta de las tres se publica: no consta.

## Siguiente acción

Conseguir el acceso al alojamiento del cliente. Trabajo de código previsto hasta entonces: no consta. Quién lo pide y a quién: no consta.

## Piezas reutilizables

Marca, fotos, textos y carta son de NOI. Lo que sirve a otros proyectos es la estructura:

- Generador de web estática con parciales e imágenes en dos tamaños, sin dependencias — `build.mjs`
- Modal de reserva con una pestaña por sala sobre CoverManager — `src/partials/modal.html`, `assets/js/widgets.js`
- Vista previa de regalo: menú degustación o tarjeta, de 1 a 10 personas, con resumen — `src/partials/regala-experiencia.html`, `assets/js/gift.js`, `assets/css/gift.css`
- Pases de fotos con cortes, secuencia al hacer scroll y galería — `assets/js/widgets.js`, `assets/css/sections.css`
- Carta en PDF y como parcial HTML — `assets/docs/carta-noi-bar-e-cucina.pdf`, `src/partials/carta-bar.html`
- Cortina entre páginas, loader y scroll suave — `assets/js/core.js`

En Lince está recogido como `catalogo/web-restaurante-carta-reserva-regalo.md` (estado «prototipo», actualizada el 20/10/2026). En `proyectos/` de Lince no hay ficha de este repo.
