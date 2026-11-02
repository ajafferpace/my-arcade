const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const platformCounterEl = document.getElementById('platformCounter');
const restartButton = document.getElementById('restartButton');

const controls = {
  left: false,
  right: false,
  jumpQueued: false,
};

const player = {
  x: 0,
  y: 0,
  w: 26,
  h: 32,
  vx: 0,
  vy: 0,
  speed: 4.6,
  jumpStrength: 11,
  onGround: false,
  color: '#f8fbff',
};

const state = {
  running: true,
  won: false,
  lost: false,
  reachedIndex: 0,
  lastTime: 0,
  startTime: 0,
};

let platforms = [];

const platformPalette = [
  '#f76c5e',
  '#f4d35e',
  '#79d2a6',
  '#7aa2ff',
  '#de85ff',
  '#ff9f1c',
  '#5ae4ff',
  '#ff7eb6',
];

const platformShapes = ['rect', 'triangle', 'diamond', 'hex', 'round', 'capsule'];

function buildPlatforms() {
  const layout = [
    { x: 55, y: 360, w: 120, h: 18 },
    { x: 250, y: 300, w: 130, h: 18 },
    { x: 450, y: 240, w: 150, h: 18 },
    { x: 200, y: 180, w: 145, h: 18 },
    { x: 425, y: 120, w: 180, h: 18 },
    { x: 120, y: 70, w: 150, h: 18 },
  ];

  platforms = layout.map((platform, index) => ({
    ...platform,
    id: index,
    color: platformPalette[index % platformPalette.length],
    shape: platformShapes[index % platformShapes.length],
    falling: false,
    vy: 0,
    fallDelay: 900 + index * 250,
    reached: false,
  }));
}

function resetGame() {
  buildPlatforms();
  state.running = true;
  state.won = false;
  state.lost = false;
  state.reachedIndex = 0;
  state.startTime = performance.now();
  state.lastTime = 0;

  const startPlatform = platforms[0];
  player.x = startPlatform.x + 18;
  player.y = startPlatform.y - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;

  statusEl.textContent = 'Jump the falling platforms';
  platformCounterEl.textContent = '1';
}

function setStatus() {
  if (state.won) {
    statusEl.textContent = 'You win!';
  } else if (state.lost) {
    statusEl.textContent = 'You fell!';
  } else {
    const nextIndex = Math.min(state.reachedIndex + 1, platforms.length);
    statusEl.textContent = `Platform ${nextIndex}/${platforms.length}`;
  }
}

function onKeyChange(event, isPressed) {
  const key = event.key.toLowerCase();

  if (key === 'arrowleft' || key === 'a') {
    controls.left = isPressed;
  }

  if (key === 'arrowright' || key === 'd') {
    controls.right = isPressed;
  }

  if ((key === 'arrowup' || key === 'w' || key === ' ') && isPressed && !event.repeat) {
    controls.jumpQueued = true;
  }
}

function bindTouchButton(button, action) {
  const trigger = (event) => {
    event.preventDefault();
    if (action === 'left') {
      controls.left = true;
    }
    if (action === 'right') {
      controls.right = true;
    }
    if (action === 'jump') {
      controls.jumpQueued = true;
    }
  };

  const release = (event) => {
    event.preventDefault();
    if (action === 'left') {
      controls.left = false;
    }
    if (action === 'right') {
      controls.right = false;
    }
  };

  button.addEventListener('pointerdown', trigger);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointerleave', release);
  button.addEventListener('pointercancel', release);
}

function applyControls() {
  if (controls.left && !controls.right) {
    player.vx = -player.speed;
  } else if (controls.right && !controls.left) {
    player.vx = player.speed;
  } else {
    player.vx *= 0.72;
    if (Math.abs(player.vx) < 0.1) {
      player.vx = 0;
    }
  }

  if (controls.jumpQueued && player.onGround) {
    player.vy = -player.jumpStrength;
    player.onGround = false;
    controls.jumpQueued = false;
  }

  if (controls.jumpQueued && !player.onGround) {
    controls.jumpQueued = false;
  }
}

function handlePlatformFalls() {
  const elapsed = performance.now() - state.startTime;

  platforms.forEach((platform, index) => {
    if (!platform.falling && elapsed > platform.fallDelay) {
      platform.falling = true;
      platform.vy = 0.45 + index * 0.06;
    }

    if (platform.falling) {
      platform.y += platform.vy;
      platform.vy += 0.08;
    }

    if (platform.y > canvas.height + 30) {
      state.running = false;
      state.lost = true;
    }
  });
}

function handleCollision() {
  const previousY = player.y - player.vy;

  for (const platform of platforms) {
    const intersectsX = player.x + player.w > platform.x && player.x < platform.x + platform.w;
    const wasAbove = previousY + player.h <= platform.y + 7;
    const isTouching = player.y + player.h >= platform.y && player.y < platform.y + platform.h + 16;

    if (intersectsX && wasAbove && isTouching && player.vy >= 0) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.onGround = true;

      if (!platform.reached) {
        platform.reached = true;
        state.reachedIndex = Math.max(state.reachedIndex, platform.id);
        platformCounterEl.textContent = String(Math.min(state.reachedIndex + 1, platforms.length));
      }

      if (platform.id === platforms.length - 1) {
        state.running = false;
        state.won = true;
      }
      break;
    }
  }
}

function updatePlayer() {
  applyControls();

  player.vy += 0.42;
  player.x += player.vx;
  player.y += player.vy;

  if (player.x < 0) {
    player.x = 0;
  }

  if (player.x + player.w > canvas.width) {
    player.x = canvas.width - player.w;
  }

  if (player.y > canvas.height + 80) {
    state.running = false;
    state.lost = true;
  }

  player.onGround = false;
  handleCollision();
}

function drawBackdrop() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(0.68, '#111827');
  gradient.addColorStop(1, '#040b14');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 28; i += 1) {
    const starX = (i * 89 + 31) % canvas.width;
    const starY = (i * 67 + 17) % 220;
    const radius = (i % 3) + 1;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(starX, starY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRoundedRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function drawPlatform(platform) {
  ctx.save();
  ctx.translate(platform.x, platform.y);
  ctx.fillStyle = platform.color;
  ctx.strokeStyle = 'rgba(8, 15, 25, 0.4)';
  ctx.lineWidth = 2;

  switch (platform.shape) {
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(0, platform.h);
      ctx.lineTo(platform.w / 2, 0);
      ctx.lineTo(platform.w, platform.h);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(platform.w / 2, 0);
      ctx.lineTo(platform.w, platform.h / 2);
      ctx.lineTo(platform.w / 2, platform.h);
      ctx.lineTo(0, platform.h / 2);
      ctx.closePath();
      break;
    case 'hex':
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(platform.w - 12, 0);
      ctx.lineTo(platform.w, platform.h / 2);
      ctx.lineTo(platform.w - 12, platform.h);
      ctx.lineTo(12, platform.h);
      ctx.lineTo(0, platform.h / 2);
      ctx.closePath();
      break;
    case 'round':
      drawRoundedRect(0, 0, platform.w, platform.h, 12);
      break;
    case 'capsule':
      drawRoundedRect(0, 3, platform.w, platform.h - 6, platform.h / 2);
      break;
    default:
      drawRoundedRect(0, 0, platform.w, platform.h, 4);
      break;
  }

  if (platform.shape !== 'round' && platform.shape !== 'capsule' && platform.shape !== 'default') {
    ctx.fill();
  } else {
    ctx.fill();
  }

  ctx.stroke();
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.fillStyle = player.color;
  drawRoundedRect(player.x, player.y, player.w, player.h, 9);
  ctx.fill();

  ctx.fillStyle = '#0b1220';
  ctx.beginPath();
  ctx.arc(player.x + 9, player.y + 9, 3.5, 0, Math.PI * 2);
  ctx.arc(player.x + player.w - 9, player.y + 9, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#0b1220';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x + 8, player.y + 22);
  ctx.lineTo(player.x + player.w / 2, player.y + 26);
  ctx.lineTo(player.x + player.w - 8, player.y + 22);
  ctx.stroke();
  ctx.restore();
}

function drawMessage() {
  if (!state.running) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(120, 140, canvas.width - 240, 120);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.strokeRect(120, 140, canvas.width - 240, 120);

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.font = '700 34px Trebuchet MS';
    ctx.fillText(state.won ? 'You win!' : 'Game over', canvas.width / 2, 190);

    ctx.font = '600 18px Trebuchet MS';
    const details = state.won ? 'You climbed every platform.' : 'A platform hit the ground.';
    ctx.fillText(details, canvas.width / 2, 222);
    ctx.fillText('Press restart to try again', canvas.width / 2, 248);
  }
}

function draw() {
  drawBackdrop();
  platforms.forEach(drawPlatform);
  drawPlayer();
  drawMessage();
}

function update() {
  if (!state.running) {
    setStatus();
    return;
  }

  handlePlatformFalls();
  updatePlayer();
  setStatus();
}

function loop(timestamp) {
  if (!state.lastTime) {
    state.lastTime = timestamp;
  }

  const delta = timestamp - state.lastTime;
  state.lastTime = timestamp;

  if (state.running) {
    update();
  } else {
    setStatus();
  }

  draw();
  window.requestAnimationFrame(loop);
}

document.addEventListener('keydown', (event) => onKeyChange(event, true));
document.addEventListener('keyup', (event) => onKeyChange(event, false));

const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const jumpButton = document.getElementById('jumpButton');

bindTouchButton(leftButton, 'left');
bindTouchButton(rightButton, 'right');
bindTouchButton(jumpButton, 'jump');

restartButton.addEventListener('click', () => {
  resetGame();
});

window.addEventListener('pointerdown', () => {
  if (!state.running && !state.won && !state.lost) {
    resetGame();
  }
});

resetGame();
window.requestAnimationFrame(loop);
