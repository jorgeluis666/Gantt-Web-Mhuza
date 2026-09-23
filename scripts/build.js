#!/usr/bin/env node
/**
 * build.js — arma dist/ para publicar en el hosting de Lima Retail.
 *
 * Uso: HTPASSWD_PATH=/home/<usuario>/.htpasswds/<carpeta>/passwd node scripts/build.js
 * Salida: las paginas del tablero, assets/, data/board.json y dist/.htaccess (Basic Auth + CSP).
 * README.md, .claude/ y .agents/ no se publican.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');

const PAGES = [
  'index.html',
  'Muhza_Homepage_Mockup.html',
  'Muhza_Key_Pages_Mockup.html',
  'Muhza_Cycle_Hub_Interactive.html',
  'muhza-cycle-quiz.html',
];
const DIRS = ['assets', 'data'];

const sha256 = text => `'sha256-${crypto.createHash('sha256').update(text, 'utf8').digest('base64')}'`;

// CSP con el hash de cada <script> inline y de cada manejador on*="..." de todas las paginas.
function buildCsp(htmlFiles) {
  const scriptHashes = new Set();
  const handlerHashes = new Set();
  for (const html of htmlFiles) {
    for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) scriptHashes.add(sha256(match[1]));
    for (const match of html.matchAll(/\son[a-z]+="([^"]*)"/g)) handlerHashes.add(sha256(match[1]));
  }
  const scriptSrc = ["'self'", ...scriptHashes];
  if (handlerHashes.size) scriptSrc.push("'unsafe-hashes'", ...handlerHashes);
  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    'font-src https://fonts.gstatic.com',
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

// El acceso lo controla Apache (HTTP Basic Auth). HTPASSWD_PATH es la ruta absoluta del archivo de
// claves en el servidor (la que crea cPanel > Privacidad de directorios). Si falta, se deja un
// marcador: Apache responde 500 en vez de servir el tablero sin clave.
function writeHtaccess(htmlFiles) {
  const htpasswdPath = (process.env.HTPASSWD_PATH || '').trim();
  if (!htpasswdPath) console.warn('[build] falta HTPASSWD_PATH; dist/.htaccess queda con un marcador y el sitio no abrira');
  const template = fs.readFileSync(path.join(ROOT, 'deploy', '.htaccess'), 'utf8');
  for (const token of ['__HTPASSWD_PATH__', '__CSP__']) {
    if (template.split(token).length !== 2) throw new Error(`deploy/.htaccess debe contener ${token} exactamente una vez`);
  }
  const output = template
    .replace('__HTPASSWD_PATH__', htpasswdPath || '/RUTA/NO/CONFIGURADA/.htpasswd')
    .replace('__CSP__', buildCsp(htmlFiles));
  fs.writeFileSync(path.join(DIST_DIR, '.htaccess'), output, 'utf8');
}

function main() {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });
  // El navegador calcula el hash CSP sobre el texto con saltos LF; se normaliza para que coincidan.
  const htmlFiles = PAGES.map(page => {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8').replace(/\r\n?/g, '\n');
    fs.writeFileSync(path.join(DIST_DIR, page), html, 'utf8');
    return html;
  });
  for (const dir of DIRS) fs.cpSync(path.join(ROOT, dir), path.join(DIST_DIR, dir), { recursive: true });
  writeHtaccess(htmlFiles);
  console.log(`[build] dist/ listo: ${PAGES.length} paginas, ${DIRS.join(', ')} y .htaccess`);
}

try {
  main();
} catch (error) {
  console.error('[build] error:', error.message);
  process.exit(1);
}
