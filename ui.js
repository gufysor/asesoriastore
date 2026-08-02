/* =====================================================================
   ui.js — modal flotante, páginas dedicadas (#/asesorias, #/descuentos,
   #/cuentas, #/productos, #/login) y compra por WhatsApp.
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
export function openModal({ name, cat, tags = [], price, desc, img, buyLabel = 'Comprar por WhatsApp' }) {
  const root = ensureModal();
  root.querySelector('.m-card').innerHTML = `
    <button class="m-x" aria-label="Cerrar">✕</button>
    <div class="m-img">${img ? `<img src="${esc(img)}" alt="">` : `<span>${esc(name).slice(0, 2)}</span>`}</div>
    <div class="m-body">
      ${cat ? `<span class="m-cat">${esc(cat)}</span>` : ''}
      <h3>${esc(name)}</h3>
      ${tags.length ? `<div class="m-tags">${tags.map(t => `<i>${esc(t)}</i>`).join('')}</div>` : ''}
      <p>${esc(desc)}</p>
      <div class="m-foot">
        ${price ? `<b class="m-price">${esc(price)}</b>` : ''}
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

function itemCard(it) {
  return `<article class="pg-item" data-name="${esc(it.name)}">
    <div class="pg-thumb">${it.img ? `<img src="${esc(it.img)}" alt="">` : `<span>${esc(it.name).slice(0, 2)}</span>`}</div>
    <h4>${esc(it.name)}</h4>
    <p>${esc(it.desc)}</p>
    <div class="pg-row"><b>${esc(it.price || '')}</b><button class="pg-more">Ver</button></div>
  </article>`;
}

function renderSimplePage(key) {
  const pg = (CONTENT.pages || {})[key] || { title: key, intro: '', items: [] };
  return `
    <header class="pg-head"><button class="pg-back" aria-label="Volver">←</button>
      <span class="pg-brand">${esc(CONTENT.brand)}</span></header>
    <h1 class="pg-title">${esc(pg.title)}</h1>
    <p class="pg-intro">${esc(pg.intro)}</p>
    <div class="pg-grid">${(pg.items || []).map(itemCard).join('')}</div>
    <a class="pg-cta" target="_blank" rel="noopener"
       href="${waLink(`Hola ${CONTENT.brand} 👋, quiero información sobre ${pg.title}.`)}">Consultar por WhatsApp</a>`;
}

function productCard(p) {
  return `<article class="st-card" data-id="${esc(p.id)}">
    <div class="st-thumb">${p.img ? `<img src="${esc(p.img)}" alt="">` : `<span>${esc(p.name).slice(0, 2)}</span>`}</div>
    <span class="st-cat">${esc(p.cat)}</span>
    <h4>${esc(p.name)}</h4>
    <div class="st-tags">${(p.tags || []).map(t => `<i>${esc(t)}</i>`).join('')}</div>
    <div class="pg-row"><b>${esc(p.price || '')}</b><button class="pg-more">Ver</button></div>
  </article>`;
}

function renderStore(filterCat = 'Todos') {
  const prods = CONTENT.products || [];
  const cats = ['Todos', ...new Set(prods.map(p => p.cat))];
  const pinned = prods.filter(p => p.pinned).slice(0, 4);
  const list = prods.filter(p => filterCat === 'Todos' || p.cat === filterCat);
  return `
    <header class="pg-head"><button class="pg-back" aria-label="Volver">←</button>
      <span class="pg-brand">${esc(CONTENT.brand)}</span></header>
    <h1 class="pg-title">Productos</h1>
    ${pinned.length ? `<h2 class="st-sub">⭐ Fijados</h2>
    <div class="st-pinned">${pinned.map(productCard).join('')}</div>` : ''}
    <h2 class="st-sub">Catálogo</h2>
    <div class="st-filters">${cats.map(c =>
      `<button class="st-f${c === filterCat ? ' on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="pg-grid">${list.map(productCard).join('')}</div>`;
}

function renderLogin() {
  return `
    <header class="pg-head"><button class="pg-back" aria-label="Volver">←</button>
      <span class="pg-brand">${esc(CONTENT.brand)}</span></header>
    <div class="lg-box">
      <h1 class="pg-title" style="font-size:56px">Administración</h1>
      <p class="pg-intro">Acceso solo para el administrador.</p>
      <input id="lg-pass" type="password" placeholder="Contraseña" autocomplete="current-password">
      <button id="lg-go">Entrar</button>
      <p id="lg-err" class="lg-err"></p>
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
}
export function closePage() {
  const root = pageRoot();
  root.classList.remove('on');
  document.body.classList.remove('page-open');
  if (location.hash && location.hash !== '#/') history.pushState('', '', location.pathname);
}

function bindPage(root, key) {
  root.querySelector('.pg-back').onclick = closePage;
  // items de páginas simples → modal
  root.querySelectorAll('.pg-item').forEach(el => el.onclick = () => {
    const pg = (CONTENT.pages || {})[key];
    const it = (pg.items || []).find(i => i.name === el.dataset.name);
    if (it) openModal({ ...it, cat: pg.title });
  });
  // productos → modal
  root.querySelectorAll('.st-card').forEach(el => el.onclick = () => {
    const p = (CONTENT.products || []).find(x => x.id === el.dataset.id);
    if (p) openProduct(p);
  });
  // filtros de la tienda
  root.querySelectorAll('.st-f').forEach(b => b.onclick = e => {
    e.stopPropagation();
    root.innerHTML = renderStore(b.dataset.cat);
    bindPage(root, key);
  });
  // login
  const go = root.querySelector('#lg-go');
  if (go) {
    const doLogin = async () => {
      const pass = root.querySelector('#lg-pass').value;
      const err = root.querySelector('#lg-err');
      try {
        const r = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ pass }) });
        if (!r.ok) { err.textContent = 'Contraseña incorrecta.'; return; }
        const { token } = await r.json();
        sessionStorage.setItem('guf-token', token);
        err.textContent = '';
        closePage();
        document.dispatchEvent(new CustomEvent('guf-admin-on'));
      } catch (e) { err.textContent = 'El servidor no tiene la API activa (hosting estático).'; }
    };
    go.onclick = doLogin;
    root.querySelector('#lg-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  }
}

/* ------------------------------------------------------------ router */
function route() {
  const m = location.hash.match(/^#\/([a-z]+)/);
  if (m) openPage(m[1]); else closePage();
}
addEventListener('hashchange', route);
route();
