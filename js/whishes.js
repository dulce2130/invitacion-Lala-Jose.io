/* ========= wishes.js =========
   Google Sheets (CSV) → Tarjetas con "Cargar más"
================================ */

document.addEventListener('DOMContentLoaded', () => {
  // 1) CONFIG
  const CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6NdovwmjXAcW0XiLIS9o_ZWkkwjyblIYSRxewucvYlD1eGMmU3UrcdX2Ct4HC0tfSTJKc5-87rY0D/pub?gid=1867337060&single=true&output=csv';

  const PAGE_SIZE = 5;          
  const REFRESH_VISIBLE_MS = 15000; 
  const BOOST_MS = 90000;      
  const BOOST_INTERVAL = 5000;  

  // 2) DOM refs
  const section    = document.getElementById('buenos-deseos');
  const listEl     = document.getElementById('wishes');
  const hintEl     = document.getElementById('wish-hint');
  const moreBtn    = document.getElementById('wishes-more');
  const iframeForm = document.getElementById('wishes-iframe');

  if (!section || !listEl) return; // nada que hacer

  // 3) Estado
  let ALL = [];
  let VISIBLE = PAGE_SIZE;
  let lastRenderHash = '';  // para evitar re-renders idénticos
  let visTimer = null;

  // 4) Utils
  function esc(s) {
    return String(s ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  // Parser CSV (respeta comillas dobles)
  function parseCSV(text) {
    const rows = [];
    let row = [], cur = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (inQ) {
        if (c === '"' && n === '"') { cur += '"'; i++; }
        else if (c === '"') { inQ = false; }
        else { cur += c; }
      } else {
        if (c === '"') inQ = true;
        else if (c === ',') { row.push(cur); cur = ''; }
        else if (c === '\n' || c === '\r') {
          if (cur !== '' || row.length) { row.push(cur); rows.push(row); row = []; cur = ''; }
          if (c === '\r' && n === '\n') i++;
        } else { cur += c; }
      }
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  function hashState(arr) {
    // Suficiente para detectar cambios reales
    return JSON.stringify(arr);
  }

  // 5) Render
  function render() {
    if (!listEl) return;

    // Si no hay datos, mensaje único
    if (!ALL.length) {
      listEl.innerHTML = '<p class="muted center">Aún no hay mensajes. Sé el primero en escribir 💌</p>';
      if (moreBtn) moreBtn.style.display = 'none';
      return;
    }

    const frag = document.createDocumentFragment();
    listEl.innerHTML = '';

    const slice = ALL.slice(0, VISIBLE);
    slice.forEach(({ ts, name, msg }) => {
      const card = document.createElement('article');
      card.className = 'wish';
      card.innerHTML = `
        <div class="wish-head">
          <span class="wish-name">${esc(name || 'Anónimo')}</span>
          <time class="wish-time">${esc(ts || '')}</time>
        </div>
        <p class="wish-msg">${esc(msg || '')}</p>
      `;
      frag.appendChild(card);
    });

    listEl.appendChild(frag);

    // Botón “Cargar más”
    if (moreBtn) {
      moreBtn.style.display = (ALL.length > VISIBLE) ? '' : 'none';
    }
  }

  // 6) Fetch + normaliza columnas
  async function fetchWishes() {
    const res = await fetch(CSV_URL + '&_=' + Date.now(), { mode: 'cors' });
    const csv = await res.text();
    const rows = parseCSV(csv);

    if (rows.length <= 1) {
      return []; // nada (no sobreescribimos aún)
    }

    const header = rows[0].map(h => h.trim().toLowerCase());
    const iTime = header.findIndex(h => h.includes('marca') || h.includes('timestamp'));
    const iName = header.findIndex(h => h.includes('nombre'));
    const iMsg  = header.findIndex(h => h.includes('mensaje') || h.includes('message'));

    const data = rows.slice(1)
      .filter(r => (r[iMsg] || '').trim() !== '')
      .map(r => ({ ts: r[iTime], name: r[iName], msg: r[iMsg] }));

    // Más recientes primero
    data.reverse();
    return data;
  }

  // 7) Refresh sin parpadeo
  async function refreshAndRender(keepCount = true) {
    const prevLen = ALL.length;
    if (!keepCount) VISIBLE = PAGE_SIZE;

    let data;
    try {
      data = await fetchWishes();
    } catch (err) {
      console.error('Error al actualizar deseos:', err);
      return; // mantenemos lo que había
    }

    // Si Google devuelve vacío momentáneo, no tiramos lo actual
    if (!data || data.length === 0) {
      // si ya teníamos algo, mantenlo (evita flash “no hay mensajes”)
      if (prevLen > 0) return;
      // si nunca hubo nada, permite mostrar vacío
      ALL = [];
    } else {
      // Solo re-render si de verdad cambió
      const newHash = hashState(data);
      if (newHash === lastRenderHash) return;
      lastRenderHash = newHash;
      ALL = data;
    }

    if (keepCount) VISIBLE = Math.min(Math.max(VISIBLE, PAGE_SIZE), ALL.length);
    render();
    if (hintEl) hintEl.textContent = (ALL.length ? 'Se actualiza automáticamente 💌' : '');
  }

  // 8) Botón “Cargar más”
  if (moreBtn) {
    moreBtn.addEventListener('click', () => {
      VISIBLE = Math.min(VISIBLE + PAGE_SIZE, ALL.length);
      render();
    });
  }

  // 9) Auto-refresh mientras la sección está visible
  if ('IntersectionObserver' in window && section) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          refreshAndRender(true);
          clearInterval(visTimer);
          visTimer = setInterval(() => refreshAndRender(true), REFRESH_VISIBLE_MS);
        } else {
          clearInterval(visTimer);
        }
      });
    }, { threshold: 0.2 });
    io.observe(section);
  }

  // 10) “Boost” tras interacción con el iframe (probable envío)
  function boostRefresh() {
    let endAt = Date.now() + BOOST_MS;
    refreshAndRender(true);
    const fast = setInterval(() => {
      refreshAndRender(true);
      if (Date.now() > endAt) clearInterval(fast);
    }, BOOST_INTERVAL);
  }
  ['pointerdown', 'touchstart', 'load'].forEach(ev => {
    if (iframeForm) iframeForm.addEventListener(ev, boostRefresh, { passive: true });
  });

  // 11) Primera carga
  refreshAndRender(false);
});
