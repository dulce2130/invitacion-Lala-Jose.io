/* ========= wishes.js =========
   Google Sheets (CSV) → Tarjetas con "Cargar más" y autorefresco sin parpadeo
================================ */

document.addEventListener('DOMContentLoaded', () => {
  // --- CONFIG ---
  const CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6NdovwmjXAcW0XiLIS9o_ZWkkwjyblIYSRxewucvYlD1eGMmU3UrcdX2Ct4HC0tfSTJKc5-87rY0D/pub?gid=1867337060&single=true&output=csv';

  const PAGE_SIZE           = 5;        // muestra inicial y por “cargar más”
  const REFRESH_VISIBLE_MS  = 15000;    // autorefresco cuando la sección es visible
  const BOOST_MS            = 90000;    // tiempo del boost tras tocar el iframe
  const BOOST_INTERVAL_MS   = 5000;     // cada cuánto refresca durante el boost
  const FETCH_TIMEOUT_MS    = 10000;    // timeout de red (defensivo)

  // --- DOM ---
  const section    = document.getElementById('buenos-deseos');
  const listEl     = document.getElementById('wishes');
  const hintEl     = document.getElementById('wish-hint');
  const moreBtn    = document.getElementById('wishes-more');
  const iframeForm = document.getElementById('wishes-iframe');
  if (!section || !listEl) return;

  // --- Estado ---
  let ALL = [];                 // cache actual
  let VISIBLE = PAGE_SIZE;      // cuántos mostrar
  let lastHash = '';            // hash del último render
  let visTimer = null;          // intervalo de autorefresco
  let boostTimer = null;        // intervalo de boost
  let refreshSeq = 0;           // controla carreras de fetch
  let lastAppliedSeq = 0;       // última respuesta aplicada

  // --- Utils ---
  const esc = s => String(s ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');

  function parseCSV(text){
    const rows=[]; let row=[], cur='', inQ=false;
    for (let i=0;i<text.length;i++){
      const c=text[i], n=text[i+1];
      if (inQ){
        if (c=='"' && n=='"'){ cur+='"'; i++; }
        else if (c=='"'){ inQ=false; }
        else { cur+=c; }
      } else {
        if (c=='"') inQ=true;
        else if (c==','){ row.push(cur); cur=''; }
        else if (c=='\n' || c=='\r'){
          if (cur!=='' || row.length){ row.push(cur); rows.push(row); row=[]; cur=''; }
          if (c=='\r' && n=='\n') i++;
        } else { cur+=c; }
      }
    }
    if (cur!=='' || row.length){ row.push(cur); rows.push(row); }
    return rows;
  }

  const hashState = arr => JSON.stringify(arr);

  // --- Render sin parpadeo (reemplazo atómico) ---
  function render(){
    if (!ALL.length){
      // No toques el DOM si ya había contenido; este mensaje solo si nunca hubo nada
      if (listEl.childElementCount === 0){
        listEl.replaceChildren(elMsg('Aún no hay mensajes. Sé el primero en escribir 💌'));
      }
      if (moreBtn) moreBtn.style.display = 'none';
      return;
    }

    const frag = document.createDocumentFragment();
    const slice = ALL.slice(0, VISIBLE);

    slice.forEach(({ts,name,msg})=>{
      const art = document.createElement('article');
      art.className = 'wish';
      art.innerHTML = `
        <div class="wish-head">
          <span class="wish-name">${esc(name || 'Anónimo')}</span>
          <time class="wish-time">${esc(ts || '')}</time>
        </div>
        <p class="wish-msg">${esc(msg || '')}</p>
      `;
      frag.appendChild(art);
    });

    // Reemplazo atómico → nada de innerHTML a '' (evita blink)
    listEl.replaceChildren(frag);

    if (moreBtn) moreBtn.style.display = (ALL.length > VISIBLE) ? '' : 'none';
    if (hintEl)  hintEl.textContent   = 'Se actualiza automáticamente 💌';
  }

  function elMsg(txt){
    const p = document.createElement('p');
    p.className = 'muted center';
    p.textContent = txt;
    return p;
  }

  // --- Fetch robusto (sin carreras, sin cache, con timeout) ---
  async function fetchWishes(){
    const seq = ++refreshSeq;
    const ctrl = new AbortController();
    const to = setTimeout(()=>ctrl.abort(), FETCH_TIMEOUT_MS);

    try{
      const res = await fetch(CSV_URL + '&_=' + Date.now(), {
        mode: 'cors',
        cache: 'no-store',
        signal: ctrl.signal
      });
      clearTimeout(to);
      if (!res.ok) throw new Error('HTTP '+res.status);
      const csv = await res.text();
      const rows = parseCSV(csv);
      if (rows.length <= 1) return { seq, data: [] };

      const header = rows[0].map(h => h.trim().toLowerCase());
      const iTime = header.findIndex(h => h.includes('marca') || h.includes('timestamp'));
      const iName = header.findIndex(h => h.includes('nombre'));
      const iMsg  = header.findIndex(h => h.includes('mensaje') || h.includes('message'));

      const data = rows.slice(1)
        .filter(r => (r[iMsg] || '').trim() !== '')
        .map(r => ({ ts:r[iTime], name:r[iName], msg:r[iMsg] }))
        .reverse(); // más reciente primero

      return { seq, data };
    } catch(e){
      clearTimeout(to);
      console.warn('fetchWishes error:', e.message || e);
      return { seq, data: null }; // null = error, no tocar estado
    }
  }

  // --- Refresh sin parpadeo ---
  async function refreshAndRender(keepCount=true){
    const prevLen = ALL.length;
    if (!keepCount) VISIBLE = PAGE_SIZE;

    const { seq, data } = await fetchWishes();

    // Ignora respuestas viejas (carrera)
    if (seq < lastAppliedSeq) return;

    if (data === null){
      // error de red → no tocamos nada
      return;
    }
    if (data.length === 0){
      // Google a veces devuelve vacío momentáneo; si ya teníamos datos, NO borres
      if (prevLen > 0) return;
      // si nunca hubo nada, permite mostrar vacío
      ALL = [];
      lastHash = '';
      render();
      return;
    }

    const newHash = hashState(data);
    if (newHash === lastHash){
      // nada cambió, pero igual actualiza visibilidad del botón “más”
      if (keepCount) VISIBLE = Math.min(Math.max(VISIBLE, PAGE_SIZE), ALL.length);
      if (moreBtn) moreBtn.style.display = (ALL.length > VISIBLE) ? '' : 'none';
      return;
    }

    lastAppliedSeq = seq;
    lastHash = newHash;
    ALL = data;
    if (keepCount) VISIBLE = Math.min(Math.max(VISIBLE, PAGE_SIZE), ALL.length);
    render();
  }

  // --- Cargar más ---
  if (moreBtn){
    moreBtn.addEventListener('click', ()=>{
      VISIBLE = Math.min(VISIBLE + PAGE_SIZE, ALL.length);
      render();
    });
  }

  // --- Autorefresco solo cuando la sección es visible ---
  if ('IntersectionObserver' in window){
    const io = new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if (e.isIntersecting){
          refreshAndRender(true);
          clearInterval(visTimer);
          visTimer = setInterval(()=>refreshAndRender(true), REFRESH_VISIBLE_MS);
        } else {
          clearInterval(visTimer);
        }
      });
    }, { threshold: 0.2 });
    io.observe(section);
  }

  // --- Boost tras interacción con el iframe (probable envío) ---
  function boost(){
    refreshAndRender(true);
    clearInterval(boostTimer);
    const endAt = Date.now() + BOOST_MS;
    boostTimer = setInterval(()=>{
      refreshAndRender(true);
      if (Date.now() > endAt) clearInterval(boostTimer);
    }, BOOST_INTERVAL_MS);
  }
  ['pointerdown','touchstart','load'].forEach(ev=>{
    if (iframeForm) iframeForm.addEventListener(ev, boost, { passive:true });
  });

  // --- Primera carga ---
  refreshAndRender(false);
});
