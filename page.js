/* =====================================================================
   page.js — comportamientos DOM + bucle maestro de render.
     · preloader
     · marquesinas scroll-driven  (medido: ≈ −0.85 px por px de scroll,
       con suavizado; de ahí el jitter en las mediciones)
     · grid de apps con desborde horizontal y arrastre
     · reveals al entrar en viewport
   ===================================================================== */
import { APP, SLIDES, slideArt, lerp, clamp } from './core.js';
import { drawBG } from './bg.js';
import { drawHero, S as HERO } from './hero.js';
import { drawFooter } from './footer.js';

/* ------------------------------------------------------------ preloader */
const pre = document.getElementById('pre');
function dismissPre() {
  if (!pre || pre.dataset.done) return;
  pre.dataset.done = '1';
  pre.classList.add('gone');
  APP.ready = true;
  setTimeout(() => pre.remove(), 1100);
}
const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
Promise.all([fontsReady, new Promise(r => setTimeout(r, 1400))]).then(dismissPre);
setTimeout(dismissPre, 5000);   // red de seguridad

/* ------------------------------------------------------------ apps del grid */
/* orden medido en la referencia (flujo por columnas, destacada 2×2 en medio) */
const APPS = [
  { name: 'OTHERSIDE',      cat: 'GAMES',                 desc: 'Web3-enabled virtual worlds on ApeChain' },
  { name: 'CAMELOT',        cat: 'FINANCE',               desc: 'Decentralized exchange' },
  { name: 'MADE BY APES',   cat: 'INTELLECTUAL PROPERTY', desc: 'A club full of builders' },
  { name: 'APE PORTAL',     cat: 'INFRASTRUCTURE',        desc: 'Get on ApeChain' },
  { name: 'BLEVER',         cat: 'COLLECTIBLES',          desc: 'An NFT launchpad for ApeChain', feature: true },
  { name: 'APE EXPRESS',    cat: 'FINANCE',               desc: 'The ultimate launchpad experience' },
  { name: 'CLUTCH MARKETS', cat: 'GAMES, FINANCE',        desc: 'Decentralized parlay platform' },
  { name: 'APESCAN',        cat: 'INFRASTRUCTURE',        desc: 'The ApeChain block explorer' },
  { name: 'GTRADE',         cat: 'FINANCE',               desc: 'Decentralized leveraged trading' },
  { name: 'OPENOCEAN',      cat: 'FINANCE',               desc: 'DEX aggregator on ApeChain' },
  { name: 'CYAN',           cat: 'FINANCE',               desc: 'BNPL for NFTs' },
  { name: 'MINTPAD',        cat: 'COLLECTIBLES',          desc: 'Create and mint on ApeChain' },
];

const grid = document.getElementById('appgrid');
APPS.forEach((a, i) => {
  const el = document.createElement('a');
  el.href = '#';
  el.className = 'appcard' + (a.feature ? ' feature' : '');
  const art = slideArt(i % SLIDES.length, a.feature ? 900 : 560);
  el.innerHTML = `
    <span class="appcat">${a.cat}</span>
    <span class="appmeta">
      <span class="appname">${a.name}</span>
      <span class="appdesc">${a.desc}</span>
    </span>
    <i class="bt"></i><i class="br"></i><i class="bb"></i><i class="bl"></i>`;
  el.style.backgroundImage = `url(${art.toDataURL('image/jpeg', 0.86)})`;
  grid.appendChild(el);
});

/* arrastre horizontal del grid (desborda a la derecha, como la referencia) */
let gDrag = false, gX = 0, gL = 0;
grid.addEventListener('pointerdown', e => { gDrag = true; gX = e.clientX; gL = grid.scrollLeft; grid.setPointerCapture(e.pointerId); grid.classList.add('grabbing'); });
grid.addEventListener('pointermove', e => { if (gDrag) grid.scrollLeft = gL - (e.clientX - gX); });
const endDrag = () => { gDrag = false; grid.classList.remove('grabbing'); };
grid.addEventListener('pointerup', endDrag);
grid.addEventListener('pointercancel', endDrag);
grid.addEventListener('click', e => { if (Math.abs(grid.scrollLeft - gL) > 6) e.preventDefault(); });

/* ------------------------------------------------------------ background cards */
document.querySelectorAll('.bgcard .inner').forEach((inner, i) => {
  const img = new Image();
  img.alt = '';
  // arte sin marco ni número: si no, el rectángulo lee como un bloque duro
  img.src = slideArt([3, 1][i] ?? i, 620, true).toDataURL('image/jpeg', 0.85);
  inner.appendChild(img);
});

/* ------------------------------------------------------------ menús del nav
   Medido: cada item abre un panel azul a ancho completo bajo el nav; el resto
   de la página queda tras el velo blur(60px). Click en el mismo item, fuera
   del panel o Escape lo cierra. */
const navEl = document.getElementById('nav');
const navLinks = [...document.querySelectorAll('.links a[data-menu]')];
const panels = [...document.querySelectorAll('.menu')];
let openMenu = null;

/* fondo del nav: transparente sobre el hero → negro al bajar; azul con menú */
function updateNavBg() {
  if (openMenu) { navEl.style.backgroundColor = '#0244f5'; return; }
  const a = clamp(scrollY / 700, 0, 1);
  navEl.style.backgroundColor = `rgba(0,0,0,${a.toFixed(3)})`;
}
function setMenu(name) {
  openMenu = name;
  document.body.classList.toggle('menu-open', !!name);
  navEl.classList.toggle('open', !!name);
  navLinks.forEach(a => a.classList.toggle('active', a.dataset.menu === name));
  panels.forEach(p => p.classList.toggle('on', p.dataset.panel === name));
  updateNavBg();
}
updateNavBg();
navLinks.forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  setMenu(a.dataset.menu === openMenu ? null : a.dataset.menu);
}));
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(null); });
addEventListener('pointerdown', e => {
  if (openMenu && !e.target.closest('.menu') && !e.target.closest('.links')) setMenu(null);
});

/* ------------------------------------------------------------ visual del spotlight */
const shot = document.getElementById('spot-shot');
if (shot) shot.src = slideArt(2, 1100).toDataURL('image/jpeg', 0.9);

/* ------------------------------------------------------------ franja del footer
   La referencia usa UNA sola imagen ancha (footer-bg.webp, 1425×259): un collage
   de vallas/escenas. La compongo como tira única con paneles de la paleta. */
const stripImg = document.getElementById('strip-img');
if (stripImg) {
  const c = document.createElement('canvas'); c.width = 2850; c.height = 518;
  const x = c.getContext('2d');
  let px = 0, i = 0;
  while (px < c.width) {
    const w = 260 + (i * 137 % 240);
    const art = slideArt(i % SLIDES.length, 480, true);
    x.save();
    x.translate(px + w / 2, c.height / 2);
    x.transform(1, (i % 2 ? -1 : 1) * 0.045, 0, 1, 0, 0);   // leve cizalla alterna
    x.drawImage(art, -w / 2, -c.height / 2 - 20, w, c.height + 40);
    x.restore();
    px += w - 8; i++;
  }
  const v = x.createLinearGradient(0, 0, 0, c.height);
  v.addColorStop(0, 'rgba(0,20,60,.55)'); v.addColorStop(.5, 'rgba(0,10,40,.15)'); v.addColorStop(1, 'rgba(0,0,30,.5)');
  x.fillStyle = v; x.fillRect(0, 0, c.width, c.height);
  stripImg.src = c.toDataURL('image/jpeg', 0.85);
}

/* ------------------------------------------------------------ marquesinas */
const CATS = ['FINANCE', 'INTELLECTUAL PROPERTY', 'COLLECTIBLES', 'GAMES', 'INFRASTRUCTURE'];
const rows = [...document.querySelectorAll('.mq-track')];
rows.forEach((track, r) => {
  const items = [];
  for (let k = 0; k < 14; k++) {
    const cat = CATS[(k + r * 2) % CATS.length];
    const art = slideArt((k + r) % SLIDES.length, 190, true);
    items.push(`<span class="mq-item"><span class="mq-word">${cat}</span><img class="mq-thumb" alt="" src="${art.toDataURL('image/jpeg', 0.8)}"></span>`);
  }
  track.innerHTML = items.join('') + items.join('');   // duplicado para el bucle
  track.dataset.dir = r % 2 ? '1' : '-1';
});

/* Velocidad medida con el scroll CONGELADO en 2638: Δx = −94.1 px cada 513 ms,
   perfectamente constante → 183 px/s. La cinta va por tiempo, no por scroll.
   (Mi medición anterior confundía las dos cosas porque muestreaba con esperas
   fijas mientras incrementaba el scroll de forma también fija.) */
const MQ_SPEED = 183;
let mqPos = rows.map(() => 0);

/* ------------------------------------------------------------ reveals */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(e => io.observe(e));

/* ------------------------------------------------------------ scroll */
/* BackgroundCard: cards decorativas grandes con rotación 3D anidada, detrás del
   contenido. Medido en la referencia:
     · izquierda → opacidad 0.2, rotateY scroll-driven de +4.88° a −6.29°
       entre scrollY 300 y 1000  (≈ −0.016°/px)
     · derecha   → opacidad 0.4, rotateY fija en 25°
     · wrapper interno de ambas → rotateY fija ≈ 15.2°
   El difuminado lo consigo con opacidad baja + blur; en la referencia no había
   filtro blur declarado, así que esta parte iguala el aspecto, no el mecanismo. */
const bgLeft = document.querySelector('.bgcard.left');
const bgRight = document.querySelector('.bgcard.right');

let lastNavY = 0;
function onScroll() {
  APP.scroll = scrollY;
  APP.heroProgress = clamp(scrollY / innerHeight, 0, 1);
  /* nav: se oculta bajando, reaparece subiendo (o cerca del top / con menú) */
  const dy = scrollY - lastNavY;
  if (openMenu || scrollY <= 120 || dy < -2) navEl.classList.remove('hidden');
  else if (dy > 2) navEl.classList.add('hidden');
  lastNavY = scrollY;
  updateNavBg();
  /* parallax medido: la card izquierda sube 0.226 px por px de scroll y la
     derecha 0.129. La rotateY de la izquierda va de +4.88° a −6.29° entre
     scrollY 300 y 1000; la de la derecha es fija en 25°. */
  if (bgLeft) {
    const deg = clamp(4.88 - (scrollY - 300) * 0.01596, -12, 10);
    bgLeft.style.transform =
      `translateY(${(-(scrollY - 420) * 0.226).toFixed(1)}px) perspective(1200px) rotateY(${deg.toFixed(2)}deg)`;
  }
  if (bgRight) {
    bgRight.style.transform =
      `translateY(${(-(scrollY - 420) * 0.129).toFixed(1)}px) perspective(1200px) rotateY(25deg)`;
  }
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
onScroll();

/* ------------------------------------------------------------ bucle maestro */
let prev = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000); prev = now;

  drawBG(now);
  drawHero(now);
  drawFooter(now);

  // marquesinas: velocidad constante por tiempo, sin relación con el scroll
  for (let i = 0; i < rows.length; i++) {
    const span = rows[i].scrollWidth / 2 || 1;
    mqPos[i] = (mqPos[i] + (+rows[i].dataset.dir) * MQ_SPEED * dt) % span;
    let x = mqPos[i];
    if (x > 0) x -= span;
    rows[i].style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__hero = { S: HERO, APP };
