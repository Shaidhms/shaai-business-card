/* ============================================
   S.H.A.A.I Solutions - 3D Interactive Card v2
   Three.js + Physics + Sound + Holographic
   ============================================ */

// ==========================================
// SOUND ENGINE (Web Audio API)
// ==========================================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let isMuted = false;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  if (isMuted || !audioCtx) return;
  try {
    if (type === 'whoosh') playSwoosh();
    else if (type === 'click') playClick();
    else if (type === 'intro') playIntroChord();
    else if (type === 'bounce') playBounce();
  } catch (e) { /* silent fail */ }
}

function playSwoosh() {
  const duration = 0.25;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + duration);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1200, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + duration);
  filter.Q.value = 2;

  gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  osc.connect(filter).connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playClick() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 1200;
  gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.06);
}

function playBounce() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

function playIntroChord() {
  const freqs = [220, 277, 330, 440];
  freqs.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.03, audioCtx.currentTime + 0.3 + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + i * 0.08);
    osc.stop(audioCtx.currentTime + 2);
  });
}

// Mute button
const muteBtn = document.getElementById('muteBtn');
const muteIcon = document.getElementById('muteIcon');
muteBtn.addEventListener('click', () => {
  isMuted = !isMuted;
  muteBtn.classList.toggle('muted', isMuted);
  muteIcon.className = isMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
  playSound('click');
});

// Init audio on first interaction
document.addEventListener('click', () => initAudio(), { once: true });
document.addEventListener('touchstart', () => initAudio(), { once: true });

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

// Start typing after dot appears
setTimeout(typeIntro, 1000);

// Hide intro and reveal card
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
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x06060e, 1);
camera.position.z = 30;

// ==========================================
// PARTICLE SYSTEM
// ==========================================
const PARTICLE_COUNT = 300;
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
  size: 0.08,
  color: 0xd4a574,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// ==========================================
// CONNECTION LINES
// ==========================================
const lineGeometry = new THREE.BufferGeometry();
const MAX_LINES = 500;
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
// FLOATING GEOMETRIC SHAPES
// ==========================================
const shapes = [];
const shapeGroup = new THREE.Group();

for (let i = 0; i < 8; i++) {
  const geometry = new THREE.IcosahedronGeometry(Math.random() * 0.8 + 0.3, 0);
  const material = new THREE.MeshBasicMaterial({
    color: i % 2 === 0 ? 0xd4a574 : 0x06b6d4,
    wireframe: true,
    transparent: true,
    opacity: 0.12,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(
    (Math.random() - 0.5) * 40,
    (Math.random() - 0.5) * 40,
    (Math.random() - 0.5) * 20
  );
  mesh.userData = {
    rotSpeed: { x: (Math.random() - 0.5) * 0.005, y: (Math.random() - 0.5) * 0.005 },
    floatSpeed: Math.random() * 0.002 + 0.001,
    floatOffset: Math.random() * Math.PI * 2,
  };
  shapeGroup.add(mesh);
  shapes.push(mesh);
}

for (let i = 0; i < 5; i++) {
  const geometry = new THREE.OctahedronGeometry(Math.random() * 0.6 + 0.2, 0);
  const material = new THREE.MeshBasicMaterial({
    color: 0xd4a574,
    wireframe: true,
    transparent: true,
    opacity: 0.08,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(
    (Math.random() - 0.5) * 50,
    (Math.random() - 0.5) * 50,
    (Math.random() - 0.5) * 15
  );
  mesh.userData = {
    rotSpeed: { x: (Math.random() - 0.5) * 0.003, y: (Math.random() - 0.5) * 0.003 },
    floatSpeed: Math.random() * 0.001 + 0.0005,
    floatOffset: Math.random() * Math.PI * 2,
  };
  shapeGroup.add(mesh);
  shapes.push(mesh);
}

scene.add(shapeGroup);

// ==========================================
// MOUSE TRACKING (for background)
// ==========================================
const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

function onMouseMove(e) {
  const x = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
  const y = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
  mouse.targetX = (x / window.innerWidth) * 2 - 1;
  mouse.targetY = -(y / window.innerHeight) * 2 + 1;
}

window.addEventListener('mousemove', onMouseMove);
window.addEventListener('touchmove', onMouseMove, { passive: true });

// ==========================================
// THREE.JS ANIMATION LOOP
// ==========================================
let time = 0;

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

  let lineIndex = 0;
  const linePos = lines.geometry.attributes.position.array;
  for (let i = 0; i < PARTICLE_COUNT && lineIndex < MAX_LINES; i++) {
    for (let j = i + 1; j < PARTICLE_COUNT && lineIndex < MAX_LINES; j++) {
      const dx = positions[i * 3] - positions[j * 3];
      const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
      const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 8) {
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ==========================================
// CARD INTERACTIONS
// ==========================================
const card = document.getElementById('card');
const cardContainer = document.getElementById('cardContainer');
const cardWrapper = document.getElementById('cardWrapper');
const flipBackBtn = document.getElementById('flipBackBtn');
const instruction = document.getElementById('instruction');
let isFlipped = false;
let hasFlippedOnce = false;

// --- Tilt State ---
let tiltX = 0;
let tiltY = 0;
let targetTiltX = 0;
let targetTiltY = 0;
let currentFlipAngle = 0;
let targetFlipAngle = 0;

// --- Throw Physics State ---
let throwX = 0;
let throwY = 0;
let velocityX = 0;
let velocityY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartTime = 0;
let lastDragX = 0;
let lastDragY = 0;
let lastDragTime = 0;
let dragDistance = 0;
const FRICTION = 0.94;
const BOUNCE_DAMP = 0.5;
const SPRING_BACK = 0.03;
const DRAG_THRESHOLD = 15;

// ==========================================
// THROW PHYSICS - Event Handlers
// ==========================================
function getPointerPos(e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function onDragStart(e) {
  const pos = getPointerPos(e);
  isDragging = true;
  dragStartX = pos.x;
  dragStartY = pos.y;
  dragStartTime = Date.now();
  lastDragX = pos.x;
  lastDragY = pos.y;
  lastDragTime = Date.now();
  dragDistance = 0;
  velocityX = 0;
  velocityY = 0;
  cardContainer.classList.add('grabbing');
}

function onDragMove(e) {
  if (!isDragging) return;
  const pos = getPointerPos(e);
  const now = Date.now();
  const dx = pos.x - lastDragX;
  const dy = pos.y - lastDragY;
  const dt = Math.max(now - lastDragTime, 1);

  throwX += dx;
  throwY += dy;
  dragDistance += Math.abs(dx) + Math.abs(dy);

  velocityX = dx / dt * 16;
  velocityY = dy / dt * 16;

  lastDragX = pos.x;
  lastDragY = pos.y;
  lastDragTime = now;

  // Update tilt based on drag direction
  targetTiltX = Math.max(-15, Math.min(15, -dy * 0.3));
  targetTiltY = Math.max(-15, Math.min(15, dx * 0.3));
}

function onDragEnd() {
  if (!isDragging) return;
  isDragging = false;
  cardContainer.classList.remove('grabbing');

  // If it was a short tap (not a drag), flip the card
  if (dragDistance < DRAG_THRESHOLD) {
    flipCard();
  }

  // Reset tilt targets
  targetTiltX = 0;
  targetTiltY = 0;
}

// Mouse events
cardContainer.addEventListener('mousedown', onDragStart);
window.addEventListener('mousemove', (e) => {
  onDragMove(e);
  // Tilt when not dragging
  if (!isDragging) {
    const rect = cardContainer.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 + throwX;
    const cy = rect.top + rect.height / 2 + throwY;
    targetTiltX = ((e.clientY - cy) / (rect.height / 2)) * -10;
    targetTiltY = ((e.clientX - cx) / (rect.width / 2)) * 10;
  }
});
window.addEventListener('mouseup', onDragEnd);

// Touch events
cardContainer.addEventListener('touchstart', (e) => {
  onDragStart(e);
}, { passive: true });
window.addEventListener('touchmove', (e) => {
  onDragMove(e);
}, { passive: true });
window.addEventListener('touchend', onDragEnd);

// Reset tilt when pointer leaves window
window.addEventListener('mouseleave', () => {
  if (!isDragging) {
    targetTiltX = 0;
    targetTiltY = 0;
  }
});

// --- Device Orientation (Gyroscope) ---
if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientation', (e) => {
    if (!isDragging && e.gamma !== null && e.beta !== null) {
      targetTiltY = Math.max(-15, Math.min(15, e.gamma * 0.4));
      targetTiltX = Math.max(-15, Math.min(15, (e.beta - 45) * 0.3));
    }
  });
}

// ==========================================
// MAIN ANIMATION LOOP (Tilt + Throw + Holo)
// ==========================================
function animateCard() {
  requestAnimationFrame(animateCard);

  // --- Throw Physics ---
  if (!isDragging) {
    // Apply velocity with friction
    throwX += velocityX;
    throwY += velocityY;
    velocityX *= FRICTION;
    velocityY *= FRICTION;

    // Bounce off edges
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    const cw = cardContainer.offsetWidth;
    const ch = cardContainer.offsetHeight;
    const maxX = (ww - cw) / 2;
    const maxY = (wh - ch) / 2;

    if (throwX > maxX) {
      throwX = maxX;
      velocityX *= -BOUNCE_DAMP;
      playSound('bounce');
    } else if (throwX < -maxX) {
      throwX = -maxX;
      velocityX *= -BOUNCE_DAMP;
      playSound('bounce');
    }

    if (throwY > maxY) {
      throwY = maxY;
      velocityY *= -BOUNCE_DAMP;
      playSound('bounce');
    } else if (throwY < -maxY) {
      throwY = -maxY;
      velocityY *= -BOUNCE_DAMP;
      playSound('bounce');
    }

    // Spring back to center when velocity is low
    const speed = Math.abs(velocityX) + Math.abs(velocityY);
    if (speed < 0.5) {
      throwX += (0 - throwX) * SPRING_BACK;
      throwY += (0 - throwY) * SPRING_BACK;
    }
  }

  // Apply position
  cardContainer.style.transform = `translate(${throwX}px, ${throwY}px)`;

  // --- Tilt ---
  tiltX += (targetTiltX - tiltX) * 0.08;
  tiltY += (targetTiltY - tiltY) * 0.08;

  // Smooth flip
  targetFlipAngle = isFlipped ? 180 : 0;
  currentFlipAngle += (targetFlipAngle - currentFlipAngle) * 0.1;
  card.style.transform = `rotateY(${currentFlipAngle + tiltY}deg) rotateX(${tiltX}deg)`;

  // --- Holographic Shimmer ---
  const holoAngle = 135 + tiltY * 3 + tiltX * 2;
  const holoIntensity = Math.min(1, (Math.abs(tiltX) + Math.abs(tiltY)) / 10);
  const holoShimmers = card.querySelectorAll('.holo-shimmer');
  holoShimmers.forEach((shimmer) => {
    shimmer.style.setProperty('--holo-angle', holoAngle + 'deg');
    shimmer.style.backgroundPosition = `${50 + tiltY * 5}% ${50 + tiltX * 5}%`;
    shimmer.style.opacity = holoIntensity * 0.8;
  });

  // --- Shine ---
  const shines = card.querySelectorAll('.card-shine');
  shines.forEach((shine) => {
    shine.style.transform = `translateX(${tiltY * 3}px) translateY(${tiltX * 3}px)`;
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

// Don't flip when clicking interactive elements
cardContainer.addEventListener('click', (e) => {
  // Flip is handled via drag end (short tap)
  // This is kept for elements that stopPropagation
});

flipBackBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (isFlipped) flipCard();
});

// Prevent drag on interactive elements
document.querySelectorAll('.back-content a, .save-btn, .share-btn, .flip-back-btn').forEach(el => {
  el.addEventListener('mousedown', (e) => e.stopPropagation());
  el.addEventListener('touchstart', (e) => e.stopPropagation());
});

// ==========================================
// FLIP BURST PARTICLES
// ==========================================
function createFlipBurst() {
  const container = document.createElement('div');
  container.className = 'flip-particles';
  document.body.appendChild(container);

  const cardRect = cardContainer.getBoundingClientRect();
  const cx = cardRect.left + cardRect.width / 2;
  const cy = cardRect.top + cardRect.height / 2;

  for (let i = 0; i < 24; i++) {
    const particle = document.createElement('div');
    particle.className = 'flip-particle';
    const angle = (Math.PI * 2 * i) / 24;
    const distance = 60 + Math.random() * 100;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;

    particle.style.left = cx + 'px';
    particle.style.top = cy + 'px';
    particle.style.setProperty('--tx', tx + 'px');
    particle.style.setProperty('--ty', ty + 'px');
    particle.style.background = Math.random() > 0.5 ? '#d4a574' : '#06b6d4';
    particle.style.animationDelay = Math.random() * 0.1 + 's';
    container.appendChild(particle);
  }

  setTimeout(() => container.remove(), 1000);
}

// ==========================================
// ANIMATED STATS COUNTER
// ==========================================
function animateStats() {
  const statNumbers = document.querySelectorAll('.stat-number');
  statNumbers.forEach((el) => {
    const target = parseInt(el.dataset.target);
    const duration = 1500;
    const startTime = Date.now();

    function update() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(update);
    }

    update();
  });
}

// Trigger stats after intro
setTimeout(animateStats, 3500);

// ==========================================
// SAVE CONTACT (vCard)
// ==========================================
document.getElementById('saveContact').addEventListener('click', (e) => {
  e.stopPropagation();
  playSound('click');

  const vCardData = `BEGIN:VCARD
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

  const blob = new Blob([vCardData], { type: 'text/vcard' });
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

  const shareData = {
    title: 'Shaid Hakkeem | S.H.A.A.I Solutions',
    text: 'Check out Shaid Hakkeem - Web Development & Digital Solutions. Turning Ideas Into Reality!',
    url: 'https://www.shaid360.com',
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.url);
      showToast('Link copied!', 'fa-solid fa-link');
    }
  } catch {
    try {
      await navigator.clipboard.writeText(shareData.url);
      showToast('Link copied!', 'fa-solid fa-link');
    } catch {
      showToast('Visit shaid360.com', 'fa-solid fa-globe');
    }
  }
});

// ==========================================
// TOAST
// ==========================================
function showToast(message, icon) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="${icon}"></i> ${message}`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 2500);
}

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    flipCard();
  }
});
