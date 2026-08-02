# GUF Corporation — web oficial

Web de **GUF Corporation** (asesorías, descuentos, cuentas y productos), construida en WebGL2 puro sin dependencias. El diseño parte de una réplica técnica de estudio de apechain.com (diseño original de OFF+BRAND); las animaciones fueron reconstruidas desde cero y el contenido es propio.

## Correr

```bash
node serve.js          # → http://localhost:8080
```

Sin nada más que Node. El mismo comando sirve la web y la API de administración.

## Administración (para el dueño de la tienda)

1. Entra a **`/#/login`** (no hay ningún link visible — es una URL oculta).
2. Contraseña: campo **`adminPass`** de `data.json` (por defecto `gufadmin2026` — **CÁMBIALA** editando ese archivo en el servidor).
3. Al entrar aparece la barra **"✎ Editar contenido"**, con pestañas para editar TODO:
   - **General**: nombre de la marca y número de WhatsApp.
   - **Hero**: los 5 slides (nombre, chip, descripción, colores y, cuando tengas, URL de imagen).
   - **Derecho**: los textos de la sección de orientación legal y qué producto se muestra al costado.
   - **Productos**: añadir/editar/eliminar productos, con categoría, etiquetas, precio, descripción, imagen, **Fijado** (top 4 de la tienda) y **Destacado** (portada).
   - **Páginas**: contenido de Asesorías, Descuentos y Cuentas.
   - **Cinta**: las palabras de la marquesina giratoria (una por línea).
   - **Footer**: columnas de información y línea legal.
4. **"Guardar y publicar"** escribe `data.json` y recarga: los cambios quedan en vivo para todos los visitantes. Antes de cada guardado se crea un respaldo `data.json.bak`.

## Cómo compra el cliente

Cualquier producto, servicio o ítem clicado abre una **ventana flotante** con su descripción, precio y etiquetas. El botón **"Comprar por WhatsApp"** abre un chat a **+51 935 090 264** con un mensaje ya escrito que incluye el nombre y precio del producto. Todo el flujo de venta ocurre por WhatsApp.

Los 4 botones del menú superior (**Asesorías, Descuentos, Cuentas, Productos**) abren páginas dedicadas; la de Productos es la tienda completa con fijados, categorías y etiquetas.

## Archivos

| Archivo | Rol |
|---|---|
| `data.json` | **Todo el contenido editable** (y la contraseña del admin) |
| `serve.js` | Servidor estático + API (`GET/POST /api/data`, `POST /api/login`) |
| `core.js` | Carga del contenido, helpers WebGL2, sistema de partículas, arte procedural |
| `bg.js` | Degradado de fondo de página completa (reactivo al scroll) |
| `hero.js` | Carrusel 3D del hero + anillos reactivos |
| `footer.js` | Wordmark líquido con aberración cromática |
| `ui.js` | Modal flotante, páginas dedicadas, router, WhatsApp |
| `admin.js` | Panel de edición del administrador |
| `page.js` | Render del contenido, menús, marquesinas, bucle maestro |

## Notas técnicas

- Sin API (hosting estático), la web funciona leyendo `./data.json`, pero el admin no puede guardar — necesita el `serve.js` en un hosting con Node.
- Las imágenes de productos aún no están cargadas: cada tarjeta muestra un arte generado; cuando tengas las fotos, pega su URL en el campo "Imagen" de cada producto desde el editor.
- La sesión de admin dura mientras el servidor esté encendido (token en memoria).
