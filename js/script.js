// Configuración
const EVENT_DATE = new Date('2025-12-27T12:00:00'); // 27 de diciembre a las 12:00 p.m.
const TITLE_CEREMONY = 'Boda • Ceremonia religiosa';
const TITLE_RECEPTION = 'Boda • Recepción';

// Referencias DOM
const openBtn = document.getElementById('openBtn');
const splash = document.getElementById('splash');
const invite = document.getElementById('invite');

// Confeti temático de boda 
function makePetal(x, y) {
  const e = document.createElement('div');
  e.className = 'petal';

  // Tamaño más variado
  const size = Math.random() * 20 + 12; // 12–32px

  // Posición inicial aleatoria por toda la pantalla
  const startX = x ?? Math.random() * 100;
  const startY = y ?? Math.random() * 100;

  e.style.left = startX + 'vw';
  e.style.top = startY + 'vh';
  e.style.fontSize = size + 'px';

    // Movimiento suave y lento como copos de nieve
  const tx = (Math.random() * 40 - 20) + 'vw'; 
  const ty = 120 + 'vh'; 
  e.style.setProperty('--tx', tx);
  e.style.setProperty('--ty', ty);
  e.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg'); // Rotación más lenta
  
  // Duración de animación variable para caída muy suave
  const duration = 12 + Math.random() * 8; // 12-20 segundos
  e.style.animation = `fall ${duration}s ease-in-out forwards`;

  // Elementos temáticos
  const weddingElements = [
    '🌹', '🌷', '🌺', '🌸', 
    '💕', '💓', 
    '✨', '⭐', 
    '🍃', '🌿'  
  ];

  const randomElement = weddingElements[Math.floor(Math.random() * weddingElements.length)];
  e.textContent = randomElement;

  const weddingColors = [
    '#d18485', 
    '#c26d6e', 
    '#c8b5b6', 
    '#b8b5b6', 
    '#e0d7d8', 
    '#a8a5a6', 
    '#d0c8c9', 
    '#b0a8a9'  
  ];

  const randomColor = weddingColors[Math.floor(Math.random() * weddingColors.length)];
  e.style.color = randomColor;

  // Añadir variación muy sutil y elegante en el color
  e.style.filter = `hue-rotate(${Math.random() * 15 - 7}deg) brightness(${0.95 + Math.random() * 0.1}) saturate(${0.6 + Math.random() * 0.2})`;

  document.body.appendChild(e);

  // Remover después de la animación
  setTimeout(() => e.remove(), (duration + 2) * 1000);
}

function burstPetals(n = 80) {
  // Crear pétalos desde la parte superior de la pantalla
  for (let i = 0; i < n; i++) {
    // Delay muy suave para caída lenta como copos de nieve
    const delay = i * 40 + Math.random() * 60;
    
    setTimeout(() => {
      // Posición aleatoria en la parte superior
      const startX = Math.random() * 100; 
      const startY = -5; // Empezar desde arriba
      
      makePetal(startX, startY);
    }, delay);
  }
}

// Abrir sobre
openBtn.addEventListener('click', () => {
  openBtn.classList.add('opened');

  setTimeout(() => {
    splash.classList.add('fade-out');

    setTimeout(() => {
      splash.style.display = 'none';

      invite.classList.remove('hidden');           
      invite.setAttribute('aria-hidden', 'false');

      void invite.offsetWidth; 

      invite.classList.add('show');

      burstPetals(120);
      setTimeout(() => { createFloatingPetals(); }, 2000);

    }, 600); // mismo tiempo que el CSS del splash
  }, 900);   // coincide con la animación del sobre
});



// Función para crear pétalos flotantes 
function createFloatingPetals() {
  for (let i = 0; i < 20; i++) { 
    setTimeout(() => {
      const petal = document.createElement('div');
      petal.className = 'floating-petal';

      const size = Math.random() * 16 + 8; 
      petal.style.fontSize = size + 'px';
      petal.style.left = Math.random() * 100 + 'vw';
      petal.style.top = Math.random() * 100 + 'vh';

      const weddingElements = [
        '🌹', '🌷', '🌺', '🌸',
        '💕', '💓', 
        '✨', '⭐', 
        '🍃', '🌿'  
      ];

      const randomElement = weddingElements[Math.floor(Math.random() * weddingElements.length)];
      petal.textContent = randomElement;

      const weddingColors = [
        '#d18485', 
        '#c26d6e', 
        '#c8b5b6', 
        '#b8b5b6', 
        '#e0d7d8', 
        '#a8a5a6', 
        '#d0c8c9', 
        '#b0a8a9'  
      ];

      const randomColor = weddingColors[Math.floor(Math.random() * weddingColors.length)];
      petal.style.color = randomColor;

      petal.style.filter = `hue-rotate(${Math.random() * 12 - 6}deg) brightness(${0.97 + Math.random() * 0.06}) saturate(${0.5 + Math.random() * 0.15})`;

      document.body.appendChild(petal);

      setTimeout(() => petal.remove(), 8000 + Math.random() * 4000);
    }, i * 400); 
  }
}

// ====== CARRUSEL PREMIUM ROBUSTO ======

(function(){
  // --- Referencias ---
  const slider   = document.getElementById('slider');                    
  const prevBtn  = document.querySelector('.C-arrow--prev');
  const nextBtn  = document.querySelector('.C-arrow--next');
  const dots     = Array.from(document.querySelectorAll('.C-dot'));
  const slides   = Array.from(slider.querySelectorAll('.C-slide'));
  const bar      = document.querySelector('.C-progress');

  if (!slider || slides.length === 0) return; // Nada que hacer

  // --- Estado ---
  let current = 0;
  let timer = null;
  const autoplayMs = 4000;

  let programmatic = false;   
  let rafSync;                
  let targetLeft = 0;        

  // --- Utils ---
  const leftOf = i => slides[i]?.offsetLeft ?? 0;

  function updateDots(){
    dots.forEach((d,idx)=> d.classList.toggle('is-active', idx === current));
    if (bar){
      bar.style.transition = 'none';
      bar.style.transform  = 'scaleX(0)';
      requestAnimationFrame(()=>{
        bar.style.transition = `transform ${autoplayMs}ms linear`;
        bar.style.transform  = 'scaleX(1)';
      });
    }
  }

  // Espera real a que termine el desplazamiento (programático o por inercia)
  function waitForScrollEnd(goal){
    return new Promise(resolve=>{
      let last = slider.scrollLeft;
      let idleMs = 0;
      function tick(){
        const now  = slider.scrollLeft;
        const dist = Math.abs(now - goal);
        if (dist < 1 || idleMs > 140){ resolve(); return; }
        if (Math.abs(now - last) < 0.5){ idleMs += 16; } else { idleMs = 0; }
        last = now;
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  // Espera a que el carrusel tenga medidas reales e imágenes iniciales decodificadas
  async function waitLayoutReady(timeoutMs = 2000){
    // 1) Espera fuentes (evita saltos por font-swap)
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch(_) {}
    }
    // 2) Decodifica las 2 primeras imágenes si se puede
    const imgs = Array.from(slider.querySelectorAll('img')).slice(0, 2);
    try {
      await Promise.all(imgs.map(img=>{
        if ('decode' in img) return img.decode().catch(()=>{});
        return img.complete ? Promise.resolve() : new Promise(res=> img.onload = img.onerror = res);
      }));
    } catch(_) {}
    // 3) Offsets válidos
    const t0 = performance.now();
    await new Promise(res=>{
      (function check(){
        const ok = slider.clientWidth > 0 && slides.length > 0 &&
                   slides[0].offsetLeft === 0 &&
                   (slides.length === 1 || slides[1].offsetLeft > 0);
        if (ok || (performance.now() - t0) > timeoutMs) return res();
        requestAnimationFrame(check);
      })();
    });
  }

  // --- Autoplay como setTimeout encadenado (no se pisa) ---
  function queueAuto(){ clearTimeout(timer); timer = setTimeout(()=> goTo(current+1, {user:false}), autoplayMs); }
  function stopAuto(){ clearTimeout(timer); }
  function restartAuto(){ stopAuto(); queueAuto(); }

  // --- Ir a slide ---
  async function goTo(i, {user=false} = {}){
    if (i < 0) i = slides.length - 1;
    if (i >= slides.length) i = 0;
    current = i;
    updateDots();

    programmatic = true;
    slider.classList.add('no-snap');

    targetLeft = leftOf(i);
    slider.scrollTo({ left: targetLeft, behavior: 'smooth' });

    await waitForScrollEnd(targetLeft);

    programmatic = false;
    slider.classList.remove('no-snap');

    // Encadena siguiente tick
    if (user) restartAuto();
    else      queueAuto();
  }

  // --- Controles ---
  if (prevBtn) prevBtn.addEventListener('click', ()=> goTo(current-1, {user:true}));
  if (nextBtn) nextBtn.addEventListener('click', ()=> goTo(current+1, {user:true}));
  dots.forEach((d,idx)=> d.addEventListener('click', ()=> goTo(idx, {user:true})));

  // Pausa/reanuda por interacción (táctil/hover/foco)
  ['mouseenter','focusin','pointerdown','touchstart'].forEach(ev=>{
    slider.addEventListener(ev, ()=> stopAuto(), {passive:true});
  });
  ['mouseleave','focusout','pointerup','touchend'].forEach(ev=>{
    slider.addEventListener(ev, ()=> queueAuto(), {passive:true});
  });

  // Teclado
  slider.addEventListener('keydown', e=>{
    if (e.key === 'ArrowRight') goTo(current+1, {user:true});
    if (e.key === 'ArrowLeft')  goTo(current-1, {user:true});
  });

  // Sync índice por posición real cuando el usuario desliza
  slider.addEventListener('scroll', ()=>{
    if (programmatic) return;
    cancelAnimationFrame(rafSync);
    rafSync = requestAnimationFrame(()=>{
      const center = slider.scrollLeft + slider.clientWidth/2;
      let nearest = 0, best = Infinity;
      slides.forEach((s,idx)=>{
        const mid = s.offsetLeft + s.clientWidth/2;
        const d = Math.abs(center - mid);
        if (d < best){ best = d; nearest = idx; }
      });
      if (nearest !== current){
        current = nearest;
        updateDots();
      }
    });
  });

  // Reposiciona sin animar tras resize/orientación
  new ResizeObserver(()=>{
    programmatic = true;
    slider.classList.add('no-snap');
    slider.scrollLeft = leftOf(current);
    slider.classList.remove('no-snap');
    programmatic = false;
  }).observe(slider);

  // Pausa autoplay si la pestaña se oculta (evita desincronías)
  document.addEventListener('visibilitychange', ()=>{
    if (document.hidden) stopAuto();
    else queueAuto();
  });

  (async function init(){
    await waitLayoutReady();              
    programmatic = true;
    slider.classList.add('no-snap');
    slider.scrollLeft = leftOf(current);  
    slider.classList.remove('no-snap');
    programmatic = false;

    updateDots();
    if (!document.hidden) queueAuto();     
  })();
})();





// Countdown
const el = id => document.getElementById(id);
function tick() {
  const now = new Date();
  const diff = EVENT_DATE - now;
  if (diff <= 0) { ['days', 'hours', 'mins', 'secs'].forEach(k => el(k).textContent = '00'); return; }
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  el('days').textContent = String(d).padStart(2, '0');
  el('hours').textContent = String(h).padStart(2, '0');
  el('mins').textContent = String(m).padStart(2, '0');
  el('secs').textContent = String(ss).padStart(2, '0');
}
setInterval(tick, 1000); tick();

// Añadir al calendario (.ics)
function makeICS({ title, start, durationMinutes = 90, location, description }) {
  const fmt = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Boda//ES\nBEGIN:VEVENT\nUID:${Date.now()}@boda\nDTSTAMP:${fmt(new Date())}\nDTSTART:${fmt(start)}\nDTEND:${fmt(end)}\nSUMMARY:${title}\nLOCATION:${location || ''}\nDESCRIPTION:${description || ''}\nEND:VEVENT\nEND:VCALENDAR`;
  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = title.replace(/\s+/g, '_') + '.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

document.getElementById('add-ceremony').addEventListener('click', (e) => {
  e.preventDefault();
  makeICS({ title: TITLE_CEREMONY, start: new Date('2025-12-27T12:00:00'), location: 'Iglesia de San Miguel Arcángel' });
  // Pequeño efecto de confeti al añadir al calendario
  burstPetals(20);
});

document.getElementById('add-reception').addEventListener('click', (e) => {
  e.preventDefault();
  makeICS({ title: TITLE_RECEPTION, start: new Date('2025-12-27T14:00:00'), durationMinutes: 240, location: 'Salón Jardín Las Bugambilias' });
  // Pequeño efecto de confeti al añadir al calendario
  burstPetals(20);
});

// Pétalos ocasionales al hacer scroll
let last = 0;
window.addEventListener('scroll', createRandomPetals);

// Desactivar clic derecho y algunos atajos comunes
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if ((e.ctrlKey||e.metaKey) && ['s','p','u','c'].includes(k)) e.preventDefault(); 
});
