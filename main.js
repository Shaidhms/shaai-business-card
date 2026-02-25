/* ============================================
   S.H.A.A.I Solutions - 3D Interactive Card
   Three.js Background + Card Physics
   ============================================ */

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

// Create floating icosahedrons
for (let i = 0; i < 8; i++) {
  const geometry = new THREE.IcosahedronGeometry(
    Math.random() * 0.8 + 0.3,
    0
  );
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
    rotSpeed: {
      x: (Math.random() - 0.5) * 0.005,
      y: (Math.random() - 0.5) * 0.005,
    },
    floatSpeed: Math.random() * 0.002 + 0.001,
    floatOffset: Math.random() * Math.PI * 2,
  };
  shapeGroup.add(mesh);
  shapes.push(mesh);
}

// Create floating octahedrons
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
    rotSpeed: {
      x: (Math.random() - 0.5) * 0.003,
      y: (Math.random() - 0.5) * 0.003,
    },
    floatSpeed: Math.random() * 0.001 + 0.0005,
    floatOffset: Math.random() * Math.PI * 2,
  };
  shapeGroup.add(mesh);
  shapes.push(mesh);
}

scene.add(shapeGroup);

// ==========================================
// MOUSE TRACKING
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

  // Smooth mouse
  mouse.x += (mouse.targetX - mouse.x) * 0.05;
  mouse.y += (mouse.targetY - mouse.y) * 0.05;

  // Animate particles
  const positions = particles.geometry.attributes.position.array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] += particleSpeeds[i].x;
    positions[i * 3 + 1] += particleSpeeds[i].y;
    positions[i * 3 + 2] += particleSpeeds[i].z;

    // Wrap around
    if (Math.abs(positions[i * 3]) > 30) particleSpeeds[i].x *= -1;
    if (Math.abs(positions[i * 3 + 1]) > 30) particleSpeeds[i].y *= -1;
    if (Math.abs(positions[i * 3 + 2]) > 15) particleSpeeds[i].z *= -1;
  }
  particles.geometry.attributes.position.needsUpdate = true;

  // Update connection lines
  let lineIndex = 0;
  const linePos = lines.geometry.attributes.position.array;
  const CONNECTION_DIST = 8;

  for (let i = 0; i < PARTICLE_COUNT && lineIndex < MAX_LINES; i++) {
    for (let j = i + 1; j < PARTICLE_COUNT && lineIndex < MAX_LINES; j++) {
      const dx = positions[i * 3] - positions[j * 3];
      const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
      const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < CONNECTION_DIST) {
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

  // Animate shapes
  shapes.forEach((shape) => {
    shape.rotation.x += shape.userData.rotSpeed.x;
    shape.rotation.y += shape.userData.rotSpeed.y;
    shape.position.y += Math.sin(time + shape.userData.floatOffset) * shape.userData.floatSpeed;
  });

  // Scene follows mouse slightly
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
const flipBackBtn = document.getElementById('flipBackBtn');
const instruction = document.getElementById('instruction');
let isFlipped = false;
let isDragging = false;
let hasFlippedOnce = false;

// --- Card Tilt (Mouse/Touch) ---
let tiltX = 0;
let tiltY = 0;
let targetTiltX = 0;
let targetTiltY = 0;
let currentFlipAngle = 0;
let targetFlipAngle = 0;

cardContainer.addEventListener('mousemove', (e) => {
  if (isDragging) return;
  const rect = cardContainer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  targetTiltX = ((y - centerY) / centerY) * -12;
  targetTiltY = ((x - centerX) / centerX) * 12;
});

cardContainer.addEventListener('mouseleave', () => {
  targetTiltX = 0;
  targetTiltY = 0;
});

// Touch tilt
cardContainer.addEventListener('touchmove', (e) => {
  if (isDragging) return;
  const touch = e.touches[0];
  const rect = cardContainer.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  targetTiltX = ((y - centerY) / centerY) * -8;
  targetTiltY = ((x - centerX) / centerX) * 8;
}, { passive: true });

cardContainer.addEventListener('touchend', () => {
  targetTiltX = 0;
  targetTiltY = 0;
});

// --- Device Orientation (Gyroscope for mobile) ---
if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma !== null && e.beta !== null) {
      targetTiltY = Math.max(-15, Math.min(15, e.gamma * 0.4));
      targetTiltX = Math.max(-15, Math.min(15, (e.beta - 45) * 0.3));
    }
  });
}

// --- Tilt Animation Loop ---
function animateTilt() {
  requestAnimationFrame(animateTilt);

  tiltX += (targetTiltX - tiltX) * 0.08;
  tiltY += (targetTiltY - tiltY) * 0.08;

  // Smooth flip interpolation
  targetFlipAngle = isFlipped ? 180 : 0;
  currentFlipAngle += (targetFlipAngle - currentFlipAngle) * 0.1;
  card.style.transform = `rotateY(${currentFlipAngle + tiltY}deg) rotateX(${tiltX}deg)`;

  // Update shine position
  const shines = card.querySelectorAll('.card-shine');
  shines.forEach((shine) => {
    const shiftX = tiltY * 3;
    const shiftY = tiltX * 3;
    shine.style.transform = `translateX(${shiftX}px) translateY(${shiftY}px)`;
  });
}

animateTilt();

// --- Flip Card ---
function flipCard() {
  isFlipped = !isFlipped;

  // Hide instruction after first flip
  if (!hasFlippedOnce) {
    hasFlippedOnce = true;
    instruction.classList.add('hidden');
  }

  // Create burst particles
  createFlipBurst();
}

cardContainer.addEventListener('click', (e) => {
  // Don't flip if clicking interactive elements on the back
  if (isFlipped) {
    const target = e.target;
    if (
      target.closest('a') ||
      target.closest('.save-btn') ||
      target.closest('.share-btn') ||
      target.closest('.flip-back-btn')
    ) {
      return;
    }
  }
  flipCard();
});

flipBackBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (isFlipped) flipCard();
});

// --- Flip Burst Particles ---
function createFlipBurst() {
  const container = document.createElement('div');
  container.className = 'flip-particles';
  document.body.appendChild(container);

  const cardRect = cardContainer.getBoundingClientRect();
  const cx = cardRect.left + cardRect.width / 2;
  const cy = cardRect.top + cardRect.height / 2;

  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.className = 'flip-particle';
    const angle = (Math.PI * 2 * i) / 20;
    const distance = 60 + Math.random() * 80;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;

    particle.style.left = cx + 'px';
    particle.style.top = cy + 'px';
    particle.style.setProperty('--tx', tx + 'px');
    particle.style.setProperty('--ty', ty + 'px');
    particle.style.background =
      Math.random() > 0.5 ? '#d4a574' : '#06b6d4';
    particle.style.animationDelay = Math.random() * 0.1 + 's';
    container.appendChild(particle);
  }

  setTimeout(() => container.remove(), 1000);
}

// ==========================================
// SAVE CONTACT (vCard)
// ==========================================
document.getElementById('saveContact').addEventListener('click', (e) => {
  e.stopPropagation();

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

  const shareData = {
    title: 'Shaid Hakkeem | S.H.A.A.I Solutions',
    text: 'Check out Shaid Hakkeem - Web Development & Digital Solutions. Turning Ideas Into Reality!',
    url: 'https://www.shaid360.com',
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      // Fallback: copy link to clipboard
      await navigator.clipboard.writeText(shareData.url);
      showToast('Link copied!', 'fa-solid fa-link');
    }
  } catch (err) {
    // User cancelled or error - copy as fallback
    try {
      await navigator.clipboard.writeText(shareData.url);
      showToast('Link copied!', 'fa-solid fa-link');
    } catch {
      showToast('Visit shaid360.com', 'fa-solid fa-globe');
    }
  }
});

// ==========================================
// TOAST NOTIFICATION
// ==========================================
function showToast(message, icon) {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="${icon}"></i> ${message}`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 2500);
}

// ==========================================
// LOADER
// ==========================================
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
  }, 2000);
});

// ==========================================
// KEYBOARD SHORTCUT (for demo/presentation)
// ==========================================
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    flipCard();
  }
});
