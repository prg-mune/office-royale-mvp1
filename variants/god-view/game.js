const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const aliveCountEl = document.getElementById("aliveCount");
const rankEl = document.getElementById("rank");
const timerEl = document.getElementById("timer");
const leaderboardEl = document.getElementById("leaderboard");
const startPanel = document.getElementById("startPanel");
const resultPanel = document.getElementById("resultPanel");
const resultEyebrow = document.getElementById("resultEyebrow");
const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const resultStats = document.getElementById("resultStats");
const eliminatedPanel = document.getElementById("eliminatedPanel");
const eliminatedText = document.getElementById("eliminatedText");
const eliminatedCloseButton = document.getElementById("eliminatedCloseButton");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const quickRestart = document.getElementById("quickRestart");
const stick = document.getElementById("stick");
const stickKnob = document.getElementById("stickKnob");
const dashButton = document.getElementById("dashButton");
const rulesButton = document.getElementById("rulesButton");
const rulesModal = document.getElementById("rulesModal");
const rulesCloseButton = document.getElementById("rulesCloseButton");
const burstMeter = document.getElementById("burstMeter");
const burstValue = document.getElementById("burstValue");
const burstFill = document.getElementById("burstFill");
const eventLog = document.getElementById("eventLog");

const WORLD = { width: 1280, height: 720 };
const ARENA = { x: 120, y: 72, cols: 13, rows: 7, tile: 80, gap: 8 };
const ARENA_BOUNDS = {
  left: ARENA.x,
  top: ARENA.y,
  right: ARENA.x + ARENA.cols * ARENA.tile,
  bottom: ARENA.y + ARENA.rows * ARENA.tile,
};
const ROUND_SECONDS = 90;
const PLAYER_COUNT = 50;
const PLAYER_RADIUS = 12;
const BURST_RADIUS = 92;
const BURST_FORCE = 560;
const BURST_COOLDOWN = 2.8;
const BURST_CHARGE_MAX = 1.2;

const palette = [
  "#62d6a6",
  "#ff765f",
  "#65b7f3",
  "#f4c95d",
  "#c084fc",
  "#f28fb3",
  "#95e06c",
  "#f0a35e",
];

const names = [
  "You",
  "Aki",
  "Mina",
  "Riku",
  "Sora",
  "Yui",
  "Ren",
  "Kaho",
  "Nao",
  "Haru",
  "Emi",
  "Toma",
  "Rio",
  "Mei",
  "Kota",
  "Sae",
  "Jun",
  "Nana",
  "Kai",
  "Mao",
  "Yuto",
  "Aya",
  "Leo",
  "Miu",
  "Ken",
  "Rina",
  "Sho",
  "Niko",
  "Tao",
  "Ena",
  "Hina",
  "Noa",
  "Rei",
  "Sara",
  "Iori",
  "Miki",
  "Taku",
  "Yuna",
  "Asa",
  "Kei",
  "Mana",
  "Ryo",
  "Tina",
  "Yori",
  "Gin",
  "Luna",
  "Masa",
  "Neri",
  "Tsuba",
  "Kiri",
];

let state = createState("ready");
let lastTime = performance.now();
let accumulator = 0;
let leaderboardTick = 0;

const input = {
  x: 0,
  y: 0,
  actionHeld: false,
  actionReleased: false,
  keys: new Set(),
  touchId: null,
  actionPointerId: null,
};

function createState(mode = "playing") {
  const tiles = [];
  for (let row = 0; row < ARENA.rows; row += 1) {
    for (let col = 0; col < ARENA.cols; col += 1) {
      tiles.push({
        id: `${col}-${row}`,
        col,
        row,
        x: ARENA.x + col * ARENA.tile,
        y: ARENA.y + row * ARENA.tile,
        state: "solid",
        crack: 0,
        removedAt: null,
      });
    }
  }

  const walls = createWalls();
  const spawnTiles = tiles.filter((tile) => !tileBlockedByWalls(tile, walls));
  const players = [];
  for (let i = 0; i < PLAYER_COUNT; i += 1) {
    const tile = spawnTiles[Math.floor(Math.random() * spawnTiles.length)] || tiles[Math.floor(Math.random() * tiles.length)];
    players.push({
      id: i,
      name: names[i] || `P${i + 1}`,
      isHuman: i === 0,
      x: tile.x + 18 + Math.random() * 44,
      y: tile.y + 18 + Math.random() * 44,
      vx: 0,
      vy: 0,
      radius: PLAYER_RADIUS,
      color: palette[i % palette.length],
      alive: true,
      eliminatedAt: null,
      burstHits: 0,
      eliminationsCaused: 0,
      lastHitBy: null,
      lastHitAt: -999,
      burstCooldown: 0,
      burstTime: 0,
      burstCharge: 0,
      lastBurstPower: 0,
      knockbackTime: 0,
      targetTile: null,
      skill: 0.65 + Math.random() * 0.5,
      wobble: Math.random() * Math.PI * 2,
      rank: null,
    });
  }

  return {
    mode,
    players,
    tiles,
    walls,
    obstacles: createObstacles(),
    rotators: createRotators(),
    events: [],
    announcedAlive: new Set(),
    eventSeq: 0,
    spectating: false,
    elapsed: 0,
    endTimer: 0,
    shake: 0,
    finalRank: null,
  };
}

function createWalls() {
  return pickMany([
    { x: ARENA.x + 210, y: ARENA.y + 130, w: 190, h: 34, label: "desk" },
    { x: ARENA.x + 610, y: ARENA.y + 70, w: 34, h: 190, label: "board" },
    { x: ARENA.x + 735, y: ARENA.y + 365, w: 210, h: 34, label: "table" },
    { x: ARENA.x + 340, y: ARENA.y + 410, w: 34, h: 150, label: "board" },
    { x: ARENA.x + 870, y: ARENA.y + 115, w: 170, h: 34, label: "desk" },
    { x: ARENA.x + 515, y: ARENA.y + 285, w: 160, h: 34, label: "table" },
    { x: ARENA.x + 165, y: ARENA.y + 505, w: 190, h: 34, label: "desk" },
  ], 3 + Math.floor(Math.random() * 2));
}

function createRotators() {
  return pickMany([
    {
      cx: ARENA.x + 500 + randomBetween(-70, 70),
      cy: ARENA.y + 335 + randomBetween(-45, 45),
      length: randomBetween(205, 255),
      width: 26,
      angle: randomBetween(0, Math.PI),
      speed: randomSign() * randomBetween(1.25, 1.85),
    },
    {
      cx: ARENA.x + 895 + randomBetween(-65, 70),
      cy: ARENA.y + 185 + randomBetween(-45, 60),
      length: randomBetween(175, 230),
      width: 24,
      angle: randomBetween(0, Math.PI),
      speed: randomSign() * randomBetween(1.05, 1.55),
    },
    {
      cx: ARENA.x + 285 + randomBetween(-40, 65),
      cy: ARENA.y + 360 + randomBetween(-35, 55),
      length: randomBetween(160, 215),
      width: 24,
      angle: randomBetween(0, Math.PI),
      speed: randomSign() * randomBetween(1.1, 1.7),
    },
  ], 2);
}

function createObstacles() {
  return pickMany([
    {
      x: ARENA.x + 145,
      y: ARENA.y + randomBetween(245, 330),
      baseX: ARENA.x + 145,
      baseY: ARENA.y + randomBetween(245, 330),
      w: randomBetween(165, 220),
      h: 28,
      axis: "x",
      range: randomBetween(190, 275),
      speed: randomBetween(1.1, 1.55),
      phase: randomBetween(0, Math.PI * 2),
      vx: 0,
      vy: 0,
    },
    {
      x: ARENA.x + 690,
      y: ARENA.y + randomBetween(455, 525),
      baseX: ARENA.x + 690,
      baseY: ARENA.y + randomBetween(455, 525),
      w: randomBetween(180, 235),
      h: 28,
      axis: "x",
      range: randomBetween(170, 250),
      speed: randomBetween(1.25, 1.75),
      phase: randomBetween(0, Math.PI * 2),
      vx: 0,
      vy: 0,
    },
    {
      x: ARENA.x + randomBetween(470, 600),
      y: ARENA.y + 105,
      baseX: ARENA.x + randomBetween(470, 600),
      baseY: ARENA.y + 105,
      w: 28,
      h: randomBetween(165, 220),
      axis: "y",
      range: randomBetween(135, 210),
      speed: randomBetween(1.05, 1.55),
      phase: randomBetween(0, Math.PI * 2),
      vx: 0,
      vy: 0,
    },
    {
      x: ARENA.x + randomBetween(925, 1015),
      y: ARENA.y + 245,
      baseX: ARENA.x + randomBetween(925, 1015),
      baseY: ARENA.y + 245,
      w: 28,
      h: randomBetween(155, 215),
      axis: "y",
      range: randomBetween(125, 190),
      speed: randomBetween(1.05, 1.5),
      phase: randomBetween(0, Math.PI * 2),
      vx: 0,
      vy: 0,
    },
  ], 3);
}

function tileBlockedByWalls(tile, walls) {
  const cx = tile.x + ARENA.tile / 2;
  const cy = tile.y + ARENA.tile / 2;
  return walls.some((wall) => cx > wall.x - 16 && cx < wall.x + wall.w + 16 && cy > wall.y - 16 && cy < wall.y + wall.h + 16);
}

function pickMany(items, count) {
  return [...items].sort(() => Math.random() - 0.5).slice(0, count);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomSign() {
  return Math.random() < 0.5 ? -1 : 1;
}

function startGame() {
  state = createState("playing");
  startPanel.classList.add("hidden");
  resultPanel.classList.add("hidden");
  eliminatedPanel.classList.add("hidden");
}

function openRules() {
  rulesModal.classList.remove("hidden");
}

function closeRules() {
  rulesModal.classList.add("hidden");
}

function endGame(reason) {
  if (state.mode === "ended") return;
  state.mode = "ended";
  const human = state.players[0];
  const alive = getAlivePlayers();
  const sorted = getRanking();
  state.finalRank = sorted.findIndex((player) => player.isHuman) + 1;

  resultPanel.classList.remove("hidden");
  resultEyebrow.textContent = reason === "survive" ? "SURVIVED" : "RESULT";
  resultTitle.textContent = human.alive ? "生き残り成功" : "脱落";
  const survival = Math.floor(human.eliminatedAt ?? state.elapsed);
  const award = getAward(human, state.finalRank, survival);
  resultText.textContent = `あなたの順位は ${state.finalRank} / ${PLAYER_COUNT} 位。称号: ${award}`;
  renderResultStats([
    ["生存時間", `${survival}s`],
    ["バースト命中", `${human.burstHits}人`],
    ["押し出し", `${human.eliminationsCaused}人`],
  ]);
}

function renderResultStats(items) {
  resultStats.replaceChildren(
    ...items.map(([label, value]) => {
      const card = document.createElement("div");
      card.className = "result-stat";
      const labelEl = document.createElement("span");
      labelEl.textContent = label;
      const valueEl = document.createElement("strong");
      valueEl.textContent = value;
      card.append(labelEl, valueEl);
      return card;
    })
  );
}

function getAward(human, rank, survival) {
  if (rank === 1) return "会議室の王者";
  if (human.eliminationsCaused >= 3) return "押し出し名人";
  if (human.burstHits >= 10) return "バースト職人";
  if (survival >= 60) return "粘りの議事録係";
  if (rank <= 10) return "安全地帯ハンター";
  return "次回の主役候補";
}

function getAlivePlayers() {
  return state.players.filter((player) => player.alive);
}

function getRanking() {
  return [...state.players].sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    if (!a.alive && !b.alive) return b.eliminatedAt - a.eliminatedAt;
    const centerX = WORLD.width / 2;
    const centerY = WORLD.height / 2;
    const da = Math.hypot(a.x - centerX, a.y - centerY);
    const db = Math.hypot(b.x - centerX, b.y - centerY);
    return da - db;
  });
}

function update(dt) {
  if (state.mode !== "playing") return;

  state.elapsed += dt;
  leaderboardTick += dt;
  state.shake = Math.max(0, state.shake - dt * 18);

  updateObstacles(dt);
  updateTiles(dt);
  updatePlayers(dt);
  applyPendingBursts();
  resolveObstacleCollisions();
  resolvePlayers();
  updateEliminations();

  const alive = getAlivePlayers();
  const human = state.players[0];
  if (alive.length <= 1 || state.elapsed >= ROUND_SECONDS) {
    endGame(alive.length <= 1 || human.alive ? "survive" : "out");
  }
}

function updateTiles(dt) {
  const activeTiles = state.tiles.filter((tile) => tile.state !== "gone");
  const targetGone = Math.floor(Math.max(0, state.elapsed - 4) / 1.35);

  while (state.tiles.filter((tile) => tile.state === "gone" || tile.state === "cracking").length < targetGone && activeTiles.length > 0) {
    const weighted = activeTiles
      .filter((tile) => tile.state === "solid")
      .sort((a, b) => tileWeight(b) - tileWeight(a));
    const pick = weighted[Math.floor(Math.random() * Math.min(8, weighted.length))];
    if (!pick) break;
    pick.state = "cracking";
    pick.crack = 0.01;
    activeTiles.splice(activeTiles.indexOf(pick), 1);
  }

  for (const tile of state.tiles) {
    if (tile.state === "cracking") {
      tile.crack += dt;
      if (tile.crack >= 2.4) {
        tile.state = "gone";
        tile.removedAt = state.elapsed;
        state.shake = 5;
      }
    }
  }
}

function updateObstacles(dt) {
  for (const obstacle of state.obstacles) {
    const prevX = obstacle.x;
    const prevY = obstacle.y;
    const offset = Math.sin(state.elapsed * obstacle.speed + obstacle.phase) * obstacle.range;
    if (obstacle.axis === "x") {
      obstacle.x = obstacle.baseX + offset;
      obstacle.y = obstacle.baseY;
    } else {
      obstacle.x = obstacle.baseX;
      obstacle.y = obstacle.baseY + offset;
    }
    obstacle.vx = (obstacle.x - prevX) / dt;
    obstacle.vy = (obstacle.y - prevY) / dt;
  }

  for (const rotator of state.rotators) {
    rotator.angle += rotator.speed * dt;
  }
}

function tileWeight(tile) {
  let weight = 1 + Math.random() * 4;
  for (const player of state.players) {
    if (!player.alive) continue;
    if (player.x >= tile.x && player.x <= tile.x + ARENA.tile - ARENA.gap && player.y >= tile.y && player.y <= tile.y + ARENA.tile - ARENA.gap) {
      weight += player.isHuman ? 0.4 : 1.8;
    }
  }
  return weight;
}

function updatePlayers(dt) {
  state.pendingBursts = [];
  for (const player of state.players) {
    if (!player.alive) continue;
    const intent = player.isHuman ? getHumanIntent() : getBotIntent(player);
    const speed = player.isHuman ? 260 : 205 * player.skill;
    const isCharging = player.burstCharge > 0 && player.burstCooldown <= 0;
    const accel = player.burstTime > 0 ? 520 : isCharging ? 590 : 820;
    const maxSpeed = player.knockbackTime > 0 ? 920 : player.burstTime > 0 ? speed * 0.62 : isCharging ? speed * 0.72 : speed;

    player.burstCooldown = Math.max(0, player.burstCooldown - dt);
    player.burstTime = Math.max(0, player.burstTime - dt);
    player.knockbackTime = Math.max(0, player.knockbackTime - dt);

    if (player.isHuman) {
      if (intent.actionHeld && player.burstCooldown <= 0) {
        player.burstCharge = Math.min(BURST_CHARGE_MAX, player.burstCharge + dt);
      }
      if (intent.actionReleased && player.burstCharge > 0 && player.burstCooldown <= 0) {
        queueBurst(player, getBurstPower(player));
      }
      if (player.burstCooldown > 0 || (!intent.actionHeld && !intent.actionReleased)) {
        player.burstCharge = 0;
      }
    } else if (intent.actionReleased && player.burstCooldown <= 0) {
      player.burstCharge = BURST_CHARGE_MAX * (0.25 + Math.random() * 0.75);
      queueBurst(player, getBurstPower(player));
    }

    player.vx += intent.x * accel * dt;
    player.vy += intent.y * accel * dt;
    const len = Math.hypot(player.vx, player.vy);
    if (len > maxSpeed) {
      player.vx = (player.vx / len) * maxSpeed;
      player.vy = (player.vy / len) * maxSpeed;
    }

    const drag = player.knockbackTime > 0 ? 0.42 : 0.08;
    player.vx *= Math.pow(drag, dt);
    player.vy *= Math.pow(drag, dt);
    player.x += player.vx * dt;
    player.y += player.vy * dt;
  }
  input.actionReleased = false;
}

function queueBurst(source, power) {
  state.pendingBursts.push({ source, power });
}

function applyPendingBursts() {
  if (!state.pendingBursts || state.pendingBursts.length === 0) return;
  for (const burst of state.pendingBursts) {
    if (burst.source.alive) triggerBurst(burst.source, burst.power);
  }
  state.pendingBursts = [];
}

function getBurstPower(player) {
  return Math.max(0.28, Math.min(1, player.burstCharge / BURST_CHARGE_MAX));
}

function triggerBurst(source, power = 1) {
  source.burstTime = 0.28;
  source.burstCooldown = BURST_COOLDOWN;
  source.lastBurstPower = power;
  source.vx *= 0.35;
  source.vy *= 0.35;

  const radius = BURST_RADIUS * (0.62 + power * 0.38);
  const forceBase = BURST_FORCE * (0.55 + power * 0.65);
  let hits = 0;
  for (const target of state.players) {
    if (target === source || !target.alive) continue;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > radius) continue;

    const falloff = 1 - dist / radius;
    const force = forceBase * (0.35 + falloff * 0.65);
    const nx = dx / dist;
    const ny = dy / dist;
    target.vx += nx * force;
    target.vy += ny * force;
    target.x += nx * 12;
    target.y += ny * 12;
    target.knockbackTime = Math.max(target.knockbackTime, 0.38);
    target.lastHitBy = source.id;
    target.lastHitAt = state.elapsed;
    hits += 1;
  }

  source.burstHits += hits;
  if (source.isHuman && hits > 0) {
    addEvent(`バースト命中: ${hits}人`, "good");
  } else if (!source.isHuman && hits > 0 && wasHumanInBurst(source, radius)) {
    addEvent(`${source.name} のバーストを受けた`, "danger");
  }

  state.shake = Math.max(state.shake, source.isHuman ? 5 + power * 6 : 3 + power * 3);
  source.burstCharge = 0;
}

function wasHumanInBurst(source, radius) {
  const human = state.players[0];
  if (!human.alive) return false;
  return Math.hypot(human.x - source.x, human.y - source.y) <= radius;
}

function getHumanIntent() {
  let x = input.x;
  let y = input.y;
  if (input.keys.has("arrowleft") || input.keys.has("a")) x -= 1;
  if (input.keys.has("arrowright") || input.keys.has("d")) x += 1;
  if (input.keys.has("arrowup") || input.keys.has("w")) y -= 1;
  if (input.keys.has("arrowdown") || input.keys.has("s")) y += 1;
  const len = Math.hypot(x, y);
  return {
    x: len > 1 ? x / len : x,
    y: len > 1 ? y / len : y,
    actionHeld: input.actionHeld,
    actionReleased: input.actionReleased,
  };
}

function getBotIntent(player) {
  const safeTiles = state.tiles.filter((tile) => tile.state === "solid");
  if (!player.targetTile || player.targetTile.state !== "solid" || distanceToTile(player, player.targetTile) < 18 || tileRisk(player.targetTile, player) > 170) {
    player.targetTile = chooseBotTile(player, safeTiles);
  }

  const targetX = player.targetTile.x + (ARENA.tile - ARENA.gap) / 2;
  const targetY = player.targetTile.y + (ARENA.tile - ARENA.gap) / 2;
  const avoid = avoidance(player);
  player.wobble += 0.04;

  let x = targetX - player.x + avoid.x * 120 + Math.cos(player.wobble) * 18;
  let y = targetY - player.y + avoid.y * 120 + Math.sin(player.wobble * 1.3) * 18;
  const len = Math.hypot(x, y) || 1;
  return {
    x: x / len,
    y: y / len,
    actionHeld: false,
    actionReleased: Math.random() < 0.0025 * player.skill,
  };
}

function chooseBotTile(player, tiles) {
  if (tiles.length === 0) return state.tiles[0];
  const candidates = [...tiles].sort((a, b) => {
    return tileRisk(a, player) - tileRisk(b, player);
  });
  return candidates[Math.floor(Math.random() * Math.min(8, candidates.length))];
}

function tileRisk(tile, player) {
  const cx = tile.x + ARENA.tile / 2;
  const cy = tile.y + ARENA.tile / 2;
  const edgeDistance = Math.min(cx - ARENA_BOUNDS.left, ARENA_BOUNDS.right - cx, cy - ARENA_BOUNDS.top, ARENA_BOUNDS.bottom - cy);
  let risk = Math.max(0, 150 - edgeDistance) * 1.8;
  risk += Math.hypot(cx - player.x, cy - player.y) * 0.28;

  for (const otherTile of state.tiles) {
    if (otherTile.state === "solid") continue;
    const tx = otherTile.x + ARENA.tile / 2;
    const ty = otherTile.y + ARENA.tile / 2;
    const dist = Math.hypot(cx - tx, cy - ty);
    if (dist < 170) risk += (170 - dist) * (otherTile.state === "cracking" ? 0.9 : 1.7);
  }

  for (const other of state.players) {
    if (other === player || !other.alive) continue;
    const dist = Math.hypot(cx - other.x, cy - other.y);
    if (dist < 95) risk += (95 - dist) * 0.75;
  }

  for (const obstacle of state.obstacles) {
    const ox = obstacle.x + obstacle.w / 2;
    const oy = obstacle.y + obstacle.h / 2;
    const dist = Math.hypot(cx - ox, cy - oy);
    if (dist < 150) risk += (150 - dist) * 0.95;
  }

  for (const rotator of state.rotators) {
    const dist = Math.hypot(cx - rotator.cx, cy - rotator.cy);
    if (dist < rotator.length * 0.65) risk += (rotator.length * 0.65 - dist) * 1.1;
  }

  return risk + Math.random() * 24;
}

function distanceToTile(player, tile) {
  return Math.hypot(player.x - (tile.x + 36), player.y - (tile.y + 36));
}

function avoidance(player) {
  const force = { x: 0, y: 0 };
  for (const other of state.players) {
    if (other === player || !other.alive) continue;
    const dx = player.x - other.x;
    const dy = player.y - other.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < 44) {
      force.x += dx / dist;
      force.y += dy / dist;
    }
  }
  return force;
}

function resolvePlayers() {
  const alive = getAlivePlayers();
  for (let i = 0; i < alive.length; i += 1) {
    for (let j = i + 1; j < alive.length; j += 1) {
      const a = alive[i];
      const b = alive[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      const overlap = a.radius + b.radius - dist;
      if (overlap > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        const push = overlap * 0.52;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        a.vx -= nx * 14;
        a.vy -= ny * 14;
        b.vx += nx * 14;
        b.vy += ny * 14;
      }
    }
  }
}

function resolveObstacleCollisions() {
  const colliders = [
    ...state.walls.map((wall) => ({ ...wall, kind: "wall", vx: 0, vy: 0 })),
    ...state.obstacles.map((obstacle) => ({ ...obstacle, kind: "mover" })),
  ];

  for (const player of state.players) {
    if (!player.alive) continue;
    for (const rect of colliders) {
      const hit = circleRectHit(player, rect);
      if (!hit) continue;

      player.x += hit.nx * hit.depth;
      player.y += hit.ny * hit.depth;

      const intoSurface = player.vx * hit.nx + player.vy * hit.ny;
      if (intoSurface < 0) {
        player.vx -= intoSurface * hit.nx * 1.3;
        player.vy -= intoSurface * hit.ny * 1.3;
      }

      if (rect.kind === "mover") {
        player.vx += hit.nx * 110 + rect.vx * 0.42;
        player.vy += hit.ny * 110 + rect.vy * 0.42;
        state.shake = Math.max(state.shake, player.isHuman ? 4 : 1.5);
      }
    }

    for (const rotator of state.rotators) {
      const hit = circleRotatedRectHit(player, rotator);
      if (!hit) continue;

      player.x += hit.nx * hit.depth;
      player.y += hit.ny * hit.depth;

      const tangentX = -Math.sin(rotator.angle) * Math.sign(rotator.speed);
      const tangentY = Math.cos(rotator.angle) * Math.sign(rotator.speed);
      player.vx += hit.nx * 150 + tangentX * 95;
      player.vy += hit.ny * 150 + tangentY * 95;
      state.shake = Math.max(state.shake, player.isHuman ? 5 : 2);
    }
  }
}

function circleRectHit(circle, rect) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  let dx = circle.x - closestX;
  let dy = circle.y - closestY;
  let dist = Math.hypot(dx, dy);

  if (dist >= circle.radius) return null;

  if (dist === 0) {
    const left = Math.abs(circle.x - rect.x);
    const right = Math.abs(rect.x + rect.w - circle.x);
    const top = Math.abs(circle.y - rect.y);
    const bottom = Math.abs(rect.y + rect.h - circle.y);
    const min = Math.min(left, right, top, bottom);
    if (min === left) return { nx: -1, ny: 0, depth: circle.radius + left };
    if (min === right) return { nx: 1, ny: 0, depth: circle.radius + right };
    if (min === top) return { nx: 0, ny: -1, depth: circle.radius + top };
    return { nx: 0, ny: 1, depth: circle.radius + bottom };
  }

  dx /= dist;
  dy /= dist;
  return { nx: dx, ny: dy, depth: circle.radius - dist };
}

function circleRotatedRectHit(circle, rect) {
  const cos = Math.cos(-rect.angle);
  const sin = Math.sin(-rect.angle);
  const dx = circle.x - rect.cx;
  const dy = circle.y - rect.cy;
  const localCircle = {
    x: dx * cos - dy * sin + rect.length / 2,
    y: dx * sin + dy * cos + rect.width / 2,
    radius: circle.radius,
  };
  const localRect = { x: 0, y: 0, w: rect.length, h: rect.width };
  const hit = circleRectHit(localCircle, localRect);
  if (!hit) return null;

  const worldCos = Math.cos(rect.angle);
  const worldSin = Math.sin(rect.angle);
  return {
    nx: hit.nx * worldCos - hit.ny * worldSin,
    ny: hit.nx * worldSin + hit.ny * worldCos,
    depth: hit.depth,
  };
}


function updateEliminations() {
  for (const player of state.players) {
    if (!player.alive) continue;
    const tile = getTileAt(player.x, player.y);
    const outsideArena = player.x < ARENA_BOUNDS.left || player.x >= ARENA_BOUNDS.right || player.y < ARENA_BOUNDS.top || player.y >= ARENA_BOUNDS.bottom;
    const onGone = outsideArena || !tile || tile.state === "gone";
    if (onGone) {
      player.alive = false;
      player.eliminatedAt = state.elapsed;
      player.vx = 0;
      player.vy = 0;
      if (player.lastHitBy != null) {
        const source = state.players[player.lastHitBy];
        if (source && source !== player && state.elapsed - player.lastHitAt < 2.2) {
          source.eliminationsCaused += 1;
        }
      }
      announceElimination(player, outsideArena);
      state.shake = 7;
    }
  }

  const alive = getAlivePlayers().length;
  for (const count of [25, 10, 5]) {
    if (alive <= count && !state.announcedAlive.has(count)) {
      state.announcedAlive.add(count);
      addEvent(`残り${alive}人`, alive <= 10 ? "danger" : "good");
    }
  }
}

function announceElimination(player, outsideArena) {
  if (player.isHuman) {
    addEvent(outsideArena ? "あなたは端から落下" : "あなたは床から落下", "danger");
    enterSpectatorMode();
    return;
  }
  const alive = getAlivePlayers().length;
  if (alive <= 12 || Math.random() < 0.18) {
    addEvent(`${player.name} が脱落`, "danger");
  }
}

function enterSpectatorMode() {
  if (state.spectating) return;
  state.spectating = true;
  showEliminatedPanel();
  addEvent("観戦モード: 試合終了まで神視点で見られます", "good");
}

function showEliminatedPanel() {
  const human = state.players[0];
  const rank = getRanking().findIndex((player) => player.isHuman) + 1;
  const survival = Math.floor(human.eliminatedAt ?? state.elapsed);
  eliminatedText.textContent = `暫定 ${rank} / ${PLAYER_COUNT} 位・生存 ${survival}s。試合はこのまま続きます。`;
  eliminatedPanel.classList.remove("hidden");
}

function getTileAt(x, y) {
  return state.tiles.find((tile) => {
    return x >= tile.x && x < tile.x + ARENA.tile && y >= tile.y && y < tile.y + ARENA.tile;
  });
}

function render() {
  const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  ctx.save();
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  ctx.translate(shakeX, shakeY);
  drawBackground();
  drawTiles();
  drawObstacles();
  drawPlayers();
  drawOverlay();
  ctx.restore();

  updateHud();
  updateEventLog();
  if (leaderboardTick > 0.18) {
    updateLeaderboard();
    leaderboardTick = 0;
  }
}

function addEvent(text, tone = "") {
  if (!state.events) return;
  state.events.unshift({
    id: state.eventSeq++,
    text,
    tone,
    until: state.elapsed + 3.4,
  });
  state.events = state.events.slice(0, 5);
}

function updateEventLog() {
  if (!state.events) return;
  state.events = state.events.filter((event) => event.until > state.elapsed || state.mode !== "playing");
  eventLog.replaceChildren(
    ...state.events.slice(0, 4).map((event) => {
      const item = document.createElement("div");
      item.className = `event-toast ${event.tone}`.trim();
      item.textContent = event.text;
      return item;
    })
  );
}

function drawBackground() {
  ctx.fillStyle = "#11161c";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  for (let x = 0; x < WORLD.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.height);
    ctx.stroke();
  }
  for (let y = 0; y < WORLD.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.05)";
  roundRect(82, 35, 1114, 606, 24);
  ctx.fill();
}

function drawTiles() {
  for (const tile of state.tiles) {
    const size = ARENA.tile - ARENA.gap;
    if (tile.state === "gone") {
      ctx.fillStyle = "#07090c";
      roundRect(tile.x, tile.y, size, size, 8);
      ctx.fill();
      continue;
    }

    const pulse = tile.state === "cracking" ? Math.sin(tile.crack * 18) * 0.5 + 0.5 : 0;
    ctx.fillStyle = tile.state === "cracking" ? mixColor("#293340", "#ff765f", pulse) : checkerColor(tile.col, tile.row);
    roundRect(tile.x, tile.y, size, size, 8);
    ctx.fill();

    ctx.strokeStyle = tile.state === "cracking" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (tile.state === "cracking") {
      ctx.strokeStyle = "rgba(20, 25, 32, 0.72)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tile.x + 16, tile.y + 18);
      ctx.lineTo(tile.x + 35, tile.y + 39);
      ctx.lineTo(tile.x + 26, tile.y + 62);
      ctx.moveTo(tile.x + 50, tile.y + 12);
      ctx.lineTo(tile.x + 42, tile.y + 34);
      ctx.lineTo(tile.x + 62, tile.y + 57);
      ctx.stroke();
    }
  }
}

function drawObstacles() {
  for (const wall of state.walls) {
    ctx.fillStyle = wall.label === "board" ? "#d9e2ea" : "#8c6d55";
    roundRect(wall.x, wall.y, wall.w, wall.h, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(18, 22, 28, 0.55)";
    ctx.lineWidth = 3;
    ctx.stroke();

    if (wall.label !== "board") {
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(wall.x + 12, wall.y + 7, wall.w - 24, 4);
    }
  }

  for (const obstacle of state.obstacles) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    roundRect(obstacle.x + 4, obstacle.y + 8, obstacle.w, obstacle.h, 12);
    ctx.fill();

    ctx.fillStyle = "#ff765f";
    roundRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.28)";
    for (let x = obstacle.x + 14; x < obstacle.x + obstacle.w - 10; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x, obstacle.y + 4);
      ctx.lineTo(x + 16, obstacle.y + obstacle.h - 4);
      ctx.lineTo(x + 8, obstacle.y + obstacle.h - 4);
      ctx.lineTo(x - 8, obstacle.y + 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  for (const rotator of state.rotators) {
    ctx.save();
    ctx.translate(rotator.cx, rotator.cy);
    ctx.rotate(rotator.angle);

    ctx.fillStyle = "rgba(0,0,0,0.28)";
    roundRect(-rotator.length / 2 + 5, -rotator.width / 2 + 9, rotator.length, rotator.width, 12);
    ctx.fill();

    ctx.fillStyle = "#f4c95d";
    roundRect(-rotator.length / 2, -rotator.width / 2, rotator.length, rotator.width, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(34, 28, 12, 0.65)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#263340";
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.34)";
    for (let x = -rotator.length / 2 + 18; x < rotator.length / 2 - 12; x += 38) {
      ctx.fillRect(x, -rotator.width / 2 + 5, 18, 5);
    }
    ctx.restore();
  }
}

function checkerColor(col, row) {
  if ((col + row) % 3 === 0) return "#253447";
  if ((col + row) % 3 === 1) return "#263b37";
  return "#342d42";
}

function drawPlayers() {
  const players = [...state.players].sort((a, b) => a.y - b.y);
  for (const player of players) {
    if (!player.alive) {
      drawEliminated(player);
      continue;
    }
    const scale = player.burstTime > 0 ? 1.08 : 1;

    if (player.burstTime > 0) {
      const progress = 1 - player.burstTime / 0.28;
      ctx.globalAlpha = 0.85 * (1 - progress);
      ctx.strokeStyle = player.isHuman ? "#ffffff" : player.color;
      ctx.lineWidth = player.isHuman ? 7 : 4;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 24 + BURST_RADIUS * (0.62 + player.lastBurstPower * 0.38) * progress, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (player.burstCharge > 0 && player.burstCooldown <= 0) {
      const power = getBurstPower(player);
      ctx.globalAlpha = player.isHuman ? 0.9 : 0.45;
      ctx.strokeStyle = player.isHuman ? "#f4c95d" : player.color;
      ctx.lineWidth = player.isHuman ? 4 : 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, BURST_RADIUS * (0.62 + power * 0.38), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 12, player.radius * 1.2, player.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * scale, 0, Math.PI * 2);
    ctx.fill();

    if (player.knockbackTime > 0) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.arc(player.x - 4, player.y - 3, 2.2, 0, Math.PI * 2);
    ctx.arc(player.x + 4, player.y - 3, 2.2, 0, Math.PI * 2);
    ctx.fill();

    if (player.isHuman) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawEliminated(player) {
  if (!player.eliminatedAt || state.elapsed - player.eliminatedAt > 1.3) return;
  const alpha = 1 - (state.elapsed - player.eliminatedAt) / 1.3;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = player.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_RADIUS + 18 * (1 - alpha), 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawOverlay() {
  const seconds = Math.ceil(Math.max(0, ROUND_SECONDS - state.elapsed));
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "800 18px Segoe UI, sans-serif";
  ctx.fillText("Space/BURST長押しで溜めて、離して周囲を弾け", 98, 678);
  ctx.textAlign = "right";
  ctx.fillText(`${seconds}s`, 1180, 678);
  ctx.textAlign = "left";
}

function updateHud() {
  const alive = getAlivePlayers();
  const ranking = getRanking();
  const humanRank = ranking.findIndex((player) => player.isHuman) + 1;
  aliveCountEl.textContent = String(alive.length);
  rankEl.textContent = String(humanRank);
  timerEl.textContent = String(Math.ceil(Math.max(0, ROUND_SECONDS - state.elapsed)));
  updateBurstButton();
}

function updateBurstButton() {
  const human = state.players[0];
  const cooldownProgress = human.burstCooldown > 0 ? human.burstCooldown / BURST_COOLDOWN : 0;
  const chargeProgress = human.burstCooldown <= 0 ? Math.min(1, human.burstCharge / BURST_CHARGE_MAX) : 0;
  dashButton.style.setProperty("--cooldown", `${cooldownProgress * 100}%`);
  dashButton.style.setProperty("--charge", `${chargeProgress * 100}%`);
  dashButton.classList.toggle("charging", chargeProgress > 0);
  dashButton.classList.toggle("cooling", cooldownProgress > 0);
  burstMeter.classList.toggle("charging", chargeProgress > 0);
  burstMeter.classList.toggle("cooling", cooldownProgress > 0);
  if (cooldownProgress > 0) {
    const seconds = Math.ceil(human.burstCooldown).toString();
    dashButton.textContent = seconds;
    burstValue.textContent = `${seconds}s`;
    burstFill.style.height = `${(1 - cooldownProgress) * 100}%`;
  } else if (chargeProgress > 0) {
    const percent = `${Math.round(Math.max(28, chargeProgress * 100))}%`;
    dashButton.textContent = percent;
    burstValue.textContent = percent;
    burstFill.style.height = percent;
  } else {
    dashButton.textContent = "BURST";
    burstValue.textContent = "READY";
    burstFill.style.height = "100%";
  }
}

function updateLeaderboard() {
  const top = getRanking().slice(0, 15);
  leaderboardEl.replaceChildren(
    ...top.map((player, index) => {
      const li = document.createElement("li");
      li.className = player.isHuman ? "me" : "";
      const status = player.alive ? "ALIVE" : "OUT";
      li.innerHTML = `<span>${index + 1}</span><strong>${player.name}</strong><span>${status}</span>`;
      return li;
    })
  );
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function mixColor(a, b, t) {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = ah >> 16;
  const ag = (ah >> 8) & 0xff;
  const ab = ah & 0xff;
  const br = bh >> 16;
  const bg = (bh >> 8) & 0xff;
  const bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr}, ${rg}, ${rb})`;
}

function frame(now) {
  const delta = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  accumulator += delta;
  while (accumulator >= 1 / 60) {
    update(1 / 60);
    accumulator -= 1 / 60;
  }
  render();
  requestAnimationFrame(frame);
}

function updateStick(clientX, clientY) {
  const rect = stick.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const max = rect.width * 0.32;
  const len = Math.hypot(dx, dy);
  const clamped = Math.min(max, len);
  const nx = len ? dx / len : 0;
  const ny = len ? dy / len : 0;
  input.x = (nx * clamped) / max;
  input.y = (ny * clamped) / max;
  stickKnob.style.transform = `translate(calc(-50% + ${nx * clamped}px), calc(-50% + ${ny * clamped}px))`;
}

function resetStick() {
  input.x = 0;
  input.y = 0;
  input.touchId = null;
  stickKnob.style.transform = "translate(-50%, -50%)";
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !rulesModal.classList.contains("hidden")) {
    closeRules();
    return;
  }
  input.keys.add(event.key.toLowerCase());
  if (event.key === " ") {
    event.preventDefault();
    if (!event.repeat) input.actionHeld = true;
  }
});

window.addEventListener("keyup", (event) => {
  input.keys.delete(event.key.toLowerCase());
  if (event.key === " ") {
    event.preventDefault();
    input.actionHeld = false;
    input.actionReleased = true;
  }
});

window.addEventListener("blur", () => {
  input.keys.clear();
  input.actionHeld = false;
  input.actionReleased = false;
  input.actionPointerId = null;
  resetStick();
});

stick.addEventListener("pointerdown", (event) => {
  input.touchId = event.pointerId;
  stick.setPointerCapture(event.pointerId);
  updateStick(event.clientX, event.clientY);
});

stick.addEventListener("pointermove", (event) => {
  if (input.touchId === event.pointerId) updateStick(event.clientX, event.clientY);
});

stick.addEventListener("pointerup", resetStick);
stick.addEventListener("pointercancel", resetStick);

dashButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  input.actionPointerId = event.pointerId;
  dashButton.setPointerCapture(event.pointerId);
  input.actionHeld = true;
});

dashButton.addEventListener("pointerup", (event) => {
  if (input.actionPointerId !== event.pointerId) return;
  event.preventDefault();
  input.actionHeld = false;
  input.actionReleased = true;
  input.actionPointerId = null;
});

dashButton.addEventListener("pointercancel", (event) => {
  if (input.actionPointerId !== event.pointerId) return;
  input.actionHeld = false;
  input.actionPointerId = null;
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
quickRestart.addEventListener("click", startGame);
eliminatedCloseButton.addEventListener("click", () => {
  eliminatedPanel.classList.add("hidden");
});
rulesButton.addEventListener("click", openRules);
rulesCloseButton.addEventListener("click", closeRules);
rulesModal.addEventListener("click", (event) => {
  if (event.target === rulesModal) closeRules();
});

updateLeaderboard();
requestAnimationFrame(frame);
