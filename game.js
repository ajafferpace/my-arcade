const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const hud = document.createElement('div');
hud.style.position = 'absolute';
hud.style.top = '60px';
hud.style.left = '50%';
hud.style.transform = 'translateX(-50%)';
hud.style.display = 'flex';
hud.style.alignItems = 'center';
hud.style.gap = '12px';
hud.style.padding = '8px 14px';
hud.style.borderRadius = '999px';
hud.style.background = 'rgba(15, 23, 42, 0.7)';
hud.style.color = '#edf7ff';
hud.style.font = '600 14px Trebuchet MS';
hud.style.zIndex = '10';
hud.style.pointerEvents = 'none';

const statusEl = document.createElement('div');
statusEl.style.color = '#ffd166';
statusEl.style.whiteSpace = 'nowrap';

const levelEl = document.createElement('div');
levelEl.textContent = 'Level 1';

const platformCounterEl = document.createElement('div');
platformCounterEl.textContent = '1/6';

const restartButton = document.createElement('button');
restartButton.type = 'button';
restartButton.textContent = 'Restart';
restartButton.style.pointerEvents = 'auto';
restartButton.style.border = '1px solid rgba(255,209,102,0.5)';
restartButton.style.borderRadius = '999px';
restartButton.style.background = 'rgba(255, 209, 102, 0.14)';
restartButton.style.color = '#edf7ff';
restartButton.style.padding = '8px 14px';
restartButton.style.cursor = 'pointer';
restartButton.style.font = 'inherit';

hud.appendChild(platformCounterEl);
hud.appendChild(levelEl);
hud.appendChild(statusEl);
hud.appendChild(restartButton);
canvas.parentElement.style.position = 'relative';
canvas.parentElement.insertBefore(hud, canvas);

const touchControls = document.createElement('div');
touchControls.style.position = 'static';
touchControls.style.display = 'flex';
touchControls.style.justifyContent = 'center';
touchControls.style.gap = '12px';
touchControls.style.marginTop = '12px';

const leftButton = document.createElement('button');
leftButton.type = 'button';
leftButton.textContent = '◀';
leftButton.setAttribute('aria-label', 'Move left');
leftButton.style.minWidth = '72px';
leftButton.style.minHeight = '52px';
leftButton.style.borderRadius = '12px';
leftButton.style.border = '1px solid rgba(255,255,255,0.15)';
leftButton.style.background = 'rgba(255,255,255,0.08)';
leftButton.style.color = '#edf7ff';
leftButton.style.fontSize = '1.2rem';
leftButton.style.fontWeight = '700';

const jumpButton = document.createElement('button');
jumpButton.type = 'button';
jumpButton.textContent = 'Jump';
jumpButton.setAttribute('aria-label', 'Jump');
jumpButton.style.minWidth = '92px';
jumpButton.style.minHeight = '52px';
jumpButton.style.borderRadius = '12px';
jumpButton.style.border = '1px solid rgba(255,255,255,0.15)';
jumpButton.style.background = 'rgba(255,255,255,0.08)';
jumpButton.style.color = '#edf7ff';
jumpButton.style.fontSize = '1rem';
jumpButton.style.fontWeight = '700';

const rightButton = document.createElement('button');
rightButton.type = 'button';
rightButton.textContent = '▶';
rightButton.setAttribute('aria-label', 'Move right');
rightButton.style.minWidth = '72px';
rightButton.style.minHeight = '52px';
rightButton.style.borderRadius = '12px';
rightButton.style.border = '1px solid rgba(255,255,255,0.15)';
rightButton.style.background = 'rgba(255,255,255,0.08)';
rightButton.style.color = '#edf7ff';
rightButton.style.fontSize = '1.2rem';
rightButton.style.fontWeight = '700';

touchControls.appendChild(leftButton);
touchControls.appendChild(jumpButton);
touchControls.appendChild(rightButton);

const controlsHint = document.createElement('div');
controlsHint.textContent = 'Move: A/D or ←/→ · Jump: W, ↑, or Space';
controlsHint.style.marginTop = '10px';
controlsHint.style.color = '#cbd5e1';
controlsHint.style.font = '13px Trebuchet MS';
controlsHint.style.textAlign = 'center';

const controlsPanel = document.createElement('div');
controlsPanel.appendChild(controlsHint);
controlsPanel.appendChild(touchControls);
canvas.parentElement.appendChild(controlsPanel);

const controls = {
  left: false,
  right: false,
  jumpQueued: false,
  jumpArmed: true,
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
  jumpOriginId: null,
  color: '#f8fbff',
};

const state = {
  running: true,
  won: false,
  lost: false,
  level: 1,
  levelCompleteUntil: 0,
  reachedCount: 0,
  lossReason: '',
  lastTime: 0,
  startTime: 0,
};

let platforms = [];
const platformCount = 6;
const gravity = 0.42;
const platformGravity = 0.14;

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
  const difficulty = Math.min(state.level - 1, 10);
  const layout = [
    { x: 55, y: 360, w: Math.max(80, 130 - difficulty * 5), h: 28 },
    { x: 250, y: 310, w: Math.max(80, 130 - difficulty * 5), h: 28 },
    { x: 450, y: 260, w: Math.max(80, 130 - difficulty * 5), h: 28 },
    { x: 250, y: 210, w: Math.max(80, 130 - difficulty * 5), h: 28 },
    { x: 450, y: 160, w: Math.max(80, 130 - difficulty * 5), h: 28 },
    { x: 250, y: 110, w: Math.max(100, 150 - difficulty * 5), h: 28 },
  ];

  const mirrored = state.level % 2 === 0;
  platforms = layout.map((platform, index) => ({
    ...platform,
    x: mirrored ? canvas.width - platform.x - platform.w : platform.x,
    id: index,
    color: platformPalette[index % platformPalette.length],
    shape: platformShapes[index % platformShapes.length],
    falling: false,
    grounded: false,
    disappeared: false,
    vy: 0,
    fallDelay: Math.max(1000, 2500 - difficulty * 150) +
      index * Math.max(350, 900 - difficulty * 55),
    fallSpeed: 1.2 + difficulty * 0.18 + index * 0.12,
    fallGravity: platformGravity * (1 + difficulty * 0.08),
    reached: index === 0,
  }));
}

function startLevel() {
  buildPlatforms();
  state.running = true;
  state.won = false;
  state.lost = false;
  state.reachedCount = 1;
  state.lossReason = '';
  state.levelCompleteUntil = 0;
  state.startTime = performance.now();
  state.lastTime = 0;
  controls.left = false;
  controls.right = false;
  controls.jumpQueued = false;
  controls.jumpArmed = true;

  const startPlatform = platforms[0];
  player.x = startPlatform.x + 18;
  player.y = startPlatform.y - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.platformId = startPlatform.id;
  player.jumpOriginId = null;

  levelEl.textContent = `Level ${state.level}`;
  statusEl.textContent = 'Jump the falling platforms';
  platformCounterEl.textContent = '1/6';
}

function resetGame() {
  state.level = 1;
  startLevel();
}

function startNextLevel() {
  state.level += 1;
  startLevel();
}

function setStatus() {
  if (state.won) {
    statusEl.textContent = 'You win!';
  } else if (state.lost) {
    statusEl.textContent = 'You fell!';
  } else if (state.levelCompleteUntil) {
    levelEl.textContent = `Level ${state.level}`;
    statusEl.textContent = `Level ${state.level} cleared!`;
  } else {
    levelEl.textContent = `Level ${state.level}`;
    statusEl.textContent = `Platform ${state.reachedCount}/${platformCount}`;
  }
}

function onKeyChange(event, isPressed) {
  const key = event.key.toLowerCase();

  if (key === 'arrowleft' || key === 'a') {
    event.preventDefault();
    controls.left = isPressed;
  }

  if (key === 'arrowright' || key === 'd') {
    event.preventDefault();
    controls.right = isPressed;
  }

  if (key === 'arrowup' || key === 'w' || key === ' ') {
    event.preventDefault();
    if (isPressed) {
      if (controls.jumpArmed && player.onGround) {
        controls.jumpQueued = true;
      }
      controls.jumpArmed = false;
    } else {
      controls.jumpArmed = true;
    }
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
      if (controls.jumpArmed && player.onGround) {
        controls.jumpQueued = true;
      }
      controls.jumpArmed = false;
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
    if (action === 'jump') {
      controls.jumpArmed = true;
    }
  };

  button.addEventListener('pointerdown', (event) => {
    button.setPointerCapture(event.pointerId);
    trigger(event);
  });
  button.addEventListener('pointerup', release);
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
    player.jumpOriginId = player.platformId;
    player.vy = -player.jumpStrength;
    player.onGround = false;
    controls.jumpQueued = false;
  }

  if (controls.jumpQueued && !player.onGround) {
    controls.jumpQueued = false;
  }
}

function playerTouchesPlatform(platform) {
  return player.x + player.w > platform.x &&
    player.x < platform.x + platform.w &&
    player.y + player.h > platform.y &&
    player.y < platform.y + platform.h;
}

function handlePlatformFalls(scale) {
  const elapsed = performance.now() - state.startTime;

  platforms.forEach((platform, index) => {
    if (!platform.falling && !platform.grounded && elapsed > platform.fallDelay) {
      platform.falling = true;
      platform.vy = platform.fallSpeed;
    }

    if (platform.falling) {
      platform.y += platform.vy * scale;
      platform.vy += platform.fallGravity * scale;

      const groundY = canvas.height - platform.h;
      if (platform.y >= groundY) {
        platform.y = groundY;
        platform.falling = false;
        platform.grounded = true;
        platform.disappeared = true;

        if (player.platformId === platform.id || playerTouchesPlatform(platform)) {
          state.running = false;
          state.lost = true;
          state.lossReason = 'A platform reached the ground while you were touching it.';
        }
      }
    }
  });

  platforms = platforms.filter((platform) => !platform.disappeared);
}

function getPlatformSurfaceY(platform, centerX) {
  const relativeX = Math.max(0, Math.min(1, (centerX - platform.x) / platform.w));

  if (platform.shape === 'triangle') {
    return platform.y + platform.h * (1 - Math.abs(relativeX * 2 - 1));
  }

  if (platform.shape === 'diamond') {
    return platform.y + platform.h * Math.abs(relativeX * 2 - 1);
  }

  if (platform.shape === 'hex' && (relativeX < 0.12 || relativeX > 0.88)) {
    return platform.y + platform.h * (0.5 - Math.min(relativeX, 1 - relativeX) / 0.24);
  }

  return platform.y;
}

function handleCollision(previousBottom) {
  let landedPlatform = null;

  for (const platform of platforms) {
    const centerX = player.x + player.w / 2;
    const intersectsX = centerX >= platform.x && centerX <= platform.x + platform.w;
    const surfaceY = getPlatformSurfaceY(platform, centerX);
    const crossedSurface = previousBottom <= surfaceY + 2 && player.y + player.h >= surfaceY;

    if (intersectsX && crossedSurface && player.vy >= platform.vy) {
      player.y = surfaceY - player.h;
      player.vy = 0;
      player.onGround = true;
      landedPlatform = platform;

      if (!platform.reached &&
          player.jumpOriginId !== null &&
          player.jumpOriginId !== platform.id) {
        platform.reached = true;
        state.reachedCount += 1;
        platformCounterEl.textContent = `${state.reachedCount}/${platformCount}`;
      }

      if (state.reachedCount === platformCount) {
        state.levelCompleteUntil = performance.now() + 1400;
      }
      player.jumpOriginId = null;
      break;
    }
  }

  player.platformId = landedPlatform ? landedPlatform.id : null;
}

function updatePlayer(scale) {
  applyControls();

  const supportingPlatform = platforms.find((platform) => platform.id === player.platformId);
  const nextCenterX = player.x + player.vx * scale + player.w / 2;
  const staysOnPlatform = supportingPlatform &&
    nextCenterX >= supportingPlatform.x &&
    nextCenterX <= supportingPlatform.x + supportingPlatform.w;

  if (player.onGround && staysOnPlatform && !controls.jumpQueued) {
    player.x += player.vx * scale;
    player.y = getPlatformSurfaceY(supportingPlatform, player.x + player.w / 2) - player.h;
    player.vy = supportingPlatform.falling ? supportingPlatform.vy : 0;
  } else {
    const previousBottom = player.y + player.h;
    player.vy += gravity * scale;
    player.x += player.vx * scale;
    player.y += player.vy * scale;

    if (player.x < 0) {
      player.x = 0;
    }

    if (player.x + player.w > canvas.width) {
      player.x = canvas.width - player.w;
    }

    player.onGround = false;
    player.platformId = null;
    handleCollision(previousBottom);
  }

  if (player.x < 0) {
    player.x = 0;
  }

  if (player.x + player.w > canvas.width) {
    player.x = canvas.width - player.w;
  }

  if (player.y > canvas.height + 40) {
    state.running = false;
    state.lost = true;
    state.lossReason = 'You fell off the platforms.';
  }
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

  ctx.fillStyle = '#fb7185';
  ctx.fillRect(0, canvas.height - 3, canvas.width, 3);
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

  ctx.fill();
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
  if (!state.running || state.levelCompleteUntil) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(120, 140, canvas.width - 240, 120);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.strokeRect(120, 140, canvas.width - 240, 120);

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.font = '700 34px Trebuchet MS';
    const heading = state.levelCompleteUntil
      ? `Level ${state.level} complete!`
      : state.won ? 'You win!' : 'Game over';
    ctx.fillText(heading, canvas.width / 2, 190);

    ctx.font = '600 18px Trebuchet MS';
    if (state.levelCompleteUntil) {
      ctx.fillText('Get ready for the next level!', canvas.width / 2, 222);
    } else {
      const details = state.won ? 'You climbed every platform.' : state.lossReason;
      ctx.fillText(details, canvas.width / 2, 222);
      ctx.fillText('Press restart or tap the screen to try again', canvas.width / 2, 248);
    }
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

  const timestamp = performance.now();
  if (state.levelCompleteUntil) {
    if (timestamp >= state.levelCompleteUntil) {
      startNextLevel();
    } else {
      setStatus();
      return;
    }
  }

  const elapsed = state.lastTime ? timestamp - state.lastTime : 16.667;
  const scale = Math.min(elapsed / 16.667, 2);
  state.lastTime = timestamp;

  updatePlayer(scale);
  handlePlatformFalls(scale);
  setStatus();
}

function loop() {
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
window.addEventListener('blur', () => {
  controls.left = false;
  controls.right = false;
  controls.jumpQueued = false;
});

bindTouchButton(leftButton, 'left');
bindTouchButton(rightButton, 'right');
bindTouchButton(jumpButton, 'jump');

restartButton.addEventListener('click', () => {
  resetGame();
});

window.addEventListener('pointerdown', () => {
  if (!state.running) {
    resetGame();
  }
});

resetGame();
window.requestAnimationFrame(loop);
