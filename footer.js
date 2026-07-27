/* =====================================================================
   footer.js — wordmark gigante con distorsión líquida y aberración cromática.

   La referencia NO usa un shader de aberración: reutiliza el MISMO sistema de
   partículas del hero y dibuja la forma tres veces, en rojo, verde y azul, con
   uDispStrength distinto en cada pasada. Medido:
     uColor        = [1,0,0,0.3333] y [0,1,0,0.3333]   → canales R/G/B
     uDispStrength = 0.9 | 1.0 | 1.1                   → 3 desplazamientos
     uEffectsStrength = [1, 0]                         → solo arrastre, sin empuje
   Donde las tres coinciden se suman a blanco; donde el muelle las separa
   aparecen los flecos de color.

   Diferencia de implementación: la referencia triangula los contornos de las
   letras (2794 partículas). Yo uso una rejilla densa con la palabra como
   máscara alfa — misma deformación, sin depender de la fuente comercial.
   ===================================================================== */
import { APP, makeGL, DispSystem, buildGrid, texFromCanvas } from './core.js';

const canvas = document.getElementById('footer-gl');
const gl = makeGL(canvas);

const WORD = 'GUF CORPORATION';
const MASK_W = 2048, MASK_H = 512;

function buildMask() {
  const c = document.createElement('canvas');
  c.width = MASK_W; c.height = MASK_H;
  const x = c.getContext('2d');
  x.clearRect(0, 0, MASK_W, MASK_H);
  x.fillStyle = '#fff';
  x.textBaseline = 'middle';
  x.textAlign = 'center';
  // ajusta el tamaño para que la palabra ocupe casi todo el ancho
  let size = 460;
  x.font = `${size}px 'Anton', Impact, sans-serif`;
  const target = MASK_W * 0.985;
  const w = x.measureText(WORD).width;
  size = Math.floor(size * target / w);
  x.font = `${size}px 'Anton', Impact, sans-serif`;
  x.fillText(WORD, MASK_W / 2, MASK_H * 0.56);
  return c;
}

let mask = null, sys = null;
const geo = buildGrid({ nx: 200, ny: 44, x0: -1, x1: 1, y0: -1, y1: 1 });

function init() {
  mask = texFromCanvas(gl, buildMask());
  sys = new DispSystem(gl, { ...geo, drag: 1.0, push: 0.0 });   // medido: [1, 0]
}
// espera a que la fuente esté lista para que la máscara no salga con la de fallback
if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); else init();

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
  if (!w || !h || (canvas.width === w && canvas.height === h)) return;
  canvas.width = w; canvas.height = h;
}
addEventListener('resize', resize);

/* cursor en coordenadas locales del canvas del footer */
const local = [0, 0, 0, 0];
let lastMove = -1e9;
addEventListener('pointermove', e => {
  const r = canvas.getBoundingClientRect();
  if (!r.height) return;
  const nx = (e.clientX - r.left) / r.width * 2 - 1;
  const ny = -((e.clientY - r.top) / r.height * 2 - 1);
  local[2] = nx - local[0]; local[3] = ny - local[1];
  local[0] = nx; local[1] = ny;
  lastMove = performance.now();
});

/* ---- deriva en reposo ----------------------------------------------------
   En la referencia el wordmark nunca se queda quieto: siempre tiene algo de
   distorsión y de aberración. Lo más probable es que el solver de fluidos
   (Navier-Stokes, 120×64, que corre de forma permanente) le inyecte un campo
   de velocidad. No pude confirmar esa atribución, así que uso una deriva
   propia: un cursor virtual recorriendo una curva de Lissajous lenta. Mismo
   resultado visual, mecanismo distinto. */
function idle(now) {
  if (now - lastMove < 400) return;
  const t = now / 1000;
  // barrido suficientemente rápido para que la velocidad del cursor virtual
  // alimente el arrastre (la física solo usa vel += cursorVel · 0.02)
  const x = Math.sin(t * 1.15) * 0.92 + Math.sin(t * 0.37) * 0.1;
  const y = Math.sin(t * 0.83 + 1.7) * 0.6;
  local[2] = x - local[0];
  local[3] = y - local[1];
  local[0] = x; local[1] = y;
}

const PASSES = [
  { dispStrength: 0.9, color: [1, 0, 0, 1] },
  { dispStrength: 1.0, color: [0, 1, 0, 1] },
  { dispStrength: 1.1, color: [0, 0, 1, 1] },
];

export function drawFooter(now = performance.now()) {
  if (!sys) return;
  idle(now);
  /* con el mouse encima la deformación es mucho más fuerte que la deriva:
     sube el arrastre mientras hay movimiento real reciente */
  sys.drag = (now - lastMove < 350) ? 5.0 : 1.0;
  resize();
  if (!canvas.width) return;
  const r = canvas.getBoundingClientRect();
  const visible = r.top < innerHeight + 200 && r.bottom > -200;

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  if (!visible) return;                       // no simular fuera de pantalla

  sys.step(local);
  local[2] *= 0.82; local[3] *= 0.82;

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);               // aditivo: R+G+B → blanco
  sys.render([1, 1], PASSES, mask);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
}
