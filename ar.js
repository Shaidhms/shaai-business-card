// ===== AR — Video + Premium 3D Layered HUD (Front + Back) =====

const $ = id => document.getElementById(id);
const startScreen = $('start-screen');
const startBtn   = $('start-btn');
const cameraFeed = $('camera-feed');
const arCanvas   = $('ar-canvas');
const arUI       = $('ar-ui');
const arLoading  = $('ar-loading');
const arStatus   = $('ar-status');

let scene, camera, renderer, clock;
let group, hudGroup;
let videoMesh, videoEl, playIcon;
let isPlaying = true;

// Front HUD layers
let bgPanel, frameLayer, photoLayer, identityLayer;
let servicesLayer, achieveLayer, statsLayer;
let accentLayer, scanLine;

// Back layers
let backBg, backFrame, backHeader, backRadar, backTech, backCTA, backScanLine;

let sc = 1, tSc = 1;
let rY = 0, tRY = 0;
let rX = 0, tRX = 0;
let dragging = false, lastX = 0, lastY = 0;

// Gyroscope
let gyroActive = false;
let gyroBeta0 = null, gyroGamma0 = null; // baseline angles

const FS = THREE.FrontSide;
const PI = Math.PI;
const TAU = PI * 2;

startBtn.onclick = init;

// Auto-launch AR immediately — skip start screen
init();

async function init() {
  startScreen.classList.add('hidden');
  arLoading.classList.remove('hidden');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    cameraFeed.srcObject = stream;
    await cameraFeed.play();

    clock = new THREE.Clock();
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
    camera.position.set(0, 0, 4.5);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: arCanvas, alpha: true, antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1));

    const photoTex = await new Promise((res, rej) =>
      new THREE.TextureLoader().load('./photo.jpg', res, undefined, rej)
    );

    group = new THREE.Group();
    scene.add(group);
    buildVideo(group);
    buildHUD(group, photoTex);
    buildBack(group);

    // Try playing with audio first; iOS blocks unmuted autoplay without gesture
    videoEl.play().catch(() => {
      videoEl.muted = true;
      videoEl.play();

      // Show "tap for audio" hint on iOS/iPhone
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        const hint = document.createElement('div');
        hint.textContent = '\u{1F50A} Tap anywhere for audio';
        hint.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:999;padding:8px 18px;border-radius:20px;background:rgba(0,0,0,0.7);color:#fff;font-size:13px;font-family:Inter,sans-serif;backdrop-filter:blur(8px);pointer-events:none;transition:opacity 0.5s;';
        document.body.appendChild(hint);
        // Remove hint after tap
        function removeHint() { hint.style.opacity = '0'; setTimeout(() => hint.remove(), 500); }
        setTimeout(removeHint, 5000); // auto-hide after 5s

        document.addEventListener('touchstart', function unmuteVideo() {
          videoEl.muted = false;
          videoEl.play().catch(() => {});
          removeHint();
          document.removeEventListener('touchstart', unmuteVideo);
        }, { once: true });
      }

      // Also handle click for any device
      document.addEventListener('click', function unmuteVideo() {
        videoEl.muted = false;
        videoEl.play().catch(() => {});
        document.removeEventListener('click', unmuteVideo);
      }, { once: true });
    });

    // Entrance animation
    group.scale.set(0.7, 0.7, 0.7);
    group.traverse(c => { if (c.material) c.material.opacity = 0; });
    const t0 = performance.now();
    (function fadeIn(now) {
      const p = Math.min((now - t0) / 1000, 1);
      const e = 1 - Math.pow(1 - p, 3);
      group.scale.setScalar(0.7 + e * 0.3);
      group.traverse(c => {
        if (c.material && c.material._targetOp != null)
          c.material.opacity = c.material._targetOp * e;
      });
      if (p < 1) requestAnimationFrame(fadeIn);
    })(t0);

    arLoading.classList.add('hidden');
    arUI.classList.remove('hidden');
    arStatus.classList.add('found');

    setupTouch();
    setupGyro();
    addEventListener('resize', resize);
    renderer.setAnimationLoop(loop);

    // Release camera when page is hidden (e.g. switching tabs) so other pages can use it
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && cameraFeed.srcObject) {
        cameraFeed.srcObject.getTracks().forEach(t => t.stop());
        cameraFeed.srcObject = null;
      } else if (!document.hidden && !cameraFeed.srcObject) {
        // Re-acquire camera when returning to this tab
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        }).then(s => { cameraFeed.srcObject = s; cameraFeed.play(); }).catch(() => {});
      }
    });
  } catch (e) {
    console.error(e);
    arLoading.querySelector('p').textContent = 'Camera denied. Reload & allow access.';
  }
}

// ======================================================================
//  VIDEO SECTION (front-facing only)
// ======================================================================
function buildVideo(g) {
  videoEl = document.createElement('video');
  videoEl.src = './intro.mp4';
  videoEl.crossOrigin = 'anonymous';
  videoEl.playsInline = true;
  videoEl.loop = true;
  videoEl.preload = 'auto';

  const vTex = new THREE.VideoTexture(videoEl);
  vTex.minFilter = THREE.LinearFilter;
  vTex.magFilter = THREE.LinearFilter;

  const vw = 1.7, vh = 0.956;
  videoMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(vw, vh),
    new THREE.MeshBasicMaterial({ map: vTex, transparent: true, side: FS })
  );
  videoMesh.material._targetOp = 1;
  videoMesh.position.y = 0.6;
  g.add(videoMesh);

  // Video frame
  const fc = document.createElement('canvas');
  fc.width = 850; fc.height = 478;
  const fx = fc.getContext('2d');
  fx.strokeStyle = 'rgba(212,165,116,0.35)';
  fx.lineWidth = 2;
  fx.strokeRect(3, 3, 844, 472);
  const al = 45;
  fx.strokeStyle = 'rgba(212,165,116,0.8)';
  fx.lineWidth = 3;
  [[3,al,3,3,al,3],[847,al,847,3,850-al,3],
   [3,478-al,3,475,al,475],[847,478-al,847,475,850-al,475]].forEach(c => {
    fx.beginPath(); fx.moveTo(c[0],c[1]); fx.lineTo(c[2],c[3]); fx.lineTo(c[4],c[5]); fx.stroke();
  });
  const frameMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(vw + 0.04, vh + 0.025),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(fc), transparent: true, depthWrite: false, side: FS })
  );
  frameMesh.material._targetOp = 0.7;
  frameMesh.position.set(0, 0.6, 0.001);
  g.add(frameMesh);

  // Play icon
  const ic = document.createElement('canvas');
  ic.width = ic.height = 128;
  const ix = ic.getContext('2d');
  ix.fillStyle = 'rgba(0,0,0,0.5)';
  ix.beginPath(); ix.arc(64,64,50,0,TAU); ix.fill();
  ix.fillStyle = '#fff';
  ix.beginPath(); ix.moveTo(52,38); ix.lineTo(52,90); ix.lineTo(92,64); ix.closePath(); ix.fill();
  playIcon = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(ic), transparent: true, opacity: 0 }));
  playIcon.material._targetOp = 0;
  playIcon.scale.set(0.3, 0.3, 1);
  playIcon.position.set(0, 0.6, 0.01);
  g.add(playIcon);
}

// ======================================================================
//  FRONT HUD — 9 layers (front-facing only)
// ======================================================================
function buildHUD(g, photoTex) {
  hudGroup = new THREE.Group();
  hudGroup.position.y = -0.58;
  g.add(hudGroup);

  const W = 2.2, H = 1.25;

  bgPanel = mkLayer(drawBg, 1600, 900, W, H, 0, 0, -0.18);
  bgPanel.material._targetOp = 0.92;
  hudGroup.add(bgPanel);

  frameLayer = mkLayer(drawFrame, 1600, 900, W, H, 0, 0, -0.08);
  frameLayer.material._targetOp = 0.75;
  hudGroup.add(frameLayer);

  accentLayer = mkLayer(drawAccents, 1600, 900, W, H, 0, 0, -0.03);
  accentLayer.material._targetOp = 0.65;
  hudGroup.add(accentLayer);

  achieveLayer = mkLayer(drawAchievements, 1600, 80, W, 0.11, 0, -0.24, 0.03);
  achieveLayer.material._targetOp = 0.9;
  hudGroup.add(achieveLayer);

  servicesLayer = mkLayer(drawServices, 1600, 200, W, 0.28, 0, -0.05, 0.08);
  servicesLayer.material._targetOp = 0.95;
  hudGroup.add(servicesLayer);

  identityLayer = mkLayer(c => drawIdentity(c), 1600, 200, W, 0.28, 0, 0.28, 0.13);
  identityLayer.material._targetOp = 1;
  hudGroup.add(identityLayer);

  photoLayer = mkLayer(c => drawPhoto(c, photoTex.image), 380, 380, 0.46, 0.46, -0.82, 0.3, 0.20);
  photoLayer.material._targetOp = 1;
  hudGroup.add(photoLayer);

  statsLayer = mkLayer(drawStats, 1600, 200, W, 0.28, 0, -0.45, 0.16);
  statsLayer.material._targetOp = 1;
  hudGroup.add(statsLayer);

  scanLine = mkLayer(drawScanLine, 1600, 20, W, 0.025, 0, 0, 0.24);
  scanLine.material._targetOp = 0.5;
  hudGroup.add(scanLine);
}

// Front-facing layer helper
function mkLayer(drawFn, cw, ch, w, h, x, y, z) {
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  drawFn(c);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: FS, depthWrite: false })
  );
  mesh.position.set(x, y, z);
  return mesh;
}

// Back-facing layer helper — rotated PI so it faces backward
function mkBackLayer(drawFn, cw, ch, w, h, x, y, z) {
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  drawFn(c);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: FS, depthWrite: false })
  );
  mesh.position.set(x, y, z);
  mesh.rotation.y = PI;
  return mesh;
}

// ======================================================================
//  BACK SIDE — Skill radar, tech stack, CTA
// ======================================================================
function buildBack(g) {
  const backGroup = new THREE.Group();
  g.add(backGroup);

  const W = 2.2, H = 2.3;

  // B0: Background (z = 0.20)
  backBg = mkBackLayer(drawBackBg, 1600, 1650, W, H, 0, -0.05, 0.20);
  backBg.material._targetOp = 0.94;
  backGroup.add(backBg);

  // B1: Corner frame (z = 0.10)
  backFrame = mkBackLayer(drawBackFrame, 1600, 1650, W, H, 0, -0.05, 0.10);
  backFrame.material._targetOp = 0.7;
  backGroup.add(backFrame);

  // B2: Header tagline (z = 0.0)
  backHeader = mkBackLayer(drawBackHeader, 1400, 220, 1.9, 0.3, 0, 0.72, 0.0);
  backHeader.material._targetOp = 1;
  backGroup.add(backHeader);

  // B3: Hexagonal skill radar chart (z = -0.10, hero element)
  backRadar = mkBackLayer(drawRadarChart, 900, 900, 1.2, 1.2, 0, 0.08, -0.10);
  backRadar.material._targetOp = 1;
  backGroup.add(backRadar);

  // B4: Tech stack pills (z = -0.05)
  backTech = mkBackLayer(drawTechStack, 1600, 120, W, 0.165, 0, -0.55, -0.05);
  backTech.material._targetOp = 0.9;
  backGroup.add(backTech);

  // B5: CTA + contact summary (z = -0.12)
  backCTA = mkBackLayer(drawBackCTA, 1400, 180, 1.9, 0.245, 0, -0.78, -0.12);
  backCTA.material._targetOp = 0.95;
  backGroup.add(backCTA);

  // B6: Back scan line (z = -0.14)
  backScanLine = mkBackLayer(drawScanLine, 1600, 20, W, 0.025, 0, 0, -0.14);
  backScanLine.material._targetOp = 0.4;
  backGroup.add(backScanLine);
}

// ======================================================================
//  FRONT DRAW FUNCTIONS
// ======================================================================

function drawBg(c) {
  const x = c.getContext('2d'), W = c.width, H = c.height;
  const bg = x.createLinearGradient(0, 0, W * 0.3, H);
  bg.addColorStop(0, 'rgba(12, 15, 35, 0.92)');
  bg.addColorStop(0.5, 'rgba(8, 10, 22, 0.95)');
  bg.addColorStop(1, 'rgba(6, 6, 14, 0.94)');
  x.fillStyle = bg;
  x.beginPath(); x.roundRect(0, 0, W, H, 28); x.fill();

  const ig = x.createRadialGradient(W / 2, 0, 0, W / 2, H * 0.4, W * 0.7);
  ig.addColorStop(0, 'rgba(6, 182, 212, 0.04)');
  ig.addColorStop(0.5, 'rgba(212, 165, 116, 0.02)');
  ig.addColorStop(1, 'rgba(0, 0, 0, 0)');
  x.fillStyle = ig;
  x.fillRect(0, 0, W, H);

  x.fillStyle = 'rgba(212, 165, 116, 0.025)';
  for (let gx = 20; gx < W; gx += 35) {
    for (let gy = 20; gy < H; gy += 35) {
      x.beginPath(); x.arc(gx, gy, 1, 0, TAU); x.fill();
    }
  }
}

function drawFrame(c) {
  const x = c.getContext('2d'), W = c.width, H = c.height;
  const m = 12, L = 65;
  x.strokeStyle = 'rgba(212, 165, 116, 0.15)';
  x.lineWidth = 2;
  x.beginPath(); x.roundRect(m, m, W - m * 2, H - m * 2, 24); x.stroke();

  x.shadowColor = '#d4a574';
  x.shadowBlur = 12;
  x.strokeStyle = 'rgba(212, 165, 116, 0.8)';
  x.lineWidth = 3.5;
  x.beginPath(); x.moveTo(m, m + L); x.lineTo(m, m); x.lineTo(m + L, m); x.stroke();
  x.beginPath(); x.moveTo(W - m - L, m); x.lineTo(W - m, m); x.lineTo(W - m, m + L); x.stroke();
  x.beginPath(); x.moveTo(m, H - m - L); x.lineTo(m, H - m); x.lineTo(m + L, H - m); x.stroke();
  x.beginPath(); x.moveTo(W - m - L, H - m); x.lineTo(W - m, H - m); x.lineTo(W - m, H - m - L); x.stroke();
  x.shadowBlur = 0;

  x.fillStyle = 'rgba(212, 165, 116, 0.35)';
  x.font = "600 18px 'Courier New', monospace";
  x.textAlign = 'right';
  x.fillText('SYS:HUD.v3', W - 30, 36);
  x.textAlign = 'left';
}

function drawAccents(c) {
  const x = c.getContext('2d'), W = c.width, H = c.height;
  const g1 = x.createLinearGradient(60, 0, W - 60, 0);
  g1.addColorStop(0, 'rgba(212,165,116,0)');
  g1.addColorStop(0.2, 'rgba(212,165,116,0.45)');
  g1.addColorStop(0.5, 'rgba(251,191,36,0.65)');
  g1.addColorStop(0.8, 'rgba(212,165,116,0.45)');
  g1.addColorStop(1, 'rgba(212,165,116,0)');
  x.fillStyle = g1;
  x.fillRect(60, 22, W - 120, 2.5);
  x.fillRect(60, H - 24, W - 120, 2.5);

  [305, 510, 680].forEach(y => {
    const gd = x.createLinearGradient(80, y, W - 80, y);
    gd.addColorStop(0, 'rgba(6,182,212,0)');
    gd.addColorStop(0.2, 'rgba(6,182,212,0.15)');
    gd.addColorStop(0.5, 'rgba(6,182,212,0.3)');
    gd.addColorStop(0.8, 'rgba(6,182,212,0.15)');
    gd.addColorStop(1, 'rgba(6,182,212,0)');
    x.fillStyle = gd;
    x.fillRect(80, y, W - 160, 1.5);
  });
}

function drawPhoto(c, img) {
  const x = c.getContext('2d'), S = c.width, cx = S / 2, cy = S / 2;
  const R = S / 2 - 30;

  x.shadowColor = '#d4a574';
  x.shadowBlur = 30;
  x.strokeStyle = 'rgba(212,165,116,0.25)';
  x.lineWidth = 2;
  x.beginPath(); x.arc(cx, cy, R + 18, 0, TAU); x.stroke();

  x.shadowColor = '#06b6d4';
  x.shadowBlur = 22;
  x.strokeStyle = 'rgba(6,182,212,0.4)';
  x.lineWidth = 2.5;
  x.beginPath(); x.arc(cx, cy, R + 10, 0, TAU); x.stroke();

  x.shadowColor = '#fbbf24';
  x.shadowBlur = 15;
  x.strokeStyle = 'rgba(251,191,36,0.5)';
  x.lineWidth = 3;
  x.beginPath(); x.arc(cx, cy, R + 3, 0, TAU); x.stroke();
  x.shadowBlur = 0;

  x.save();
  x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.clip();
  const ar = img.width / img.height;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (ar > 1) { sx = (sw - sh) / 2; sw = sh; } else { sy = (sh - sw) / 2; sh = sw; }
  x.drawImage(img, sx, sy, sw, sh, cx - R, cy - R, R * 2, R * 2);
  x.restore();

  x.strokeStyle = '#d4a574';
  x.lineWidth = 3.5;
  x.beginPath(); x.arc(cx, cy, R + 1, 0, TAU); x.stroke();
}

function drawIdentity(c) {
  const x = c.getContext('2d'), W = c.width;
  const offX = 480;

  x.fillStyle = '#f1f5f9';
  x.font = "bold 72px 'Helvetica Neue', Arial, sans-serif";
  x.textBaseline = 'top';
  x.shadowColor = 'rgba(212,165,116,0.3)';
  x.shadowBlur = 18;
  x.fillText('SHAID', offX, 20);
  x.shadowBlur = 0;

  const nameW = x.measureText('SHAID').width;
  const ug = x.createLinearGradient(offX, 0, offX + nameW, 0);
  ug.addColorStop(0, 'rgba(212,165,116,0.6)');
  ug.addColorStop(0.5, 'rgba(251,191,36,0.8)');
  ug.addColorStop(1, 'rgba(212,165,116,0.3)');
  x.fillStyle = ug;
  x.fillRect(offX, 100, nameW, 3);

  x.textBaseline = 'middle';
  const roles = [
    { text: 'Freelancer', color: '#d4a574', bg: 'rgba(212,165,116,0.1)' },
    { text: 'Gen AI Architect', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
    { text: 'Web Developer', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  ];
  let px = offX;
  const pillY = 120, pillH = 42;
  x.font = "500 28px 'Helvetica Neue', Arial, sans-serif";
  roles.forEach(r => {
    const tw = x.measureText(r.text).width + 30;
    x.fillStyle = r.bg;
    x.beginPath(); x.roundRect(px, pillY, tw, pillH, 21); x.fill();
    x.strokeStyle = r.color + '44';
    x.lineWidth = 1.5;
    x.beginPath(); x.roundRect(px, pillY, tw, pillH, 21); x.stroke();
    x.fillStyle = r.color;
    x.fillText(r.text, px + 15, pillY + pillH / 2 + 1);
    px += tw + 12;
  });

  const avX = W - 300;
  x.fillStyle = 'rgba(34,197,94,0.1)';
  x.beginPath(); x.roundRect(avX, 30, 240, 48, 24); x.fill();
  x.strokeStyle = 'rgba(34,197,94,0.35)';
  x.lineWidth = 1.5;
  x.beginPath(); x.roundRect(avX, 30, 240, 48, 24); x.stroke();
  x.fillStyle = '#22c55e';
  x.shadowColor = '#22c55e';
  x.shadowBlur = 8;
  x.beginPath(); x.arc(avX + 24, 54, 7, 0, TAU); x.fill();
  x.shadowBlur = 0;
  x.font = "600 26px 'Helvetica Neue', Arial, sans-serif";
  x.fillStyle = '#22c55e';
  x.fillText('Available', avX + 46, 55);
}

function drawServices(c) {
  const x = c.getContext('2d'), W = c.width, H = c.height;
  const services = [
    { icon: '\uD83C\uDFA4', label: 'Voice Agents', color: '#a78bfa', border: 'rgba(167,139,250,0.3)' },
    { icon: '\u2699\uFE0F', label: 'AI Automation', color: '#06b6d4', border: 'rgba(6,182,212,0.3)' },
    { icon: '\uD83C\uDF10', label: '3D Websites', color: '#f472b6', border: 'rgba(244,114,182,0.3)' },
    { icon: '\uD83D\uDCCA', label: 'AI Dashboards', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
    { icon: '\uD83D\uDED2', label: 'E-Commerce', color: '#34d399', border: 'rgba(52,211,153,0.3)' },
    { icon: '\uD83D\uDCF1', label: 'Mobile Apps', color: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
  ];

  const cols = 3, cardW = 440, cardH = 72, gapX = 30, gapY = 22;
  const totalW = cols * cardW + (cols - 1) * gapX;
  const totalH = 2 * cardH + gapY;
  const startX = (W - totalW) / 2;
  const startY = (H - totalH) / 2;

  services.forEach((s, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = startX + col * (cardW + gapX);
    const cy = startY + row * (cardH + gapY);

    x.fillStyle = 'rgba(255,255,255,0.04)';
    x.beginPath(); x.roundRect(cx, cy, cardW, cardH, 14); x.fill();

    const ag = x.createLinearGradient(cx, cy, cx, cy + cardH);
    ag.addColorStop(0, s.color + 'cc');
    ag.addColorStop(1, s.color + '55');
    x.fillStyle = ag;
    x.beginPath(); x.roundRect(cx, cy, 6, cardH, [14,0,0,14]); x.fill();

    x.strokeStyle = s.border;
    x.lineWidth = 1;
    x.beginPath(); x.roundRect(cx, cy, cardW, cardH, 14); x.stroke();

    x.shadowColor = s.color;
    x.shadowBlur = 10;
    x.fillStyle = s.color;
    x.beginPath(); x.arc(cx + 36, cy + cardH / 2, 5, 0, TAU); x.fill();
    x.shadowBlur = 0;

    x.font = '32px sans-serif';
    x.textBaseline = 'middle';
    x.fillText(s.icon, cx + 56, cy + cardH / 2 + 1);

    x.fillStyle = '#e2e8f0';
    x.font = "500 28px 'Helvetica Neue', Arial, sans-serif";
    x.fillText(s.label, cx + 100, cy + cardH / 2 + 1);
  });
}

function drawAchievements(c) {
  const x = c.getContext('2d'), W = c.width;
  const items = [
    { icon: '\uD83C\uDFC6', text: 'SIH Evaluator' },
    { icon: '\uD83E\uDD47', text: 'Buildathon Winner' },
    { icon: '\uD83C\uDF99\uFE0F', text: 'Voice Agent Builder' },
    { icon: '\uD83C\uDFA8', text: '3D Web Designer' },
    { icon: '\uD83C\uDF0D', text: 'Gulf & India' },
    { icon: '\u26A1', text: 'AI Expert' },
  ];

  x.font = "500 22px 'Helvetica Neue', Arial, sans-serif";
  x.textBaseline = 'middle';
  let total = 0;
  items.forEach(t => { total += x.measureText(t.icon + ' ' + t.text).width + 36 + 14; });
  let px = (W - total + 14) / 2;

  items.forEach(t => {
    const label = t.icon + ' ' + t.text;
    const tw = x.measureText(label).width + 36;
    x.fillStyle = 'rgba(6,182,212,0.06)';
    x.beginPath(); x.roundRect(px, 10, tw, 44, 22); x.fill();
    x.strokeStyle = 'rgba(6,182,212,0.18)';
    x.lineWidth = 1;
    x.beginPath(); x.roundRect(px, 10, tw, 44, 22); x.stroke();
    x.fillStyle = '#67e8f9';
    x.fillText(label, px + 18, 33);
    px += tw + 14;
  });
}

function drawStats(c) {
  const x = c.getContext('2d'), W = c.width;
  const stats = [
    { num: '20+', label: 'Projects', color: '#d4a574', glow: 'rgba(212,165,116,0.08)' },
    { num: '5+', label: 'Clients', color: '#06b6d4', glow: 'rgba(6,182,212,0.08)' },
    { num: '15+', label: 'Years Exp', color: '#fbbf24', glow: 'rgba(251,191,36,0.08)' },
  ];
  const colW = W / 3;

  stats.forEach((s, i) => {
    const cx = colW * i + colW / 2;
    const rg = x.createRadialGradient(cx, 65, 0, cx, 65, 100);
    rg.addColorStop(0, s.glow);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rg;
    x.fillRect(cx - 100, 0, 200, 160);

    x.fillStyle = '#f1f5f9';
    x.font = "bold 80px 'Helvetica Neue', Arial, sans-serif";
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.shadowColor = s.color;
    x.shadowBlur = 28;
    x.fillText(s.num, cx, 60);
    x.shadowBlur = 0;

    x.fillStyle = s.color;
    x.globalAlpha = 0.55;
    x.fillRect(cx - 35, 108, 70, 3);
    x.globalAlpha = 1;

    x.fillStyle = 'rgba(148,163,184,0.8)';
    x.font = "500 30px 'Helvetica Neue', Arial, sans-serif";
    x.fillText(s.label, cx, 145);

    if (i < 2) {
      const dg = x.createLinearGradient(0, 15, 0, 165);
      dg.addColorStop(0, 'rgba(212,165,116,0)');
      dg.addColorStop(0.3, 'rgba(212,165,116,0.12)');
      dg.addColorStop(0.7, 'rgba(212,165,116,0.12)');
      dg.addColorStop(1, 'rgba(212,165,116,0)');
      x.fillStyle = dg;
      x.fillRect(colW * (i + 1) - 1, 15, 2, 150);
    }
  });
  x.textAlign = 'left';
}

function drawScanLine(c) {
  const x = c.getContext('2d'), W = c.width, H = c.height;
  const sg = x.createLinearGradient(0, 0, W, 0);
  sg.addColorStop(0, 'rgba(6,182,212,0)');
  sg.addColorStop(0.15, 'rgba(6,182,212,0.4)');
  sg.addColorStop(0.5, 'rgba(6,182,212,0.7)');
  sg.addColorStop(0.85, 'rgba(6,182,212,0.4)');
  sg.addColorStop(1, 'rgba(6,182,212,0)');
  x.fillStyle = sg;
  x.fillRect(0, 0, W, H);
}

// ======================================================================
//  BACK DRAW FUNCTIONS
// ======================================================================

function drawBackBg(c) {
  const x = c.getContext('2d'), W = c.width, H = c.height;
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, 'rgba(8, 10, 25, 0.94)');
  bg.addColorStop(0.5, 'rgba(6, 6, 14, 0.96)');
  bg.addColorStop(1, 'rgba(10, 12, 28, 0.94)');
  x.fillStyle = bg;
  x.beginPath(); x.roundRect(0, 0, W, H, 28); x.fill();

  // Radial glow from center
  const rg = x.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, W * 0.5);
  rg.addColorStop(0, 'rgba(212, 165, 116, 0.04)');
  rg.addColorStop(0.5, 'rgba(6, 182, 212, 0.02)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = rg;
  x.fillRect(0, 0, W, H);

  // Cross-hatch pattern
  x.strokeStyle = 'rgba(212, 165, 116, 0.02)';
  x.lineWidth = 1;
  for (let i = -H; i < W + H; i += 60) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + H, H); x.stroke();
    x.beginPath(); x.moveTo(i + H, 0); x.lineTo(i, H); x.stroke();
  }
}

function drawBackFrame(c) {
  const x = c.getContext('2d'), W = c.width, H = c.height;
  const m = 12, L = 65;

  x.strokeStyle = 'rgba(212, 165, 116, 0.12)';
  x.lineWidth = 2;
  x.beginPath(); x.roundRect(m, m, W - m * 2, H - m * 2, 24); x.stroke();

  x.shadowColor = '#d4a574';
  x.shadowBlur = 12;
  x.strokeStyle = 'rgba(212, 165, 116, 0.7)';
  x.lineWidth = 3.5;
  x.beginPath(); x.moveTo(m, m + L); x.lineTo(m, m); x.lineTo(m + L, m); x.stroke();
  x.beginPath(); x.moveTo(W - m - L, m); x.lineTo(W - m, m); x.lineTo(W - m, m + L); x.stroke();
  x.beginPath(); x.moveTo(m, H - m - L); x.lineTo(m, H - m); x.lineTo(m + L, H - m); x.stroke();
  x.beginPath(); x.moveTo(W - m - L, H - m); x.lineTo(W - m, H - m); x.lineTo(W - m, H - m - L); x.stroke();
  x.shadowBlur = 0;

  // Top + bottom accent lines
  const gl = x.createLinearGradient(60, 0, W - 60, 0);
  gl.addColorStop(0, 'rgba(212,165,116,0)');
  gl.addColorStop(0.3, 'rgba(212,165,116,0.4)');
  gl.addColorStop(0.5, 'rgba(251,191,36,0.6)');
  gl.addColorStop(0.7, 'rgba(212,165,116,0.4)');
  gl.addColorStop(1, 'rgba(212,165,116,0)');
  x.fillStyle = gl;
  x.fillRect(60, 22, W - 120, 2.5);
  x.fillRect(60, H - 24, W - 120, 2.5);
}

function drawBackHeader(c) {
  const x = c.getContext('2d'), W = c.width, H = c.height;
  x.textAlign = 'center';
  x.textBaseline = 'middle';

  // Main tagline
  x.fillStyle = '#d4a574';
  x.font = "bold 52px 'Helvetica Neue', Arial, sans-serif";
  x.shadowColor = 'rgba(212,165,116,0.4)';
  x.shadowBlur = 22;
  x.fillText('TURNING IDEAS INTO REALITY', W / 2, 55);
  x.shadowBlur = 0;

  // Underline
  const ug = x.createLinearGradient(W * 0.15, 0, W * 0.85, 0);
  ug.addColorStop(0, 'rgba(212,165,116,0)');
  ug.addColorStop(0.3, 'rgba(212,165,116,0.5)');
  ug.addColorStop(0.5, 'rgba(251,191,36,0.7)');
  ug.addColorStop(0.7, 'rgba(212,165,116,0.5)');
  ug.addColorStop(1, 'rgba(212,165,116,0)');
  x.fillStyle = ug;
  x.fillRect(W * 0.15, 92, W * 0.7, 3);

  // Subtitle
  x.fillStyle = 'rgba(148,163,184,0.65)';
  x.font = "500 26px 'Helvetica Neue', Arial, sans-serif";
  x.fillText('SKILL PROFILE', W / 2, 135);

  // Decorative dashes
  x.fillStyle = 'rgba(6,182,212,0.3)';
  x.fillRect(W / 2 - 120, 160, 50, 2);
  x.fillRect(W / 2 + 70, 160, 50, 2);
  x.fillStyle = 'rgba(212,165,116,0.4)';
  x.beginPath(); x.arc(W / 2, 161, 4, 0, TAU); x.fill();
}

function drawRadarChart(c) {
  const x = c.getContext('2d'), S = c.width, cx = S / 2, cy = S / 2;
  const R = S * 0.38;

  const skills = [
    { label: 'Web Dev', value: 0.95, color: '#d4a574' },
    { label: 'AI / ML', value: 0.90, color: '#06b6d4' },
    { label: 'Voice AI', value: 0.88, color: '#a78bfa' },
    { label: '3D / WebGL', value: 0.82, color: '#f472b6' },
    { label: 'Mobile', value: 0.78, color: '#34d399' },
    { label: 'Automation', value: 0.85, color: '#fbbf24' },
  ];
  const n = skills.length;

  // Helper: point on hex at level (0-1)
  const pt = (i, level) => {
    const a = (i / n) * TAU - PI / 2;
    return [cx + Math.cos(a) * R * level, cy + Math.sin(a) * R * level];
  };

  // Grid rings (25%, 50%, 75%, 100%)
  [0.25, 0.5, 0.75, 1.0].forEach(level => {
    x.strokeStyle = level === 1.0 ? 'rgba(212,165,116,0.15)' : 'rgba(212,165,116,0.06)';
    x.lineWidth = level === 1.0 ? 1.5 : 1;
    x.beginPath();
    for (let i = 0; i <= n; i++) {
      const [px, py] = pt(i % n, level);
      i === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
    }
    x.closePath();
    x.stroke();
  });

  // Axis lines
  x.strokeStyle = 'rgba(212,165,116,0.08)';
  x.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    const [px, py] = pt(i, 1);
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(px, py); x.stroke();
  }

  // Filled skill polygon
  x.beginPath();
  skills.forEach((s, i) => {
    const [px, py] = pt(i, s.value);
    i === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
  });
  x.closePath();

  // Gradient fill
  const fg = x.createRadialGradient(cx, cy, 0, cx, cy, R);
  fg.addColorStop(0, 'rgba(6,182,212,0.15)');
  fg.addColorStop(0.5, 'rgba(212,165,116,0.12)');
  fg.addColorStop(1, 'rgba(6,182,212,0.06)');
  x.fillStyle = fg;
  x.fill();

  // Polygon border (glowing)
  x.shadowColor = '#06b6d4';
  x.shadowBlur = 12;
  x.strokeStyle = 'rgba(6,182,212,0.6)';
  x.lineWidth = 2.5;
  x.stroke();
  x.shadowBlur = 0;

  // Vertex dots + labels
  skills.forEach((s, i) => {
    const [px, py] = pt(i, s.value);
    const [lx, ly] = pt(i, 1.18);

    // Dot on polygon vertex
    x.fillStyle = s.color;
    x.shadowColor = s.color;
    x.shadowBlur = 10;
    x.beginPath(); x.arc(px, py, 5, 0, TAU); x.fill();
    x.shadowBlur = 0;

    // Outer dot ring
    x.strokeStyle = s.color;
    x.lineWidth = 1.5;
    x.beginPath(); x.arc(px, py, 9, 0, TAU); x.stroke();

    // Label
    x.fillStyle = '#e2e8f0';
    x.font = "600 22px 'Helvetica Neue', Arial, sans-serif";
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(s.label, lx, ly);

    // Percentage below label
    x.fillStyle = s.color;
    x.font = "bold 20px 'Helvetica Neue', Arial, sans-serif";
    x.fillText(Math.round(s.value * 100) + '%', lx, ly + 24);
  });

  // Center dot
  x.fillStyle = 'rgba(212,165,116,0.3)';
  x.beginPath(); x.arc(cx, cy, 4, 0, TAU); x.fill();
}

function drawTechStack(c) {
  const x = c.getContext('2d'), W = c.width, H = c.height;
  x.textBaseline = 'middle';

  const techs = [
    { label: 'React', color: '#61dafb' },
    { label: 'Three.js', color: '#049ef4' },
    { label: 'Node.js', color: '#68a063' },
    { label: 'Python', color: '#ffd43b' },
    { label: 'OpenAI', color: '#10a37f' },
    { label: 'Vapi', color: '#a78bfa' },
    { label: 'Vercel', color: '#e2e8f0' },
    { label: 'Figma', color: '#f472b6' },
  ];

  x.font = "500 24px 'Helvetica Neue', Arial, sans-serif";
  const pillH = 44, gap = 14, padX = 28;
  let total = 0;
  techs.forEach(t => { total += x.measureText(t.label).width + padX * 2 + gap; });
  let px = (W - total + gap) / 2;

  techs.forEach(t => {
    const tw = x.measureText(t.label).width + padX * 2;
    // Pill bg
    x.fillStyle = 'rgba(255,255,255,0.04)';
    x.beginPath(); x.roundRect(px, (H - pillH) / 2, tw, pillH, 22); x.fill();
    // Border
    x.strokeStyle = t.color + '44';
    x.lineWidth = 1.5;
    x.beginPath(); x.roundRect(px, (H - pillH) / 2, tw, pillH, 22); x.stroke();
    // Color dot
    x.fillStyle = t.color;
    x.shadowColor = t.color;
    x.shadowBlur = 5;
    x.beginPath(); x.arc(px + 18, H / 2, 4, 0, TAU); x.fill();
    x.shadowBlur = 0;
    // Text
    x.fillStyle = '#e2e8f0';
    x.fillText(t.label, px + 32, H / 2 + 1);
    px += tw + gap;
  });
}

function drawBackCTA(c) {
  const x = c.getContext('2d'), W = c.width, H = c.height;
  x.textAlign = 'center';
  x.textBaseline = 'middle';

  // "Let's Build Together" heading
  x.fillStyle = '#06b6d4';
  x.font = "bold 40px 'Helvetica Neue', Arial, sans-serif";
  x.shadowColor = 'rgba(6,182,212,0.3)';
  x.shadowBlur = 15;
  x.fillText("LET'S BUILD TOGETHER", W / 2, 45);
  x.shadowBlur = 0;

  // Contact row below
  const items = [
    { icon: '\uD83D\uDCDE', text: '+91 63802 57066' },
    { icon: '\u2709\uFE0F', text: 'mail2shaid@gmail.com' },
    { icon: '\uD83C\uDF10', text: 'shaid360.com' },
  ];
  x.font = "500 24px 'Helvetica Neue', Arial, sans-serif";
  const sep = '    \u2022    ';
  const line = items.map(i => i.icon + ' ' + i.text).join(sep);
  x.fillStyle = 'rgba(148,163,184,0.7)';
  x.fillText(line, W / 2, 110);

  // Decorative line
  const lg = x.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
  lg.addColorStop(0, 'rgba(6,182,212,0)');
  lg.addColorStop(0.5, 'rgba(6,182,212,0.3)');
  lg.addColorStop(1, 'rgba(6,182,212,0)');
  x.fillStyle = lg;
  x.fillRect(W * 0.2, 148, W * 0.6, 1.5);
  x.fillStyle = 'rgba(148,163,184,0.4)';
  x.font = "500 20px 'Helvetica Neue', Arial, sans-serif";
  x.fillText('GFF 2026  \u2022  IIT Madras Research Park', W / 2, 170);
}

// ======================================================================
//  TOUCH CONTROLS
// ======================================================================
function toggleVideo(e) {
  if (e.touches && e.touches.length > 1) return;
  if (videoEl.paused) { videoEl.play(); isPlaying = true; playIcon.material.opacity = 0; }
  else { videoEl.pause(); isPlaying = false; playIcon.material.opacity = 0.9; }
}

function setupTouch() {
  let d0 = 0, s0 = 1, moved = false;
  arCanvas.addEventListener('touchstart', e => {
    moved = false;
    if (e.touches.length === 2) { d0 = dist(e.touches); s0 = tSc; }
    else { dragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }
  }, { passive: true });
  arCanvas.addEventListener('touchmove', e => {
    moved = true;
    if (e.touches.length === 2) tSc = clamp(s0 * dist(e.touches) / d0, 0.4, 3);
    else if (dragging) {
      tRY += (e.touches[0].clientX - lastX) * 0.007;
      tRX -= (e.touches[0].clientY - lastY) * 0.007;
      tRX = clamp(tRX, -1.05, 1.05);
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }
  }, { passive: true });
  arCanvas.addEventListener('touchend', e => {
    dragging = false;
    if (gyroActive) { gyroBeta0 = null; gyroGamma0 = null; } // re-baseline after drag
    if (!moved && e.changedTouches.length === 1) toggleVideo(e);
  }, { passive: true });
  let md = false, mmoved = false;
  arCanvas.addEventListener('mousedown', e => { md = true; mmoved = false; lastX = e.clientX; lastY = e.clientY; });
  arCanvas.addEventListener('mousemove', e => {
    mmoved = true;
    if (md) {
      tRY += (e.clientX - lastX) * 0.004;
      tRX -= (e.clientY - lastY) * 0.004;
      tRX = clamp(tRX, -1.05, 1.05);
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });
  arCanvas.addEventListener('mouseup', e => {
    md = false;
    if (gyroActive) { gyroBeta0 = null; gyroGamma0 = null; }
    if (!mmoved) toggleVideo(e);
  });
  arCanvas.addEventListener('wheel', e => { tSc = clamp(tSc - e.deltaY * 0.001, 0.4, 3); }, { passive: true });
}
function dist(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// ======================================================================
//  GYROSCOPE CONTROLS
// ======================================================================
function setupGyro() {
  const gyroBtn = document.getElementById('gyro-btn');
  const gyroHint = document.getElementById('gyro-hint');
  if (!gyroBtn) return;

  // Check if DeviceOrientationEvent is available
  if (!window.DeviceOrientationEvent) {
    gyroBtn.style.display = 'none';
    return;
  }

  // Show hint arrow after a short delay to draw attention
  setTimeout(() => {
    if (gyroHint) gyroHint.classList.add('show');
    // Auto-hide after 4s
    setTimeout(() => { if (gyroHint) gyroHint.classList.remove('show'); }, 4000);
  }, 2000);

  gyroBtn.addEventListener('click', async () => {
    // Hide hint on any tap
    if (gyroHint) gyroHint.classList.remove('show');

    if (gyroActive) {
      // Turn off gyro
      gyroActive = false;
      gyroBeta0 = null;
      gyroGamma0 = null;
      gyroBtn.classList.remove('active');
      return;
    }

    // iOS 13+ requires permission request on user gesture
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm !== 'granted') return;
      } catch (e) {
        return;
      }
    }

    gyroActive = true;
    gyroBeta0 = null;
    gyroGamma0 = null;
    gyroBtn.classList.add('active');
  });

  window.addEventListener('deviceorientation', e => {
    if (!gyroActive || dragging) return;
    if (e.beta == null || e.gamma == null) return;

    // Capture baseline on first reading
    if (gyroBeta0 === null) {
      gyroBeta0 = e.beta;
      gyroGamma0 = e.gamma;
      return;
    }

    // Delta from baseline position
    const dBeta = e.beta - gyroBeta0;   // front-back tilt → X rotation
    const dGamma = e.gamma - gyroGamma0; // left-right tilt → Y rotation

    // Map to rotation targets (scaled down for smooth subtle movement)
    tRX = clamp(dBeta * -0.015, -1.05, 1.05);
    tRY = dGamma * 0.015;
  }, true);
}

// ======================================================================
//  ANIMATION LOOP
// ======================================================================
function loop() {
  const t = clock.getElapsedTime();
  if (!group) return;

  sc += (tSc - sc) * 0.1;
  group.scale.setScalar(sc);
  rY += (tRY - rY) * 0.08;
  rX += (tRX - rX) * 0.08;
  group.rotation.y = rY;
  group.rotation.x = rX;

  group.position.y = Math.sin(t * 0.55) * 0.012;

  // Front HUD parallax
  if (hudGroup) {
    if (photoLayer)     photoLayer.position.y    = 0.3 + Math.sin(t * 0.75) * 0.012;
    if (identityLayer)  identityLayer.position.y = 0.28 + Math.sin(t * 0.65 + 0.4) * 0.007;
    if (servicesLayer)  servicesLayer.position.y  = -0.05 + Math.sin(t * 0.85 + 0.8) * 0.008;
    if (achieveLayer)   achieveLayer.position.y   = -0.24 + Math.sin(t * 0.7 + 1.2) * 0.006;
    if (statsLayer)     statsLayer.position.y     = -0.45 + Math.sin(t * 0.6 + 1.8) * 0.01;

    if (scanLine) {
      scanLine.position.y = Math.sin(t * 0.5) * 0.55;
      scanLine.material.opacity = 0.25 + Math.sin(t * 1.5) * 0.15;
    }
  }

  // Back parallax
  if (backHeader)  backHeader.position.y  = 0.72 + Math.sin(t * 0.6 + 0.3) * 0.008;
  if (backRadar)   backRadar.position.y   = 0.08 + Math.sin(t * 0.45 + 0.7) * 0.012;
  if (backTech)    backTech.position.y    = -0.55 + Math.sin(t * 0.7 + 1.1) * 0.007;
  if (backCTA)     backCTA.position.y     = -0.78 + Math.sin(t * 0.55 + 1.5) * 0.008;
  if (backScanLine) {
    backScanLine.position.y = Math.sin(t * 0.45 + PI) * 0.8;
    backScanLine.material.opacity = 0.2 + Math.sin(t * 1.3) * 0.12;
  }

  renderer.render(scene, camera);
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
