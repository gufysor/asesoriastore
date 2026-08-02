/* =====================================================================
   bg.js — canvas `fixed` con el degradado de 2 colores. En la referencia
   este canvas es `fixed top-0 left-0 w-screen min-h-screen`: cubre TODA la
   página, y el div opaco del contenido lo tapa en el medio. Por eso el azul
   del footer es este mismo degradado, no un color propio del footer.

   Medido:  ángulo = 90° − sin(t)·55°   ·   dither = hash(uv)·0.01
   ===================================================================== */
import { APP, CONTENT, hex, makeGL, program, buffer, attrib, lerp, clamp } from './core.js';

/* Tramos del degradado según el scroll (estructura medida de la referencia):
     scroll 0        → colores del slide activo (vivos)
     scroll ≥ ~600   → #e1edfa / #e2f0ff  (el "blanco" del cuerpo de la página)
     footer          → color propio, editable por el admin (footer.c1/c2)      */
const PALE1 = [0.882, 0.929, 0.980], PALE2 = [0.886, 0.941, 1.000];
const BLUE1 = hex((CONTENT.footer || {}).c1 || '#3b1470');
const BLUE2 = hex((CONTENT.footer || {}).c2 || '#7a29c9');
const smooth = t => t * t * (3 - 2 * t);
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

const canvas = document.getElementById('bg');
const gl = makeGL(canvas);

const BG = program(gl, `#version 300 es
precision highp float;
in vec2 aPosition; in vec2 aTexCoord;
uniform float uTime;
out vec2 vTexCoord; out float vGradient;
void main(){
  gl_Position = vec4(aPosition, 0.0, 1.0);
  vTexCoord = aTexCoord;
  float sway = sin(uTime) * 55.0;
  vec2 uv = aTexCoord - 0.5;
  float a = radians(90.0) - radians(sway) + atan(uv.y, uv.x);
  float l = length(uv);
  uv = vec2(cos(a) * l, sin(a) * l) + 0.5;
  vGradient = smoothstep(0.0, 1.0, uv.x);
}`, `#version 300 es
precision highp float;
uniform vec3 uColor1; uniform vec3 uColor2;
in vec2 vTexCoord; in float vGradient;
out vec4 fragColor;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123); }
void main(){
  float f = vGradient + hash(vTexCoord) * 0.01;
  fragColor = vec4(mix(uColor1, uColor2, clamp(f, 0.0, 1.0)), 1.0);
}`);

const pos = buffer(gl, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
const uv = buffer(gl, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]));

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
}
addEventListener('resize', resize); resize();

let t0 = performance.now(), last = t0;
export function drawBG(now) {
  const dt = Math.min(50, now - last); last = now;
  /* objetivo según el scroll: slide → blanco pálido al salir del hero →
     azul del footer al llegar abajo (los tres tramos, medidos) */
  const y = scrollY;
  const hf = smooth(clamp((y - 250) / 350, 0, 1));
  const ftop = document.documentElement.scrollHeight - 759;
  const ff = smooth(clamp((y - (ftop - 900)) / 600, 0, 1));
  const t1 = mix3(mix3(APP.c1t, PALE1, hf), BLUE1, ff);
  const t2 = mix3(mix3(APP.c2t, PALE2, hf), BLUE2, ff);
  const k = 1 - Math.pow(0.0035, dt / 1000);
  for (let i = 0; i < 3; i++) {
    APP.c1[i] = lerp(APP.c1[i], t1[i], k);
    APP.c2[i] = lerp(APP.c2[i], t2[i], k);
  }
  resize();
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(BG.p);
  attrib(gl, BG.a.aPosition, pos, 2);
  attrib(gl, BG.a.aTexCoord, uv, 2);
  gl.uniform1f(BG.u.uTime, (now - t0) / 1000);
  gl.uniform3fv(BG.u.uColor1, APP.c1);
  gl.uniform3fv(BG.u.uColor2, APP.c2);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
