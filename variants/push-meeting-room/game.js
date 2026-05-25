const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const aliveCountEl = document.getElementById("aliveCount");
const rankTextEl = document.getElementById("rankText");
const roundTextEl = document.getElementById("roundText");
const tickTextEl = document.getElementById("tickText");
const phaseTextEl = document.getElementById("phaseText");
const intentTextEl = document.getElementById("intentText");
const statusTextEl = document.getElementById("statusText");
const logListEl = document.getElementById("logList");
const powerSlider = document.getElementById("powerSlider");
const powerTextEl = document.getElementById("powerText");
const resultBanner = document.getElementById("resultBanner");
const restartButton = document.getElementById("restartButton");
const rulesButton = document.getElementById("rulesButton");
const closeRulesButton = document.getElementById("closeRulesButton");
const rulesDialog = document.getElementById("rulesDialog");

const W = canvas.width;
const H = canvas.height;
const PLAYER_COUNT = 50;
const TICK_MS = 1000;
const playerRadius = 9;

const dirs = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const actionLabels = {
  push: "Push",
  brace: "Brace",
  heavy: "Heavy",
  dodge: "Dodge",
};

const dirLabels = {
  up: "上",
  down: "下",
  left: "左",
  right: "右",
};

const state = {
  players: [],
  round: 1,
  elapsed: 0,
  tickElapsed: 0,
  selectedAction: "push",
  selectedDir: "right",
  power: 0.7,
  running: true,
  playerRank: null,
  winnerId: null,
  shake: 0,
  flash: 0,
  phasePulse: 0,
  effects: [],
  logs: [],
  safe: { x: 70, y: 58, w: W - 140, h: H - 116 },
};

const obstacles = [
  { x: 154, y: 126, w: 130, h: 36, label: "TABLE" },
  { x: 688, y: 120, w: 132, h: 38, label: "BOARD" },
  { x: 410, y: 268, w: 140, h: 42, label: "TABLE" },
  { x: 118, y: 440, w: 168, h: 38, label: "CHAIRS" },
  { x: 666, y: 430, w: 160, h: 42, label: "TABLE" },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isInObstacle(x, y, pad = 0) {
  return obstacles.some((o) => (
    x > o.x - pad &&
    x < o.x + o.w + pad &&
    y > o.y - pad &&
    y < o.y + o.h + pad
  ));
}

function makePlayer(id, isHuman) {
  let x = W / 2;
  let y = H / 2;
  for (let tries = 0; tries < 200; tries += 1) {
    x = rand(state.safe.x + 80, state.safe.x + state.safe.w - 80);
    y = rand(state.safe.y + 70, state.safe.y + state.safe.h - 70);
    if (!isInObstacle(x, y, 20)) break;
  }
  const hue = isHuman ? 154 : rand(190, 355);
  return {
    id,
    isHuman,
    x,
    y,
    vx: 0,
    vy: 0,
    alive: true,
    rank: null,
    action: "push",
    dir: "right",
    power: rand(0.35, 0.95),
    stun: 0,
    hue,
  };
}

function resetGame() {
  state.players = [];
  state.round = 1;
  state.elapsed = 0;
  state.tickElapsed = 0;
  state.running = true;
  state.playerRank = null;
  state.winnerId = null;
  state.shake = 0;
  state.flash = 0;
  state.phasePulse = 0;
  state.effects = [];
  state.logs = [];
  state.safe = { x: 70, y: 58, w: W - 140, h: H - 116 };
  resultBanner.classList.add("hidden");

  for (let i = 0; i < PLAYER_COUNT; i += 1) {
    state.players.push(makePlayer(i + 1, i === 0));
  }
  addLog("Round 1: 行動を予約して、ゲージが0になる瞬間を待ちます。");
  updateActionText();
}

function alivePlayers() {
  return state.players.filter((p) => p.alive);
}

function human() {
  return state.players[0];
}

function chooseNpcAction(p) {
  if (!p.alive) return;
  const cx = state.safe.x + state.safe.w / 2;
  const cy = state.safe.y + state.safe.h / 2;
  const margin = 58;
  const nearLeft = p.x - state.safe.x < margin;
  const nearRight = state.safe.x + state.safe.w - p.x < margin;
  const nearTop = p.y - state.safe.y < margin;
  const nearBottom = state.safe.y + state.safe.h - p.y < margin;
  const crowded = state.players.some((q) => q !== p && q.alive && distance(p, q) < 24);

  if (nearLeft || nearRight || nearTop || nearBottom) {
    p.action = Math.random() < 0.52 ? "brace" : "push";
    if (nearLeft) p.dir = "right";
    else if (nearRight) p.dir = "left";
    else if (nearTop) p.dir = "down";
    else p.dir = "up";
    p.power = rand(0.55, 0.95);
    return;
  }

  if (crowded && Math.random() < 0.28) {
    p.action = Math.random() < 0.45 ? "heavy" : "dodge";
    p.dir = Math.abs(cx - p.x) > Math.abs(cy - p.y)
      ? (cx > p.x ? "right" : "left")
      : (cy > p.y ? "down" : "up");
    p.power = rand(0.45, 0.9);
    return;
  }

  p.action = Math.random() < 0.72 ? "push" : "brace";
  p.dir = Math.abs(cx - p.x) > Math.abs(cy - p.y)
    ? (cx > p.x ? "right" : "left")
    : (cy > p.y ? "down" : "up");
  p.power = rand(0.3, 0.75);
}

function currentHumanIntent() {
  const h = human();
  h.action = state.selectedAction;
  h.dir = state.selectedDir;
  h.power = state.power;
}

function shrinkSafeArea() {
  const maxShrink = 220;
  const shrink = Math.min(maxShrink, state.round * 5.5);
  state.safe = {
    x: 70 + shrink,
    y: 58 + shrink * 0.62,
    w: W - 140 - shrink * 2,
    h: H - 116 - shrink * 1.24,
  };
}

function addEffect(type, x, y, dir, power) {
  state.effects.push({
    type,
    x,
    y,
    dir,
    power,
    age: 0,
    life: type === "shock" ? 560 : 420,
  });
}

function applyActionForces() {
  currentHumanIntent();
  state.players.forEach(chooseNpcAction);

  const h = human();
  const report = {
    action: h.action,
    dir: h.dir,
    power: h.power,
    affected: 0,
    blocked: h.stun > 0,
    eliminated: 0,
  };

  const alive = alivePlayers();
  for (const p of alive) {
    if (p.stun > 0) {
      p.stun -= 1;
      continue;
    }

    const d = dirs[p.dir];
    const base = p.action === "heavy" ? 4.8 : p.action === "push" ? 2.7 : p.action === "dodge" ? 3.1 : 0;
    const selfMove = p.action === "brace" ? 0.25 : base * p.power;
    const side = p.action === "dodge" ? { x: -d.y, y: d.x } : d;
    p.vx += side.x * selfMove;
    p.vy += side.y * selfMove;

    if (p.action === "heavy") {
      p.stun = 1;
      state.shake = 10;
    }
  }

  for (let i = 0; i < alive.length; i += 1) {
    for (let j = i + 1; j < alive.length; j += 1) {
      const a = alive[i];
      const b = alive[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      if (dist > 40) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = 40 - dist;
      const aBrace = a.action === "brace" ? 0.45 : 1;
      const bBrace = b.action === "brace" ? 0.45 : 1;
      const impulse = overlap * 0.055;

      a.vx -= nx * impulse * aBrace;
      a.vy -= ny * impulse * aBrace;
      b.vx += nx * impulse * bBrace;
      b.vy += ny * impulse * bBrace;

      if (a.isHuman || b.isHuman) report.affected += 1;

      if (a.action === "heavy") {
        b.vx += dirs[a.dir].x * 4.6 * a.power;
        b.vy += dirs[a.dir].y * 4.6 * a.power;
        if (a.isHuman) report.affected += 1;
      }
      if (b.action === "heavy") {
        a.vx += dirs[b.dir].x * 4.6 * b.power;
        a.vy += dirs[b.dir].y * 4.6 * b.power;
        if (b.isHuman) report.affected += 1;
      }
    }
  }

  addEffect(h.action === "heavy" ? "shock" : "pulse", h.x, h.y, h.dir, h.power);
  state.flash = 1;
  state.phasePulse = 1;
  return report;
}

function resolveObstacles(p) {
  for (const o of obstacles) {
    const closestX = clamp(p.x, o.x, o.x + o.w);
    const closestY = clamp(p.y, o.y, o.y + o.h);
    const dx = p.x - closestX;
    const dy = p.y - closestY;
    const dist = Math.max(0.1, Math.hypot(dx, dy));
    if (dist < playerRadius + 3) {
      const nx = dx / dist || (p.x < o.x + o.w / 2 ? -1 : 1);
      const ny = dy / dist || 0;
      const push = playerRadius + 3 - dist;
      p.x += nx * push;
      p.y += ny * push;
      p.vx += nx * 2.2;
      p.vy += ny * 2.2;
    }
  }
}

function eliminateOutsiders() {
  const aliveBefore = alivePlayers().length;
  let eliminatedThisCheck = 0;
  for (const p of state.players) {
    if (!p.alive) continue;
    const outside = (
      p.x < state.safe.x ||
      p.x > state.safe.x + state.safe.w ||
      p.y < state.safe.y ||
      p.y > state.safe.y + state.safe.h
    );
    if (outside) {
      p.alive = false;
      eliminatedThisCheck += 1;
      p.rank = aliveBefore - eliminatedThisCheck + 1;
      if (p.isHuman) {
        state.playerRank = p.rank;
        showBanner(`脱落！あなたの順位は ${p.rank} 位です。ゲームは最後まで観戦できます。`);
      }
    }
  }
  return eliminatedThisCheck;
}

function tickTurn() {
  if (!state.running) return;
  state.round += 1;
  shrinkSafeArea();
  const report = applyActionForces();
  report.eliminated += eliminateOutsiders();
  addActionLog(report);
  updateActionText();

  const alive = alivePlayers();
  if (alive.length <= 1) {
    state.running = false;
    state.winnerId = alive[0]?.id ?? null;
    const h = human();
    if (h.alive) {
      state.playerRank = 1;
      showBanner("優勝！会議室の最後の1人です。");
    } else {
      showBanner(`決着！優勝は Player ${state.winnerId}。あなたは ${state.playerRank} 位でした。`);
    }
  }
}

function addActionLog(report) {
  const power = Math.round(report.power * 100);
  let result = `${dirLabels[report.dir]}へ${actionLabels[report.action]} ${power}%`;
  if (report.blocked) result += " / 硬直で弱め";
  if (report.affected > 0) result += ` / 近くの${report.affected}人に影響`;
  else result += " / 周囲への影響は小さめ";
  if (report.eliminated > 0) result += ` / ${report.eliminated}人脱落`;
  addLog(`Round ${state.round}: ${result}`);
}

function addLog(text) {
  state.logs.unshift(text);
  state.logs = state.logs.slice(0, 6);
  logListEl.innerHTML = state.logs.map((log) => `<li>${log}</li>`).join("");
}

function showBanner(text) {
  resultBanner.textContent = text;
  resultBanner.classList.remove("hidden");
}

function updatePhysics(dt) {
  for (const p of state.players) {
    if (!p.alive) continue;
    p.x += p.vx * dt * 58;
    p.y += p.vy * dt * 58;
    p.vx *= 0.9;
    p.vy *= 0.9;
    resolveObstacles(p);
  }
  eliminateOutsiders();
  state.effects = state.effects
    .map((effect) => ({ ...effect, age: effect.age + dt * 1000 }))
    .filter((effect) => effect.age < effect.life);
  state.flash = Math.max(0, state.flash - dt * 3.5);
  state.phasePulse = Math.max(0, state.phasePulse - dt * 3.8);
}

function drawRoom() {
  ctx.fillStyle = "#141922";
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  for (let x = 34; x < W; x += 34) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 34; y < H; y += 34) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(255, 123, 100, 0.12)";
  ctx.fillRect(state.safe.x, state.safe.y, state.safe.w, state.safe.h);
  ctx.strokeStyle = "#ff7b64";
  ctx.lineWidth = 5;
  ctx.strokeRect(state.safe.x, state.safe.y, state.safe.w, state.safe.h);
  ctx.restore();

  for (const o of obstacles) {
    ctx.fillStyle = "#293342";
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    roundRect(o.x, o.y, o.w, o.h, 7, true, true);
    ctx.fillStyle = "rgba(247,248,251,0.45)";
    ctx.font = "700 11px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(o.label, o.x + o.w / 2, o.y + o.h / 2 + 4);
  }
}

function roundRect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function drawEffects() {
  for (const effect of state.effects) {
    const t = effect.age / effect.life;
    const d = dirs[effect.dir] || dirs.right;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = effect.type === "shock" ? "#ff7b64" : "#5ed7a5";
    ctx.lineWidth = effect.type === "shock" ? 6 : 4;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, 24 + t * 82 * effect.power, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(effect.x, effect.y);
    ctx.lineTo(effect.x + d.x * (60 + t * 90), effect.y + d.y * (60 + t * 90));
    ctx.stroke();
    ctx.restore();
  }
}

function drawPlayers() {
  const sorted = [...state.players].sort((a, b) => Number(a.isHuman) - Number(b.isHuman));
  for (const p of sorted) {
    if (!p.alive) {
      ctx.globalAlpha = 0.12;
    }
    const isHuman = p.isHuman;
    ctx.beginPath();
    ctx.fillStyle = isHuman ? "#5ed7a5" : `hsl(${p.hue} 78% 62%)`;
    ctx.arc(p.x, p.y, isHuman ? 12 : 8, 0, Math.PI * 2);
    ctx.fill();

    if (isHuman) {
      ctx.strokeStyle = "#f4c95d";
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    if (p.alive) {
      const d = dirs[p.dir] || dirs.right;
      ctx.strokeStyle = p.action === "heavy" ? "#ff7b64" : p.action === "brace" ? "#f4c95d" : "#ffffff";
      ctx.globalAlpha = p.action === "brace" ? 0.55 : 0.75;
      ctx.lineWidth = p.action === "heavy" ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + d.x * 21, p.y + d.y * 21);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  ctx.globalAlpha = 1;
}

function drawTurnPulse() {
  const progress = state.tickElapsed / TICK_MS;
  ctx.save();
  ctx.fillStyle = "rgba(94, 215, 165, 0.92)";
  ctx.fillRect(0, H - 7, W * (1 - progress), 7);
  ctx.restore();
}

function drawFlash() {
  if (state.flash <= 0) return;
  ctx.save();
  ctx.globalAlpha = state.flash * 0.22;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function draw() {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake));
    state.shake *= 0.82;
    if (state.shake < 0.5) state.shake = 0;
  }
  drawRoom();
  drawEffects();
  drawPlayers();
  drawTurnPulse();
  drawFlash();
  ctx.restore();
}

function updateHud() {
  const alive = alivePlayers().length;
  const remain = Math.max(0, TICK_MS - state.tickElapsed);
  aliveCountEl.textContent = String(alive);
  roundTextEl.textContent = String(state.round);
  tickTextEl.textContent = state.running ? `${(remain / 1000).toFixed(1)}s` : "done";

  if (remain < 180 && state.running) {
    phaseTextEl.textContent = "PUSH!";
    phaseTextEl.classList.add("hot");
  } else {
    phaseTextEl.textContent = remain < 520 ? "SET" : "WAIT";
    phaseTextEl.classList.toggle("hot", state.phasePulse > 0);
  }

  const h = human();
  if (h.alive) {
    rankTextEl.textContent = `${alive}人中`;
  } else {
    rankTextEl.textContent = `${state.playerRank}位`;
  }
}

function updateActionText() {
  const action = actionLabels[state.selectedAction];
  const dir = dirLabels[state.selectedDir];
  const power = Math.round(state.power * 100);
  intentTextEl.textContent = `${dir}へ${action} ${power}%`;
  statusTextEl.textContent = `次のtickで「${dir}へ${action}」を発動します。PUSH! の瞬間に衝撃波とログで結果が出ます。`;
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;

  if (state.running) {
    state.elapsed += dt * 1000;
    state.tickElapsed += dt * 1000;
    if (state.tickElapsed >= TICK_MS) {
      state.tickElapsed -= TICK_MS;
      tickTurn();
    }
    updatePhysics(dt);
  }

  updateHud();
  draw();
  requestAnimationFrame(loop);
}

function setAction(action) {
  state.selectedAction = action;
  document.querySelectorAll(".action-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.action === action);
  });
  updateActionText();
}

function setDirection(dir) {
  state.selectedDir = dir;
  document.querySelectorAll(".dir-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.dir === dir);
  });
  updateActionText();
}

document.querySelectorAll(".action-button").forEach((button) => {
  button.addEventListener("click", () => setAction(button.dataset.action));
});

document.querySelectorAll(".dir-button").forEach((button) => {
  button.addEventListener("click", () => setDirection(button.dataset.dir));
});

powerSlider.addEventListener("input", () => {
  state.power = Number(powerSlider.value);
  powerTextEl.textContent = `${Math.round(state.power * 100)}%`;
  updateActionText();
});

restartButton.addEventListener("click", resetGame);

rulesButton.addEventListener("click", () => {
  if (typeof rulesDialog.showModal === "function") rulesDialog.showModal();
});

closeRulesButton.addEventListener("click", () => rulesDialog.close());

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") setDirection("up");
  if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") setDirection("down");
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") setDirection("left");
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") setDirection("right");
  if (event.key === "1") setAction("push");
  if (event.key === "2") setAction("brace");
  if (event.key === "3") setAction("heavy");
  if (event.key === "4") setAction("dodge");
});

resetGame();
requestAnimationFrame(loop);
