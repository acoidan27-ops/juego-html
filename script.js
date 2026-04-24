/**
 * Skybound Quest - versión visual/audio pulida.
 * HTML5 Canvas + Web Audio API (sin assets externos).
 */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("scoreDisplay");
const livesDisplay = document.getElementById("livesDisplay");
const levelDisplay = document.getElementById("levelDisplay");
const crystalDisplay = document.getElementById("crystalDisplay");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const victoryScreen = document.getElementById("victoryScreen");

const finalScore = document.getElementById("finalScore");
const victoryScore = document.getElementById("victoryScore");

const startButton = document.getElementById("startButton");
const retryButton = document.getElementById("retryButton");
const playAgainButton = document.getElementById("playAgainButton");
const soundToggle = document.getElementById("soundToggle");
const touchLeft = document.getElementById("touchLeft");
const touchRight = document.getElementById("touchRight");
const touchJump = document.getElementById("touchJump");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GROUND_HEIGHT = 64;
const GRAVITY = 0.62;
const MAX_FALL_SPEED = 15;

const gameState = {
  running: false,
  gameOver: false,
  victory: false,
  levelIndex: 0,
  score: 0,
  lives: 3,
  crystalsCollected: 0,
  totalCrystals: 0,
  time: 0,
  hurtFlash: 0,
  levelPulse: 0,
};

const keys = { left: false, right: false };
let level = null;
let player = null;
let cameraX = 0;

const particles = [];
const stars = Array.from({ length: 90 }, () => ({
  x: Math.random() * WIDTH,
  y: Math.random() * HEIGHT * 0.7,
  size: Math.random() * 2 + 0.4,
  twinkle: Math.random() * Math.PI * 2,
}));

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.unlocked = false;
    this.ambienceTimer = null;
  }

  async unlock() {
    if (!this.enabled || this.unlocked) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.18;
    this.master.connect(this.ctx.destination);
    this.unlocked = true;
    this.startAmbience();
  }

  toggle() {
    this.enabled = !this.enabled;
    soundToggle.textContent = this.enabled ? "🔊 Sonido ON" : "🔇 Sonido OFF";
    soundToggle.setAttribute("aria-pressed", String(this.enabled));

    if (!this.enabled && this.ambienceTimer) {
      clearInterval(this.ambienceTimer);
      this.ambienceTimer = null;
    }

    if (this.enabled && this.unlocked) {
      this.startAmbience();
    }
  }

  startAmbience() {
    if (!this.enabled || !this.ctx || this.ambienceTimer) return;
    const notes = [196, 247, 293, 329, 392, 329, 293, 247];
    let index = 0;

    this.ambienceTimer = setInterval(() => {
      if (!gameState.running || !this.enabled) return;
      this.tone(notes[index % notes.length], 0.5, "triangle", 0.06, 0.25);
      this.tone(notes[(index + 2) % notes.length] / 2, 0.9, "sine", 0.03, 0.3);
      index += 1;
    }, 520);
  }

  tone(freq, duration = 0.2, type = "sine", volume = 0.1, slideTo = null) {
    if (!this.enabled || !this.unlocked || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  jump() {
    this.tone(410, 0.18, "square", 0.08, 700);
  }

  crystal() {
    this.tone(850, 0.12, "triangle", 0.09, 1200);
    this.tone(1180, 0.08, "sine", 0.06);
  }

  hurt() {
    this.tone(190, 0.25, "sawtooth", 0.08, 120);
  }

  stomp() {
    this.tone(140, 0.14, "square", 0.07, 90);
  }

  levelUp() {
    [520, 660, 840].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.18, "triangle", 0.09), i * 120);
    });
  }

  gameOver() {
    [330, 280, 240, 180].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.2, "sawtooth", 0.08), i * 160);
    });
  }
}

const sound = new SoundEngine();

class Player {
  constructor(x, y) {
    this.spawnX = x;
    this.spawnY = y;
    this.width = 36;
    this.height = 50;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.speed = 4.2;
    this.jumpPower = 12.5;
    this.onGround = false;
    this.facing = 1;
    this.invulnerableTimer = 0;
    this.stepTick = 0;
  }

  resetPosition(x = this.spawnX, y = this.spawnY) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.invulnerableTimer = 55;
  }

  update(level) {
    if (keys.left) {
      this.vx = -this.speed;
      this.facing = -1;
    } else if (keys.right) {
      this.vx = this.speed;
      this.facing = 1;
    } else {
      this.vx *= 0.74;
      if (Math.abs(this.vx) < 0.08) this.vx = 0;
    }

    this.vy = Math.min(this.vy + GRAVITY, MAX_FALL_SPEED);
    this.x += this.vx;

    for (const p of level.platforms) {
      if (rectsOverlap(this, p)) {
        if (this.vx > 0) this.x = p.x - this.width;
        if (this.vx < 0) this.x = p.x + p.width;
        this.vx = 0;
      }
    }

    this.y += this.vy;
    this.onGround = false;

    for (const p of level.platforms) {
      if (rectsOverlap(this, p)) {
        if (this.vy > 0) {
          this.y = p.y - this.height;
          this.vy = 0;
          this.onGround = true;
        } else if (this.vy < 0) {
          this.y = p.y + p.height;
          this.vy = 0;
        }
      }
    }

    this.x = clamp(this.x, 0, level.width - this.width);
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= 1;
    if (Math.abs(this.vx) > 0.1) this.stepTick += 0.15;
  }

  jump() {
    if (!this.onGround) return;
    this.vy = -this.jumpPower;
    this.onGround = false;
    sound.jump();
  }

  draw(cameraX) {
    const x = this.x - cameraX;
    const y = this.y;
    const blink = this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer / 5) % 2 === 0;
    if (blink) return;

    const bob = Math.sin(this.stepTick) * 1.8;

    ctx.save();
    ctx.translate(x + this.width / 2, y + this.height / 2 + bob);
    ctx.scale(this.facing, 1);

    // sombra
    const shadow = ctx.createRadialGradient(0, 24, 2, 0, 24, 24);
    shadow.addColorStop(0, "rgba(0,0,0,0.28)");
    shadow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(0, 24, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // capa
    ctx.fillStyle = "#f97316";
    roundRect(-9, -8, 20, 30, 8, true);

    // cuerpo principal (traje)
    const body = ctx.createLinearGradient(0, -20, 0, 22);
    body.addColorStop(0, "#79f2ff");
    body.addColorStop(1, "#0ea5e9");
    ctx.fillStyle = body;
    roundRect(-14, -18, 28, 38, 10, true);

    // casco/cabeza
    const helmet = ctx.createLinearGradient(0, -30, 0, -8);
    helmet.addColorStop(0, "#1d4ed8");
    helmet.addColorStop(1, "#38bdf8");
    ctx.fillStyle = helmet;
    roundRect(-13, -31, 26, 20, 9, true);

    // visor
    const visor = ctx.createLinearGradient(-8, -26, 8, -16);
    visor.addColorStop(0, "#dbeafe");
    visor.addColorStop(1, "#93c5fd");
    ctx.fillStyle = visor;
    roundRect(-7, -25, 15, 9, 4, true);

    // piernas
    ctx.fillStyle = "#111827";
    roundRect(-10, 17, 8, 9, 3, true);
    roundRect(2, 17, 8, 9, 3, true);

    // brillo
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    roundRect(-9, -15, 5, 18, 3, true);

    ctx.restore();
  }
}

class Enemy {
  constructor(x, y, minX, maxX, speed = 1.2) {
    this.x = x;
    this.y = y;
    this.width = 36;
    this.height = 32;
    this.minX = minX;
    this.maxX = maxX;
    this.speed = speed;
    this.direction = 1;
    this.alive = true;
    this.wobble = Math.random() * Math.PI * 2;
  }

  update() {
    if (!this.alive) return;
    this.x += this.speed * this.direction;
    this.wobble += 0.08;
    if (this.x <= this.minX) {
      this.x = this.minX;
      this.direction = 1;
    } else if (this.x + this.width >= this.maxX) {
      this.x = this.maxX - this.width;
      this.direction = -1;
    }
  }

  draw(cameraX) {
    if (!this.alive) return;
    const x = this.x - cameraX;
    const y = this.y + Math.sin(this.wobble) * 1.4;

    const skin = ctx.createLinearGradient(x, y, x, y + this.height);
    skin.addColorStop(0, "#fb7185");
    skin.addColorStop(1, "#be123c");
    ctx.fillStyle = skin;
    roundRect(x, y, this.width, this.height, 12, true);

    ctx.fillStyle = "#111827";
    ctx.fillRect(x + 7, y + 10, 7, 7);
    ctx.fillRect(x + 22, y + 10, 7, 7);

    ctx.fillStyle = "#fee2e2";
    roundRect(x + 8, y + 21, this.width - 16, 5, 3, true);

    // cuernos
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 2);
    ctx.lineTo(x + 12, y - 7);
    ctx.lineTo(x + 16, y + 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 2);
    ctx.lineTo(x + 24, y - 7);
    ctx.lineTo(x + 28, y + 2);
    ctx.fill();
  }
}

class Collectible {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 20;
    this.collected = false;
    this.floatTick = Math.random() * Math.PI * 2;
  }

  update() {
    this.floatTick += 0.08;
  }

  draw(cameraX) {
    if (this.collected) return;
    const drawX = this.x - cameraX + this.width / 2;
    const drawY = this.y + this.height / 2 + Math.sin(this.floatTick) * 4;

    const glow = ctx.createRadialGradient(drawX, drawY, 1, drawX, drawY, 18);
    glow.addColorStop(0, "rgba(255,247,151,0.85)");
    glow.addColorStop(1, "rgba(255,247,151,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(drawX, drawY, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(Math.sin(this.floatTick) * 0.3);

    const gem = ctx.createLinearGradient(0, -12, 0, 12);
    gem.addColorStop(0, "#fde68a");
    gem.addColorStop(1, "#f59e0b");
    ctx.fillStyle = gem;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, -2);
    ctx.lineTo(5, 9);
    ctx.lineTo(-5, 9);
    ctx.lineTo(-8, -2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.moveTo(-2, -5);
    ctx.lineTo(2, -3);
    ctx.lineTo(0, 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

class Particle {
  constructor(x, y, color, config = {}) {
    this.x = x;
    this.y = y;
    this.vx = config.vx ?? (Math.random() - 0.5) * 3;
    this.vy = config.vy ?? (Math.random() - 0.5) * 3;
    this.life = config.life ?? 30;
    this.maxLife = this.life;
    this.size = config.size ?? (Math.random() * 3 + 2);
    this.color = color;
    this.gravity = config.gravity ?? 0.06;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.life -= 1;
  }

  draw(cameraX = 0, fixed = false) {
    const alpha = Math.max(0, this.life / this.maxLife);
    const x = fixed ? this.x : this.x - cameraX;
    ctx.fillStyle = this.color.replace("ALPHA", alpha.toFixed(2));
    ctx.beginPath();
    ctx.arc(x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Level {
  constructor(data) {
    this.width = data.width;
    this.goalX = data.goalX;
    this.spawn = data.spawn;
    this.platforms = data.platforms.map((p) => ({ ...p }));
    this.enemies = data.enemies.map((e) => new Enemy(e.x, e.y, e.minX, e.maxX, e.speed));
    this.collectibles = data.collectibles.map((c) => new Collectible(c.x, c.y));
    this.theme = data.theme;
  }

  drawBackground(cameraX) {
    const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grad.addColorStop(0, this.theme.skyTop);
    grad.addColorStop(0.5, this.theme.skyMid);
    grad.addColorStop(1, this.theme.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Estrellas suaves
    for (const s of stars) {
      const pulse = (Math.sin(gameState.time * 0.01 + s.twinkle) + 1) * 0.5;
      ctx.fillStyle = `rgba(255,255,255,${0.12 + pulse * 0.3})`;
      ctx.beginPath();
      ctx.arc((s.x - cameraX * 0.05 + WIDTH) % WIDTH, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Halo solar/luz
    const lx = WIDTH * 0.75 + Math.sin(gameState.time * 0.003) * 25;
    const ly = 120 + Math.cos(gameState.time * 0.0025) * 10;
    const light = ctx.createRadialGradient(lx, ly, 20, lx, ly, 180);
    light.addColorStop(0, this.theme.lightCore);
    light.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Montañas fondo lejano
    drawMountainLayer(cameraX * 0.12, this.theme.mountainFar, HEIGHT - 180, 260, 0.35);
    drawMountainLayer(cameraX * 0.24, this.theme.mountainMid, HEIGHT - 130, 210, 0.55);

    // Nubes parallax
    for (let i = 0; i < 7; i++) {
      const nx = ((i * 260 + gameState.time * 0.15 - cameraX * 0.32) % (WIDTH + 280)) - 120;
      const ny = 90 + (i % 3) * 38 + Math.sin(gameState.time * 0.01 + i) * 5;
      drawCloud(nx, ny, 0.75 + (i % 2) * 0.3, this.theme.cloud);
    }
  }

  drawWorld(cameraX) {
    // Suelo principal
    const gx = -cameraX;
    const groundGrad = ctx.createLinearGradient(0, HEIGHT - GROUND_HEIGHT, 0, HEIGHT);
    groundGrad.addColorStop(0, this.theme.groundTop);
    groundGrad.addColorStop(1, this.theme.groundBottom);
    ctx.fillStyle = groundGrad;
    ctx.fillRect(gx, HEIGHT - GROUND_HEIGHT, this.width, GROUND_HEIGHT);

    // hierba superior
    ctx.fillStyle = this.theme.grass;
    for (let i = 0; i < this.width; i += 10) {
      const h = 4 + Math.sin((i + gameState.time * 0.8) * 0.035) * 2;
      ctx.fillRect(gx + i, HEIGHT - GROUND_HEIGHT - h, 6, h);
    }

    for (const p of this.platforms) {
      drawPlatform(p.x - cameraX, p.y, p.width, p.height, this.theme);
    }

    const flagX = this.goalX - cameraX;
    drawGoal(flagX, HEIGHT - GROUND_HEIGHT - 132, this.theme.goal);

    this.collectibles.forEach((item) => item.draw(cameraX));
    this.enemies.forEach((enemy) => enemy.draw(cameraX));
  }
}

const levelData = [
  {
    width: 1800,
    goalX: 1700,
    spawn: { x: 70, y: 390 },
    theme: {
      skyTop: "#0f3f83",
      skyMid: "#1764af",
      skyBottom: "#35a7c9",
      lightCore: "rgba(254,240,138,0.22)",
      mountainFar: "#2d4d7f",
      mountainMid: "#25406e",
      cloud: "rgba(241,245,249,0.24)",
      groundTop: "#3f7d47",
      groundBottom: "#1f4d2e",
      grass: "#7ee787",
      platformTop: "#9fb4d2",
      platformMid: "#536685",
      platformBottom: "#2d3f57",
      goal: "#4ade80",
    },
    platforms: [
      { x: 0, y: HEIGHT - GROUND_HEIGHT, width: 520, height: GROUND_HEIGHT },
      { x: 620, y: HEIGHT - GROUND_HEIGHT, width: 430, height: GROUND_HEIGHT },
      { x: 1130, y: HEIGHT - GROUND_HEIGHT, width: 670, height: GROUND_HEIGHT },
      { x: 350, y: 390, width: 120, height: 20 },
      { x: 770, y: 340, width: 130, height: 20 },
      { x: 1330, y: 300, width: 140, height: 20 },
    ],
    enemies: [
      { x: 740, y: HEIGHT - GROUND_HEIGHT - 32, minX: 670, maxX: 980, speed: 1.15 },
      { x: 1460, y: HEIGHT - GROUND_HEIGHT - 32, minX: 1200, maxX: 1650, speed: 1.3 },
    ],
    collectibles: [
      { x: 390, y: 360 },
      { x: 810, y: 308 },
      { x: 1370, y: 268 },
      { x: 1570, y: HEIGHT - GROUND_HEIGHT - 40 },
    ],
  },
  {
    width: 2200,
    goalX: 2090,
    spawn: { x: 60, y: 380 },
    theme: {
      skyTop: "#311066",
      skyMid: "#4f46b8",
      skyBottom: "#7c4dcb",
      lightCore: "rgba(244,208,255,0.22)",
      mountainFar: "#35205c",
      mountainMid: "#482e70",
      cloud: "rgba(236,233,255,0.2)",
      groundTop: "#4f7d45",
      groundBottom: "#2f4d2f",
      grass: "#a3e635",
      platformTop: "#c5b7f6",
      platformMid: "#5f4d99",
      platformBottom: "#3a2f63",
      goal: "#a78bfa",
    },
    platforms: [
      { x: 0, y: HEIGHT - GROUND_HEIGHT, width: 470, height: GROUND_HEIGHT },
      { x: 560, y: HEIGHT - GROUND_HEIGHT, width: 340, height: GROUND_HEIGHT },
      { x: 980, y: HEIGHT - GROUND_HEIGHT, width: 300, height: GROUND_HEIGHT },
      { x: 1360, y: HEIGHT - GROUND_HEIGHT, width: 300, height: GROUND_HEIGHT },
      { x: 1740, y: HEIGHT - GROUND_HEIGHT, width: 460, height: GROUND_HEIGHT },
      { x: 300, y: 370, width: 110, height: 20 },
      { x: 690, y: 320, width: 120, height: 20 },
      { x: 1110, y: 280, width: 130, height: 20 },
      { x: 1480, y: 330, width: 130, height: 20 },
    ],
    enemies: [
      { x: 580, y: HEIGHT - GROUND_HEIGHT - 32, minX: 560, maxX: 860, speed: 1.45 },
      { x: 1000, y: HEIGHT - GROUND_HEIGHT - 32, minX: 980, maxX: 1260, speed: 1.6 },
      { x: 1860, y: HEIGHT - GROUND_HEIGHT - 32, minX: 1760, maxX: 2140, speed: 1.7 },
    ],
    collectibles: [
      { x: 330, y: 338 },
      { x: 720, y: 288 },
      { x: 1150, y: 248 },
      { x: 1510, y: 298 },
      { x: 1970, y: HEIGHT - GROUND_HEIGHT - 42 },
    ],
  },
  {
    width: 2600,
    goalX: 2480,
    spawn: { x: 60, y: 380 },
    theme: {
      skyTop: "#4a1329",
      skyMid: "#9f1c4d",
      skyBottom: "#f97316",
      lightCore: "rgba(255,219,153,0.25)",
      mountainFar: "#5f243e",
      mountainMid: "#7b334e",
      cloud: "rgba(255,228,210,0.2)",
      groundTop: "#6f9a34",
      groundBottom: "#41631f",
      grass: "#d9f99d",
      platformTop: "#f7c9a0",
      platformMid: "#9d5a46",
      platformBottom: "#66392f",
      goal: "#fb923c",
    },
    platforms: [
      { x: 0, y: HEIGHT - GROUND_HEIGHT, width: 380, height: GROUND_HEIGHT },
      { x: 470, y: HEIGHT - GROUND_HEIGHT, width: 260, height: GROUND_HEIGHT },
      { x: 820, y: HEIGHT - GROUND_HEIGHT, width: 260, height: GROUND_HEIGHT },
      { x: 1170, y: HEIGHT - GROUND_HEIGHT, width: 260, height: GROUND_HEIGHT },
      { x: 1510, y: HEIGHT - GROUND_HEIGHT, width: 250, height: GROUND_HEIGHT },
      { x: 1840, y: HEIGHT - GROUND_HEIGHT, width: 240, height: GROUND_HEIGHT },
      { x: 2160, y: HEIGHT - GROUND_HEIGHT, width: 440, height: GROUND_HEIGHT },
      { x: 270, y: 350, width: 100, height: 20 },
      { x: 620, y: 305, width: 110, height: 20 },
      { x: 975, y: 260, width: 120, height: 20 },
      { x: 1330, y: 320, width: 120, height: 20 },
      { x: 1680, y: 270, width: 120, height: 20 },
      { x: 2030, y: 230, width: 120, height: 20 },
    ],
    enemies: [
      { x: 500, y: HEIGHT - GROUND_HEIGHT - 32, minX: 470, maxX: 710, speed: 1.8 },
      { x: 845, y: HEIGHT - GROUND_HEIGHT - 32, minX: 820, maxX: 1050, speed: 1.95 },
      { x: 1190, y: HEIGHT - GROUND_HEIGHT - 32, minX: 1170, maxX: 1410, speed: 2.05 },
      { x: 1860, y: HEIGHT - GROUND_HEIGHT - 32, minX: 1840, maxX: 2060, speed: 2.15 },
      { x: 2260, y: HEIGHT - GROUND_HEIGHT - 32, minX: 2160, maxX: 2500, speed: 2.25 },
    ],
    collectibles: [
      { x: 295, y: 318 },
      { x: 655, y: 273 },
      { x: 1010, y: 228 },
      { x: 1365, y: 288 },
      { x: 1715, y: 238 },
      { x: 2065, y: 198 },
      { x: 2380, y: HEIGHT - GROUND_HEIGHT - 42 },
    ],
  },
];

function initLevel(index, keepState = true) {
  if (!keepState) {
    gameState.score = 0;
    gameState.lives = 3;
    gameState.crystalsCollected = 0;
  }

  gameState.levelIndex = index;
  level = new Level(levelData[index]);
  player = new Player(level.spawn.x, level.spawn.y);
  cameraX = 0;
  gameState.levelPulse = 26;
  gameState.totalCrystals = level.collectibles.length;
  updateHud();
}

async function startNewGame() {
  await sound.unlock();
  gameState.running = true;
  gameState.gameOver = false;
  gameState.victory = false;

  hideOverlay(startScreen);
  hideOverlay(gameOverScreen);
  hideOverlay(victoryScreen);

  initLevel(0, false);
}

function restartCurrentLevel() {
  initLevel(gameState.levelIndex, true);
}

function updateHud() {
  scoreDisplay.textContent = String(gameState.score);
  livesDisplay.textContent = String(gameState.lives);
  levelDisplay.textContent = String(gameState.levelIndex + 1);
  crystalDisplay.textContent = `${gameState.crystalsCollected}/${gameState.totalCrystals}`;
}

function loseLife() {
  gameState.lives -= 1;
  gameState.hurtFlash = 22;
  sound.hurt();
  spawnBurst(player.x + player.width / 2, player.y + player.height / 2, "rgba(248,113,113,ALPHA)", 18, 4.2);
  updateHud();

  if (gameState.lives <= 0) {
    triggerGameOver();
    return;
  }

  player.resetPosition(level.spawn.x, level.spawn.y);
}

function triggerGameOver() {
  gameState.running = false;
  gameState.gameOver = true;
  finalScore.textContent = String(gameState.score);
  showOverlay(gameOverScreen);
  sound.gameOver();
}

function triggerVictory() {
  gameState.running = false;
  gameState.victory = true;
  victoryScore.textContent = String(gameState.score);
  showOverlay(victoryScreen);
}

function nextLevelOrWin() {
  gameState.score += 1000;
  gameState.levelPulse = 34;
  sound.levelUp();
  spawnBurst(player.x + player.width / 2, player.y + player.height / 2, "rgba(110,231,183,ALPHA)", 35, 6);

  const nextIndex = gameState.levelIndex + 1;
  if (nextIndex >= levelData.length) {
    updateHud();
    triggerVictory();
    return;
  }

  initLevel(nextIndex, true);
}

function update() {
  if (!gameState.running) return;

  gameState.time += 1;
  if (gameState.hurtFlash > 0) gameState.hurtFlash -= 1;
  if (gameState.levelPulse > 0) gameState.levelPulse -= 1;

  player.update(level);

  for (const enemy of level.enemies) enemy.update();

  for (const item of level.collectibles) {
    item.update();
    if (!item.collected && rectsOverlap(player, item)) {
      item.collected = true;
      gameState.crystalsCollected += 1;
      gameState.score += 130;
      sound.crystal();
      spawnBurst(item.x + 10, item.y + 8, "rgba(250,204,21,ALPHA)", 16, 3.7);
      updateHud();
    }
  }

  for (const enemy of level.enemies) {
    if (!enemy.alive || !rectsOverlap(player, enemy)) continue;

    const playerBottom = player.y + player.height;
    const enemyTop = enemy.y;
    const descending = player.vy > 0;

    if (descending && playerBottom - player.vy <= enemyTop + 8) {
      enemy.alive = false;
      player.vy = -9;
      gameState.score += 250;
      sound.stomp();
      spawnBurst(enemy.x + enemy.width / 2, enemy.y + 8, "rgba(251,113,133,ALPHA)", 12, 3.2);
      updateHud();
    } else if (player.invulnerableTimer <= 0) {
      loseLife();
      if (!gameState.running) return;
    }
  }

  if (player.y > HEIGHT + 120) {
    loseLife();
    if (!gameState.running) return;
  }

  if (player.x + player.width >= level.goalX) nextLevelOrWin();

  const targetX = player.x - WIDTH * 0.36;
  cameraX += (targetX - cameraX) * 0.12;
  cameraX = clamp(cameraX, 0, level.width - WIDTH);

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
}

function draw() {
  if (!level) {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    return;
  }

  level.drawBackground(cameraX);
  level.drawWorld(cameraX);
  player.draw(cameraX);

  for (const p of particles) p.draw(cameraX);

  drawCrystalPanel();
  drawEdgeVignette();

  if (gameState.hurtFlash > 0) {
    ctx.fillStyle = `rgba(239,68,68,${gameState.hurtFlash / 90})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  if (gameState.levelPulse > 0) {
    const alpha = gameState.levelPulse / 120;
    ctx.fillStyle = `rgba(110,231,183,${alpha})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function drawCrystalPanel() {
  const left = level.collectibles.filter((c) => !c.collected).length;

  ctx.save();
  const panelGrad = ctx.createLinearGradient(16, 12, 220, 46);
  panelGrad.addColorStop(0, "rgba(2,6,23,0.72)");
  panelGrad.addColorStop(1, "rgba(30,41,59,0.62)");
  ctx.fillStyle = panelGrad;
  roundRect(14, 12, 225, 38, 12, true);

  ctx.strokeStyle = "rgba(148,197,255,0.35)";
  ctx.lineWidth = 1;
  roundRect(14, 12, 225, 38, 12, false, true);

  const glow = ctx.createRadialGradient(40, 31, 2, 40, 31, 16);
  glow.addColorStop(0, "rgba(255,247,161,0.8)");
  glow.addColorStop(1, "rgba(255,247,161,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(40, 31, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  ctx.moveTo(40, 22);
  ctx.lineTo(47, 30);
  ctx.lineTo(40, 39);
  ctx.lineTo(33, 30);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "16px Segoe UI";
  ctx.fillText(`Cristales restantes: ${left}`, 60, 35);
  ctx.restore();
}

function drawEdgeVignette() {
  const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 160, WIDTH / 2, HEIGHT / 2, WIDTH * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.36)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function spawnBurst(x, y, color, amount = 10, speed = 3) {
  for (let i = 0; i < amount; i++) {
    const angle = (Math.PI * 2 * i) / amount + Math.random() * 0.3;
    particles.push(
      new Particle(x, y, color, {
        vx: Math.cos(angle) * (Math.random() * speed),
        vy: Math.sin(angle) * (Math.random() * speed) - 1.2,
        life: 20 + Math.floor(Math.random() * 14),
        size: 1.6 + Math.random() * 2.7,
        gravity: 0.08,
      })
    );
  }
}

function drawGoal(x, y, color) {
  ctx.fillStyle = "rgba(15,23,42,0.6)";
  ctx.fillRect(x + 2, y + 2, 8, 132);

  const poleGrad = ctx.createLinearGradient(x, y, x + 6, y);
  poleGrad.addColorStop(0, "#f8fafc");
  poleGrad.addColorStop(1, "#cbd5e1");
  ctx.fillStyle = poleGrad;
  roundRect(x, y, 6, 132, 3, true);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 8);
  ctx.quadraticCurveTo(x + 58, y + 24, x + 8, y + 45);
  ctx.closePath();
  ctx.fill();
}

function drawPlatform(x, y, width, height, theme) {
  const shadow = ctx.createLinearGradient(0, y, 0, y + height + 8);
  shadow.addColorStop(0, "rgba(0,0,0,0)");
  shadow.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = shadow;
  roundRect(x + 3, y + 3, width, height, 7, true);

  const grad = ctx.createLinearGradient(0, y, 0, y + height);
  grad.addColorStop(0, theme.platformTop);
  grad.addColorStop(0.5, theme.platformMid);
  grad.addColorStop(1, theme.platformBottom);
  ctx.fillStyle = grad;
  roundRect(x, y, width, height, 7, true);

  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(x + 4, y + 3, width - 8, 2);

  // textura de piedra
  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.lineWidth = 1;
  for (let i = 10; i < width - 10; i += 20) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + 8);
    ctx.lineTo(x + i - 4, y + height - 5);
    ctx.stroke();
  }
}

function drawMountainLayer(offset, color, baseY, amp, alpha) {
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(-200, HEIGHT);

  for (let x = -200; x <= WIDTH + 200; x += 70) {
    const wx = x + offset;
    const y = baseY - Math.sin(wx * 0.008) * amp * 0.4 - Math.abs(Math.cos(wx * 0.004)) * amp;
    ctx.lineTo(x, y);
  }

  ctx.lineTo(WIDTH + 200, HEIGHT);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawCloud(x, y, scale, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 46 * scale, 18 * scale, 0, Math.PI, 0, true);
  ctx.ellipse(x + 20 * scale, y, 42 * scale, 16 * scale, 0, Math.PI, 0, true);
  ctx.ellipse(x - 22 * scale, y, 34 * scale, 14 * scale, 0, Math.PI, 0, true);
  ctx.fill();
}


const activePointers = new Map();

function bindTouchButton(button, action) {
  if (!button) return;

  button.addEventListener("contextmenu", (event) => event.preventDefault());

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    button.classList.add("active");
    activePointers.set(event.pointerId, action);

    if (action === "left") keys.left = true;
    if (action === "right") keys.right = true;
    if (action === "jump" && gameState.running) player.jump();
  });

  const release = (event) => {
    event.preventDefault();
    button.classList.remove("active");
    const mappedAction = activePointers.get(event.pointerId);
    if (!mappedAction) return;

    if (mappedAction === "left") keys.left = false;
    if (mappedAction === "right") keys.right = false;
    activePointers.delete(event.pointerId);
  };

  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", (event) => {
    if (event.buttons === 0) release(event);
  });
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function showOverlay(element) {
  element.classList.add("visible");
  element.setAttribute("aria-hidden", "false");
}

function hideOverlay(element) {
  element.classList.remove("visible");
  element.setAttribute("aria-hidden", "true");
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundRect(x, y, width, height, radius, fill = true, stroke = false) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", " ", "arrowup"].includes(event.key)) event.preventDefault();

  if (key === "a" || event.key === "ArrowLeft") keys.left = true;
  if (key === "d" || event.key === "ArrowRight") keys.right = true;

  if (key === "w" || event.key === " " || event.key === "ArrowUp") {
    if (gameState.running) player.jump();
  }

  if (key === "r" && gameState.running) restartCurrentLevel();

  if (event.key === "Enter" && !gameState.running && !gameState.gameOver && !gameState.victory) {
    startNewGame();
  }
}

function handleKeyUp(event) {
  const key = event.key.toLowerCase();
  if (key === "a" || event.key === "ArrowLeft") keys.left = false;
  if (key === "d" || event.key === "ArrowRight") keys.right = false;
}

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

startButton.addEventListener("click", startNewGame);
retryButton.addEventListener("click", startNewGame);
playAgainButton.addEventListener("click", startNewGame);
soundToggle.addEventListener("click", async () => {
  if (!sound.unlocked) await sound.unlock();
  sound.toggle();
});


bindTouchButton(touchLeft, "left");
bindTouchButton(touchRight, "right");
bindTouchButton(touchJump, "jump");

initLevel(0, false);
gameState.running = false;
showOverlay(startScreen);
gameLoop();
