/* ========= wishes.js =========
   Google Sheets (CSV) → Tarjetas con "Cargar más" (sin parpadeo)
================================ */

document.addEventListener('DOMContentLoaded', () => {
  // --- CONFIG ---
  const CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6NdovwmjXAcW0XiLIS9o_ZWkkwjyblIYSRxewucvYlD1eGMmU3UrcdX2Ct4HC0tfSTJKc5-87rY0D/pub?gid=1867337060&single=true&output=csv';

  const PAGE_SIZE           = 3;
  const REFRESH_VISIBLE_MS  = 15000;
  const BOOST_MS            = 90000;
  const BOOST_INTERVAL_MS   = 5000;
  const FETCH_TIMEOUT_MS    = 10000;

  // --- DOM ---
  const section    = document.getElementById('buenos-deseos');
  const listEl     = document.getElementById('wishes');
  const hintEl     = document.getElementById('wish-hint');
  const moreBtn    = document.getElementById('wishes-more');
  const iframeForm = document.getElementById('wishes-iframe');
  if (!section || !listEl) return;

  // --- Estado ---
  let ALL = [];
  let VISIBLE = PAGE_SIZE;
  let visTimer = null;
  let boostTimer = null;
  let refreshSeq = 0;
  let lastAppliedSeq = 0;
  let hadAny = false; // para no mostrar el mensaje vacío después

  // --- Utils ---
  const esc = s => String(s ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');

  const rowId = r => `${r.ts || ''}|${r.name || ''}|${r.msg || ''}`;

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

  function buildCard({ts,name,msg}){
    const art = document.createElement('article');
    art.className = 'wish';
    art.dataset.id = rowId({ts,name,msg});
    art.innerHTML = `
      <div class="wish-head">
        <span class="wish-name">${esc(name || 'Anónimo')}</span>
        <time class="wish-time">${esc(ts || '')}</time>
      </div>
      <p class="wish-msg">${esc(msg || '')}</p>
    `;
    return art;
  }

  function showEmptyOnce(){
    if (hadAny) return; // ya hubo datos alguna vez → no flashes “vacío”
    listEl.replaceChildren(emptyP('Aún no hay mensajes. Sé el primero en escribir 💌'));
    if (moreBtn) moreBtn.style.display = 'none';
  }
  function emptyP(txt){
    const p = document.createElement('p');
    p.className = 'muted center';
    p.textContent = txt;
    return p;
  }

  function updateMoreBtn(){
    if (!moreBtn) return;
    moreBtn.style.display = (ALL.length > VISIBLE) ? '' : 'none';
  }

  // === Render incremental (sin parpadeo) ===
  function syncRender(newData){
    if (newData.length === 0){
      showEmptyOnce();
      return;
    }
    hadAny = true;

    // ids actuales en DOM (en orden visual)
    const currentIds = Array.from(listEl.children).map(el => el.dataset.id);
    const newIds = newData.map(rowId);

    // Caso feliz: la hoja solo creció al frente (lo normal)
    const currentIsSuffix = currentIds.every((id, idx) => id === newIds[idx]);
    if (currentIds.length === 0 || currentIsSuffix){
      // cuántos nuevos hay al frente
      const addedCount = Math.max(0, Math.min(newIds.length, VISIBLE) - currentIds.length);
      if (addedCount > 0){
        // Inserta solo las nuevas tarjetas al inicio
        for (let i = addedCount - 1; i >= 0; i--){
          listEl.prepend(buildCard(newData[i]));
        }
      }
      // Asegura que haya exactamente VISIBLE elementos (recorta si sobran)
      while (listEl.children.length > Math.min(VISIBLE, newData.length)){
        listEl.removeChild(listEl.lastElementChild);
      }
      updateMoreBtn();
      return;
    }

    // Si el orden cambió de forma rara, render completo (infrecuente)
    const frag = document.createDocumentFragment();
    newData.slice(0, VISIBLE).forEach(r => frag.appendChild(buildCard(r)));
    listEl.replaceChildren(frag);
    updateMoreBtn();
  }

  // --- Fetch robusto ---
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
      return { seq, data: null };
    }
  }

  // --- Refresh (sin borrar lo que ya hay si Google da vacío momentáneo) ---
  async function refresh(keepCount = true){
    if (!keepCount) VISIBLE = PAGE_SIZE;

    const { seq, data } = await fetchWishes();
    if (seq < lastAppliedSeq) return; // carrera
    if (data === null) return;        // error de red → no tocar

    if (data.length === 0){
      if (ALL.length === 0) showEmptyOnce();
      return; // no borres lo que ya se ve
    }

    lastAppliedSeq = seq;
    ALL = data;
    if (keepCount) VISIBLE = Math.min(Math.max(VISIBLE, PAGE_SIZE), ALL.length);
    syncRender(ALL);
    if (hintEl) hintEl.textContent = 'Se actualiza automáticamente 💌';
  }

  // --- “Cargar más” ---
  if (moreBtn){
    moreBtn.addEventListener('click', ()=>{
      VISIBLE = Math.min(VISIBLE + PAGE_SIZE, ALL.length);
      syncRender(ALL);
    });
  }

  // --- Autorefresco solo cuando la sección es visible ---
  if ('IntersectionObserver' in window){
    const io = new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if (e.isIntersecting){
          refresh(true);
          clearInterval(visTimer);
          visTimer = setInterval(()=>refresh(true), REFRESH_VISIBLE_MS);
        } else {
          clearInterval(visTimer);
        }
      });
    }, { threshold: 0.2 });
    io.observe(section);
  }

  // --- Boost tras tocar el iframe (probable envío) ---
  function boost(){
    refresh(true);
    clearInterval(boostTimer);
    const endAt = Date.now() + BOOST_MS;
    boostTimer = setInterval(()=>{
      refresh(true);
      if (Date.now() > endAt) clearInterval(boostTimer);
    }, BOOST_INTERVAL_MS);
  }
  ['pointerdown','touchstart','load'].forEach(ev=>{
    if (iframeForm) iframeForm.addEventListener(ev, boost, { passive:true });
  });

  // --- Primera carga ---
  refresh(false);
});
