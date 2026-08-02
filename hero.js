/* =====================================================================
   hero.js — carrusel instanciado + rings reactivos al cursor.
   Todo parámetro numérico sale de las llamadas GL reales de la referencia:
     · malla card   = 1.0 × 0.6 local, 19×1 segmentos → 40 verts / 114 índices
     · winding      = 0,20,1 / 1,20,21
     · aInstanceID  = (i/5, i)
     · uRadius      = 1/(2·sin(π/5)) = 0.85065081  (circunradio del pentágono)
     · escala 0.9 · z ×0.5 · offset +0.25
     · uMVP         = 16 floats capturados (2 variantes = dolly con el scroll)
     · autoplay     = 6.10 s
   ===================================================================== */
import {
  APP, CONTENT, SLIDES, hex, lerp, easeInOut, makeGL, program, buffer, attrib,
  DispSystem, buildRings, slideArt,
} from './core.js';

export const CFG = {
  slides: 5,
  radius: 1 / (2 * Math.sin(Math.PI / 5)),
  cardScale: 0.9,
  cardHalfY: 0.3,            // medido: aPosition.y ∈ [-0.3, 0.3]
  zSquash: 0.5,
  autoplayMs: 6100,
  transitionMs: 950,
  segsX: 19,
  refAspect: 1440 / 860,
  introMs: 1250,
  /* uMVP medido barriendo el scroll de 0 a 1300 px: es CONSTANTE, no depende
     del scroll. El estado en reposo es este (m14/m15 = 2.3498 / 2.5013). */
  mvpRest:  [3.1449, 0.5772, 0.0720, 0.0706, -0.3871, 5.1317, 0.2312, 0.2266,
             0.1382, 1.2388, -0.9911, -0.9714, 0, -0.5311, 2.3498, 2.5013],
  /* la otra variante capturada (m14/m15 = 2.8586 / 3.0) es la cámara más
     alejada: es el arranque de la animación de entrada, no un estado de scroll */
  mvpIntro: [3.1449, 0.5772, 0.0720, 0.0706, -0.3871, 5.1317, 0.2312, 0.2266,
             0.1382, 1.2388, -0.9911, -0.9714, 0, -0.5311, 2.8586, 3.0000],
};

const canvas = document.getElementById('hero-gl');
const gl = makeGL(canvas);

/* ------------------------------------------------------------ carrusel */
const CARD = program(gl, `#version 300 es
precision highp float;
in vec2 aPosition; in vec2 aTexCoord; in vec2 aInstanceID;
uniform float uProgress; uniform float uRadius; uniform mat4 uMVP;
out vec3 vTexCoord; out vec2 vViewportPosition; out float vInst;
#define PI 3.14159265359
void main(){
  vec3 position = vec3(aPosition, 0.0);
  position.xy *= ${CFG.cardScale};
  float stride = 1.0 / ${CFG.slides}.0;
  float circleProgress = -(aInstanceID.x + position.x * stride) + uProgress + 0.25;
  float angle = circleProgress * 2.0 * PI;
  position.x = cos(angle) * uRadius;
  position.z = sin(angle) * uRadius * ${CFG.zSquash};
  gl_Position = uMVP * vec4(position, 1.0);
  vTexCoord = vec3(aTexCoord, aInstanceID.y);
  vViewportPosition = gl_Position.xy / gl_Position.w;
  vInst = aInstanceID.y;
}`, `#version 300 es
precision highp float;
uniform mediump sampler2DArray uTextures;
uniform float uFacingFlip; uniform float uDebug;
in vec3 vTexCoord; in vec2 vViewportPosition; in float vInst;
out vec4 fragColor;
void main(){
  if (uDebug > 0.5) {
    fragColor = vec4(vInst < 0.5 ? vec3(1,0,0) : vInst < 1.5 ? vec3(0,1,0)
                   : vInst < 2.5 ? vec3(0,0,1) : vInst < 3.5 ? vec3(1,1,0) : vec3(1,0,1), 1.0);
    return;
  }
  bool front = gl_FrontFacing != (uFacingFlip > 0.5);
  vec3 tc = vTexCoord;
  tc.x = front ? 1.0 - tc.x : tc.x;
  float near = front ? 1.0 : 0.0;
  vec4 sharp = texture(uTextures, tc);
  vec4 blur  = texture(uTextures, tc, 1.0);
  fragColor = mix(blur, sharp, near);
  fragColor.rgb *= 0.5 + near * 0.5;
  fragColor.a *= clamp(smoothstep(-1.0, -0.8, vViewportPosition.y), 0.0, 1.0);
}`);

function buildCard() {
  const nx = CFG.segsX, ny = 1, pos = [], uv = [], idx = [];
  for (let y = 0; y <= ny; y++) for (let x = 0; x <= nx; x++) {
    const u = x / nx, v = y / ny;
    pos.push(u - 0.5, (v - 0.5) * CFG.cardHalfY * 2);
    uv.push(1 - u, 1 - v);                    // aTexCoord.x invertida, igual que la referencia
  }
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const a = y * (nx + 1) + x, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);               // winding 0,20,1 / 1,20,21
  }
  return { pos: new Float32Array(pos), uv: new Float32Array(uv), idx: new Uint16Array(idx), count: idx.length };
}
const card = buildCard();
const cardPos = buffer(gl, card.pos), cardUV = buffer(gl, card.uv);
const cardIdx = buffer(gl, card.idx, gl.ELEMENT_ARRAY_BUFFER);
const instData = new Float32Array(CFG.slides * 2);
for (let i = 0; i < CFG.slides; i++) { instData[i * 2] = i / CFG.slides; instData[i * 2 + 1] = i; }
const cardInst = buffer(gl, instData);

/* texturas de los slides en un sampler2DArray (con mipmaps: el LOD 1 es el
   desenfoque de las caras traseras) */
export const arts = SLIDES.map((_, i) => slideArt(i));
const TW = arts[0].width, TH = arts[0].height;
const texArr = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D_ARRAY, texArr);
gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 8, gl.RGBA8, TW, TH, CFG.slides);
arts.forEach((c, i) => gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, TW, TH, 1, gl.RGBA, gl.UNSIGNED_BYTE, c));
gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

/* fotos del admin: si un slide tiene URL de imagen, reemplaza su textura y su
   miniatura (la imagen debe permitir CORS; ideal subirla al mismo hosting) */
(CONTENT.heroSlides || []).forEach((s, i) => {
  if (!s.img) return;
  const im = new Image();
  im.crossOrigin = 'anonymous';
  im.onload = () => {
    const c = document.createElement('canvas'); c.width = TW; c.height = TH;
    const x = c.getContext('2d');
    const k = Math.max(TW / im.width, TH / im.height);   // cover
    x.drawImage(im, (TW - im.width * k) / 2, (TH - im.height * k) / 2, im.width * k, im.height * k);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texArr);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, TW, TH, 1, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    const tc = document.querySelectorAll('.thumb canvas')[i];
    if (tc) {
      const side = Math.min(c.width, c.height);
      tc.getContext('2d').drawImage(c, (c.width - side) / 2, (c.height - side) / 2, side, side, 0, 0, 96, 96);
    }
  };
  im.src = s.img;
});

/* ------------------------------------------------------------ rings */
let ringGeo = buildRings();
let ringSys = new DispSystem(gl, { ...ringGeo, drag: 0.2, push: 0.2 });

/* ------------------------------------------------------------ estado */
export const S = {
  progress: 0, from: 0, to: 0, tStart: -1, index: 0,
  dragging: false, dragX: 0, dragStart: 0, moved: 0,
  nextAt: performance.now() + CFG.autoplayMs,
  debug: false,
};

const info = document.getElementById('info');
function paintInfo() {
  const s = SLIDES[S.index];
  info.classList.add('swapping');
  setTimeout(() => {
    document.getElementById('title').textContent = s.name;
    document.getElementById('cat').textContent = s.cat;
    document.getElementById('desc').textContent = s.desc;
    info.classList.remove('swapping');
  }, 260);
  [...document.querySelectorAll('.thumb')].forEach((b, i) => b.dataset.active = i === S.index ? '1' : '0');
}
export function goTo(i, animate = true) {
  const n = CFG.slides;
  /* Anclar SIEMPRE a la vuelta entera más cercana a la posición actual: tras
     un drag (o a mitad de transición) S.progress es arbitrario, y sumar el
     delta sobre él dejaba el carrusel asentado entre dos cards (la costura
     al centro). El delta se calcula contra la card visible, no contra el
     índice viejo, y el destino es múltiplo exacto de 1/n. */
  const base = Math.round(S.progress * n);
  const baseIdx = ((base % n) + n) % n;
  const tgt = ((i % n) + n) % n;
  let d = ((tgt - baseIdx) % n + n) % n; if (d > n / 2) d -= n;
  S.index = tgt;
  S.from = S.progress; S.to = (base + d) / n;
  S.tStart = animate ? performance.now() : -1;
  if (!animate) S.progress = S.to;
  APP.index = S.index;
  APP.c1t = hex(SLIDES[S.index].c1); APP.c2t = hex(SLIDES[S.index].c2);
  S.nextAt = performance.now() + CFG.autoplayMs + (animate ? CFG.transitionMs : 0);
  paintInfo();
}

/* thumbnails */
const thumbs = document.getElementById('thumbs');
arts.forEach((art, i) => {
  const b = document.createElement('button');
  b.className = 'thumb'; b.dataset.active = i === 0 ? '1' : '0';
  b.setAttribute('aria-label', SLIDES[i].name);
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const side = Math.min(art.width, art.height);
  c.getContext('2d').drawImage(art, (art.width - side) / 2, (art.height - side) / 2, side, side, 0, 0, 96, 96);
  b.appendChild(c);
  b.onclick = () => goTo(i);
  thumbs.appendChild(b);
});
document.getElementById('next').onclick = () => goTo(S.index + 1);
document.getElementById('prev').onclick = () => goTo(S.index - 1);
paintInfo();

/* ------------------------------------------------------------ input */
addEventListener('pointermove', e => {
  const r = canvas.getBoundingClientRect();
  const nx = (e.clientX - r.left) / r.width * 2 - 1;
  const ny = -((e.clientY - r.top) / r.height * 2 - 1);
  APP.cursor[2] = nx - APP.cursor[0]; APP.cursor[3] = ny - APP.cursor[1];
  APP.cursor[0] = nx; APP.cursor[1] = ny;
  if (S.dragging) {
    const dx = e.clientX - S.dragX; S.moved += Math.abs(dx);
    S.progress = S.dragStart - dx / r.width * 0.55;
    S.tStart = -1;
  }
});
canvas.addEventListener('pointerdown', e => {
  S.dragging = true; S.dragX = e.clientX; S.dragStart = S.progress; S.moved = 0;
  canvas.setPointerCapture(e.pointerId);
});
addEventListener('pointerup', () => {
  if (!S.dragging) return;
  S.dragging = false;
  goTo(Math.round(S.progress * CFG.slides));
});
addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') goTo(S.index + 1);
  if (e.key === 'ArrowLeft') goTo(S.index - 1);
});

/* ------------------------------------------------------------ resize */
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
  if (!w || !h || (canvas.width === w && canvas.height === h)) return;
  canvas.width = w; canvas.height = h;
}
addEventListener('resize', resize);

/* La matriz NO depende del scroll. Lo único que la mueve es la animación de
   entrada: arranca en la cámara alejada y llega a la de reposo. */
let introT0 = -1;
function mvp(now) {
  const a = canvas.clientWidth / canvas.clientHeight;
  const k = CFG.refAspect / a;               // conserva el encuadre vertical
  if (introT0 < 0 && APP.ready) introT0 = now;
  const t = introT0 < 0 ? 0 : Math.min(1, (now - introT0) / CFG.introMs);
  const e = 1 - Math.pow(1 - t, 4);          // easeOutQuart
  const m = new Float32Array(16);
  for (let i = 0; i < 16; i++) m[i] = lerp(CFG.mvpIntro[i], CFG.mvpRest[i], e);
  m[0] *= k; m[4] *= k; m[8] *= k; m[12] *= k;
  return m;
}

/* ------------------------------------------------------------ render */
export function drawHero(now) {
  resize();
  if (!canvas.width) return;

  if (!S.dragging && S.tStart < 0 && now > S.nextAt) goTo(S.index + 1);
  if (S.tStart > 0) {
    const k = Math.min(1, (now - S.tStart) / CFG.transitionMs);
    S.progress = lerp(S.from, S.to, easeInOut(k));
    if (k >= 1) S.tStart = -1;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.DEPTH_TEST);

  // rings (blanco al 20%, medido de uColor)
  ringSys.step(APP.cursor);
  ringSys.render([1, canvas.clientWidth / canvas.clientHeight], [{ dispStrength: 1, color: [1, 1, 1, 0.2] }]);
  APP.cursor[2] *= 0.82; APP.cursor[3] *= 0.82;

  // carrusel
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(CARD.p);
  attrib(gl, CARD.a.aPosition, cardPos, 2);
  attrib(gl, CARD.a.aTexCoord, cardUV, 2);
  attrib(gl, CARD.a.aInstanceID, cardInst, 2, 1);
  gl.uniform1f(CARD.u.uProgress, S.progress);
  gl.uniform1f(CARD.u.uRadius, CFG.radius);
  gl.uniformMatrix4fv(CARD.u.uMVP, false, mvp(now));
  gl.uniform1f(CARD.u.uFacingFlip, 1);
  gl.uniform1f(CARD.u.uDebug, S.debug ? 1 : 0);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texArr);
  gl.uniform1i(CARD.u.uTextures, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cardIdx);
  gl.drawElementsInstanced(gl.TRIANGLES, card.count, gl.UNSIGNED_SHORT, 0, CFG.slides);
}
