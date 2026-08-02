/* =====================================================================
   admin.js — panel del administrador.
   Entra por /#/login (contraseña en data.json → adminPass). Al iniciar
   sesión aparece la barra "✎ Editar" y desde ahí se edita TODO el
   contenido: hero, derecho/spotlight, productos, páginas, cinta y footer.
   Guardar escribe data.json en el servidor y recarga la página.
   ===================================================================== */
import { CONTENT } from './core.js';

const token = () => sessionStorage.getItem('guf-token');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ------------------------------------------------------------ barra */
const bar = document.createElement('div');
bar.id = 'admin-bar';
bar.innerHTML = `<button id="ad-edit">✎ Editar contenido</button><button id="ad-out">Salir</button>`;
document.body.appendChild(bar);
function refreshBar() { document.body.classList.toggle('admin', !!token()); }
refreshBar();
document.addEventListener('guf-admin-on', refreshBar);
bar.querySelector('#ad-out').onclick = () => { sessionStorage.removeItem('guf-token'); refreshBar(); };

/* ------------------------------------------------------------ editor */
const ov = document.createElement('div');
ov.id = 'admin-ov';
document.body.appendChild(ov);
bar.querySelector('#ad-edit').onclick = openEditor;

const TABS = [
  ['general', 'General'], ['hero', 'Hero'], ['spot', 'Derecho'],
  ['products', 'Productos'], ['pages', 'Páginas'], ['marquee', 'Cinta'], ['footer', 'Footer'],
];

/* helpers de formulario: cada input escribe directo en CONTENT al vuelo */
const inp = (obj, key, label, ph = '') =>
  `<label class="ad-f"><span>${esc(label)}</span>
   <input data-path="${key}" value="${esc(obj[key] ?? '')}" placeholder="${esc(ph)}"></label>`;
const ta = (obj, key, label) =>
  `<label class="ad-f"><span>${esc(label)}</span>
   <textarea data-path="${key}" rows="3">${esc(obj[key] ?? '')}</textarea></label>`;

function bindInputs(scope, obj) {
  scope.querySelectorAll('[data-path]').forEach(el => {
    el.oninput = () => { obj[el.dataset.path] = el.value; };
  });
}

function tabGeneral(el) {
  el.innerHTML = `<h3>General</h3>
    ${inp(CONTENT, 'brand', 'Nombre de la marca')}
    ${inp(CONTENT, 'whatsapp', 'WhatsApp (solo dígitos, con código de país)', '51935090264')}
    <p class="ad-note">La contraseña del admin se cambia en el archivo data.json del servidor (campo adminPass).</p>`;
  bindInputs(el, CONTENT);
}

function tabHero(el) {
  el.innerHTML = `<h3>Hero — 5 slides</h3>` + CONTENT.heroSlides.map((s, i) => `
    <fieldset class="ad-card"><legend>Slide ${i + 1}</legend>
      <div data-slide="${i}">
        ${inp(s, 'name', 'Nombre')} ${inp(s, 'cat', 'Etiqueta (chip)')} ${ta(s, 'desc', 'Descripción')}
        ${inp(s, 'c1', 'Color 1 (hex)', '#a37a1f')} ${inp(s, 'c2', 'Color 2 (hex)', '#26610d')}
        ${inp(s, 'img', 'Imagen (URL, opcional — cuando tengas imágenes)')}
      </div>
    </fieldset>`).join('');
  el.querySelectorAll('[data-slide]').forEach(w => bindInputs(w, CONTENT.heroSlides[+w.dataset.slide]));
}

function tabSpot(el) {
  const s = CONTENT.spotlight;
  el.innerHTML = `<h3>Sección Derecho (antes Spotlight)</h3>
    ${inp(s, 'lockup2', 'Etiqueta del sello (2ª palabra)')}
    ${inp(s, 'title', 'Título grande')}
    ${ta(s, 'p1', 'Párrafo 1')} ${ta(s, 'p2', 'Párrafo 2')} ${ta(s, 'p3', 'Párrafo 3 (negrita)')}
    ${inp(s, 'btn1', 'Botón 1')} ${inp(s, 'btn2', 'Botón 2')}
    <label class="ad-f"><span>Producto mostrado al costado</span>
      <select id="ad-spotprod">${(CONTENT.products || []).map(p =>
        `<option value="${esc(p.id)}"${p.id === s.productId ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}
      </select></label>`;
  bindInputs(el, s);
  el.querySelector('#ad-spotprod').onchange = e => { s.productId = e.target.value; };
}

function productRow(p, i) {
  return `<fieldset class="ad-card" data-prod="${i}"><legend>${esc(p.name) || 'Producto'}</legend>
    ${inp(p, 'name', 'Nombre')} ${inp(p, 'cat', 'Categoría')}
    ${inp(p, '_tags', 'Etiquetas (separadas por coma)')}
    ${inp(p, 'price', 'Precio actual')} ${inp(p, 'oldPrice', 'Precio anterior (opcional — muestra el % de descuento)')}
    ${ta(p, 'desc', 'Descripción')}
    ${inp(p, 'img', 'Foto (URL, opcional)')}
    <label class="ad-chk"><input type="checkbox" data-flag="pinned" ${p.pinned ? 'checked' : ''}> Fijado (top 4 de la tienda)</label>
    <label class="ad-chk"><input type="checkbox" data-flag="featured" ${p.featured ? 'checked' : ''}> Destacado (portada)</label>
    <button class="ad-del" data-del="${i}">Eliminar</button>
  </fieldset>`;
}
function tabProducts(el) {
  (CONTENT.products || []).forEach(p => { p._tags = (p.tags || []).join(', '); });
  el.innerHTML = `<h3>Productos</h3>
    <p class="ad-note">“Fijado” = aparece arriba en la tienda (máx. 4). “Destacado” = aparece en la portada.</p>
    <div id="ad-prods">${(CONTENT.products || []).map(productRow).join('')}</div>
    <button id="ad-add" class="ad-add">+ Añadir producto</button>`;
  const wire = () => {
    el.querySelectorAll('[data-prod]').forEach(w => {
      const p = CONTENT.products[+w.dataset.prod];
      bindInputs(w, p);
      w.querySelectorAll('[data-flag]').forEach(c => c.onchange = () => { p[c.dataset.flag] = c.checked; });
    });
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      CONTENT.products.splice(+b.dataset.del, 1); tabProducts(el);
    });
  };
  wire();
  el.querySelector('#ad-add').onclick = () => {
    CONTENT.products.push({ id: 'p' + Date.now(), name: '', cat: '', tags: [], _tags: '', price: '', desc: '', img: '', pinned: false, featured: false });
    tabProducts(el);
  };
}

function pageItems(pg, key) {
  return `<fieldset class="ad-card"><legend>${esc(pg.title)}</legend>
    <div data-page="${key}">${inp(pg, 'title', 'Título')} ${ta(pg, 'intro', 'Introducción')}</div>
    <div class="ad-sub">${(pg.items || []).map((it, j) => `
      <div class="ad-mini" data-pgit="${key}:${j}">
        ${inp(it, 'name', 'Nombre')} ${inp(it, 'price', 'Precio')} ${ta(it, 'desc', 'Descripción')}
        ${inp(it, 'img', 'Foto (URL, opcional)')}
        <button class="ad-del" data-itdel="${key}:${j}">Eliminar</button>
      </div>`).join('')}
    </div>
    <button class="ad-add" data-itadd="${key}">+ Añadir ítem a ${esc(pg.title)}</button>
  </fieldset>`;
}
function tabPages(el) {
  const P = CONTENT.pages || {};
  el.innerHTML = `<h3>Páginas (Asesorías / Descuentos / Cuentas)</h3>` +
    Object.keys(P).map(k => pageItems(P[k], k)).join('');
  el.querySelectorAll('[data-page]').forEach(w => bindInputs(w, P[w.dataset.page]));
  el.querySelectorAll('[data-pgit]').forEach(w => {
    const [k, j] = w.dataset.pgit.split(':'); bindInputs(w, P[k].items[+j]);
  });
  el.querySelectorAll('[data-itdel]').forEach(b => b.onclick = () => {
    const [k, j] = b.dataset.itdel.split(':'); P[k].items.splice(+j, 1); tabPages(el);
  });
  el.querySelectorAll('[data-itadd]').forEach(b => b.onclick = () => {
    P[b.dataset.itadd].items.push({ name: '', price: '', desc: '' }); tabPages(el);
  });
}

function tabMarquee(el) {
  el.innerHTML = `<h3>Cinta giratoria</h3>
    <p class="ad-note">Una palabra o frase por línea. Son las cosas que hace GUF.</p>
    <textarea id="ad-mq" rows="12">${esc((CONTENT.marquee || []).join('\n'))}</textarea>`;
  el.querySelector('#ad-mq').oninput = e => {
    CONTENT.marquee = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
  };
}

function tabFooter(el) {
  const f = CONTENT.footer;
  const links = (k) => `<label class="ad-f"><span>Links (uno por línea)</span>
    <textarea data-links="${k}" rows="4">${esc((f[k] || []).join('\n'))}</textarea></label>`;
  el.innerHTML = `<h3>Footer — información de GUF</h3>
    <p class="ad-note">Links: escribe "Texto|https://direccion" para que sea un enlace
    (correo: "Texto|mailto:correo@gmail.com"). Un texto sin "|" queda como informativo, sin click.</p>
    ${inp(f, 'c1', 'Color 1 del fondo del footer (hex)', '#3b1470')}
    ${inp(f, 'c2', 'Color 2 del fondo del footer (hex)', '#7a29c9')}
    ${inp(f, 'col1Title', 'Columna 1 — título')} ${links('col1Links')}
    ${inp(f, 'col2Title', 'Columna 2 — título')} ${links('col2Links')}
    ${inp(f, 'col3Title', 'Columna 3 — título')} ${links('col3Links')}
    ${inp(f, 'legal', 'Línea legal (abajo a la izquierda)')}`;
  bindInputs(el, f);
  el.querySelectorAll('[data-links]').forEach(t => t.oninput = () => {
    f[t.dataset.links] = t.value.split('\n').map(s => s.trim()).filter(Boolean);
  });
}

const RENDER = { general: tabGeneral, hero: tabHero, spot: tabSpot, products: tabProducts, pages: tabPages, marquee: tabMarquee, footer: tabFooter };

function openEditor() {
  ov.innerHTML = `
    <div class="ad-panel">
      <header class="ad-head">
        <b>Editor de contenido</b>
        <div><button id="ad-save" class="ad-save">Guardar y publicar</button>
             <button id="ad-close" class="ad-x">✕</button></div>
      </header>
      <nav class="ad-tabs">${TABS.map(([k, l], i) =>
        `<button data-tab="${k}" class="${i === 0 ? 'on' : ''}">${l}</button>`).join('')}</nav>
      <section id="ad-body" class="ad-body"></section>
      <p id="ad-msg" class="ad-msg"></p>
    </div>`;
  ov.classList.add('on');
  const body = ov.querySelector('#ad-body');
  const show = k => { RENDER[k](body); ov.querySelectorAll('.ad-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === k)); };
  ov.querySelectorAll('.ad-tabs button').forEach(b => b.onclick = () => show(b.dataset.tab));
  show('general');
  ov.querySelector('#ad-close').onclick = () => ov.classList.remove('on');
  ov.querySelector('#ad-save').onclick = save;
}

async function save() {
  // normalizar etiquetas de productos escritas como texto
  (CONTENT.products || []).forEach(p => {
    if (p._tags !== undefined) { p.tags = p._tags.split(',').map(s => s.trim()).filter(Boolean); delete p._tags; }
  });
  const msg = ov.querySelector('#ad-msg');
  msg.textContent = 'Guardando…';
  try {
    const r = await fetch('/api/data', {
      method: 'POST', headers: { 'x-token': token() || '' },
      body: JSON.stringify(CONTENT),
    });
    if (!r.ok) { msg.textContent = r.status === 401 ? 'Sesión caducada: vuelve a entrar en /#/login.' : 'Error al guardar.'; return; }
    msg.textContent = 'Guardado ✓ — recargando…';
    setTimeout(() => location.reload(), 600);
  } catch (e) { msg.textContent = 'Sin conexión con la API (¿hosting estático?).'; }
}
