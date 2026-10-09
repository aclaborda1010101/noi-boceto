// NOI — build mínimo: compone src/pages/*.html con los parciales de src/partials
// Uso: node build.mjs   (genera index.html, ristorante.html y bar-e-cucina.html en esta carpeta)
//
// Sintaxis en las plantillas:
//   {{> header}}                         incluye src/partials/header.html
//   {{title}}                            variable definida en el bloque <!--meta {...} --> de la página
//   {{img noi-web-03 | alt | sizes | attrs}}  <img> con srcset 1200/2400 y dimensiones reales

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "src");
const IMAGES = JSON.parse(readFileSync(join(SRC, "images.json"), "utf8"));

const read = (path) => readFileSync(path, "utf8");
// Versión para romper la caché del navegador en cada build (assets/*.css|js?v=...)
const VERSION = Date.now().toString(36);

function renderImg(spec) {
  const [name, alt = "", sizes = "100vw", attrs = ""] = spec.split("|").map((s) => s.trim());
  const dims = IMAGES[name];
  if (!dims) throw new Error(`Imagen desconocida: ${name}`);
  const [mw, mh] = dims.m;
  const [lw] = dims.l;
  const lazy = /loading=/.test(attrs) ? "" : ' loading="lazy"';
  const srcset = lw > mw
    ? `assets/img/${name}-1200.webp ${mw}w, assets/img/${name}-2400.webp ${lw}w`
    : `assets/img/${name}-1200.webp ${mw}w`;
  return `<img src="assets/img/${name}-1200.webp" srcset="${srcset}" sizes="${sizes}" width="${mw}" height="${mh}" alt="${alt}"${lazy} decoding="async"${attrs ? " " + attrs : ""}>`;
}

function render(template, vars, depth = 0) {
  if (depth > 5) throw new Error("Inclusión de parciales demasiado profunda");
  return template
    .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => render(read(join(SRC, "partials", `${name}.html`)), vars, depth + 1))
    .replace(/\{\{img\s+([^}]+)\}\}/g, (_, spec) => renderImg(spec))
    .replace(/\{\{(\w+)\}\}/g, (_, key) => {
      if (!(key in vars)) throw new Error(`Variable sin definir: ${key}`);
      return vars[key];
    });
}

function buildPage(file) {
  const raw = read(join(SRC, "pages", file));
  const metaMatch = raw.match(/<!--meta\s*([\s\S]*?)-->/);
  if (!metaMatch) throw new Error(`${file}: falta el bloque <!--meta {...} -->`);
  const vars = { ...JSON.parse(metaMatch[1]), v: VERSION };
  const html = render(raw.replace(metaMatch[0], "").trimStart(), vars);
  writeFileSync(join(ROOT, file), html);
  return file;
}

const built = readdirSync(join(SRC, "pages")).filter((f) => f.endsWith(".html")).map(buildPage);
console.log(`OK → ${built.join(", ")}`);
