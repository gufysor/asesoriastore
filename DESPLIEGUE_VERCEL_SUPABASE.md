# Desplegar en Vercel + Supabase (gratis) con dominio de Hostinger

El contenido editable vive en Supabase; Vercel sirve la web y la API. El panel
del administrador (/login) funciona igual que en local.

## 1. Supabase (5 min)

1. Entra a supabase.com → New project (gratis). Espera a que arranque.
2. Menú **SQL Editor** → pega TODO el contenido del archivo **`seed.sql`** → Run.
   (Crea la tabla `content` y carga el contenido inicial de la web.)
3. Menú **Settings → API** y copia dos cosas:
   - **Project URL** (algo como `https://abcd1234.supabase.co`)
   - **service_role** key (la secreta, NO la anon)

## 2. Vercel (5 min)

1. Entra a vercel.com → Add New → Project → **Import** el repo `MARCEKMC/apechain-hero`.
2. Framework: **Other**. No toques el build (no hay build).
3. Antes de darle Deploy, abre **Environment Variables** y agrega 3:
   - `SUPABASE_URL` → el Project URL de Supabase
   - `SUPABASE_SERVICE_KEY` → la service_role key
   - `ADMIN_PASS` → la contraseña del administrador (elige una nueva y larga)
4. **Deploy**. Al terminar te da una URL `xxxx.vercel.app` — pruébala:
   la web carga, `/productos` abre directo, y `/login` entra con tu ADMIN_PASS.

## 3. Conectar tu dominio de Hostinger (5 min + espera de DNS)

1. En Vercel → tu proyecto → **Settings → Domains** → escribe tu dominio → Add.
   Vercel te muestra qué registro DNS necesita (normalmente un **A** a `76.76.21.21`
   y para `www` un **CNAME** a `cname.vercel-dns.com`).
2. En Hostinger → **Dominios → tu dominio → DNS / Nameservers** → edita:
   - Registro **A** de `@` → `76.76.21.21` (borra el A que hubiera)
   - Registro **CNAME** de `www` → `cname.vercel-dns.com`
3. Espera a que Vercel marque el dominio como verificado (minutos a unas horas).
   El HTTPS lo emite Vercel solo.

## Notas

- **La contraseña ya no está en ningún archivo**: vive en la variable `ADMIN_PASS`
  de Vercel. Para cambiarla: Settings → Environment Variables → editar → Redeploy.
- Cada "Guardar y publicar" del admin escribe en Supabase; el respaldo es el
  historial del proyecto en Supabase (Database → Backups, incluido en el plan gratis).
- **Fotos**: en Supabase → **Storage** crea un bucket público `img`, sube las
  imágenes y usa el botón "Get URL" para pegar la URL en el editor de la web.
  Esas URLs permiten CORS, así que también sirven para el hero.
- Si haces `git push` al repo, Vercel redespliega solo (el contenido no se toca:
  está en Supabase).
- Para desarrollo local sigue funcionando `node serve.js` con `data.json` local.
