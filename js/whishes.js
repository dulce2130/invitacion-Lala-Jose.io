/* ========= wishes.js (anti-parpadeo, anti-doble-carga) ========= */
(() => {
  // --- Guard global: evita que el módulo se ejecute dos veces ---
  if (window.__wishesInit) return;
  window.__wishesInit = true;

  document.addEventListener('DOMContentLoaded', () => {
    const CSV_URL =
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6NdovwmjXAcW0XiLIS9o_ZWkkwjyblIYSRxewucvYlD1eGMmU3UrcdX2Ct4HC0tfSTJKc5-87rY0D/pub?gid=1867337060&single=true&output=csv';

    const PAGE_SIZE = 3;
    const REFRESH_VISIBLE_MS = 15000;
    const BOOST_MS = 90000;
    const BOOST_INTERVAL_MS = 5000;
    const FETCH_TIMEOUT_MS = 10000;

    const section    = document.getElementById('buenos-deseos');
    const listEl     = document.getElementById('wishes');
    const hintEl     = document.getElementById('wish-hint');
    const moreBtn    = document.getElementById('wishes-more');
    const iframeForm = document.getElementById('wishes-iframe');
    if (!section || !listEl) return;

    // Loader inicial (esquelético) para que no diga “no hay” por error
    listEl.innerHTML = '<div class="wish wish--skeleton"></div>'.repeat(3);

    let ALL = [];
    let VISIBLE = PAGE_SIZE;
    let lastHash = '';
    let visTimer = null;
    let boostTimer = null;
    let refreshSeq = 0;
    let lastAppliedSeq = 0;
    let firstPaintDone = false;

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

    function elMsg(txt){
      const p = document.createElement('p');
      p.className = 'muted center';
      p.textContent = txt;
      return p;
    }

    function render(){
      // No re-render idéntico
      if (!ALL.length){
        // Solo muestra “no hay” si ya terminamos la primera carga real
        if (firstPaintDone){
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

      listEl.replaceChildren(frag);
      if (moreBtn) moreBtn.style.display = (ALL.length > VISIBLE) ? '' : 'none';
      if (hintEl)  hintEl.textContent   = 'Se actualiza automáticamente 💌';
      firstPaintDone = true;
    }

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
          .reverse();

        return { seq, data };
      } catch(e){
        clearTimeout(to);
        console.warn('fetchWishes error:', e.message || e);
        return { seq, data: null };
      }
    }

    async function refreshAndRender(keepCount=true){
      const prevLen = ALL.length;
      if (!keepCount) VISIBLE = PAGE_SIZE;

      const { seq, data } = await fetchWishes();

      // ignora respuestas viejas
      if (seq < lastAppliedSeq) return;

      // error de red → no toques nada
      if (data === null) return;

      // CSV momentáneamente vacío → si ya teníamos algo, NO borres (evita flash)
      if (data.length === 0 && prevLen > 0) return;

      // si es igual, no re-render
      const newHash = hashState(data);
      if (data.length && newHash === lastHash){
        if (keepCount) VISIBLE = Math.min(Math.max(VISIBLE, PAGE_SIZE), ALL.length);
        if (moreBtn) moreBtn.style.display = (ALL.length > VISIBLE) ? '' : 'none';
        return;
      }

      lastAppliedSeq = seq;
      lastHash = newHash;
      ALL = data; // si está vacío aquí, es porque nunca hubo nada (primera carga)
      if (keepCount) VISIBLE = Math.min(Math.max(VISIBLE, PAGE_SIZE), ALL.length);
      render();
    }

    // Botón “Cargar más”
    moreBtn?.addEventListener('click', ()=>{
      VISIBLE = Math.min(VISIBLE + PAGE_SIZE, ALL.length);
      render();
    });

    // Autorefresco (un solo intervalo activo)
    if ('IntersectionObserver' in window){
      const io = new IntersectionObserver(entries=>{
        entries.forEach(e=>{
          if (e.isIntersecting){
            refreshAndRender(true);
            if (visTimer) clearInterval(visTimer);
            visTimer = setInterval(()=>refreshAndRender(true), REFRESH_VISIBLE_MS);
          } else {
            if (visTimer) clearInterval(visTimer);
            visTimer = null;
          }
        });
      }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
      io.observe(section);
    }

    // Boost tras interacción con el iframe
    function boost(){
      refreshAndRender(true);
      if (boostTimer) clearInterval(boostTimer);
      const endAt = Date.now() + BOOST_MS;
      boostTimer = setInterval(()=>{
        refreshAndRender(true);
        if (Date.now() > endAt){
          clearInterval(boostTimer);
          boostTimer = null;
        }
      }, BOOST_INTERVAL_MS);
    }
    ['pointerdown','touchstart','load'].forEach(ev=>{
      iframeForm?.addEventListener(ev, boost, { passive:true });
    });

    // Primera carga real
    refreshAndRender(false);
  });
})();
