<?php
/* =====================================================================
   API de GUF Corporation para hosting compartido (Hostinger, PHP 8).
   Equivalente a la API de serve.js:
     GET  /api/data            → contenido público (sin la contraseña)
     POST /api/login {pass}    → {token} si la contraseña coincide
     POST /api/data  (x-token) → guarda data.json (preserva adminPass)
   Requiere el .htaccess incluido (reescribe /api/* hacia este archivo).
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');

$DATA = __DIR__ . '/data.json';
$TOK  = __DIR__ . '/tokens.json';
$r = $_GET['r'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function jout($code, $obj) { http_response_code($code); echo json_encode($obj, JSON_UNESCAPED_UNICODE); exit; }
function read_data($f) {
  if (!is_readable($f)) jout(500, ['error' => 'data.json ilegible']);
  $d = json_decode(file_get_contents($f), true);
  if (!is_array($d)) jout(500, ['error' => 'data.json corrupto']);
  return $d;
}
function read_tokens($f) {
  $t = is_readable($f) ? json_decode(file_get_contents($f), true) : [];
  if (!is_array($t)) $t = [];
  $now = time();
  return array_filter($t, fn($exp) => $exp > $now);
}

if ($r === 'data' && $method === 'GET') {
  $d = read_data($DATA);
  unset($d['adminPass']);
  jout(200, $d);
}

if ($r === 'login' && $method === 'POST') {
  $b = json_decode(file_get_contents('php://input'), true);
  $pass = is_array($b) ? ($b['pass'] ?? '') : '';
  $d = read_data($DATA);
  if ($pass !== '' && hash_equals((string)($d['adminPass'] ?? ''), (string)$pass)) {
    $t = read_tokens($TOK);
    $tok = bin2hex(random_bytes(24));
    $t[$tok] = time() + 7 * 86400;          // la sesión dura 7 días
    file_put_contents($TOK, json_encode($t));
    jout(200, ['token' => $tok]);
  }
  jout(401, ['error' => 'contraseña incorrecta']);
}

if ($r === 'data' && $method === 'POST') {
  $tok = $_SERVER['HTTP_X_TOKEN'] ?? '';
  $t = read_tokens($TOK);
  if ($tok === '' || !isset($t[$tok])) jout(401, ['error' => 'no autorizado']);
  $in = json_decode(file_get_contents('php://input'), true);
  if (!is_array($in) || !isset($in['heroSlides'])) jout(400, ['error' => 'JSON inválido']);
  $cur = read_data($DATA);
  $in['adminPass'] = $cur['adminPass'] ?? '';   // nunca se pisa desde el cliente
  @copy($DATA, $DATA . '.bak');                 // respaldo del estado anterior
  if (file_put_contents($DATA, json_encode($in, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false)
    jout(500, ['error' => 'no se pudo escribir data.json (revisa permisos)']);
  jout(200, ['ok' => true]);
}

jout(404, ['error' => 'ruta no encontrada']);
