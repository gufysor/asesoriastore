/* =====================================================================
   ui.js — modal flotante, páginas reales (/asesorias, /descuentos,
   /cuentas, /productos, /login) y compra por WhatsApp (solo en el modal).
   Las páginas usan History API: cada sección tiene su propia URL y el nav
   fijo queda visible; el logo vuelve al main.
   ===================================================================== */
import { CONTENT } from './core.js';

/* ------------------------------------------------------------ WhatsApp */
export function waLink(text) {
  return `https://wa.me/${CONTENT.whatsapp}?text=${encodeURIComponent(text)}`;
}
export function buyMsg(name, price) {
  return `Hola ${CONTENT.brand} 👋, me interesa *${name}*${price ? ` (${price})` : ''}. ¿Me pueden dar más información?`;
}

/* ------------------------------------------------------------ modal */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FRAME = '<i class="gf-t"></i><i class="gf-r"></i><i class="gf-b"></i><i class="gf-l"></i>';
let modalRoot = null;
function ensureModal() {
  if (modalRoot) return modalRoot;
  modalRoot = document.createElement('div');
  modalRoot.id = 'modal-root';
  modalRoot.innerHTML = `<div class="m-scrim"></div><div class="m-card" role="dialog"></div>`;
  document.body.appendChild(modalRoot);
  modalRoot.querySelector('.m-scrim').onclick = closeModal;
  addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  return modalRoot;
}
export function closeModal() { if (modalRoot) modalRoot.classList.remove('on'); }
export function openModal({ name, cat, tags = [], price, oldPrice, desc, img, buyLabel = 'Comprar por WhatsApp' }) {
  const root = ensureModal();
  const pct = discountPct({ price, oldPrice });
  const card = root.querySelector('.m-card');
  card.className = 'm-card gf gf-on';          // marco degradado completo = estado "elegido"
  card.innerHTML = `
    ${FRAME}
    <button class="m-x" aria-label="Cerrar">✕</button>
    <div class="m-img ph">${pct ? `<span class="st-badge">-${pct}%</span>` : ''}${img ? `<img src="${esc(img)}" alt="">` : `<span>${esc(name).slice(0, 2)}</span>`}</div>
    <div class="m-body">
      ${cat ? `<span class="m-cat">${esc(cat)}</span>` : ''}
      <h3>${esc(name)}</h3>
      ${tags.length ? `<div class="m-tags">${tags.map(t => `<i>${esc(t)}</i>`).join('')}</div>` : ''}
      <p>${esc(desc)}</p>
      <div class="m-foot">
        <span>${price ? `<b class="m-price">${esc(price)}</b>` : ''}${pct ? `<s class="m-old">${esc(oldPrice)}</s>` : ''}</span>
        <a class="m-buy" target="_blank" rel="noopener" href="${waLink(buyMsg(name, price))}">${esc(buyLabel)}</a>
      </div>
    </div>`;
  root.querySelector('.m-x').onclick = closeModal;
  root.classList.add('on');
}
export const openProduct = p => openModal(p);

/* ------------------------------------------------------------ páginas */
const pageRoot = () => document.getElementById('page-root');
const ROUTES = ['asesorias', 'descuentos', 'cuentas', 'productos', 'login'];
/* acento de la cabecera por página (colores de los slides del hero) */
const ACCENT = { asesorias: '#26610d', descuentos: '#0086ff', cuentas: '#488434', productos: '#3e6674', login: '#0086ff' };

/* % de descuento calculado de precio anterior vs actual (si ambos son números) */
const num = s => { const m = String(s || '').replace(',', '.').match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : null; };
export function discountPct(p) {
  const a = num(p.oldPrice), b = num(p.price);
  return (a && b && a > b) ? Math.round((1 - b / a) * 100) : null;
}

function heroBand(key, title, intro = '') {
  return `<div class="pg-hero" style="--pgc:${ACCENT[key] || '#0244f5'}">
    <p class="pg-eyebrow">${esc(CONTENT.brand)}</p>
    <h1 class="pg-title">${esc(title)}</h1>
    ${intro ? `<p class="pg-intro">${esc(intro)}</p>` : ''}
  </div>`;
}

/* fila editorial con espacio real para la imagen */
function itemRow(it) {
  return `<article class="pg-item" data-name="${esc(it.name)}">
    <div class="pg-media ph gf">${FRAME}${it.img ? `<img src="${esc(it.img)}" alt="">` : `<span>${esc(it.name).slice(0, 2)}</span>`}</div>
    <div class="pg-txt"><h4>${esc(it.name)}</h4><p>${esc(it.desc)}</p>
      <div class="pg-row"><b class="pg-price">${esc(it.price || '')}</b><span class="pg-go">Ver ▶</span></div>
    </div>
  </article>`;
}

function renderSimplePage(key) {
  const pg = (CONTENT.pages || {})[key] || { title: key, intro: '', items: [] };
  const items = pg.items || [];
  return heroBand(key, pg.title, pg.intro) + `
    <div class="pg-body">
      <div class="pg-list">${items.length ? items.map(itemRow).join('')
        : '<p class="pg-empty">Aún no hay ítems aquí.</p>'}</div>
    </div>`;
}

function productCard(p) {
  const pct = discountPct(p);
  return `<article class="st-card gf" data-id="${esc(p.id)}">
    ${FRAME}
    <div class="st-thumb ph">${pct ? `<span class="st-badge">-${pct}%</span>` : ''}${p.img ? `<img src="${esc(p.img)}" alt="">` : `<span>${esc(p.name).slice(0, 2)}</span>`}</div>
    <div class="st-meta">
      <span class="st-cat">${esc(p.cat)}</span>
      <h4>${esc(p.name)}</h4>
      <div class="st-tags">${(p.tags || []).map(t => `<i>${esc(t)}</i>`).join('')}</div>
      <div class="st-row">
        <span class="st-prices"><b>${esc(p.price || '')}</b>${pct ? `<s class="st-old">${esc(p.oldPrice)}</s>` : ''}</span>
        <span>Ver ▶</span>
      </div>
    </div>
  </article>`;
}

function renderStore(filterCat = 'Todos') {
  const prods = CONTENT.products || [];
  const cats = ['Todos', ...new Set(prods.map(p => p.cat))];
  const pinned = prods.filter(p => p.pinned).slice(0, 4);
  const list = prods.filter(p => filterCat === 'Todos' || p.cat === filterCat);
  return heroBand('productos', 'Productos', 'Todo lo que tenemos, con categorías y etiquetas. Toca cualquier producto para ver su detalle.') + `
    <div class="pg-body">
      ${pinned.length ? `<h2 class="st-sub">Fijados</h2>
      <div class="st-pinned">${pinned.map(productCard).join('')}</div>` : ''}
      <h2 class="st-sub">Catálogo</h2>
      <div class="st-filters">${cats.map(c =>
        `<button class="st-f${c === filterCat ? ' on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="pg-grid">${list.length ? list.map(productCard).join('')
        : '<p class="pg-empty">No hay productos en esta categoría todavía.</p>'}</div>
    </div>`;
}

function renderLogin() {
  return heroBand('login', 'Administración', 'Acceso solo para el administrador.') + `
    <div class="pg-body">
      <div class="lg-box">
        <input id="lg-pass" type="password" placeholder="Contraseña" autocomplete="current-password">
        <button id="lg-go">Entrar</button>
        <p id="lg-err" class="lg-err"></p>
      </div>
    </div>`;
}

export function openPage(key) {
  if (!ROUTES.includes(key)) return closePage();
  const root = pageRoot();
  root.innerHTML = key === 'productos' ? renderStore()
    : key === 'login' ? renderLogin()
    : renderSimplePage(key);
  root.classList.add('on');
  document.body.classList.add('page-open');
  root.scrollTop = 0;
  bindPage(root, key);
  document.dispatchEvent(new CustomEvent('guf-route'));
}
export function closePage() {
  const root = pageRoot();
  root.classList.remove('on');
  document.body.classList.remove('page-open');
  document.dispatchEvent(new CustomEvent('guf-route'));
}
/* navegación con URL real */
export function go(path) {
  history.pushState({}, '', path);
  route();
}

function bindPage(root, key) {
  root.querySelectorAll('.pg-item').forEach(el => el.onclick = () => {
    const pg = (CONTENT.pages || {})[key];
    const it = (pg.items || []).find(i => i.name === el.dataset.name);
    if (it) openModal({ ...it, cat: pg.title });
  });
  root.querySelectorAll('.st-card').forEach(el => el.onclick = () => {
    const p = (CONTENT.products || []).find(x => x.id === el.dataset.id);
    if (p) openProduct(p);
  });
  root.querySelectorAll('.st-f').forEach(b => b.onclick = e => {
    e.stopPropagation();
    root.innerHTML = renderStore(b.dataset.cat);
    bindPage(root, key);
  });
  const goBtn = root.querySelector('#lg-go');
  if (goBtn) {
    const doLogin = async () => {
      const pass = root.querySelector('#lg-pass').value;
      const err = root.querySelector('#lg-err');
      try {
        const r = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ pass }) });
        if (!r.ok) { err.textContent = 'Contraseña incorrecta.'; return; }
        const { token } = await r.json();
        sessionStorage.setItem('guf-token', token);
        err.textContent = '';
        go('/');
        document.dispatchEvent(new CustomEvent('guf-admin-on'));
      } catch (e) { err.textContent = 'El servidor no tiene la API activa (hosting estático).'; }
    };
    goBtn.onclick = doLogin;
    root.querySelector('#lg-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  }
}

/* ------------------------------------------------------------ router */
function route() {
  const p = location.pathname.replace(/\/+$/, '') || '/';
  let key = null;
  if (p === '/') {
    const m = location.hash.match(/^#\/([a-z]+)/);   // compatibilidad con #/ruta
    key = m ? m[1] : null;
  } else key = p.slice(1).toLowerCase();
  if (key && ROUTES.includes(key)) openPage(key); else closePage();
}
addEventListener('popstate', route);
addEventListener('hashchange', route);
route();
