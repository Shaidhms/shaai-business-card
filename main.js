/* ============================================
   S.H.A.A.I Solutions - 3D Interactive Card v2
   Mobile-Optimized + Physics + Sound + Holo
   ============================================ */

const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) ||
  ('ontouchstart' in window);

// ==========================================
// SOUND ENGINE (Web Audio API)
// ==========================================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let isMuted = false;

function initAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
  if (isMuted || !audioCtx) return;
  try {
    if (type === 'whoosh') playSwoosh();
    else if (type === 'click') playClick();
    else if (type === 'intro') playIntroChord();
    else if (type === 'bounce') playBounce();
  } catch (e) { /* silent */ }
}

function playSwoosh() {
  const d = 0.25, t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + d);
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1200, t);
  filter.frequency.exponentialRampToValueAtTime(300, t + d);
  filter.Q.value = 2;
  gain.gain.setValueAtTime(0.06, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + d);
  osc.connect(filter).connect(gain).connect(audioCtx.destination);
  osc.start(); osc.stop(t + d);
}

function playClick() {
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine'; osc.frequency.value = 1200;
  gain.gain.setValueAtTime(0.04, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(); osc.stop(t + 0.06);
}

function playBounce() {
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(150, t + 0.15);
  gain.gain.setValueAtTime(0.05, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(); osc.stop(t + 0.15);
}

function playIntroChord() {
  const t = audioCtx.currentTime;
  [220, 277, 330, 440].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.03, t + 0.3 + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t + i * 0.08); osc.stop(t + 2);
  });
}

// Mute button
const muteBtn = document.getElementById('muteBtn');
const muteIcon = document.getElementById('muteIcon');
muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  isMuted = !isMuted;
  muteBtn.classList.toggle('muted', isMuted);
  muteIcon.className = isMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
});

// Init audio on first interaction
function firstInteraction() {
  initAudio();
  document.removeEventListener('touchstart', firstInteraction);
  document.removeEventListener('click', firstInteraction);
}
document.addEventListener('click', firstInteraction);
document.addEventListener('touchstart', firstInteraction);

// ==========================================
// CINEMATIC INTRO
// ==========================================
const introBrand = document.getElementById('introBrand');
const introText = 'S.H.A.A.I';
let charIndex = 0;

function typeIntro() {
  if (charIndex < introText.length) {
    introBrand.textContent += introText[charIndex];
    charIndex++;
    setTimeout(typeIntro, 100 + Math.random() * 80);
  }
}

setTimeout(typeIntro, 1000);

setTimeout(() => {
  document.getElementById('cinematicIntro').classList.add('hidden');
  initAudio();
  playSound('intro');
}, 3200);

// ==========================================
// THREE.JS SCENE SETUP
// ==========================================
const canvas = document.getElementById('bg-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.setClearColor(0x06060e, 1);
camera.position.z = 30;

// ==========================================
// PARTICLES (reduced on mobile)
// ==========================================
const PARTICLE_COUNT = isMobile ? 120 : 300;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
const particleSpeeds = [];

for (let i = 0; i < PARTICLE_COUNT; i++) {
  particlePositions[i * 3] = (Math.random() - 0.5) * 60;
  particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 60;
  particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 30;
  particleSpeeds.push({
    x: (Math.random() - 0.5) * 0.008,
    y: (Math.random() - 0.5) * 0.008,
    z: (Math.random() - 0.5) * 0.004,
  });
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

const particleMaterial = new THREE.PointsMaterial({
  size: isMobile ? 0.12 : 0.08,
  color: 0xd4a574,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// ==========================================
// CONNECTION LINES (reduced on mobile)
// ==========================================
const MAX_LINES = isMobile ? 150 : 500;
const lineGeometry = new THREE.BufferGeometry();
const linePositions = new Float32Array(MAX_LINES * 6);
lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
lineGeometry.setDrawRange(0, 0);

const lineMaterial = new THREE.LineBasicMaterial({
  color: 0xd4a574,
  transparent: true,
  opacity: 0.08,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
scene.add(lines);

// ==========================================
// FLOATING SHAPES (reduced on mobile)
// ==========================================
const shapes = [];
const shapeGroup = new THREE.Group();
const SHAPE_COUNT = isMobile ? 5 : 8;
const OCTA_COUNT = isMobile ? 3 : 5;

for (let i = 0; i < SHAPE_COUNT; i++) {
  const geo = new THREE.IcosahedronGeometry(Math.random() * 0.8 + 0.3, 0);
  const mat = new THREE.MeshBasicMaterial({
    color: i % 2 === 0 ? 0xd4a574 : 0x06b6d4,
    wireframe: true, transparent: true, opacity: 0.12,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 20);
  mesh.userData = {
    rotSpeed: { x: (Math.random() - 0.5) * 0.005, y: (Math.random() - 0.5) * 0.005 },
    floatSpeed: Math.random() * 0.002 + 0.001,
    floatOffset: Math.random() * Math.PI * 2,
  };
  shapeGroup.add(mesh); shapes.push(mesh);
}

for (let i = 0; i < OCTA_COUNT; i++) {
  const geo = new THREE.OctahedronGeometry(Math.random() * 0.6 + 0.2, 0);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xd4a574, wireframe: true, transparent: true, opacity: 0.08,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 15);
  mesh.userData = {
    rotSpeed: { x: (Math.random() - 0.5) * 0.003, y: (Math.random() - 0.5) * 0.003 },
    floatSpeed: Math.random() * 0.001 + 0.0005,
    floatOffset: Math.random() * Math.PI * 2,
  };
  shapeGroup.add(mesh); shapes.push(mesh);
}

scene.add(shapeGroup);

// ==========================================
// MOUSE TRACKING (background parallax)
// ==========================================
const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

window.addEventListener('mousemove', (e) => {
  mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
});

// ==========================================
// THREE.JS ANIMATION LOOP
// ==========================================
let time = 0;
let lineFrame = 0;
const LINE_UPDATE_INTERVAL = isMobile ? 3 : 1;

function animateScene() {
  requestAnimationFrame(animateScene);
  time += 0.01;

  mouse.x += (mouse.targetX - mouse.x) * 0.05;
  mouse.y += (mouse.targetY - mouse.y) * 0.05;

  const positions = particles.geometry.attributes.position.array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] += particleSpeeds[i].x;
    positions[i * 3 + 1] += particleSpeeds[i].y;
    positions[i * 3 + 2] += particleSpeeds[i].z;
    if (Math.abs(positions[i * 3]) > 30) particleSpeeds[i].x *= -1;
    if (Math.abs(positions[i * 3 + 1]) > 30) particleSpeeds[i].y *= -1;
    if (Math.abs(positions[i * 3 + 2]) > 15) particleSpeeds[i].z *= -1;
  }
  particles.geometry.attributes.position.needsUpdate = true;

  // Update lines every N frames on mobile for performance
  lineFrame++;
  if (lineFrame >= LINE_UPDATE_INTERVAL) {
    lineFrame = 0;
    let lineIndex = 0;
    const linePos = lines.geometry.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT && lineIndex < MAX_LINES; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT && lineIndex < MAX_LINES; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const dist = dx * dx + dy * dy + dz * dz; // skip sqrt for perf
        if (dist < 64) { // 8*8
          linePos[lineIndex * 6] = positions[i * 3];
          linePos[lineIndex * 6 + 1] = positions[i * 3 + 1];
          linePos[lineIndex * 6 + 2] = positions[i * 3 + 2];
          linePos[lineIndex * 6 + 3] = positions[j * 3];
          linePos[lineIndex * 6 + 4] = positions[j * 3 + 1];
          linePos[lineIndex * 6 + 5] = positions[j * 3 + 2];
          lineIndex++;
        }
      }
    }
    lines.geometry.setDrawRange(0, lineIndex * 2);
    lines.geometry.attributes.position.needsUpdate = true;
  }

  shapes.forEach((shape) => {
    shape.rotation.x += shape.userData.rotSpeed.x;
    shape.rotation.y += shape.userData.rotSpeed.y;
    shape.position.y += Math.sin(time + shape.userData.floatOffset) * shape.userData.floatSpeed;
  });

  shapeGroup.rotation.y = mouse.x * 0.08;
  shapeGroup.rotation.x = mouse.y * 0.05;
  particles.rotation.y = mouse.x * 0.03;
  particles.rotation.x = mouse.y * 0.02;

  renderer.render(scene, camera);
}

animateScene();

// ==========================================
// RESIZE HANDLER
// ==========================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
});

// ==========================================
// CARD ELEMENTS
// ==========================================
const card = document.getElementById('card');
const cardContainer = document.getElementById('cardContainer');
const flipBackBtn = document.getElementById('flipBackBtn');
const instruction = document.getElementById('instruction');
let isFlipped = false;
let hasFlippedOnce = false;

// --- Tilt State ---
let tiltX = 0, tiltY = 0;
let targetTiltX = 0, targetTiltY = 0;
let currentFlipAngle = 0;

// --- Throw Physics ---
let throwX = 0, throwY = 0;
let velocityX = 0, velocityY = 0;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let lastDragX = 0, lastDragY = 0, lastDragTime = 0;
let dragDistance = 0;
const FRICTION = 0.93;
const BOUNCE_DAMP = 0.45;
const SPRING_BACK = 0.04;
const DRAG_THRESHOLD = 12;

// ==========================================
// POINTER HELPERS (unified mouse + touch)
// ==========================================
function getPointerPos(e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

// ==========================================
// DRAG START
// ==========================================
function onPointerDown(e) {
  // Skip if clicking interactive elements on back face
  const target = e.target;
  if (target.closest && (
    target.closest('a') ||
    target.closest('.save-btn') ||
    target.closest('.share-btn') ||
    target.closest('.flip-back-btn') ||
    target.closest('.mute-btn')
  )) return;

  const pos = getPointerPos(e);
  isDragging = true;
  dragStartX = pos.x;
  dragStartY = pos.y;
  lastDragX = pos.x;
  lastDragY = pos.y;
  lastDragTime = Date.now();
  dragDistance = 0;
  velocityX = 0;
  velocityY = 0;
  cardContainer.classList.add('grabbing');
}

// ==========================================
// DRAG MOVE
// ==========================================
function onPointerMove(e) {
  if (!isDragging) return;

  // Prevent page scroll/bounce on mobile while dragging card
  if (e.cancelable) e.preventDefault();

  const pos = getPointerPos(e);
  const now = Date.now();
  const dx = pos.x - lastDragX;
  const dy = pos.y - lastDragY;
  const dt = Math.max(now - lastDragTime, 1);

  throwX += dx;
  throwY += dy;
  dragDistance += Math.abs(dx) + Math.abs(dy);

  // Track velocity for throw
  velocityX = (dx / dt) * 16;
  velocityY = (dy / dt) * 16;

  // Tilt towards drag direction
  targetTiltX = Math.max(-15, Math.min(15, -dy * 0.4));
  targetTiltY = Math.max(-15, Math.min(15, dx * 0.4));

  lastDragX = pos.x;
  lastDragY = pos.y;
  lastDragTime = now;
}

// ==========================================
// DRAG END
// ==========================================
function onPointerUp() {
  if (!isDragging) return;
  isDragging = false;
  cardContainer.classList.remove('grabbing');

  // Short tap = flip, long drag = throw
  if (dragDistance < DRAG_THRESHOLD) {
    flipCard();
  }

  targetTiltX = 0;
  targetTiltY = 0;
}

// ==========================================
// EVENT LISTENERS
// ==========================================
// Mouse
cardContainer.addEventListener('mousedown', onPointerDown);
window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp);

// Touch — use { passive: false } on touchmove so we can preventDefault
cardContainer.addEventListener('touchstart', onPointerDown, { passive: true });
window.addEventListener('touchmove', onPointerMove, { passive: false });
window.addEventListener('touchend', onPointerUp);
window.addEventListener('touchcancel', onPointerUp);

// Mouse tilt when NOT dragging (desktop only)
if (!isMobile) {
  cardContainer.addEventListener('mousemove', (e) => {
    if (isDragging) return;
    const rect = cardContainer.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    targetTiltX = ((e.clientY - cy) / (rect.height / 2)) * -10;
    targetTiltY = ((e.clientX - cx) / (rect.width / 2)) * 10;
  });

  cardContainer.addEventListener('mouseleave', () => {
    if (!isDragging) { targetTiltX = 0; targetTiltY = 0; }
  });
}

// Gyroscope (mobile)
if (isMobile && window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientation', (e) => {
    if (!isDragging && e.gamma !== null && e.beta !== null) {
      targetTiltY = Math.max(-15, Math.min(15, e.gamma * 0.5));
      targetTiltX = Math.max(-15, Math.min(15, (e.beta - 45) * 0.35));
    }
  });
}

// Prevent interactive elements from triggering drag
document.querySelectorAll('.back-content a, .save-btn, .share-btn, .flip-back-btn').forEach(el => {
  el.addEventListener('mousedown', (e) => e.stopPropagation());
  el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
});

// ==========================================
// MAIN CARD ANIMATION LOOP
// ==========================================
function animateCard() {
  requestAnimationFrame(animateCard);

  // --- Throw Physics ---
  if (!isDragging) {
    throwX += velocityX;
    throwY += velocityY;
    velocityX *= FRICTION;
    velocityY *= FRICTION;

    // Bounce off screen edges
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    const cw = cardContainer.offsetWidth;
    const ch = cardContainer.offsetHeight;
    const maxX = (ww - cw) / 2;
    const maxY = (wh - ch) / 2;

    if (throwX > maxX) {
      throwX = maxX; velocityX *= -BOUNCE_DAMP;
      if (Math.abs(velocityX) > 0.5) playSound('bounce');
    } else if (throwX < -maxX) {
      throwX = -maxX; velocityX *= -BOUNCE_DAMP;
      if (Math.abs(velocityX) > 0.5) playSound('bounce');
    }

    if (throwY > maxY) {
      throwY = maxY; velocityY *= -BOUNCE_DAMP;
      if (Math.abs(velocityY) > 0.5) playSound('bounce');
    } else if (throwY < -maxY) {
      throwY = -maxY; velocityY *= -BOUNCE_DAMP;
      if (Math.abs(velocityY) > 0.5) playSound('bounce');
    }

    // Spring back when settled
    const speed = Math.abs(velocityX) + Math.abs(velocityY);
    if (speed < 0.3) {
      throwX += (0 - throwX) * SPRING_BACK;
      throwY += (0 - throwY) * SPRING_BACK;
    }
  }

  cardContainer.style.transform = `translate(${throwX}px, ${throwY}px)`;

  // --- Tilt ---
  tiltX += (targetTiltX - tiltX) * 0.08;
  tiltY += (targetTiltY - tiltY) * 0.08;

  // Smooth flip
  const targetFlip = isFlipped ? 180 : 0;
  currentFlipAngle += (targetFlip - currentFlipAngle) * 0.1;
  card.style.transform = `rotateY(${currentFlipAngle + tiltY}deg) rotateX(${tiltX}deg)`;

  // --- Holographic Shimmer ---
  const holoAngle = 135 + tiltY * 3 + tiltX * 2;
  const holoIntensity = Math.min(1, (Math.abs(tiltX) + Math.abs(tiltY)) / 8);
  card.querySelectorAll('.holo-shimmer').forEach((el) => {
    el.style.setProperty('--holo-angle', holoAngle + 'deg');
    el.style.backgroundPosition = `${50 + tiltY * 5}% ${50 + tiltX * 5}%`;
    el.style.opacity = holoIntensity * 0.8;
  });

  // --- Shine ---
  card.querySelectorAll('.card-shine').forEach((el) => {
    el.style.transform = `translateX(${tiltY * 3}px) translateY(${tiltX * 3}px)`;
  });
}

animateCard();

// ==========================================
// FLIP CARD
// ==========================================
function flipCard() {
  isFlipped = !isFlipped;
  playSound('whoosh');

  if (!hasFlippedOnce) {
    hasFlippedOnce = true;
    instruction.classList.add('hidden');
  }

  createFlipBurst();
}

flipBackBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (isFlipped) flipCard();
});

// ==========================================
// FLIP BURST PARTICLES
// ==========================================
function createFlipBurst() {
  const container = document.createElement('div');
  container.className = 'flip-particles';
  document.body.appendChild(container);

  const rect = cardContainer.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const count = isMobile ? 14 : 24;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'flip-particle';
    const angle = (Math.PI * 2 * i) / count;
    const dist = 50 + Math.random() * 80;
    p.style.left = cx + 'px';
    p.style.top = cy + 'px';
    p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
    p.style.background = Math.random() > 0.5 ? '#d4a574' : '#06b6d4';
    p.style.animationDelay = Math.random() * 0.1 + 's';
    container.appendChild(p);
  }

  setTimeout(() => container.remove(), 1000);
}

// ==========================================
// ANIMATED STATS COUNTER
// ==========================================
function animateStats() {
  document.querySelectorAll('.stat-number').forEach((el) => {
    const target = parseInt(el.dataset.target);
    const duration = 1500;
    const start = Date.now();

    function tick() {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    tick();
  });
}

setTimeout(animateStats, 3500);

// ==========================================
// SAVE CONTACT (vCard)
// ==========================================
document.getElementById('saveContact').addEventListener('click', (e) => {
  e.stopPropagation();
  playSound('click');

  const vCard = `BEGIN:VCARD
VERSION:3.0
FN:Muhibbuddin Shaid Hakkeem
N:Hakkeem;Muhibbuddin Shaid;;;
ORG:S.H.A.A.I Solutions
TITLE:Founder - Web Development & Digital Solutions
TEL;TYPE=CELL:+916380257066
EMAIL;TYPE=INTERNET:mail2shaid@gmail.com
URL:https://www.shaid360.com
X-SOCIALPROFILE;TYPE=linkedin:https://www.linkedin.com/in/muhibbuddin-shaid-hakkeem-26a06921/
X-SOCIALPROFILE;TYPE=github:https://github.com/Shaidhms
X-SOCIALPROFILE;TYPE=instagram:https://www.instagram.com/ai360_with_shaid/
NOTE:AI Automation Expert | Voice Agent Builder | 3D Web Designer | SIH Evaluator | Buildathon Winner
END:VCARD`;

  const blob = new Blob([vCard], { type: 'text/vcard' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Shaid_Hakkeem.vcf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Contact saved!', 'fa-solid fa-check');
});

// ==========================================
// SHARE CARD
// ==========================================
document.getElementById('shareCard').addEventListener('click', async (e) => {
  e.stopPropagation();
  playSound('click');

  const data = {
    title: 'Shaid Hakkeem | S.H.A.A.I Solutions',
    text: 'Check out Shaid Hakkeem - Web Development & Digital Solutions!',
    url: 'https://www.shaid360.com',
  };

  try {
    if (navigator.share) await navigator.share(data);
    else { await navigator.clipboard.writeText(data.url); showToast('Link copied!', 'fa-solid fa-link'); }
  } catch {
    try { await navigator.clipboard.writeText(data.url); showToast('Link copied!', 'fa-solid fa-link'); }
    catch { showToast('Visit shaid360.com', 'fa-solid fa-globe'); }
  }
});

// ==========================================
// TOAST
// ==========================================
function showToast(msg, icon) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<i class="${icon}"></i> ${msg}`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2500);
}

// ==========================================
// KEYBOARD
// ==========================================
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && document.activeElement !== chatInput) {
    e.preventDefault();
    flipCard();
  }
});

// ==========================================
// CHATBOT - FAQ Engine
// ==========================================
const chatFab = document.getElementById('chatFab');
const chatFabIcon = document.getElementById('chatFabIcon');
const chatPanel = document.getElementById('chatPanel');
const chatClose = document.getElementById('chatClose');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const chatSuggestions = document.getElementById('chatSuggestions');
let chatOpen = false;

// Knowledge base
const faqData = [
  {
    keywords: ['who', 'about', 'yourself', 'introduce', 'name', 'you'],
    answer: "I'm Muhibbuddin Shaid Hakkeem, founder of S.H.A.A.I Solutions. I specialize in Web Development, AI Automation, Voice Agents, and 3D Interactive Websites. With 15+ years of experience, I turn ideas into reality for clients across India and the Gulf region."
  },
  {
    keywords: ['do', 'services', 'offer', 'what do', 'work', 'specialize'],
    answer: "I offer a range of digital solutions:\n\n- Web Development (React, Next.js, full-stack)\n- AI Automation & AI Agents\n- Voice Agent Development\n- 3D Interactive Website Design\n- E-Commerce Solutions\n- Mobile App Development\n- Digital Consulting & Strategy"
  },
  {
    keywords: ['project', 'portfolio', 'built', 'made', 'created', 'recent'],
    answer: "Here are some recent projects:\n\n- Voice AI Agents for business automation\n- 3D Interactive Portfolios & Websites\n- AI-powered Business Dashboards\n- E-Commerce platforms for clients\n- Mobile applications\n- Purrkin Pets product tracking dashboard\n\nVisit shaid360.com for the full portfolio!"
  },
  {
    keywords: ['available', 'availability', 'hire', 'freelance', 'open', 'free', 'busy'],
    answer: "Yes, I'm currently available for freelance projects and collaborations! I work with clients globally and can take on new projects. Feel free to reach out to discuss your requirements.\n\nEmail: mail2shaid@gmail.com\nPhone: +91 63802 57066"
  },
  {
    keywords: ['contact', 'reach', 'email', 'phone', 'call', 'connect', 'touch'],
    answer: "You can reach me through:\n\n- Email: mail2shaid@gmail.com\n- Phone: +91 63802 57066\n- Website: www.shaid360.com\n- LinkedIn: /in/muhibbuddin-shaid-hakkeem\n- GitHub: /Shaidhms\n- Instagram: @ai360_with_shaid\n\nOr tap 'Save Contact' on the card to add me directly!"
  },
  {
    keywords: ['price', 'cost', 'rate', 'charge', 'budget', 'pricing', 'quote', 'much'],
    answer: "Pricing depends on the project scope and complexity. I offer competitive rates and work within various budgets. Let's discuss your project — I can provide a custom quote!\n\nEmail me at mail2shaid@gmail.com with your requirements."
  },
  {
    keywords: ['achieve', 'award', 'certificate', 'hackathon', 'sih', 'buildathon', 'experience'],
    answer: "Key achievements:\n\n- Smart India Hackathon (SIH) Evaluator\n- Buildathon Winner at Social Eagle\n- 15+ years of industry experience\n- 20+ projects delivered\n- Clients across Gulf & India\n- Voice Agent Builder & AI Automation Expert\n- 3D Interactive Web Designer"
  },
  {
    keywords: ['tech', 'stack', 'technology', 'tools', 'language', 'framework', 'skill'],
    answer: "My tech stack includes:\n\n- Frontend: React, Next.js, Three.js, Tailwind CSS\n- Backend: Node.js, Express, Python\n- AI/ML: OpenAI, Voice AI, LLMs, Automation\n- Database: Supabase, MongoDB, PostgreSQL\n- Mobile: React Native, Capacitor\n- Tools: Vercel, Git, Figma, VS Code"
  },
  {
    keywords: ['ai', 'artificial', 'intelligence', 'agent', 'voice', 'automation', 'bot'],
    answer: "I build cutting-edge AI solutions:\n\n- Voice AI Agents for customer support & sales\n- AI Automation workflows for businesses\n- Custom AI chatbots & assistants\n- AI-powered dashboards & analytics\n- LLM integration & prompt engineering\n\nAI is the future, and I help businesses leverage it!"
  },
  {
    keywords: ['3d', 'three', 'interactive', 'website', 'design', 'web'],
    answer: "I create stunning 3D interactive websites using Three.js and WebGL! From immersive portfolios to product showcases, I design experiences that leave a lasting impression — just like this card you're looking at right now!"
  },
  {
    keywords: ['hello', 'hi', 'hey', 'greet', 'good', 'morning', 'evening'],
    answer: "Hey there! Great to connect. I'm Shaid's virtual assistant. Feel free to ask me about his services, projects, availability, or anything else. How can I help you?"
  },
  {
    keywords: ['thank', 'thanks', 'bye', 'great', 'awesome', 'nice', 'cool'],
    answer: "Thank you! It was great chatting. If you need anything else, don't hesitate to ask. You can also save my contact directly from the card. Have a great day!"
  },
  {
    keywords: ['location', 'where', 'based', 'city', 'country', 'remote'],
    answer: "I'm based in India and work with clients globally — including the Gulf region. I'm comfortable with remote collaboration and can work across time zones."
  }
];

function findAnswer(input) {
  const lower = input.toLowerCase().trim();
  let bestMatch = null;
  let bestScore = 0;

  for (const faq of faqData) {
    let score = 0;
    for (const kw of faq.keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }

  if (bestScore > 0) return bestMatch.answer;

  return "That's a great question! For more specific details, you can reach Shaid directly:\n\nEmail: mail2shaid@gmail.com\nPhone: +91 63802 57066\n\nOr try asking about services, projects, availability, or tech stack!";
}

function addMessage(text, sender) {
  const msg = document.createElement('div');
  msg.className = `chat-msg ${sender}`;
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = text;
  msg.appendChild(bubble);
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addTypingIndicator() {
  const msg = document.createElement('div');
  msg.className = 'chat-msg bot';
  msg.id = 'typingIndicator';
  msg.innerHTML = '<div class="chat-typing"><span></span><span></span><span></span></div>';
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

function handleUserMessage(text) {
  if (!text.trim()) return;
  addMessage(text, 'user');
  chatInput.value = '';
  chatSuggestions.style.display = 'none';
  playSound('click');

  // Show typing, then respond
  addTypingIndicator();
  const delay = 400 + Math.random() * 600;
  setTimeout(() => {
    removeTypingIndicator();
    const answer = findAnswer(text);
    addMessage(answer, 'bot');
    playSound('click');
  }, delay);
}

// Toggle chat
chatFab.addEventListener('click', (e) => {
  e.stopPropagation();
  chatOpen = !chatOpen;
  chatPanel.classList.toggle('open', chatOpen);
  chatFab.classList.toggle('active', chatOpen);
  chatFabIcon.className = chatOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-robot';
  if (chatOpen) chatInput.focus();
  playSound('click');
});

chatClose.addEventListener('click', (e) => {
  e.stopPropagation();
  chatOpen = false;
  chatPanel.classList.remove('open');
  chatFab.classList.remove('active');
  chatFabIcon.className = 'fa-solid fa-robot';
});

// Send message
chatSend.addEventListener('click', (e) => {
  e.stopPropagation();
  handleUserMessage(chatInput.value);
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleUserMessage(chatInput.value);
  }
});

// Suggestion chips
document.querySelectorAll('.chat-chip').forEach(chip => {
  chip.addEventListener('click', (e) => {
    e.stopPropagation();
    handleUserMessage(chip.dataset.q);
  });
});

// Prevent chat interactions from triggering card drag
chatPanel.addEventListener('mousedown', (e) => e.stopPropagation());
chatPanel.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
chatFab.addEventListener('mousedown', (e) => e.stopPropagation());
chatFab.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
