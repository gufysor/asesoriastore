/* POST /api/login — versión Vercel. Compara contra ADMIN_PASS (variable de
   entorno) y devuelve un token firmado válido por 7 días. */
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'método no permitido' });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  const pass = String((b && b.pass) || '');
  const real = String(process.env.ADMIN_PASS || '');
  const ok = real && pass.length === real.length &&
    crypto.timingSafeEqual(Buffer.from(pass), Buffer.from(real));
  if (!ok) return res.status(401).json({ error: 'contraseña incorrecta' });
  const exp = Date.now() + 7 * 86400 * 1000;
  const sig = crypto.createHmac('sha256', real).update(String(exp)).digest('hex');
  res.status(200).json({ token: exp + '.' + sig });
};
