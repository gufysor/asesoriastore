/* =====================================================================
   page.js — comportamientos DOM + bucle maestro de render.
   Todo el contenido visible sale de CONTENT (data.json), editable por el
   administrador desde /#/login.
   ===================================================================== */
import { APP, CONTENT, SLIDES, slideArt, lerp, clamp } from './core.js';
import { drawBG } from './bg.js';
import { drawHero, S as HERO } from './hero.js';
import { drawFooter } from './footer.js';
import { openModal, openProduct, waLink, buyMsg } from './ui.js';
import './admin.js';

/* ------------------------------------------------------------ marca */
document.title = CONTENT.brand;
const logo = document.querySelector('.logo');
if (logo) logo.textContent = CONTENT.brand;

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

/* ------------------------------------------------------------ hero → modal */
document.querySelector('.launch')?.addEventListener('click', () => {
  const s = SLIDES[HERO.index];
  openModal({ name: s.name, cat: s.cat, desc: s.desc, buyLabel: 'Consultar por WhatsApp' });
});

/* ------------------------------------------------------------ sección Derecho */
const SPOT = CONTENT.spotlight || {};
const put = (sel, txt) => { const e = document.querySelector(sel); if (e && txt) e.textContent = txt; };
put('.lockup b', SPOT.lockup1 || CONTENT.brand);
put('.lockup i', SPOT.lockup2);
put('.spot h2', SPOT.title);
const bodyPs = document.querySelectorAll('.spot .body p');
[SPOT.p1, SPOT.p2, SPOT.p3].forEach((t, i) => { if (bodyPs[i] && t) bodyPs[i].innerHTML = i === 2 ? `<strong></strong>` : ''; if (bodyPs[i] && t) (i === 2 ? bodyPs[i].querySelector('strong') : bodyPs[i]).textContent = t; });
const ctas = document.querySelectorAll('.spotcol .cta .pill');
if (ctas[0]) {
  ctas[0].textContent = SPOT.btn1 || 'Consultar';
  ctas[0].href = waLink(`Hola ${CONTENT.brand} 👋, quiero orientación en derecho sobre mi caso.`);
  ctas[0].target = '_blank';
}
if (ctas[1]) {
  ctas[1].textContent = SPOT.btn2 || 'Cómo trabajamos';
  ctas[1].addEventListener('click', e => {
    e.preventDefault();
    openModal({
      name: SPOT.title || 'Orientación en derecho', cat: 'DERECHO',
      desc: `${SPOT.p1 || ''}\n\n${SPOT.p2 || ''}`, buyLabel: 'Consultar por WhatsApp',
    });
  });
}
/* producto individual al costado (elegible por el admin) */
const spotProd = (CONTENT.products || []).find(p => p.id === SPOT.productId) || (CONTENT.products || [])[0];
if (spotProd) {
  put('.spotmeta h3', spotProd.name);
  put('.spotmeta p', spotProd.desc);
  const b = document.querySelector('.spotmeta .pill');
  if (b) { b.textContent = 'Ver producto'; b.addEventListener('click', e => { e.preventDefault(); openProduct(spotProd); }); }
  document.querySelector('.spotcard')?.addEventListener('click', () => openProduct(spotProd));
}
/* imagen de la card de Derecho: la del producto o cuadrado plomo oscuro */
const shot = document.getElementById('spot-shot');
if (shot) {
  if (spotProd && spotProd.img) shot.src = spotProd.img;
  else {
    const box = shot.parentElement;
    shot.remove();
    box.classList.add('ph-dark');
    box.insertAdjacentHTML('beforeend',
      `<span class="ph-i" style="font-size:150px">${(spotProd ? spotProd.name : 'GUF').slice(0, 2)}</span>`);
  }
}

/* ------------------------------------------------------------ destacados */
const FEATURED = (CONTENT.products || []).filter(p => p.featured);
const grid = document.getElementById('appgrid');
FEATURED.forEach((p, i) => {
  const el = document.createElement('a');
  el.href = '#';
  el.className = 'appcard' + (i === 0 ? ' feature' : '');
  el.innerHTML = `
    ${p.img ? '' : `<span class="ph-i">${p.name.slice(0, 2)}</span>`}
    <span class="appcat">${p.cat}</span>
    <span class="appmeta">
      <span class="appname">${p.name}</span>
      <span class="appdesc">${p.price || ''}</span>
    </span>
    <i class="bt"></i><i class="br"></i><i class="bb"></i><i class="bl"></i>`;
  // sin imagen: cuadrado plomo oscuro con inicial fantasma (texto blanco legible)
  if (p.img) el.style.backgroundImage = `url(${p.img})`;
  else el.classList.add('ph-dark');
  el.addEventListener('click', e => { e.preventDefault(); if (Math.abs(grid.scrollLeft - gL) <= 6) openProduct(p); });
  grid.appendChild(el);
});

/* arrastre horizontal del grid */
let gDrag = false, gX = 0, gL = 0;
grid.addEventListener('pointerdown', e => { gDrag = true; gX = e.clientX; gL = grid.scrollLeft; grid.setPointerCapture(e.pointerId); grid.classList.add('grabbing'); });
grid.addEventListener('pointermove', e => { if (gDrag) grid.scrollLeft = gL - (e.clientX - gX); });
const endDrag = () => { gDrag = false; grid.classList.remove('grabbing'); };
grid.addEventListener('pointerup', endDrag);
grid.addEventListener('pointercancel', endDrag);

/* ------------------------------------------------------------ background cards */
document.querySelectorAll('.bgcard .inner').forEach((inner, i) => {
  const img = new Image();
  img.alt = '';
  img.src = slideArt([3, 1][i] ?? i, 620, true).toDataURL('image/jpeg', 0.85);
  inner.appendChild(img);
});

/* ------------------------------------------------------------ menús del nav
   Hover: abre el panel desplegable. Click: va a la página dedicada. */
const navEl = document.getElementById('nav');
const navLinks = [...document.querySelectorAll('.links a[data-menu]')];
const panels = [...document.querySelectorAll('.menu')];
let openMenu = null, menuTimer = null;

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
navLinks.forEach(a => {
  a.addEventListener('mouseenter', () => { clearTimeout(menuTimer); setMenu(a.dataset.menu); });
  a.addEventListener('mouseleave', () => { menuTimer = setTimeout(() => setMenu(null), 350); });
  a.addEventListener('click', e => { e.preventDefault(); setMenu(null); location.hash = '#/' + a.dataset.menu; });
});
panels.forEach(p => {
  p.addEventListener('mouseenter', () => clearTimeout(menuTimer));
  p.addEventListener('mouseleave', () => { menuTimer = setTimeout(() => setMenu(null), 350); });
});
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(null); });

/* ------------------------------------------------------------ franja del footer */
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
    x.transform(1, (i % 2 ? -1 : 1) * 0.045, 0, 1, 0, 0);
    x.drawImage(art, -w / 2, -c.height / 2 - 20, w, c.height + 40);
    x.restore();
    px += w - 8; i++;
  }
  const v = x.createLinearGradient(0, 0, 0, c.height);
  v.addColorStop(0, 'rgba(0,20,60,.55)'); v.addColorStop(.5, 'rgba(0,10,40,.15)'); v.addColorStop(1, 'rgba(0,0,30,.5)');
  x.fillStyle = v; x.fillRect(0, 0, c.width, c.height);
  stripImg.src = c.toDataURL('image/jpeg', 0.85);
}

/* ------------------------------------------------------------ footer dinámico */
const F = CONTENT.footer || {};
const fcols = document.querySelectorAll('.fcol');
[['col1', 0], ['col2', 1], ['col3', 2]].forEach(([k, i]) => {
  const col = fcols[i]; if (!col) return;
  const t = F[k + 'Title'], links = F[k + 'Links'] || [];
  if (t) col.querySelector('h3').textContent = t;
  if (links.length) {
    col.querySelectorAll('a').forEach(a => a.remove());
    links.forEach(txt => {
      const a = document.createElement('a');
      a.textContent = txt;
      const low = txt.toLowerCase();
      if (/whatsapp|\+51/.test(low)) { a.href = waLink(`Hola ${CONTENT.brand} 👋, quiero información.`); a.target = '_blank'; }
      else if (/asesor/.test(low)) a.href = '#/asesorias';
      else if (/descuento/.test(low)) a.href = '#/descuentos';
      else if (/cuenta/.test(low)) a.href = '#/cuentas';
      else if (/producto/.test(low)) a.href = '#/productos';
      else {
        a.href = '#';
        a.addEventListener('click', e => {
          e.preventDefault();
          openModal({ name: txt, cat: F[k + 'Title'] || '', desc: `Escríbenos por WhatsApp y te contamos sobre "${txt}".`, buyLabel: 'Abrir WhatsApp' });
        });
      }
      col.appendChild(a);
    });
  }
});
const legal = document.querySelector('.legal span');
if (legal && F.legal) legal.textContent = F.legal;

/* ------------------------------------------------------------ marquesinas */
const WORDS = (CONTENT.marquee || []).length ? CONTENT.marquee : ['GUF'];
const rows = [...document.querySelectorAll('.mq-track')];
rows.forEach((track, r) => {
  const items = [];
  const n = Math.max(10, WORDS.length);
  for (let k = 0; k < n; k++) {
    const w = WORDS[(k + r * 3) % WORDS.length];
    const art = slideArt((k + r) % SLIDES.length, 190, true);
    items.push(`<span class="mq-item" data-w="${w}"><span class="mq-word">${w}</span><img class="mq-thumb" alt="" src="${art.toDataURL('image/jpeg', 0.8)}"></span>`);
  }
  track.innerHTML = items.join('') + items.join('');
  track.dataset.dir = r % 2 ? '1' : '-1';
  track.querySelectorAll('.mq-item').forEach(el => el.addEventListener('click', () => {
    openModal({
      name: el.dataset.w, cat: 'GUF CORPORATION',
      desc: `¿Buscas ${el.dataset.w.toLowerCase()}? Escríbenos y te ayudamos con eso.`,
      buyLabel: 'Consultar por WhatsApp',
    });
  }));
});
/* cinta por tiempo: 183 px/s medidos de la referencia */
const MQ_SPEED = 183;
let mqPos = rows.map(() => 0);

/* botón browse → tienda */
const browse = document.querySelector('.browse');
if (browse) { browse.textContent = 'Ver todos los productos'; browse.href = '#/productos'; }
const seeall = document.querySelector('.seeall');
if (seeall) seeall.href = '#/productos';
const headLink = document.querySelector('.apps .head a');
if (headLink) headLink.href = '#/productos';

/* ------------------------------------------------------------ reveals */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(e => io.observe(e));

/* ------------------------------------------------------------ scroll */
const bgLeft = document.querySelector('.bgcard.left');
const bgRight = document.querySelector('.bgcard.right');
let lastNavY = 0;
function onScroll() {
  APP.scroll = scrollY;
  APP.heroProgress = clamp(scrollY / innerHeight, 0, 1);
  const dy = scrollY - lastNavY;
  if (openMenu || scrollY <= 120 || dy < -2) navEl.classList.remove('hidden');
  else if (dy > 2) navEl.classList.add('hidden');
  lastNavY = scrollY;
  updateNavBg();
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
