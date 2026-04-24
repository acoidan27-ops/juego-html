/**
 * Skybound Quest
 * Juego de plataformas 2D en Canvas sin librerías externas.
 */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("scoreDisplay");
const livesDisplay = document.getElementById("livesDisplay");
const levelDisplay = document.getElementById("levelDisplay");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const victoryScreen = document.getElementById("victoryScreen");

const finalScore = document.getElementById("finalScore");
const victoryScore = document.getElementById("victoryScore");

const startButton = document.getElementById("startButton");
const retryButton = document.getElementById("retryButton");
const playAgainButton = document.getElementById("playAgainButton");

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
};

const keys = {
  left: false,
  right: false,
};

class Player {
  constructor(x, y) {
    this.spawnX = x;
    this.spawnY = y;
    this.width = 34;
    this.height = 46;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.speed = 4.1;
    this.jumpPower = 12.5;
    this.onGround = false;
    this.facing = 1;
    this.invulnerableTimer = 0;
  }

  resetPosition(x = this.spawnX, y = this.spawnY) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.invulnerableTimer = 45;
  }

  update(level) {
    if (keys.left) {
      this.vx = -this.speed;
      this.facing = -1;
    } else if (keys.right) {
      this.vx = this.speed;
      this.facing = 1;
    } else {
      this.vx *= 0.75;
      if (Math.abs(this.vx) < 0.08) this.vx = 0;
    }

    this.vy = Math.min(this.vy + GRAVITY, MAX_FALL_SPEED);

    // Movimiento horizontal + colisiones
    this.x += this.vx;
    for (const p of level.platforms) {
      if (rectsOverlap(this, p)) {
        if (this.vx > 0) {
          this.x = p.x - this.width;
        } else if (this.vx < 0) {
          this.x = p.x + p.width;
        }
        this.vx = 0;
      }
    }

    // Movimiento vertical + colisiones
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

    if (this.x < 0) this.x = 0;
    if (this.x + this.width > level.width) this.x = level.width - this.width;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= 1;
    }
  }

  jump() {
    if (this.onGround) {
      this.vy = -this.jumpPower;
      this.onGround = false;
    }
  }

  draw(cameraX) {
    const drawX = this.x - cameraX;
    const blink = this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer / 4) % 2 === 0;
    if (blink) return;

    // Cuerpo
    ctx.fillStyle = "#22d3ee";
    roundRect(drawX, this.y, this.width, this.height, 9, true);

    // Visor
    ctx.fillStyle = "#f8fafc";
    roundRect(drawX + 8, this.y + 10, 18, 12, 4, true);

    // Bufanda
    ctx.fillStyle = "#f97316";
    ctx.fillRect(drawX + 5, this.y + 28, this.width - 10, 6);

    // Piernas
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(drawX + 6, this.y + this.height - 7, 8, 7);
    ctx.fillRect(drawX + this.width - 14, this.y + this.height - 7, 8, 7);
  }
}

class Enemy {
  constructor(x, y, minX, maxX, speed = 1.2) {
    this.x = x;
    this.y = y;
    this.width = 34;
    this.height = 30;
    this.minX = minX;
    this.maxX = maxX;
    this.speed = speed;
    this.direction = 1;
    this.alive = true;
  }

  update() {
    if (!this.alive) return;
    this.x += this.speed * this.direction;
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

    ctx.fillStyle = "#ef4444";
    roundRect(x, this.y, this.width, this.height, 10, true);

    ctx.fillStyle = "#111827";
    ctx.fillRect(x + 6, this.y + 8, 7, 7);
    ctx.fillRect(x + 21, this.y + 8, 7, 7);

    ctx.fillStyle = "#fca5a5";
    ctx.fillRect(x + 7, this.y + 20, this.width - 14, 4);
  }
}

class Collectible {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 18;
    this.height = 18;
    this.collected = false;
    this.floatTick = Math.random() * Math.PI * 2;
  }

  update() {
    this.floatTick += 0.08;
  }

  draw(cameraX) {
    if (this.collected) return;
    const x = this.x - cameraX;
    const y = this.y + Math.sin(this.floatTick) * 4;

    ctx.save();
    ctx.translate(x + this.width / 2, y + this.height / 2);
    ctx.rotate(Math.sin(this.floatTick) * 0.25);
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

class Level {
  constructor(data) {
    this.width = data.width;
    this.goalX = data.goalX;
    this.spawn = data.spawn;
    this.platforms = data.platforms.map((p) => ({ ...p }));
    this.enemies = data.enemies.map(
      (e) => new Enemy(e.x, e.y, e.minX, e.maxX, e.speed)
    );
    this.collectibles = data.collectibles.map((c) => new Collectible(c.x, c.y));
    this.theme = data.theme;
  }

  drawBackground(cameraX) {
    const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grad.addColorStop(0, this.theme.skyTop);
    grad.addColorStop(1, this.theme.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Colinas decorativas
    for (let i = 0; i < 6; i++) {
      const hillX = (i * 340 - cameraX * 0.35) % (this.width + 300);
      const wrappedX = hillX < -220 ? hillX + this.width + 300 : hillX;
      ctx.fillStyle = this.theme.hill;
      ctx.beginPath();
      ctx.arc(wrappedX, HEIGHT - GROUND_HEIGHT + 30, 150, Math.PI, Math.PI * 2);
      ctx.fill();
    }
  }

  drawWorld(cameraX) {
    // Suelo base
    ctx.fillStyle = this.theme.ground;
    ctx.fillRect(-cameraX, HEIGHT - GROUND_HEIGHT, this.width, GROUND_HEIGHT);

    // Plataformas
    ctx.fillStyle = this.theme.platform;
    for (const p of this.platforms) {
      roundRect(p.x - cameraX, p.y, p.width, p.height, 6, true);
      ctx.fillStyle = this.theme.platformTop;
      ctx.fillRect(p.x - cameraX, p.y, p.width, 6);
      ctx.fillStyle = this.theme.platform;
    }

    // Meta de nivel
    const gx = this.goalX - cameraX;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(gx, HEIGHT - GROUND_HEIGHT - 130, 6, 130);
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.moveTo(gx + 6, HEIGHT - GROUND_HEIGHT - 128);
    ctx.lineTo(gx + 56, HEIGHT - GROUND_HEIGHT - 108);
    ctx.lineTo(gx + 6, HEIGHT - GROUND_HEIGHT - 90);
    ctx.closePath();
    ctx.fill();

    this.collectibles.forEach((c) => c.draw(cameraX));
    this.enemies.forEach((e) => e.draw(cameraX));
  }
}

const levelData = [
  {
    width: 1800,
    goalX: 1700,
    spawn: { x: 70, y: 390 },
    theme: {
      skyTop: "#38bdf8",
      skyBottom: "#0ea5e9",
      hill: "rgba(15, 118, 110, 0.32)",
      ground: "#166534",
      platform: "#475569",
      platformTop: "#94a3b8",
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
      { x: 740, y: HEIGHT - GROUND_HEIGHT - 30, minX: 670, maxX: 980, speed: 1.15 },
      { x: 1460, y: HEIGHT - GROUND_HEIGHT - 30, minX: 1200, maxX: 1650, speed: 1.3 },
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
      skyTop: "#8b5cf6",
      skyBottom: "#2563eb",
      hill: "rgba(76, 29, 149, 0.28)",
      ground: "#14532d",
      platform: "#334155",
      platformTop: "#cbd5e1",
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
      { x: 580, y: HEIGHT - GROUND_HEIGHT - 30, minX: 560, maxX: 860, speed: 1.45 },
      { x: 1000, y: HEIGHT - GROUND_HEIGHT - 30, minX: 980, maxX: 1260, speed: 1.6 },
      { x: 1860, y: HEIGHT - GROUND_HEIGHT - 30, minX: 1760, maxX: 2140, speed: 1.7 },
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
      skyTop: "#f97316",
      skyBottom: "#db2777",
      hill: "rgba(30, 41, 59, 0.3)",
      ground: "#3f6212",
      platform: "#1e293b",
      platformTop: "#a78bfa",
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
      { x: 500, y: HEIGHT - GROUND_HEIGHT - 30, minX: 470, maxX: 710, speed: 1.8 },
      { x: 845, y: HEIGHT - GROUND_HEIGHT - 30, minX: 820, maxX: 1050, speed: 1.95 },
      { x: 1190, y: HEIGHT - GROUND_HEIGHT - 30, minX: 1170, maxX: 1410, speed: 2.05 },
      { x: 1860, y: HEIGHT - GROUND_HEIGHT - 30, minX: 1840, maxX: 2060, speed: 2.15 },
      { x: 2260, y: HEIGHT - GROUND_HEIGHT - 30, minX: 2160, maxX: 2500, speed: 2.25 },
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

let level = null;
let player = null;
let cameraX = 0;

function initLevel(index, keepState = true) {
  if (!keepState) {
    gameState.score = 0;
    gameState.lives = 3;
  }

  gameState.levelIndex = index;
  level = new Level(levelData[index]);
  player = new Player(level.spawn.x, level.spawn.y);
  cameraX = 0;
  updateHud();
}

function startNewGame() {
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
}

function loseLife() {
  gameState.lives -= 1;
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
}

function triggerVictory() {
  gameState.running = false;
  gameState.victory = true;
  victoryScore.textContent = String(gameState.score);
  showOverlay(victoryScreen);
}

function nextLevelOrWin() {
  gameState.score += 1000;
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

  player.update(level);

  for (const enemy of level.enemies) {
    enemy.update();
  }

  for (const item of level.collectibles) {
    item.update();
    if (!item.collected && rectsOverlap(player, item)) {
      item.collected = true;
      gameState.score += 100;
      updateHud();
    }
  }

  // Interacción con enemigos
  for (const enemy of level.enemies) {
    if (!enemy.alive) continue;
    if (!rectsOverlap(player, enemy)) continue;

    const playerBottom = player.y + player.height;
    const enemyTop = enemy.y;
    const descending = player.vy > 0;

    if (descending && playerBottom - player.vy <= enemyTop + 6) {
      enemy.alive = false;
      player.vy = -9;
      gameState.score += 250;
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

  if (player.x + player.width >= level.goalX) {
    nextLevelOrWin();
  }

  // Cámara horizontal
  const targetX = player.x - WIDTH * 0.36;
  cameraX += (targetX - cameraX) * 0.12;
  cameraX = clamp(cameraX, 0, level.width - WIDTH);
}

function draw() {
  if (!level) {
    // Pantalla inicial en vacío
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    return;
  }

  level.drawBackground(cameraX);
  level.drawWorld(cameraX);
  player.draw(cameraX);

  // Contador de cristales pendientes
  const left = level.collectibles.filter((c) => !c.collected).length;
  ctx.fillStyle = "rgba(2,6,23,0.55)";
  roundRect(14, 12, 190, 34, 8, true);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "16px Segoe UI";
  ctx.fillText(`Cristales restantes: ${left}`, 25, 34);
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
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Dibuja rectángulos redondeados en Canvas.
 */
function roundRect(x, y, width, height, radius, fill = true) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();

  if (["arrowleft", "arrowright", " ", "arrowup"].includes(event.key)) {
    event.preventDefault();
  }

  if (key === "a" || event.key === "ArrowLeft") keys.left = true;
  if (key === "d" || event.key === "ArrowRight") keys.right = true;

  if (key === "w" || event.key === " " || event.key === "ArrowUp") {
    if (gameState.running) player.jump();
  }

  if (key === "r" && gameState.running) {
    restartCurrentLevel();
  }

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

// Inicia en estado de presentación
initLevel(0, false);
gameState.running = false;
showOverlay(startScreen);
gameLoop();
