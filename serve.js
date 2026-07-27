/* Servidor estático mínimo. Uso:  node serve.js  [puerto]
   Hace falta http:// (no file://) porque la página usa ES modules. */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = __dirname;
const PORT = Number(process.argv[2] || 8080);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, rel === '/' ? 'index.html' : rel);
  if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end('403'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; res.setHeader('Content-Type', 'text/plain'); return res.end('404 ' + rel); }
    res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('Sirviendo ' + ROOT);
  console.log('  ->  http://localhost:' + PORT);
  console.log('Ctrl+C para detener.');
});
