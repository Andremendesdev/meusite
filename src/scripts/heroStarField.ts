type StarTone = 'cyan' | 'fuchsia' | 'blue' | 'white';

const COLORS: Record<StarTone, string> = {
  cyan: 'rgba(165, 238, 255, 1)',
  fuchsia: 'rgba(240, 171, 252, 1)',
  blue: 'rgba(125, 211, 252, 1)',
  white: 'rgba(255, 255, 255, 1)',
};

const SHOOT_TONES: StarTone[] = ['cyan', 'blue', 'white', 'fuchsia'];

interface Star {
  restX: number;
  restY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  tone: StarTone;
  cross: boolean;
  phase: number;
  depth: number;
  glow: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  length: number;
  width: number;
  tone: StarTone;
}

function colorWithAlpha(tone: StarTone, alpha: number): string {
  const rgb: Record<StarTone, string> = {
    cyan: '165, 238, 255',
    fuchsia: '240, 171, 252',
    blue: '125, 211, 252',
    white: '255, 255, 255',
  };
  return `rgba(${rgb[tone]}, ${alpha})`;
}

function spawnShootingStar(width: number, height: number): ShootingStar {
  const speed = 85 + Math.random() * 95;
  const angle = Math.PI * 0.75 + (Math.random() - 0.5) * 0.14;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const edgeT = Math.random();

  return {
    x: width * (0.62 + edgeT * 0.48),
    y: height * (-0.12 + Math.random() * 0.38),
    vx: cos * speed,
    vy: sin * speed,
    life: 0,
    maxLife: 2.4 + Math.random() * 3.2,
    length: 72 + Math.random() * 104,
    width: 0.9 + Math.random() * 1.1,
    tone: SHOOT_TONES[Math.floor(Math.random() * SHOOT_TONES.length)] ?? 'cyan',
  };
}

function drawShootingStars(ctx: CanvasRenderingContext2D, shootingStars: ShootingStar[]) {
  for (const star of shootingStars) {
    const progress = star.life / star.maxLife;
    const fadeIn = Math.min(1, progress * 6);
    const fadeOut = Math.min(1, (1 - progress) * 2.8);
    const alpha = fadeIn * fadeOut * 0.9;
    if (alpha <= 0.01) continue;

    const speed = Math.hypot(star.vx, star.vy) || 1;
    const nx = star.vx / speed;
    const ny = star.vy / speed;
    const headX = star.x;
    const headY = star.y;
    const tailX = headX - nx * star.length;
    const tailY = headY - ny * star.length;

    const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
    grad.addColorStop(0, colorWithAlpha(star.tone, 0));
    grad.addColorStop(0.35, colorWithAlpha(star.tone, alpha * 0.22));
    grad.addColorStop(0.72, colorWithAlpha(star.tone, alpha * 0.62));
    grad.addColorStop(1, colorWithAlpha(star.tone, alpha));

    ctx.globalAlpha = 1;
    ctx.strokeStyle = grad;
    ctx.lineWidth = star.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(headX, headY);
    ctx.stroke();

    ctx.globalAlpha = alpha;
    ctx.fillStyle = colorWithAlpha(star.tone, 1);
    ctx.beginPath();
    ctx.arc(headX, headY, star.width * 1.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = alpha * 0.35;
    ctx.beginPath();
    ctx.arc(headX, headY, star.width * 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function spawnStars(width: number, height: number, mobile = false): Star[] {
  const density = mobile ? 3000 : 4500;
  const count = Math.round((width * height) / density);
  const stars: Star[] = [];
  const tones: StarTone[] = ['cyan', 'fuchsia', 'blue', 'white'];

  for (let i = 0; i < count; i++) {
    const h1 = hash(i * 3.7);
    const h2 = hash(i * 5.1);
    const h3 = hash(i * 7.9);
    const h4 = hash(i * 11.3);
    const nx = mobile ? 0.18 + h1 * 0.8 : 0.04 + h1 * 0.92;
    const ny = 0.04 + h2 * 0.92;
    const tone = tones[Math.floor(h4 * tones.length)] ?? 'cyan';

    stars.push({
      restX: nx * width,
      restY: ny * height,
      x: nx * width,
      y: ny * height,
      vx: 0,
      vy: 0,
      size: 0.4 + h3 * 1.4,
      tone: h3 > 0.86 ? 'white' : tone,
      cross: h3 > 0.74,
      phase: h1 * Math.PI * 2,
      depth: 0.35 + h2 * 0.65,
      glow: 0.45 + h4 * 0.55,
    });
  }

  if (mobile) {
    const extraCount = Math.max(28, Math.round(count * 0.55));
    for (let i = 0; i < extraCount; i++) {
      const h1 = hash((i + count + 1) * 2.3);
      const h2 = hash((i + count + 1) * 4.1);
      const h3 = hash((i + count + 1) * 6.7);
      const h4 = hash((i + count + 1) * 9.2);
      const nx = 0.5 + h1 * 0.48;
      const ny = 0.02 + h2 * 0.34;
      const tone = tones[Math.floor(h4 * tones.length)] ?? 'cyan';

      stars.push({
        restX: nx * width,
        restY: ny * height,
        x: nx * width,
        y: ny * height,
        vx: 0,
        vy: 0,
        size: 0.45 + h3 * 1.55,
        tone: h3 > 0.82 ? 'white' : tone,
        cross: h3 > 0.68,
        phase: h1 * Math.PI * 2,
        depth: 0.4 + h2 * 0.6,
        glow: 0.55 + h4 * 0.45,
      });
    }
  }

  return stars;
}

function isMobileViewport(): boolean {
  return (
    window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
  );
}

function rescaleStars(
  stars: Star[],
  oldW: number,
  oldH: number,
  newW: number,
  newH: number,
  mobile = false
) {
  if (oldW <= 0 || oldH <= 0) return spawnStars(newW, newH, mobile);

  for (const star of stars) {
    const rx = star.restX / oldW;
    const ry = star.restY / oldH;
    const ox = star.x / oldW;
    const oy = star.y / oldH;
    star.restX = rx * newW;
    star.restY = ry * newH;
    star.x = ox * newW;
    star.y = oy * newH;
    star.vx *= newW / oldW;
    star.vy *= newH / oldH;
  }
  return stars;
}

/** Estrelas em tela cheia — espalham com o mouse e permanecem visíveis no scroll. */
export function initHeroStarField(): () => void {
  const layer = document.createElement('div');
  layer.className = 'hero__stars';
  layer.setAttribute('aria-hidden', 'true');

  const anchor = document.getElementById('bg-atmosphere');
  if (anchor?.parentNode) {
    anchor.parentNode.insertBefore(layer, anchor.nextSibling);
  } else {
    document.body.prepend(layer);
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'hero__stars-canvas';
  layer.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return () => layer.remove();

  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars: Star[] = [];
  let shootingStars: ShootingStar[] = [];
  let spawnCooldown = 1.8 + Math.random() * 2.4;
  let mobile = isMobileViewport();
  let raf = 0;
  let running = true;

  let pointerX = 0;
  let pointerY = 0;
  let pointerActive = false;
  let pointerDown = false;

  const influence = mobile ? 240 : 200;
  const repulse = mobile ? 2800 : 2400;
  const spring = 5.5;
  const friction = 0.86;

  function resize() {
    const prevW = width;
    const prevH = height;
    const wasMobile = mobile;
    mobile = isMobileViewport();
    dpr = Math.min(window.devicePixelRatio, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!stars.length || wasMobile !== mobile) {
      stars = spawnStars(width, height, mobile);
    } else {
      stars = rescaleStars(stars, prevW, prevH, width, height, mobile);
    }
  }

  function pointerInHost(clientX: number, clientY: number): { x: number; y: number; inside: boolean } {
    return {
      x: clientX,
      y: clientY,
      inside:
        clientX >= 0 &&
        clientX <= window.innerWidth &&
        clientY >= 0 &&
        clientY <= window.innerHeight,
    };
  }

  function updatePointer(clientX: number, clientY: number) {
    const local = pointerInHost(clientX, clientY);
    pointerActive = local.inside;
    if (local.inside) {
      pointerX = local.x;
      pointerY = local.y;
    }
  }

  function onPointerDown(e: PointerEvent) {
    pointerDown = true;
    updatePointer(e.clientX, e.clientY);
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType === 'touch' && !pointerDown) return;
    updatePointer(e.clientX, e.clientY);
  }

  function onPointerUp() {
    pointerDown = false;
    pointerActive = false;
  }

  function onPointerLeave(e: PointerEvent) {
    if (e.pointerType === 'mouse') {
      pointerActive = false;
    }
  }

  function step(dt: number, time: number) {
    for (const star of stars) {
      if (pointerActive) {
        const dx = star.x - pointerX;
        const dy = star.y - pointerY;
        const distSq = dx * dx + dy * dy;
        const radius = influence * (0.75 + star.depth * 0.35);

        if (distSq < radius * radius && distSq > 0.25) {
          const dist = Math.sqrt(distSq);
          const falloff = 1 - dist / radius;
          const push = falloff * falloff * repulse * (0.5 + star.depth * 0.5);
          const nx = dx / dist;
          const ny = dy / dist;
          star.vx += nx * push * dt;
          star.vy += ny * push * dt;
        }
      }

      const toRestX = star.restX - star.x;
      const toRestY = star.restY - star.y;
      star.vx += toRestX * spring * dt;
      star.vy += toRestY * spring * dt;

      star.vx *= Math.pow(friction, dt * 60);
      star.vy *= Math.pow(friction, dt * 60);
      star.x += star.vx * dt;
      star.y += star.vy * dt;
    }

    spawnCooldown -= dt;
    if (spawnCooldown <= 0) {
      shootingStars.push(spawnShootingStar(width, height));
      spawnCooldown = 3.2 + Math.random() * 5.8;
      if (Math.random() < 0.22) {
        shootingStars.push(spawnShootingStar(width, height));
        spawnCooldown = 0.35 + Math.random() * 0.55;
      }
    }

    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const meteor = shootingStars[i]!;
      meteor.life += dt;
      meteor.x += meteor.vx * dt;
      meteor.y += meteor.vy * dt;
      if (
        meteor.life >= meteor.maxLife ||
        meteor.x < -meteor.length * 2 ||
        meteor.y > height + meteor.length * 2
      ) {
        shootingStars.splice(i, 1);
      }
    }

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';

    for (const star of stars) {
      const speed = Math.hypot(star.vx, star.vy);
      const stretch = Math.min(1.7, 1 + speed * 0.03);
      const twinkle =
        (Math.sin(time * (2.4 + star.depth) + star.phase) * 0.5 + 0.5) * 0.38 + 0.62;
      const alpha = star.glow * twinkle * (0.52 + Math.min(0.4, speed * 0.06));
      const color = COLORS[star.tone];

      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(star.x, star.y, star.size * stretch, star.size / stretch, 0, 0, Math.PI * 2);
      ctx.fill();

      if (star.size > 0.85) {
        ctx.globalAlpha = alpha * 0.36;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (star.cross && star.size > 0.8) {
        ctx.globalAlpha = alpha * 0.72;
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.55;
        const arm = star.size * (1.9 + speed * 0.03);
        ctx.beginPath();
        ctx.moveTo(star.x - arm, star.y);
        ctx.lineTo(star.x + arm, star.y);
        ctx.moveTo(star.x, star.y - arm * 0.7);
        ctx.lineTo(star.x, star.y + arm * 0.7);
        ctx.stroke();
      }
    }

    drawShootingStars(ctx, shootingStars);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  let last = performance.now();

  function frame(now: number) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.032);
    last = now;
    step(dt, now / 1000);
    raf = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('pointercancel', onPointerUp, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave, { passive: true });
  raf = requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (running) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('pointerleave', onPointerLeave);
    layer.remove();
  };
}
