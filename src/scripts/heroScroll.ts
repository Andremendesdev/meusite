import {
  getHeroIntroProgress,
  getTrabalhosLayoutProgress,
  getSobreLayoutProgress,
  getCombinedPassCurve,
  updatePassIsolation,
  clearPassIsolation,
} from './trabalhosPass';

export { getHeroIntroProgress };

const ROLE_IDLE = 'Faço sites rápidos com design que converte.';
const ROLE_APPROACH = 'Sites vivos — performance, craft e resultado.';
const ROLE_DONE = 'Próximo: trabalhos selecionados abaixo.';

const HINT_IDLE = 'Role para aproximar';
const HINT_APPROACH = 'Respira com o scroll';
const HINT_DONE = 'Continue para os trabalhos';

const HINT_STATIC = 'Desenvolvedor · sites que convertem';

function isStaticScene(): boolean {
  return (
    document.documentElement.classList.contains('no-webgl') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function applyStaticHero(hero: HTMLElement) {
  hero.dataset.scene = 'static';

  const progress = hero.querySelector<HTMLElement>('[data-hero-progress]');
  const hint = hero.querySelector<HTMLElement>('[data-hero-hint]');
  const shade = document.querySelector<HTMLElement>('.hero-shade');

  if (progress) progress.hidden = true;
  if (shade) shade.style.opacity = '1';
  if (hint) {
    const hintText = hint.querySelector<HTMLElement>('[data-hero-hint-text]');
    if (hintText) hintText.textContent = HINT_STATIC;
    hint.style.opacity = '1';
  }
}

function updateHeroShade(hero: HTMLElement, passCurve = 0) {
  const shade = document.querySelector<HTMLElement>('.hero-shade');
  const ambient = document.querySelector<HTMLElement>('.hero-ambient');
  if (!shade && !ambient) return;

  const viewportH = window.innerHeight;
  const bottom = hero.getBoundingClientRect().bottom;
  const fadeStart = viewportH * 1.1;
  const fadeEnd = viewportH * 0.35;
  const t = (fadeStart - bottom) / (fadeStart - fadeEnd);
  const scrollFade = Math.min(1, Math.max(0, t));
  const opacity = Math.max(scrollFade, passCurve * 0.98);

  if (shade) shade.style.opacity = String(opacity);
  if (ambient && document.documentElement.classList.contains('no-webgl')) {
    ambient.style.opacity = String(opacity);
  }
}

/**
 * Atualiza copy da hero, barra de progresso e aria-live conforme o scroll intro.
 */
export function initHeroScroll(hero: HTMLElement): () => void {
  if (isStaticScene()) {
    applyStaticHero(hero);

    function onScrollStatic() {
      updateHeroShade(hero);
    }

    window.addEventListener('scroll', onScrollStatic, { passive: true });
    window.addEventListener('resize', onScrollStatic, { passive: true });
    onScrollStatic();

    return () => {
      window.removeEventListener('scroll', onScrollStatic);
      window.removeEventListener('resize', onScrollStatic);
    };
  }

  const roleLine = hero.querySelector<HTMLElement>('[data-hero-role-line]');
  const hint = hero.querySelector<HTMLElement>('[data-hero-hint]');
  const hintText = hero.querySelector<HTMLElement>('[data-hero-hint-text]');
  const progress = hero.querySelector<HTMLElement>('[data-hero-progress]');
  const progressFill = hero.querySelector<HTMLElement>('[data-hero-progress-fill]');

  let rafId = 0;
  let lastRole = '';
  let lastHint = '';

  function pickRole(t: number): string {
    if (t < 0.38) return ROLE_IDLE;
    if (t < 0.82) return ROLE_APPROACH;
    return ROLE_DONE;
  }

  function pickHint(t: number): string {
    if (t < 0.12) return HINT_IDLE;
    if (t < 0.88) return HINT_APPROACH;
    return HINT_DONE;
  }

  function tick() {
    const t = getHeroIntroProgress(hero);
    const passProgress = getTrabalhosLayoutProgress(t);
    const sobrePass = getSobreLayoutProgress();
    const passCurve = getCombinedPassCurve(passProgress, sobrePass);

    updatePassIsolation(passCurve);
    updateHeroShade(hero, passCurve);

    const pct = Math.round(t * 100);

    if (progress) {
      progress.setAttribute('aria-valuenow', String(pct));
      progress.setAttribute('aria-valuetext', `${pct}% — a água-viva se aproxima`);
    }
    if (progressFill) {
      progressFill.style.transform = `scaleX(${t})`;
    }

    const roleText = pickRole(t);
    if (roleLine && roleText !== lastRole) {
      roleLine.style.opacity = '0.55';
      roleLine.textContent = roleText;
      requestAnimationFrame(() => {
        roleLine.style.opacity = '1';
      });
      lastRole = roleText;
    }

    const hintLabel = pickHint(t);
    if (hintText && hintLabel !== lastHint) {
      hint.style.opacity = '0.55';
      hintText.textContent = hintLabel;
      requestAnimationFrame(() => {
        if (hint) hint.style.opacity = String(t > 0.95 ? 0 : 1);
      });
      lastHint = hintLabel;
    }

    if (hint) {
      hint.style.opacity = t > 0.95 ? '0' : '1';
    }
  }

  function onScroll() {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  const onSceneUnavailable = () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    applyStaticHero(hero);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  document.addEventListener('jellyfish:unavailable', onSceneUnavailable, { once: true });
  tick();

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    document.removeEventListener('jellyfish:unavailable', onSceneUnavailable);
    clearPassIsolation();
  };
}
