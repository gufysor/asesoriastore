/* =====================================================================
   GET/POST /api/data — versión Vercel + Supabase.
   El contenido vive en Supabase (tabla `content`, fila id=1, columna jsonb).
   Variables de entorno necesarias en Vercel:
     SUPABASE_URL          → https://xxxx.supabase.co
     SUPABASE_SERVICE_KEY  → service_role key (Settings → API)
     ADMIN_PASS            → contraseña del administrador
   ===================================================================== */
const crypto = require('crypto');

const SB_URL = () => (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = () => process.env.SUPABASE_SERVICE_KEY || '';
const SECRET = () => process.env.ADMIN_PASS || '';

const hmac = s => crypto.createHmac('sha256', SECRET()).update(String(s)).digest('hex');
function tokenOk(tok) {
  if (!tok || !SECRET()) return false;
  const [exp, sig] = String(tok).split('.');
  if (!exp || !sig || +exp < Date.now()) return false;
  const want = hmac(exp);
  try { return sig.length === want.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want)); }
  catch (e) { return false; }
}
const sb = (path, opts = {}) => fetch(SB_URL() + path, {
  ...opts,
  headers: {
    apikey: SB_KEY(), Authorization: 'Bearer ' + SB_KEY(),
    'Content-Type': 'application/json', ...(opts.headers || {}),
  },
});

module.exports = async (req, res) => {
  if (!SB_URL() || !SB_KEY()) return res.status(500).json({ error: 'faltan SUPABASE_URL / SUPABASE_SERVICE_KEY en Vercel' });

  if (req.method === 'GET') {
    const r = await sb('/rest/v1/content?id=eq.1&select=data');
    if (!r.ok) return res.status(500).json({ error: 'supabase respondió ' + r.status });
    const rows = await r.json();
    const d = rows[0] && rows[0].data;
    if (!d) return res.status(500).json({ error: 'sin contenido: ejecuta seed.sql en Supabase' });
    delete d.adminPass;
    return res.status(200).json(d);
  }

  if (req.method === 'POST') {
    if (!tokenOk(req.headers['x-token'])) return res.status(401).json({ error: 'no autorizado' });
    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { return res.status(400).json({ error: 'JSON inválido' }); } }
    if (!b || !b.heroSlides) return res.status(400).json({ error: 'JSON inválido' });
    delete b.adminPass;                       // la contraseña vive solo en la variable de entorno
    const r = await sb('/rest/v1/content', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{ id: 1, data: b }]),
    });
    if (!r.ok) return res.status(500).json({ error: 'no se pudo guardar (' + r.status + ')' });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'método no permitido' });
};
