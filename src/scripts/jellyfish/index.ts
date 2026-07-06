import * as THREE from 'three';
import { createJellyfishScene } from './scene';
import { Environment } from './environment';
import { WaterBackdrop } from './water';
import { Jellyfish } from './jellyfish';
import { ParticleField } from './particles';
import { BubbleField, BUBBLE_PLANE_Z } from './bubbles';
import { ScrollController } from './scroll';
import { transitionOceanPulse } from './oceanPulse';
import { MouseController } from './mouse';
import { STATES } from './states';
import { markWebGLFallback, probeWebGL, type WebGLFallbackReason } from './webgl';

const WATER_DEPTH = -7;
const ENV_DEPTH = -6;
const MAX_RENDER_ERRORS = 3;

/**
 * Boots the jellyfish WebGL scene onto the given canvas. Handles resize,
 * tab-visibility pausing, WebGL unavailability, context loss, and
 * `prefers-reduced-motion` (a single static frame, no rAF loop).
 * Returns a cleanup function (noop when WebGL is unavailable).
 */
export function initJellyfishScene(canvas: HTMLCanvasElement): () => void {
  const noop = () => {};

  if (!probeWebGL(canvas)) {
    markWebGLFallback('unsupported', canvas);
    return noop;
  }

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch {
    markWebGLFallback('init-error', canvas);
    return noop;
  }

  if (!renderer.getContext()) {
    renderer.dispose();
    markWebGLFallback('no-context', canvas);
    return noop;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const { scene, camera, ambient, key } = createJellyfishScene(window.innerWidth / window.innerHeight);

  const water = new WaterBackdrop(coarsePointer);
  scene.add(water.mesh);

  const environment = new Environment();
  scene.add(environment.mesh);

  const jellyfish = new Jellyfish({
    tentacleCount: coarsePointer ? 9 : 14,
    tentacleSegments: coarsePointer ? 12 : 18,
    headParticleCount: coarsePointer ? 12 : 24,
  });
  scene.add(jellyfish.group);
  scene.add(jellyfish.tentacleRoot);

  const particles = new ParticleField(coarsePointer ? 8 : 14);
  scene.add(particles.object);

  const bubbles = new BubbleField(coarsePointer ? 24 : 52);
  scene.add(bubbles.object);

  let disposed = false;
  let running = true;
  let rafId = 0;
  let renderErrors = 0;

  function disposeAll() {
    if (disposed) return;
    disposed = true;
    running = false;
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', handleVisibility);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    scrollController?.destroy();
    mouseController?.destroy();
    jellyfish.dispose();
    particles.dispose();
    bubbles.dispose();
    water.dispose();
    environment.dispose();
    renderer.dispose();
  }

  function activateFallback(reason: WebGLFallbackReason) {
    disposeAll();
    markWebGLFallback(reason, canvas);
  }

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    water.fit(camera, WATER_DEPTH);
    environment.fit(camera, ENV_DEPTH);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  const onContextLost = (event: Event) => {
    event.preventDefault();
    activateFallback('context-lost');
  };
  canvas.addEventListener('webglcontextlost', onContextLost);

  const centerScratch = new THREE.Vector3();
  let scrollController: ScrollController | null = null;
  let mouseController: MouseController | null = null;

  function safeRender() {
    try {
      renderer.render(scene, camera);
      renderErrors = 0;
    } catch {
      renderErrors += 1;
      if (renderErrors >= MAX_RENDER_ERRORS) {
        activateFallback('render-error');
      }
    }
  }

  if (prefersReduced) {
    const state = STATES.hero;
    jellyfish.update(0, 0, state, {
      scrollVelocity: 0,
      scrollInfluence: 0,
      scrollProgress: 0,
      heroIntroProgress: 1,
      trabalhosLayoutProgress: 0,
      mouseTarget: null,
      mouseSpeed: 0,
      nearCTA: false,
      nearHeroCta: false,
      particleGlow: 0,
      contatoPresence: 0,
      trabalhosPresence: 0,
    });
    particles.update(0, 0, state, jellyfish.getCenter(centerScratch), null, 0);
    water.update(0, state, 0, 0);
    bubbles.update(0, 0, state, camera, 0);
    environment.update(0, state);
    key.color.set('#b06cc8');
    key.intensity = 0.5 + state.ambientIntensity * 0.28;
    ambient.intensity = 0.5 + state.ambientIntensity * 0.38;
    (scene.fog as THREE.FogExp2).color.copy(state.fogColor);
    safeRender();

    return disposeAll;
  }

  scrollController = new ScrollController();
  mouseController = coarsePointer ? null : new MouseController();
  const ctaEl = document.querySelector<HTMLElement>('.contact__wa');
  const heroCtaEl = document.querySelector<HTMLElement>('.hero__cta');
  const keyMoss = new THREE.Color('#5fa872');
  const keyOcean = new THREE.Color('#38bdf8');

  let lastTime = performance.now();
  const prevMouseTarget = new THREE.Vector3();
  let hasPrevMouse = false;
  let mouseSpeed = 0;

  function renderFrame(now: number) {
    if (!running || disposed) return;

    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const time = now / 1000;

    scrollController!.tick(dt);
    const state = scrollController!.getBlendedState();
    const mouseTarget = mouseController
      ? mouseController.getWorldTarget(camera, jellyfish.group.position.z)
      : null;
    const safeDt = Math.max(dt, 1 / 120);
    if (mouseTarget && hasPrevMouse) {
      const instant = prevMouseTarget.distanceTo(mouseTarget) / safeDt;
      mouseSpeed = THREE.MathUtils.lerp(mouseSpeed, instant, 0.35);
    } else {
      mouseSpeed = THREE.MathUtils.lerp(mouseSpeed, 0, Math.min(1, dt * 8));
    }
    mouseSpeed = THREE.MathUtils.clamp(mouseSpeed, 0, 36);
    if (mouseTarget) {
      prevMouseTarget.copy(mouseTarget);
      hasPrevMouse = true;
    } else {
      hasPrevMouse = false;
    }
    const bubbleMouse = mouseController
      ? mouseController.getWorldTarget(camera, BUBBLE_PLANE_Z)
      : null;
    const nearCTA = mouseController ? mouseController.isNearElement(ctaEl) : false;
    const nearHeroCta = mouseController ? mouseController.isNearElement(heroCtaEl, 200) : false;
    const scrollInfluence = THREE.MathUtils.clamp(
      -scrollController!.getScrollVelocity() * 0.038,
      -1.2,
      1.2
    );

    particles.update(
      dt,
      time,
      state,
      jellyfish.getCenter(centerScratch),
      mouseTarget,
      scrollInfluence
    );

    jellyfish.update(dt, time, state, {
      scrollVelocity: scrollController!.getScrollVelocity(),
      scrollInfluence,
      scrollProgress: scrollController!.getScrollProgress(),
      heroIntroProgress: scrollController!.getHeroIntroProgress(),
      trabalhosLayoutProgress: scrollController!.getTrabalhosLayoutProgress(),
      mouseTarget,
      mouseSpeed,
      nearCTA,
      nearHeroCta,
      particleGlow: 0,
      contatoPresence: scrollController!.getSectionWeight('contato'),
      trabalhosPresence: scrollController!.getSectionWeight('trabalhos'),
    });
    water.update(time, state, scrollController!.getScrollVelocity(), scrollController!.getScrollProgress());
    bubbles.update(dt, time, state, camera, scrollController!.getScrollProgress(), bubbleMouse);

    environment.update(time, state);

    const heroWeight = scrollController!.getSectionWeight('hero');
    const trabalhosT = scrollController!.getTrabalhosLayoutProgress();
    const oceanPulse = transitionOceanPulse(trabalhosT);
    const heroDark = (1 - trabalhosT) * Math.max(heroWeight, 1 - trabalhosT * 0.65);
    const oceanDepth = Math.min(1, state.waterDepth + scrollController!.getScrollProgress() * 0.42);
    const intro = scrollController!.getHeroIntroProgress();
    key.color.set('#b06cc8').lerp(keyMoss, intro * 0.4 * (1 - trabalhosT * 0.85));
    key.color.lerp(keyOcean, oceanPulse * 0.72);
    key.intensity = 0.42 + state.ambientIntensity * 0.24 - oceanDepth * 0.07 - heroDark * 0.04 + oceanPulse * 0.16;
    ambient.intensity = 0.36 + state.ambientIntensity * 0.28 - oceanDepth * 0.12 - heroDark * 0.05 + oceanPulse * 0.08;
    const fog = scene.fog as THREE.FogExp2;
    fog.color.copy(state.fogColor);
    fog.density = 0.088 + oceanDepth * 0.038 + heroDark * 0.042 - oceanPulse * 0.038;

    safeRender();
  }

  function loop(now: number) {
    renderFrame(now);
    if (running && !disposed) {
      rafId = requestAnimationFrame(loop);
    }
  }
  rafId = requestAnimationFrame(loop);

  function handleVisibility() {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(rafId);
    } else if (!running && !disposed) {
      running = true;
      lastTime = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }
  document.addEventListener('visibilitychange', handleVisibility);

  return disposeAll;
}
