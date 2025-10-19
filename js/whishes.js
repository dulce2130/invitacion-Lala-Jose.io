/* ========= wishes.js (sin parpadeo, sin “desaparecer”) ========= */
(() => {
  // Evita doble ejecución si el script se carga dos veces
  if (window.__wishesInit) return;
  window.__wishesInit = true;

  document.addEventListener('DOMContentLoaded', () => {
    // === CONFIG ===
    const CSV_URL =
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6NdovwmjXAcW0XiLIS9o_ZWkkwjyblIYSRxewucvYlD1eGMmU3UrcdX2Ct4HC0tfSTJKc5-87rY0D/pub?gid=1867337060&single=true&output=csv';

    const PAGE_SIZE            = 3;      // cuántos mostrar
    const REFRESH_VISIBLE_MS   = 15000;  // refresco normal cuando la sección es visible
    const BOOST_POLL_MS        = 4000;   // refresco durante el “boost” tras tocar el iframe
    const BOOST_WINDOW_MS      = 90000;  // cuánto dura el boost
    const FETCH_TIMEOUT_MS     = 10000;  // timeout de red

    // === DOM ===
    const section    = document.getElementById('buenos-deseos');
    const listEl     = document.getElementById('wishes');
    const hintEl     = document.getElementById('wish-hint'); // <small id="wish-hint"></small>
    const moreBtn    = document.getElementById('wishes-more');
    const iframeForm = document.getElementById('wishes-iframe');
    if (!section || !listEl) return;

    // Loader inicial (opcional)
    listEl.innerHTML = '<div class="wish wish--skeleton"></div>'.repeat(3);

    // === Estado ===
    let ALL = [];                 // dataset aplicado
    let VISIBLE = PAGE_SIZE;      // cuántos mostramos
    let lastHash = '';            // hash del dataset aplicado
    let refreshSeq = 0;           // evita “carreras” de fetch
    let lastAppliedSeq = 0;       // última respuesta aplicada
    let visTimer = null;          // intervalo cuando visible
    let boostTimer = null;        // intervalo rápido tras tocar el iframe
    let firstPaintDone = false;   // para no mostrar “no hay” antes de tiempo
    let inBoost = false;          // flag de boost activo

    // === Utils ===
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
          if (c=='"') inQ = true;
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

    function updateHint(text){
      if (!hintEl) return;
      hintEl.textContent = text || '';
    }

    // === Render atómico (sin vaciar primero) ===
    function render(){
      if (!ALL.length){
        if (firstPaintDone){
          listEl.replaceChildren(elMsg('Aún no hay mensajes. Sé el primero en escribir 💌'));
          moreBtn && (moreBtn.style.display = 'none');
        }
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
      moreBtn && (moreBtn.style.display = (ALL.length > VISIBLE) ? '' : 'none');
      firstPaintDone = true;
    }

    // === Fetch robusto (no-store, timeout, anti-carreras) ===
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
          .reverse(); // más recientes primero

        return { seq, data };
      } catch (e){
        clearTimeout(to);
        console.warn('fetchWishes error:', e.message || e);
        return { seq, data: null };
      }
    }

    // === Refresh estable (NUNCA reducimos la lista mostrada) ===
    async function refreshAndRender(keepCount = true){
      const hadData = ALL.length > 0;
      const prevLen = ALL.length;
      if (!keepCount) VISIBLE = PAGE_SIZE;

      const res = await fetchWishes();
      if (!res) return;
      const { seq, data } = res;

      // Anti-carreras
      if (seq < lastAppliedSeq) return;

      // Error de red → no tocar
      if (data === null) return;

      // 1) CSV vacío temporal: si ya teníamos datos, IGNORAR (evita parpadeo)
      if (data.length === 0 && hadData) {
        // mantenemos lo que hay; hint se encarga del mensaje al usuario
        return;
      }

      // 2) Política “no shrink”: si data trae MENOS filas que las que ya mostramos, IGNORAR
      //    (Google a veces “retrocede” por segundos; no lo reflejamos)
      if (data.length < prevLen) {
        return;
      }

      // 3) Si es igual al último dataset aplicado, no re-renderices
      const newHash = hashState(data);
      if (newHash === lastHash) {
        moreBtn && (moreBtn.style.display = (ALL.length > VISIBLE) ? '' : 'none');
        updateHint(inBoost ? 'Tu mensaje aparecerá en unos segundos… 💌' : 'Se actualiza automáticamente 💌');
        return;
      }

      // 4) Cambios reales → aplica
      lastAppliedSeq = seq;
      lastHash = newHash;
      ALL = data;
      VISIBLE = Math.min(Math.max(VISIBLE, PAGE_SIZE), ALL.length);
      render();
    }

    // === “Cargar más” ===
    moreBtn && moreBtn.addEventListener('click', () => {
      VISIBLE = Math.min(VISIBLE + PAGE_SIZE, ALL.length);
      render();
    });

    // === Auto-refresh cuando la sección es visible ===
    if ('IntersectionObserver' in window){
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting){
            refreshAndRender(true);
            clearInterval(visTimer);
            visTimer = setInterval(
              () => refreshAndRender(true),
              inBoost ? BOOST_POLL_MS : REFRESH_VISIBLE_MS
            );
          } else {
            clearInterval(visTimer);
            visTimer = null;
          }
        });
      }, { threshold: 0.2 });
      io.observe(section);
    }

    // === Boost tras interacción con el iframe (probable envío) ===
    function startBoost(){
      inBoost = true;
      updateHint('Tu mensaje aparecerá en unos segundos… 💌');
      refreshAndRender(true);

      // Cambia el intervalo si ya hay uno por el observer
      if (visTimer){
        clearInterval(visTimer);
        visTimer = setInterval(() => refreshAndRender(true), BOOST_POLL_MS);
      }

      clearTimeout(boostTimer);
      boostTimer = setTimeout(() => {
        inBoost = false;
        updateHint('Se actualiza automáticamente 💌');
        // Restablece intervalo normal si visible
        if (visTimer){
          clearInterval(visTimer);
          visTimer = setInterval(() => refreshAndRender(true), REFRESH_VISIBLE_MS);
        }
      }, BOOST_WINDOW_MS);
    }

    // Dispara el boost al interactuar con el iframe (tocar, click, carga)
    ['pointerdown','touchstart','load','submit'].forEach(ev=>{
      iframeForm && iframeForm.addEventListener(ev, startBoost, { passive:true });
    });

    // === Primera carga ===
    refreshAndRender(false);
  });
})();
