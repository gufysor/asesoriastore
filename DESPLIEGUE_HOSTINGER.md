# Desplegar GUF Corporation en Hostinger

La web funciona en el hosting compartido de Hostinger (PHP), sin Node: la API del
administrador la atiende `api.php` y el `.htaccess` incluido hace el resto.

## Pasos (10 minutos)

1. **Sube los archivos** a `public_html` del dominio (hPanel → Administrador de archivos, o FTP). Deben quedar en la raíz:
   - `index.html`, `.htaccess`, `api.php`, `data.json`
   - `core.js`, `bg.js`, `hero.js`, `footer.js`, `ui.js`, `admin.js`, `page.js`
   - (No hace falta subir: `serve.js`, `README.md`, `PROMPTS_IMAGENES.md`, `.gitignore`)

2. **Cambia la contraseña del admin**: abre `data.json` con el editor del Administrador
   de archivos y reemplaza el valor de `"adminPass"` por una contraseña nueva y larga.

3. **Permisos de escritura**: `data.json` debe ser escribible por PHP (en Hostinger
   el permiso por defecto **644 ya funciona** porque PHP corre como tu usuario).
   Si el editor dice "no se pudo escribir data.json", ponle 664.

4. **Activa HTTPS** (hPanel → SSL) y fuerza la redirección a https.

5. **Prueba**:
   - `https://tudominio/` → la web carga con todo el contenido.
   - `https://tudominio/productos` → abre la tienda directo (si da 404, el
     `.htaccess` no se subió — es un archivo oculto, activa "mostrar archivos ocultos").
   - `https://tudominio/data.json` → debe dar **403/prohibido** (protege la contraseña).
   - `https://tudominio/login` → entra con la contraseña, edita algo y guarda.

## Notas

- El guardado crea `data.json.bak` (respaldo del estado anterior) y `tokens.json`
  (sesiones del admin, duran 7 días). Ambos están bloqueados desde fuera.
- Las **fotos**: súbelas a una carpeta `img/` en `public_html` (crea la carpeta y
  arrastra los archivos) y en el editor pega la ruta, por ejemplo `/img/audifonos.jpg`.
  Al estar en el mismo dominio, también funcionan en el hero (sin problemas de CORS).
- Si algún día migran a un VPS con Node, `node serve.js` da exactamente la misma API;
  no hay que cambiar nada del frontend.
