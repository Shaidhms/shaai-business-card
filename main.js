/* ============================================
   Shaid Hakkeem - 3D Interactive Card v3
   Ultra-smooth Mobile + Creative Effects
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
const introText = 'SHAID';
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
  // Trigger staggered content entrance
  document.querySelector('.card')?.classList.add('entered');
  // Set explicit opacity so we don't rely on animation fill-mode
  setTimeout(() => {
    document.getElementById('cardContainer').style.opacity = '1';
  }, 1200);
}, 3200);

// ==========================================
// THREE.JS SCENE SETUP
// ==========================================
const canvas = document.getElementById('bg-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !isMobile,
  alpha: true,
  powerPreference: isMobile ? 'low-power' : 'high-performance',
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 2));
renderer.setClearColor(0x06060e, 1);
camera.position.z = 30;

// ==========================================
// PARTICLES (drastically reduced on mobile)
// ==========================================
const PARTICLE_COUNT = isMobile ? 50 : 300;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
const particleSpeeds = [];

for (let i = 0; i < PARTICLE_COUNT; i++) {
  particlePositions[i * 3] = (Math.random() - 0.5) * 60;
  particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 60;
  particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 30;
  particleSpeeds.push({
    x: (Math.random() - 0.5) * 0.006,
    y: (Math.random() - 0.5) * 0.006,
    z: (Math.random() - 0.5) * 0.003,
  });
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

const particleMaterial = new THREE.PointsMaterial({
  size: isMobile ? 0.15 : 0.08,
  color: 0xd4a574,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// ==========================================
// CONNECTION LINES (disabled on mobile!)
// ==========================================
let lines = null;
let linePositionsArr = null;
const MAX_LINES = 500;

if (!isMobile) {
  const lineGeometry = new THREE.BufferGeometry();
  linePositionsArr = new Float32Array(MAX_LINES * 6);
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositionsArr, 3));
  lineGeometry.setDrawRange(0, 0);

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xd4a574,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(lines);
}

// ==========================================
// FLOATING SHAPES (fewer on mobile)
// ==========================================
const shapes = [];
const shapeGroup = new THREE.Group();
const SHAPE_COUNT = isMobile ? 3 : 8;
const OCTA_COUNT = isMobile ? 2 : 5;

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

if (!isMobile) {
  window.addEventListener('mousemove', (e) => {
    mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
  });
}

// ==========================================
// CARD ELEMENTS (cached references)
// ==========================================
const card = document.getElementById('card');
const cardContainer = document.getElementById('cardContainer');
const flipBackBtn = document.getElementById('flipBackBtn');
const instruction = document.getElementById('instruction');
let isFlipped = false;
let hasFlippedOnce = false;

// Cache DOM refs used in animation loop
const holoShimmers = card.querySelectorAll('.holo-shimmer');
const cardShines = card.querySelectorAll('.card-shine');

// --- Tilt State ---
let tiltX = 0, tiltY = 0;
let targetTiltX = 0, targetTiltY = 0;
let currentFlipAngle = 0;
let idleTime = 0;

// ==========================================
// UNIFIED ANIMATION LOOP (single rAF)
// ==========================================
let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 0.01;

  // --- Three.js Scene ---
  if (!isMobile) {
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;
  }

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

  // Connection lines (desktop only)
  if (lines) {
    let lineIndex = 0;
    const linePos = lines.geometry.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT && lineIndex < MAX_LINES; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT && lineIndex < MAX_LINES; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const dist = dx * dx + dy * dy + dz * dz;
        if (dist < 64) {
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

  if (!isMobile) {
    shapeGroup.rotation.y = mouse.x * 0.08;
    shapeGroup.rotation.x = mouse.y * 0.05;
    particles.rotation.y = mouse.x * 0.03;
    particles.rotation.x = mouse.y * 0.02;
  }

  renderer.render(scene, camera);

  // --- Card Animation ---
  // Idle floating effect (subtle auto-tilt when no interaction)
  idleTime += 0.008;
  if (Math.abs(targetTiltX) < 0.5 && Math.abs(targetTiltY) < 0.5) {
    const idleTiltX = Math.sin(idleTime * 0.7) * 2;
    const idleTiltY = Math.cos(idleTime * 0.5) * 2.5;
    tiltX += (idleTiltX - tiltX) * 0.03;
    tiltY += (idleTiltY - tiltY) * 0.03;
  } else {
    const tiltSpeed = isMobile ? 0.12 : 0.08;
    tiltX += (targetTiltX - tiltX) * tiltSpeed;
    tiltY += (targetTiltY - tiltY) * tiltSpeed;
  }

  // Smooth flip
  const targetFlip = isFlipped ? 180 : 0;
  const flipSpeed = isMobile ? 0.15 : 0.12;
  currentFlipAngle += (targetFlip - currentFlipAngle) * flipSpeed;
  card.style.transform = `rotateY(${currentFlipAngle + tiltY}deg) rotateX(${tiltX}deg)`;

  // Holographic Shimmer (cached refs, no querySelectorAll)
  const holoAngle = 135 + tiltY * 3 + tiltX * 2;
  const holoIntensity = Math.min(1, (Math.abs(tiltX) + Math.abs(tiltY)) / 6);
  for (let i = 0; i < holoShimmers.length; i++) {
    holoShimmers[i].style.setProperty('--holo-angle', holoAngle + 'deg');
    holoShimmers[i].style.backgroundPosition = `${50 + tiltY * 5}% ${50 + tiltX * 5}%`;
    holoShimmers[i].style.opacity = holoIntensity * 0.8;
  }

  // Shine (cached refs)
  for (let i = 0; i < cardShines.length; i++) {
    cardShines[i].style.transform = `translateX(${tiltY * 3}px) translateY(${tiltX * 3}px)`;
  }
}

animate();

// ==========================================
// RESIZE HANDLER
// ==========================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 2));
});

// ==========================================
// TAP TO FLIP (with ripple effect)
// ==========================================
cardContainer.addEventListener('click', (e) => {
  const target = e.target;
  if (target.closest && (
    target.closest('a') ||
    target.closest('button') ||
    target.closest('.chat-panel') ||
    target.closest('.chat-fab') ||
    target.closest('.mute-btn')
  )) return;
  createRipple(e);
  flipCard();
});

// ==========================================
// TAP RIPPLE EFFECT
// ==========================================
function createRipple(e) {
  const ripple = document.createElement('div');
  ripple.className = 'tap-ripple';
  const x = e.clientX || (window.innerWidth / 2);
  const y = e.clientY || (window.innerHeight / 2);
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
}

// ==========================================
// MOUSE TILT (desktop only)
// ==========================================
if (!isMobile) {
  cardContainer.addEventListener('mousemove', (e) => {
    const rect = cardContainer.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    targetTiltX = ((e.clientY - cy) / (rect.height / 2)) * -10;
    targetTiltY = ((e.clientX - cx) / (rect.width / 2)) * 10;
  });

  cardContainer.addEventListener('mouseleave', () => {
    targetTiltX = 0;
    targetTiltY = 0;
  });
}

// ==========================================
// GYROSCOPE TILT (mobile)
// ==========================================
if (isMobile && window.DeviceOrientationEvent) {
  let lastGamma = 0, lastBeta = 0;

  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma !== null && e.beta !== null) {
      // Smooth out noisy gyroscope readings
      lastGamma += (e.gamma - lastGamma) * 0.3;
      lastBeta += (e.beta - lastBeta) * 0.3;
      targetTiltY = Math.max(-10, Math.min(10, lastGamma * 0.35));
      targetTiltX = Math.max(-10, Math.min(10, (lastBeta - 45) * 0.25));
    }
  });
}

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
  createLightLeak();
}

flipBackBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (isFlipped) flipCard();
});

// ==========================================
// FLIP BURST PARTICLES (sparkle style)
// ==========================================
function createFlipBurst() {
  const container = document.createElement('div');
  container.className = 'flip-particles';
  document.body.appendChild(container);

  const rect = cardContainer.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const count = isMobile ? 10 : 20;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'flip-particle';
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const dist = 40 + Math.random() * 100;
    p.style.left = cx + 'px';
    p.style.top = cy + 'px';
    p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
    p.style.setProperty('--rot', (Math.random() * 360) + 'deg');
    // Mix of gold, cyan, and white sparkles
    const colors = ['#d4a574', '#06b6d4', '#e8c9a0', '#fbbf24', '#ffffff'];
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDelay = Math.random() * 0.15 + 's';
    p.style.width = (2 + Math.random() * 4) + 'px';
    p.style.height = p.style.width;
    container.appendChild(p);
  }

  setTimeout(() => container.remove(), 900);
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
// TYPING BIO (cycling roles)
// ==========================================
const typingEl = document.getElementById('typingText');
const roles = [
  'Web Applications',
  'AI Automation',
  'Voice Agents',
  '3D Websites',
  'E-Commerce Stores',
  'Mobile Apps',
  'Business Dashboards',
];
let roleIndex = 0;
let roleCharIndex = 0;
let isDeleting = false;
let typingTimeout = null;

function typeBio() {
  const current = roles[roleIndex];

  if (!isDeleting) {
    typingEl.textContent = current.substring(0, roleCharIndex + 1);
    roleCharIndex++;

    if (roleCharIndex === current.length) {
      // Pause at full text, then start deleting
      typingTimeout = setTimeout(() => { isDeleting = true; typeBio(); }, 2000);
      return;
    }
    typingTimeout = setTimeout(typeBio, 60 + Math.random() * 40);
  } else {
    typingEl.textContent = current.substring(0, roleCharIndex - 1);
    roleCharIndex--;

    if (roleCharIndex === 0) {
      isDeleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      typingTimeout = setTimeout(typeBio, 400);
      return;
    }
    typingTimeout = setTimeout(typeBio, 30);
  }
}

// Start typing bio after card entrance
setTimeout(typeBio, 4200);

// ==========================================
// PROJECTS AUTO-SCROLL (uses scrollLeft, not transform)
// ==========================================
(function() {
  const scrollEl = document.querySelector('.projects-scroll');
  if (!scrollEl) return;
  let scrollDir = 1;
  let userTouching = false;
  let resumeTimeout = null;

  scrollEl.addEventListener('touchstart', () => { userTouching = true; clearTimeout(resumeTimeout); }, { passive: true });
  scrollEl.addEventListener('touchend', () => { resumeTimeout = setTimeout(() => { userTouching = false; }, 3000); }, { passive: true });

  setInterval(() => {
    if (userTouching) return;
    const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
    if (maxScroll <= 0) return;
    scrollEl.scrollLeft += scrollDir * 1;
    if (scrollEl.scrollLeft >= maxScroll) scrollDir = -1;
    if (scrollEl.scrollLeft <= 0) scrollDir = 1;
  }, 30);
})();

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
TITLE:Freelance Developer - Web, AI & Automation
TEL;TYPE=CELL:+916380257066
EMAIL;TYPE=INTERNET:mail2shaid@gmail.com
URL:https://www.shaid360.com
X-SOCIALPROFILE;TYPE=linkedin:https://www.linkedin.com/in/muhibbuddin-shaid-hakkeem-26a06921/
X-SOCIALPROFILE;TYPE=github:https://github.com/Shaidhms
X-SOCIALPROFILE;TYPE=instagram:https://www.instagram.com/ai360_with_shaid/
NOTE:Freelance Developer | AI Automation | Voice Agents | 3D Web Design | SIH Evaluator | Buildathon Winner
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
    title: 'Shaid Hakkeem | Freelance Developer',
    text: 'Check out Shaid Hakkeem - Freelance Web Developer, AI & Automation!',
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
  if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
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
    answer: "I'm Muhibbuddin Shaid Hakkeem, a freelance developer specializing in Web Development, AI Automation, Voice Agents, and 3D Interactive Websites. With 15+ years of experience, I turn ideas into reality for clients across India and the Gulf region."
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

// ==========================================
// CARD EDGE LIGHT LEAK
// ==========================================
function createLightLeak() {
  const rect = cardContainer.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;

  // Vertical edge light (the seam of the flip)
  const edge = document.createElement('div');
  edge.className = 'light-leak-edge';
  edge.style.left = cx + 'px';
  edge.style.top = (rect.top - 25) + 'px';
  edge.style.height = (rect.height + 50) + 'px';
  document.body.appendChild(edge);

  // Ambient screen flash
  const flash = document.createElement('div');
  flash.className = 'light-leak-ambient';
  document.body.appendChild(flash);

  setTimeout(() => { edge.remove(); flash.remove(); }, 900);
}

// ==========================================
// SNAP & LINK - Camera, Form & EmailJS
// ==========================================
// ---- EmailJS Setup ----
// 1. Sign up free at https://www.emailjs.com
// 2. Add Gmail service → copy SERVICE_ID
// 3. Create template with variables: {{name}}, {{phone}}, {{email}}, {{role}}, {{photo}}, {{date}}
// 4. Copy TEMPLATE_ID and PUBLIC_KEY below
const EMAILJS_PUBLIC_KEY = 'sgbvvPX5ZIgnOzmH5';     // <-- Replace
const EMAILJS_SERVICE_ID = 'service_b79gpyv';     // <-- Replace
const EMAILJS_TEMPLATE_ID = 'template_burd1vp';   // <-- Replace

if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

const connectOverlay = document.getElementById('connectOverlay');
const connectCloseBtn = document.getElementById('connectCloseBtn');
const quickConnectBtn = document.getElementById('quickConnectBtn');
const camFeed = document.getElementById('camFeed');
const camCanvas = document.getElementById('camCanvas');
const camPhoto = document.getElementById('camPhoto');
const camPlaceholder = document.getElementById('camPlaceholder');
const camSnapBtn = document.getElementById('camSnapBtn');
const camRetakeBtn = document.getElementById('camRetakeBtn');
const connectNameInput = document.getElementById('connectNameInput');
const connectPhoneInput = document.getElementById('connectPhoneInput');
const connectEmailInput = document.getElementById('connectEmailInput');
const connectRoleInput = document.getElementById('connectRoleInput');
const connectSubmitBtn = document.getElementById('connectSubmitBtn');
const connectSuccess = document.getElementById('connectSuccess');
const successDesc = document.getElementById('successDesc');
const successWhatsapp = document.getElementById('successWhatsapp');
const successDoneBtn = document.getElementById('successDoneBtn');

const camFloatBubble = document.getElementById('camFloatBubble');
let camStream = null;
let photoDataUrl = null;

function openConnect() {
  connectOverlay.classList.add('open');
  camFloatBubble.classList.add('visible');
  startCamera();
  playSound('click');
  document.getElementById('stampDate').textContent =
    new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Open overlay
quickConnectBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  openConnect();
});

// Close overlay
connectCloseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  closeConnect();
});

connectOverlay.addEventListener('click', (e) => {
  if (e.target === connectOverlay) closeConnect();
});

function closeConnect() {
  connectOverlay.classList.remove('open');
  camFloatBubble.classList.remove('visible');
  stopCamera();
  resetConnectForm();
}

// Camera
async function startCamera() {
  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 300 }, height: { ideal: 300 } }
    });
    camFeed.srcObject = camStream;
    camFeed.style.display = 'block';
    camPlaceholder.style.display = 'none';
  } catch (err) {
    camPlaceholder.style.display = 'flex';
    camFeed.style.display = 'none';
  }
}

function stopCamera() {
  if (camStream) {
    camStream.getTracks().forEach(t => t.stop());
    camStream = null;
  }
  camFeed.srcObject = null;
}

// Snap photo
camSnapBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  playSound('click');

  if (camStream) {
    const ctx = camCanvas.getContext('2d');
    camCanvas.width = 300;
    camCanvas.height = 300;
    // Mirror the image to match the mirrored video preview
    ctx.translate(300, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(camFeed, 0, 0, 300, 300);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    photoDataUrl = camCanvas.toDataURL('image/jpeg', 0.85);
    camPhoto.src = photoDataUrl;
    camPhoto.style.display = 'block';
    camFeed.style.display = 'none';
    stopCamera();
  }

  camSnapBtn.style.display = 'none';
  camRetakeBtn.style.display = 'flex';

  // Flash effect on the cam wrap
  const wrap = document.getElementById('connectCamWrap');
  wrap.style.boxShadow = '0 0 30px rgba(255,255,255,0.5), 0 0 60px rgba(212,165,116,0.3)';
  setTimeout(() => { wrap.style.boxShadow = ''; }, 400);
});

// Floating bubble triggers snap
camFloatBubble.addEventListener('click', (e) => {
  e.stopPropagation();
  if (camStream) {
    camSnapBtn.click();
  } else if (!photoDataUrl) {
    // Restart camera and snap
    startCamera().then(() => {
      setTimeout(() => camSnapBtn.click(), 500);
    });
  }
});

// Retake
camRetakeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  camPhoto.style.display = 'none';
  camRetakeBtn.style.display = 'none';
  camSnapBtn.style.display = 'flex';
  photoDataUrl = null;
  startCamera();
});

// Submit
connectSubmitBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const name = connectNameInput.value.trim();
  const phone = connectPhoneInput.value.trim();
  const email = connectEmailInput.value.trim();
  const role = connectRoleInput.value.trim();

  if (!name) {
    connectNameInput.parentElement.style.borderColor = 'rgba(255, 100, 100, 0.5)';
    connectNameInput.focus();
    setTimeout(() => { connectNameInput.parentElement.style.borderColor = ''; }, 2000);
    return;
  }

  playSound('click');

  // Show loading state
  const origBtnHTML = connectSubmitBtn.innerHTML;
  connectSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  connectSubmitBtn.disabled = true;

  const connectionDate = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // Save to localStorage
  const connections = JSON.parse(localStorage.getItem('gff_connections') || '[]');
  connections.push({
    name, phone, email, role,
    photo: photoDataUrl,
    date: new Date().toISOString(),
    event: 'Global Freelancers Festival 2026'
  });
  localStorage.setItem('gff_connections', JSON.stringify(connections));

  // Send email via EmailJS (if configured)
  const emailPromise = (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY')
    ? emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        name,
        phone: phone || 'Not provided',
        email: email || 'Not provided',
        role: role || 'Not provided',
        photo: photoDataUrl || 'No photo taken',
        date: connectionDate,
        event: 'Global Freelancers Festival 2026',
        venue: 'IIT Madras Research Park, Chennai',
      }).catch(() => null)
    : Promise.resolve(null);

  emailPromise.then(() => {
    // Hide form, show success
    document.getElementById('connectGffLogo').style.display = 'none';
    document.getElementById('connectTitle').style.display = 'none';
    document.getElementById('connectDesc').style.display = 'none';
    document.getElementById('connectCamWrap').style.display = 'none';
    document.getElementById('connectCamActions').style.display = 'none';
    document.getElementById('connectFields').style.display = 'none';
    document.getElementById('connectStamp').style.display = 'none';
    connectSubmitBtn.style.display = 'none';

    successDesc.textContent = role
      ? `Nice meeting you, ${name} — ${role}!`
      : `Nice meeting you, ${name}!`;
    const details = [role, phone, email].filter(Boolean).join(' | ');
    const waText = encodeURIComponent(
      `Hi Shaid! I'm ${name}${details ? ' — ' + details : ''} — we just connected at the Global Freelancers Festival 2026! Let's keep in touch.`
    );
    successWhatsapp.href = `https://wa.me/916380257066?text=${waText}`;
    connectSuccess.classList.add('visible');

    // Restore button for next use
    connectSubmitBtn.innerHTML = origBtnHTML;
    connectSubmitBtn.disabled = false;
  });
});

// Done
successDoneBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  closeConnect();
});

function resetConnectForm() {
  connectNameInput.value = '';
  connectPhoneInput.value = '';
  connectEmailInput.value = '';
  connectRoleInput.value = '';
  photoDataUrl = null;
  camPhoto.style.display = 'none';
  camRetakeBtn.style.display = 'none';
  camSnapBtn.style.display = 'flex';
  connectSuccess.classList.remove('visible');

  // Restore form elements
  document.getElementById('connectGffLogo').style.display = '';
  document.getElementById('connectTitle').style.display = '';
  document.getElementById('connectDesc').style.display = '';
  document.getElementById('connectCamWrap').style.display = '';
  document.getElementById('connectCamActions').style.display = '';
  document.getElementById('connectFields').style.display = '';
  document.getElementById('connectStamp').style.display = '';
  connectSubmitBtn.style.display = '';

  camPlaceholder.style.display = 'flex';
  camFeed.style.display = 'none';
}
