/* =====================================================================
   core.js — utilidades WebGL2 compartidas + estado global + el sistema de
   desplazamiento por partículas (transform feedback) que la referencia
   reutiliza en dos sitios: los rings del hero y el wordmark del footer.
   ===================================================================== */

export const hex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOut = t => 1 - Math.pow(1 - t, 3);

/* =====================================================================
   CONTENIDO EDITABLE — se carga de /api/data (servidor con API) o de
   ./data.json (hosting estático). El admin lo edita desde /#/login.
   Top-level await: todos los módulos que importan core esperan a que el
   contenido esté listo antes de arrancar.
   ===================================================================== */
const HERO_IMAGES = [
  '/assets/hero/asesorias.jpg',
  '/assets/hero/descuentos.jpg',
  '/assets/hero/cuentas.jpg',
  '/assets/hero/productos.jpg',
  '/assets/hero/personalizados.jpg',
];
const ASESORIAS_IMAGES = [
  '/assets/pages/asesorias/cursos-ingenieria.jpg',
  '/assets/pages/asesorias/resolucion-examenes.jpg',
  '/assets/pages/asesorias/orientacion-derecho.jpg',
];
const DESCUENTOS_IMAGES = [
  '/assets/pages/descuentos/productos-amazon.jpg',
  '/assets/pages/descuentos/vuelos.jpg',
];
const CUENTAS_IMAGES = [
  '/assets/pages/cuentas/netflix.jpg',
  '/assets/pages/cuentas/disney-plus.jpg',
  '/assets/pages/cuentas/chatgpt-plus.jpg',
  '/assets/pages/cuentas/gemini-advanced.jpg',
];
const FALLBACK = {
  brand: 'GUF CORPORATION', whatsapp: '51935090264',
  heroSlides: [
    { name: 'ASESORÍAS',     cat: 'INGENIERÍA · EXÁMENES', desc: 'Asesorías de cursos de ingeniería y resolución de exámenes.', c1: '#a37a1f', c2: '#26610d', img: HERO_IMAGES[0] },
    { name: 'DESCUENTOS',    cat: 'AMAZON · VUELOS',       desc: 'Descuentos en productos de Amazon y en vuelos.',              c1: '#ffffff', c2: '#0086ff', img: HERO_IMAGES[1] },
    { name: 'CUENTAS',       cat: 'STREAMING · IA',        desc: 'Cuentas de streaming y de ChatGPT o Gemini.',                 c1: '#1a4910', c2: '#488434', img: HERO_IMAGES[2] },
    { name: 'PRODUCTOS',     cat: 'TIENDA',                desc: 'Productos varios con descuentos especiales.',                 c1: '#568d9f', c2: '#3e6674', img: HERO_IMAGES[3] },
    { name: 'PERSONALIZADOS',cat: 'A TU MEDIDA',           desc: 'Productos y servicios personalizados.',                       c1: '#02224c', c2: '#bb1001', img: HERO_IMAGES[4] },
  ],
  products: [], pages: {}, marquee: ['GUF CORPORATION'], footer: {}, spotlight: {},
};
async function loadContent() {
  for (const u of ['/api/data', './data.json']) {
    try {
      const r = await fetch(u, { cache: 'no-store' });
      if (r.ok) {
        const d = await r.json();
        if (d && d.heroSlides) {
          delete d.adminPass;
          /* En producción /api/data viene de Supabase y puede conservar los
             campos img vacíos de un contenido anterior al despliegue. */
          d.heroSlides.forEach((slide, i) => { if (!slide.img && HERO_IMAGES[i]) slide.img = HERO_IMAGES[i]; });
          const asesorias = d.pages && d.pages.asesorias && d.pages.asesorias.items;
          if (asesorias) asesorias.forEach((item, i) => {
            if (!item.img && ASESORIAS_IMAGES[i]) item.img = ASESORIAS_IMAGES[i];
          });
          const descuentos = d.pages && d.pages.descuentos && d.pages.descuentos.items;
          if (descuentos) descuentos.forEach((item, i) => {
            if (!item.img && DESCUENTOS_IMAGES[i]) item.img = DESCUENTOS_IMAGES[i];
          });
          const cuentas = d.pages && d.pages.cuentas && d.pages.cuentas.items;
          if (cuentas) cuentas.forEach((item, i) => {
            if (!item.img && CUENTAS_IMAGES[i]) item.img = CUENTAS_IMAGES[i];
          });
          return d;
        }
      }
    } catch (e) { /* siguiente origen */ }
  }
  return FALLBACK;
}
export const CONTENT = await loadContent();

/* slides del hero desde el contenido (colores del degradado por slide) */
export const SLIDES = CONTENT.heroSlides.map(s => ({ name: s.name, cat: s.cat, desc: s.desc, c1: s.c1, c2: s.c2 }));

/* estado compartido entre módulos (el fondo fijo necesita el color del slide
   activo del hero, y el footer necesita el cursor) */
export const APP = {
  index: 0,
  c1: hex(SLIDES[0].c1), c2: hex(SLIDES[0].c2),
  c1t: hex(SLIDES[0].c1), c2t: hex(SLIDES[0].c2),
  cursor: [0, 0, 0, 0],       // xy posición NDC, zw velocidad
  scroll: 0,                  // scrollY en px
  heroProgress: 0,            // 0..1 del scroll dentro del hero
  ready: false,
};

/* ------------------------------------------------------------ GL helpers */
export function makeGL(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: false });
  if (!gl) throw new Error('WebGL2 no disponible');
  return gl;
}
export function shader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src);
  return s;
}
export function program(gl, vs, fs, tfVars) {
  const p = gl.createProgram();
  gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs));
  if (tfVars) gl.transformFeedbackVaryings(p, tfVars, gl.SEPARATE_ATTRIBS);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}, a = {};
  for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) {
    const n = gl.getActiveUniform(p, i).name.replace('[0]', ''); u[n] = gl.getUniformLocation(p, n);
  }
  for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i++) {
    const n = gl.getActiveAttrib(p, i).name; a[n] = gl.getAttribLocation(p, n);
  }
  return { p, u, a };
}
export const buffer = (gl, data, target = gl.ARRAY_BUFFER, usage = gl.STATIC_DRAW) => {
  const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, usage); return b;
};
export function attrib(gl, loc, b, size, divisor = 0) {
  if (loc === undefined || loc < 0) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(loc, divisor);
}

/* =====================================================================
   DispSystem — muelle amortiguado por vértice, simulado en la GPU.
   Física medida del shader de la referencia:
     strength = clamp(1/(1 + d/0.05) − 0.1, 0, 1)
     vel += cursorVel · 0.02 · strength · DRAG
     vel += −disp · 0.1                     (retorno al origen)
     vel += (pos − cursor) · strength · PUSH (empuje radial)
     vel *= 0.90                            (amortiguación)
   ===================================================================== */
const TF_VS = `#version 300 es
precision highp float;
in vec2 aPosition; in vec4 aDisplacementIn;
uniform vec4 uCursor; uniform vec2 uEffectsStrength;
out vec4 tf_disp;
void main(){
  vec2 vel = aDisplacementIn.zw;
  vec2 pos = aPosition + aDisplacementIn.xy;
  vec2 toPos = pos - uCursor.xy;
  float d = length(toPos);
  float s = clamp(1.0 / (1.0 + d / 0.05) - 0.1, 0.0, 1.0);
  vel += uCursor.zw * 0.02 * s * uEffectsStrength.x;
  vel += -aDisplacementIn.xy * 0.1;
  vel += toPos * s * uEffectsStrength.y;
  vel *= 0.90;
  tf_disp = clamp(vec4(aDisplacementIn.xy + vel * 0.1, vel), -1.0, 1.0);
  gl_Position = vec4(0.0);
}`;
const TF_FS = `#version 300 es
precision highp float; out vec4 o; void main(){ o = vec4(0.0); }`;

/* pasada de dibujo: color plano, opacidad desde aPosition.z */
const FLAT_VS = `#version 300 es
precision highp float;
in vec3 aPosition; in vec4 aDisplacementIn;
uniform vec2 uVPRatio; uniform float uDispStrength;
out float vOpacity;
void main(){
  vec2 pos = aPosition.xy + aDisplacementIn.xy * uDispStrength;
  pos *= uVPRatio;
  gl_Position = vec4(pos, 0.5, 1.0);
  vOpacity = 1.0 - aPosition.z;
}`;
const FLAT_FS = `#version 300 es
precision highp float;
uniform vec4 uColor;
in float vOpacity;
out vec4 fragColor;
void main(){ fragColor = vec4(uColor.rgb, uColor.a * clamp(vOpacity, 0.0, 1.0)); }`;

/* pasada de dibujo con máscara: igual, pero la forma sale de una textura alfa
   (así el wordmark del footer se deforma sin necesitar triangular las letras) */
const MASK_VS = `#version 300 es
precision highp float;
in vec3 aPosition; in vec2 aTexCoord; in vec4 aDisplacementIn;
uniform vec2 uVPRatio; uniform float uDispStrength;
out vec2 vUV;
void main(){
  vec2 pos = aPosition.xy + aDisplacementIn.xy * uDispStrength;
  pos *= uVPRatio;
  gl_Position = vec4(pos, 0.5, 1.0);
  vUV = aTexCoord;
}`;
const MASK_FS = `#version 300 es
precision highp float;
uniform sampler2D uMask; uniform vec4 uColor;
in vec2 vUV;
out vec4 fragColor;
void main(){
  float m = texture(uMask, vUV).a;
  if (m < 0.01) discard;
  // salida premultiplicada: con blending aditivo, las 3 pasadas R+G+B suman
  // blanco donde coinciden y dejan flecos de color donde el muelle las separa
  fragColor = vec4(uColor.rgb * m * uColor.a, m * uColor.a);
}`;

export class DispSystem {
  /* basePos: Float32Array vec2 (posición de reposo de cada partícula)
     renderPos: Float32Array vec3 (xy = posición, z → opacidad)
     indices: Uint32Array
     uv: Float32Array vec2 | null (si hay, usa la pasada con máscara) */
  constructor(gl, { basePos, renderPos, indices, uv = null, drag = 0.2, push = 0.2 }) {
    this.gl = gl;
    this.count = basePos.length / 2;
    this.drag = drag; this.push = push;
    this.masked = !!uv;
    this.tf = program(gl, TF_VS, TF_FS, ['tf_disp']);
    this.draw = program(gl, this.masked ? MASK_VS : FLAT_VS, this.masked ? MASK_FS : FLAT_FS);
    this.basePos = buffer(gl, basePos);
    this.renderPos = buffer(gl, renderPos);
    this.uv = uv ? buffer(gl, uv) : null;
    this.idx = buffer(gl, indices, gl.ELEMENT_ARRAY_BUFFER);
    this.idxLen = indices.length;
    const zero = new Float32Array(this.count * 4);
    this.a = buffer(gl, zero, gl.ARRAY_BUFFER, gl.DYNAMIC_COPY);
    this.b = buffer(gl, zero.slice(), gl.ARRAY_BUFFER, gl.DYNAMIC_COPY);
    this.tfo = gl.createTransformFeedback();
  }
  step(cursor) {
    const { gl } = this;
    gl.useProgram(this.tf.p);
    attrib(gl, this.tf.a.aPosition, this.basePos, 2);
    attrib(gl, this.tf.a.aDisplacementIn, this.a, 4);
    gl.uniform4fv(this.tf.u.uCursor, cursor);
    gl.uniform2f(this.tf.u.uEffectsStrength, this.drag, this.push);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.tfo);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.b);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, this.count);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    const t = this.a; this.a = this.b; this.b = t;
  }
  /* passes: [{ dispStrength, color:[r,g,b,a] }] — 3 pasadas RGB con
     desplazamientos distintos = aberración cromática (técnica de la referencia) */
  render(vpRatio, passes, mask = null) {
    const { gl } = this;
    gl.useProgram(this.draw.p);
    attrib(gl, this.draw.a.aPosition, this.renderPos, 3);
    attrib(gl, this.draw.a.aDisplacementIn, this.a, 4);
    if (this.masked) {
      attrib(gl, this.draw.a.aTexCoord, this.uv, 2);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, mask);
      gl.uniform1i(this.draw.u.uMask, 0);
    }
    gl.uniform2f(this.draw.u.uVPRatio, vpRatio[0], vpRatio[1]);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idx);
    for (const q of passes) {
      gl.uniform1f(this.draw.u.uDispStrength, q.dispStrength);
      gl.uniform4f(this.draw.u.uColor, q.color[0], q.color[1], q.color[2], q.color[3]);
      gl.drawElements(gl.TRIANGLES, this.idxLen, gl.UNSIGNED_INT, 0);
    }
  }
}

/* --------------------------------------------------- geometría: anillos */
export function buildRings({ count = 24, maxR = 1.03, thickness = 0.0033 } = {}) {
  const pos2 = [], pos3 = [], idx = [];
  for (let r = 0; r < count; r++) {
    const t = (r + 1) / count;
    const rad = maxR * Math.pow(t, 0.92);
    const segs = Math.max(28, Math.round(rad * 250));
    const fade = 0.10 + 0.55 * Math.pow(t, 1.6);
    const base = pos3.length / 3;
    for (let s = 0; s <= segs; s++) {
      const a = s / segs * Math.PI * 2, cx = Math.cos(a), cy = Math.sin(a);
      for (const off of [-thickness / 2, thickness / 2]) {
        pos2.push(cx * (rad + off), cy * (rad + off));
        pos3.push(cx * (rad + off), cy * (rad + off), fade);
      }
    }
    for (let s = 0; s < segs; s++) { const i = base + s * 2; idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); }
  }
  return { basePos: new Float32Array(pos2), renderPos: new Float32Array(pos3), indices: new Uint32Array(idx) };
}

/* ------------------------------- geometría: rejilla para máscara de texto */
export function buildGrid({ nx = 120, ny = 30, x0 = -1, x1 = 1, y0 = -1, y1 = 1 } = {}) {
  const pos2 = [], pos3 = [], uv = [], idx = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const u = i / nx, v = j / ny;
    const x = lerp(x0, x1, u), y = lerp(y0, y1, v);
    pos2.push(x, y); pos3.push(x, y, 0); uv.push(u, 1 - v);
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  return { basePos: new Float32Array(pos2), renderPos: new Float32Array(pos3), uv: new Float32Array(uv), indices: new Uint32Array(idx) };
}

/* --------------------------------------------------- textura desde canvas */
export function texFromCanvas(gl, c, { flipY = false } = {}) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

/* --------------------------------------- arte procedural para las cards
   (el key-art original es propiedad de terceros; genero sustituto con la
   paleta medida de cada slide) */
export function slideArt(i, W = 1024, plain = false) {
  const H = Math.round(W * 0.6);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const [r1, g1, b1] = hex(SLIDES[i].c2).map(v => v * 255);
  const [r2, g2, b2] = hex(SLIDES[i].c1).map(v => v * 255);
  const g = x.createLinearGradient(0, H, W, 0);
  g.addColorStop(0, `rgb(${r1 * .35},${g1 * .35},${b1 * .35})`);
  g.addColorStop(.55, `rgb(${r1},${g1},${b1})`);
  g.addColorStop(1, `rgb(${r2},${g2},${b2})`);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let k = 0; k < 22; k++) {
    const rad = 40 + (k * 97 % 260), px = (k * 173) % W, py = (k * 311) % H;
    const rg = x.createRadialGradient(px, py, 0, px, py, rad);
    rg.addColorStop(0, `rgba(255,255,255,${0.03 + (k % 5) * 0.012})`);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = rg; x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill();
  }
  x.strokeStyle = 'rgba(255,255,255,.10)'; x.lineWidth = 1.2;
  for (let k = -8; k <= 20; k++) { x.beginPath(); x.moveTo(W * .5 + k * 40, H * .58); x.lineTo(W * .5 + k * 150, H); x.stroke(); }
  for (let k = 0; k < 9; k++) { const yy = H * .58 + Math.pow(k / 9, 2.1) * H * .42; x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
  const v = x.createLinearGradient(0, H * .45, 0, H);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.62)');
  x.fillStyle = v; x.fillRect(0, 0, W, H);
  if (!plain) {   // marco y número: solo para las cards del carrusel
    x.fillStyle = 'rgba(255,255,255,.93)';
    x.font = `600 ${Math.round(W * .052)}px 'DM Mono', monospace`;
    x.fillText(String(i + 1).padStart(2, '0'), W * .055, H * .13);
    x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = 3;
    x.strokeRect(W * .035, H * .05, W * .93, H * .9);
  }
  return c;
}
