// Configuración
const EVENT_DATE = new Date('2025-12-27T12:00:00'); // 27 de diciembre a las 12:00 p.m.
const TITLE_CEREMONY = 'Boda • Ceremonia religiosa';
const TITLE_RECEPTION = 'Boda • Recepción';

// Referencias DOM
const openBtn = document.getElementById('openBtn');
const splash = document.getElementById('splash');
const invite = document.getElementById('invite');

// Confeti temático de boda mejorado
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
  const tx = (Math.random() * 40 - 20) + 'vw'; // -20vw a +20vw (movimiento lateral suave)
  const ty = 120 + 'vh'; // Caer más abajo para efecto flotante
  e.style.setProperty('--tx', tx);
  e.style.setProperty('--ty', ty);
  e.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg'); // Rotación más lenta
  
  // Duración de animación variable para caída muy suave
  const duration = 12 + Math.random() * 8; // 12-20 segundos
  e.style.animation = `fall ${duration}s ease-in-out forwards`;

  // Elementos temáticos de boda más serios y elegantes
  const weddingElements = [
    '🌹', '🌷', '🌺', '🌸', // Flores románticas
    '💕', '💓', // Corazones sutiles
    '✨', '⭐', // Brillos elegantes
    '🍃', '🌿'  // Elementos naturales serios
  ];

  const randomElement = weddingElements[Math.floor(Math.random() * weddingElements.length)];
  e.textContent = randomElement;

  // Aplicar colores elegantes y poco saturados
  const weddingColors = [
    '#d18485', // Tu color accent principal
    '#c26d6e', // Color del sobre
    '#c8b5b6', // Rosa grisáceo suave
    '#b8b5b6', // Gris rosado muy suave
    '#e0d7d8', // Rosa blanquecino
    '#a8a5a6', // Gris neutro
    '#d0c8c9', // Rosa pálido
    '#b0a8a9'  // Gris rosado pálido
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
    const delay = i * 40 + Math.random() * 60; // 40-100ms entre pétalos
    
    setTimeout(() => {
      // Posición aleatoria en la parte superior
      const startX = Math.random() * 100; // 0-100vw
      const startY = -5; // Empezar desde arriba
      
      makePetal(startX, startY);
    }, delay);
  }
}

// Abrir sobre con transiciones suaves
openBtn.addEventListener('click', () => {
  openBtn.classList.add('opened');

  setTimeout(() => {
    // 1) desvanece el splash
    splash.classList.add('fade-out');

    // Espera a que el splash termine su fade (≈350ms)
    setTimeout(() => {
      splash.style.display = 'none';

      // 2) prepara la invitación para animar
      invite.classList.remove('hidden');           // vuelve a ocupar layout
      invite.setAttribute('aria-hidden', 'false');

      // 3) fuerza un reflow para que el navegador “registre” el estado inicial
      //    y sí dispare la transición al agregar .show
      void invite.offsetWidth; // hackcito seguro

      // 4) dispara la animación de entrada
      invite.classList.add('show');

      // Extras: confeti y pétalos flotantes
      burstPetals(120);
      setTimeout(() => { createFloatingPetals(); }, 2000);

    }, 600); // mismo tiempo que el CSS del splash
  }, 900);   // coincide con tu animación del sobre
});



// Función para crear pétalos flotantes temáticos de boda
function createFloatingPetals() {
  for (let i = 0; i < 20; i++) { // Reducido de 30 a 20
    setTimeout(() => {
      const petal = document.createElement('div');
      petal.className = 'floating-petal';

      const size = Math.random() * 16 + 8; // 8-24px
      petal.style.fontSize = size + 'px';
      petal.style.left = Math.random() * 100 + 'vw';
      petal.style.top = Math.random() * 100 + 'vh';

      // Elementos temáticos de boda más serios y elegantes
      const weddingElements = [
        '🌹', '🌷', '🌺', '🌸', // Flores románticas
        '💕', '💓', // Corazones sutiles
        '✨', '⭐', // Brillos elegantes
        '🍃', '🌿'  // Elementos naturales serios
      ];

      const randomElement = weddingElements[Math.floor(Math.random() * weddingElements.length)];
      petal.textContent = randomElement;

      // Aplicar colores elegantes y poco saturados
      const weddingColors = [
        '#d18485', // Tu color accent principal
        '#c26d6e', // Color del sobre
        '#c8b5b6', // Rosa grisáceo suave
        '#b8b5b6', // Gris rosado muy suave
        '#e0d7d8', // Rosa blanquecino
        '#a8a5a6', // Gris neutro
        '#d0c8c9', // Rosa pálido
        '#b0a8a9'  // Gris rosado pálido
      ];

      const randomColor = weddingColors[Math.floor(Math.random() * weddingColors.length)];
      petal.style.color = randomColor;

      // Variación muy sutil y elegante en el color
      petal.style.filter = `hue-rotate(${Math.random() * 12 - 6}deg) brightness(${0.97 + Math.random() * 0.06}) saturate(${0.5 + Math.random() * 0.15})`;

      document.body.appendChild(petal);

      // Remover después de un tiempo
      setTimeout(() => petal.remove(), 8000 + Math.random() * 4000);
    }, i * 400); // Espaciado mayor entre pétalos
  }
}

// Carrusel automático
const slider = document.getElementById('slider');
const prev = document.getElementById('prev');
const next = document.getElementById('next');

// Variables para el carrusel automático
let currentSlide = 0;
const slides = slider.querySelectorAll('img');
const totalSlides = slides.length;
let autoSlideInterval;

// Función para ir a una slide específica
function goToSlide(slideIndex) {
  if (slideIndex < 0) slideIndex = totalSlides - 1;
  if (slideIndex >= totalSlides) slideIndex = 0;
  
  currentSlide = slideIndex;
  const slideWidth = slider.clientWidth;
  slider.scrollTo({
    left: slideWidth * currentSlide,
    behavior: 'smooth'
  });
  
  // Actualizar indicadores
  updateIndicators();
}

// Función para actualizar indicadores
function updateIndicators() {
  const indicators = document.querySelectorAll('.carousel-indicator');
  indicators.forEach((indicator, index) => {
    if (index === currentSlide) {
      indicator.classList.add('active');
    } else {
      indicator.classList.remove('active');
    }
  });
}

// Función para siguiente slide
function nextSlide() {
  goToSlide(currentSlide + 1);
}

// Función para slide anterior
function prevSlide() {
  goToSlide(currentSlide - 1);
}

// Iniciar carrusel automático
function startAutoSlide() {
  autoSlideInterval = setInterval(nextSlide, 4000); // Cambiar cada 4 segundos
}

// Detener carrusel automático
function stopAutoSlide() {
  clearInterval(autoSlideInterval);
}

// Event listeners para botones manuales
prev.addEventListener('click', () => {
  stopAutoSlide();
  prevSlide();
  startAutoSlide(); // Reiniciar automático
});

next.addEventListener('click', () => {
  stopAutoSlide();
  nextSlide();
  startAutoSlide(); // Reiniciar automático
});

// Pausar automático al hacer hover
slider.addEventListener('mouseenter', stopAutoSlide);
slider.addEventListener('mouseleave', startAutoSlide);

// Event listeners para indicadores
document.querySelectorAll('.carousel-indicator').forEach((indicator, index) => {
  indicator.addEventListener('click', () => {
    stopAutoSlide();
    goToSlide(index);
    startAutoSlide();
  });
});

// Iniciar carrusel automático
startAutoSlide();

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
