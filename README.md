# LR-Suite | Gantt Proyecto Web

Aplicacion estatica instalada dentro del repo con una estructura LR-Suite y un unico modulo activo: **Gantt Proyecto Web**.

## Estructura

- `index.html`: entrada principal de la suite.
- `assets/css/lr-suite.css`: estilos del shell, tablero y Gantt.
- `assets/js/gantt-proyecto-web.js`: datos del cronograma, filtros, busqueda, densidad e impresion.

## Uso

Abre `index.html` en el navegador. No requiere instalacion de paquetes ni servidor local.

## Publicacion en el hosting de Lima Retail

`node scripts/build.js` arma `dist/` con las paginas del tablero, `assets/`, `data/board.json` y un `.htaccess`
generado desde `deploy/.htaccess`: acceso con HTTP Basic Auth (una cuenta para el cliente), cabeceras de
seguridad y una CSP con el hash de cada script inline. README, scripts y carpetas de trabajo no se publican.

Configuracion unica:

1. cPanel > **Dominios**: activar **Forzar redireccion HTTPS**.
2. cPanel > **Privacidad de directorios**: proteger la carpeta del cliente y crear su usuario con una
   contraseña larga y aleatoria. La ruta del archivo de claves queda en
   `/home/<usuario_cpanel>/.htpasswds/<ruta_de_la_carpeta>/passwd`.
3. GitHub > Settings > Secrets and variables > Actions: `HTPASSWD_PATH` (ruta del paso 2), `FTP_SERVER`,
   `FTP_USERNAME`, `FTP_PASSWORD` (cuenta FTP limitada a la carpeta del cliente) y `FTP_SERVER_DIR`
   (carpeta destino terminada en `/`).
4. Desactivar GitHub Pages y dejar el repositorio en privado: los mockups y el cronograma son del cliente.
5. La presentacion de Google Slides enlazada desde el tablero esta compartida como "cualquiera con el
   enlace": restringirla a las cuentas del cliente.

Cada push a `main` ejecuta `.github/workflows/deploy-hosting.yml`, que compila y sube `dist/` por FTPS.
