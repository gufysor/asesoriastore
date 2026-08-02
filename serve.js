/* Servidor de GUF Corporation.  Uso:  node serve.js  [puerto]
   - Sirve la web estática.
   - API mínima para que el administrador edite el contenido:
       GET  /api/data            → contenido público (sin la contraseña)
       POST /api/login {pass}    → {token} si la contraseña coincide
       POST /api/data  (x-token) → guarda data.json (preserva adminPass)
   La contraseña vive en data.json → "adminPass". CÁMBIALA antes de publicar. */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = __dirname;
const PORT = Number(process.argv[2] || 8080);
const DATA = path.join(ROOT, 'data.json');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon',
};
const tokens = new Set();

const readData = () => JSON.parse(fs.readFileSync(DATA, 'utf8'));
const json = (res, code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); };
const body = req => new Promise((ok, bad) => {
  let b = ''; req.on('data', c => { b += c; if (b.length > 2e6) { bad(new Error('grande')); req.destroy(); } });
  req.on('end', () => ok(b)); req.on('error', bad);
});

http.createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

  /* ---------------- API ---------------- */
  if (url === '/api/data' && req.method === 'GET') {
    try { const d = readData(); delete d.adminPass; return json(res, 200, d); }
    catch (e) { return json(res, 500, { error: 'data.json ilegible' }); }
  }
  if (url === '/api/login' && req.method === 'POST') {
    try {
      const { pass } = JSON.parse(await body(req));
      const d = readData();
      if (pass && pass === d.adminPass) {
        const t = crypto.randomBytes(24).toString('hex');
        tokens.add(t);
        return json(res, 200, { token: t });
      }
      return json(res, 401, { error: 'contraseña incorrecta' });
    } catch (e) { return json(res, 400, { error: 'petición inválida' }); }
  }
  if (url === '/api/data' && req.method === 'POST') {
    if (!tokens.has(req.headers['x-token'])) return json(res, 401, { error: 'no autorizado' });
    try {
      const incoming = JSON.parse(await body(req));
      const current = readData();
      incoming.adminPass = current.adminPass;      // nunca se pisa desde el cliente
      fs.writeFileSync(DATA + '.bak', JSON.stringify(current, null, 2));  // respaldo del estado anterior
      fs.writeFileSync(DATA, JSON.stringify(incoming, null, 2));
      return json(res, 200, { ok: true });
    } catch (e) { return json(res, 400, { error: 'JSON inválido' }); }
  }

  /* ---------------- estático ---------------- */
  // datos y respaldos nunca se sirven directo (contienen la contraseña)
  if (/^\/(data\.json|tokens\.json)$|\.bak$/.test(url)) { res.statusCode = 404; return res.end('404'); }
  // /login (o cualquier ruta sin extensión) sirve la SPA
  let rel = url === '/' ? 'index.html' : url.slice(1);
  if (!path.extname(rel)) rel = 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end('403'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; res.setHeader('Content-Type', 'text/plain'); return res.end('404 ' + rel); }
    res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('GUF Corporation sirviendo ' + ROOT);
  console.log('  ->  http://localhost:' + PORT);
  console.log('  ->  admin: http://localhost:' + PORT + '/#/login');
});
