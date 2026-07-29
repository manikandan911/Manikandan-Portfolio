const TOTAL_FRAMES = 240;
const CANVAS_ID = 'hero-canvas';
const IMAGE_DIR = 'image-sequence-mani';
const FILE_PREFIX = 'Man_in_VR_headset_smiling_202607291506';

const canvas = document.getElementById(CANVAS_ID);
const ctx = canvas.getContext('2d', { alpha: false });

const loaderContainer = document.getElementById('loader');
const loaderBar = document.getElementById('loader-bar');
const loaderText = document.getElementById('loader-text');

const images = new Array(TOTAL_FRAMES);
const loadedFlags = new Array(TOTAL_FRAMES).fill(false);
let loadedCount = 0;

let currentFrame = 0;
let targetFrame = 0;
const ease = 0.08; // Easing factor for silky-smooth scroll animation interpolation

function getFrameUrl(index) {
  const padIndex = String(index).padStart(3, '0');
  return `${IMAGE_DIR}/${FILE_PREFIX}${padIndex}.png`;
}

// Preload images with batch concurrency
async function preloadImages() {
  const concurrency = 16;
  const indices = Array.from({ length: TOTAL_FRAMES }, (_, i) => i);
  
  // Load frame 0 immediately for instant display
  await loadImage(0);
  requestAnimationFrame(() => {
    drawFrame(0);
  });

  async function worker() {
    while (indices.length > 0) {
      const idx = indices.shift();
      if (idx !== undefined) {
        await loadImage(idx);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
}

function loadImage(index) {
  return new Promise((resolve) => {
    if (images[index]) return resolve();
    const img = new Image();
    img.src = getFrameUrl(index);
    img.onload = () => {
      images[index] = img;
      loadedFlags[index] = true;
      loadedCount++;
      updateLoaderProgress();
      resolve();
    };
    img.onerror = () => {
      console.warn(`Failed to load frame ${index}`);
      resolve();
    };
  });
}

function updateLoaderProgress() {
  const progress = Math.floor((loadedCount / TOTAL_FRAMES) * 100);
  if (loaderBar) loaderBar.style.width = `${progress}%`;
  if (loaderText) loaderText.textContent = `Loading ${progress}%`;

  if (loadedCount >= TOTAL_FRAMES) {
    setTimeout(() => {
      if (loaderContainer) loaderContainer.classList.add('hidden');
    }, 400);
  }
}

// Find nearest available loaded frame index if requested index isn't ready
function getNearestLoadedIndex(targetIdx) {
  const rounded = Math.round(targetIdx);
  if (loadedFlags[rounded]) return rounded;

  for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
    const prev = rounded - offset;
    const next = rounded + offset;
    if (prev >= 0 && loadedFlags[prev]) return prev;
    if (next < TOTAL_FRAMES && loadedFlags[next]) return next;
  }
  return 0;
}

function drawFrame(index) {
  const actualIndex = getNearestLoadedIndex(index);
  const img = images[actualIndex];
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const width = window.innerWidth;
  const height = window.innerHeight;

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const screenRatio = width / height;

  let drawWidth, drawHeight, offsetX, offsetY;

  // Cover aspect ratio scaling centered
  if (screenRatio > imgRatio) {
    drawWidth = width;
    drawHeight = width / imgRatio;
    offsetX = 0;
    offsetY = (height - drawHeight) / 2;
  } else {
    drawHeight = height;
    drawWidth = height * imgRatio;
    offsetX = (width - drawWidth) / 2;
    offsetY = 0;
  }

  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.scale(dpr, dpr);

  drawFrame(currentFrame);
}

function updateTargetFrame() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const scrollFraction = Math.max(0, Math.min(1, scrollTop / maxScroll));
  targetFrame = scrollFraction * (TOTAL_FRAMES - 1);
}

function tick() {
  updateTargetFrame();
  
  // Smooth linear interpolation (lerp)
  currentFrame += (targetFrame - currentFrame) * ease;

  if (Math.abs(targetFrame - currentFrame) < 0.001) {
    currentFrame = targetFrame;
  }

  drawFrame(currentFrame);
  requestAnimationFrame(tick);
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('scroll', updateTargetFrame, { passive: true });

// Initialize
resizeCanvas();
preloadImages();
requestAnimationFrame(tick);
