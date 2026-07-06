/** Progresso 0→1 do ritual de scroll dentro da hero (água-viva se aproxima). */
export function getHeroIntroProgress(hero: HTMLElement): number {
  const viewportH = window.innerHeight;
  const scrollable = Math.max(0, hero.offsetHeight - viewportH);
  if (scrollable <= 0) return 1;

  const scrolled = Math.min(scrollable, Math.max(0, -hero.getBoundingClientRect().top));
  const t = scrolled / scrollable;
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function smootherstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

/**
 * 0 → 1 na passagem hero→trabalhos (esquerda + zoom no meio; conteúdo some no pico).
 */
export function getTrabalhosLayoutProgress(heroIntroProgress: number): number {
  const trabalhos = document.querySelector<HTMLElement>('[data-jellyfish-section="trabalhos"]');
  if (!trabalhos) return 0;

  const introGate = smoothstep((heroIntroProgress - 0.62) / 0.18);
  if (introGate <= 0) return 0;

  const viewportH = window.innerHeight;
  const top = trabalhos.getBoundingClientRect().top;
  const start = viewportH * 1.85;
  const end = viewportH * 0.12;
  const scrollT = smootherstep((start - top) / (start - end));
  return scrollT * introGate;
}

/** 0 no início/fim da passagem, 1 no meio — sincroniza com o movimento da água-viva. */
export function getTrabalhosPassCurve(progress: number): number {
  const c = Math.min(1, Math.max(0, progress));
  return Math.sin(c * Math.PI);
}

/** Esconde HTML no pico da passagem — só a água-viva permanece visível. */
export function updatePassIsolation(passCurve: number): void {
  const root = document.documentElement;
  root.style.setProperty('--trabalhos-pass-curve', String(passCurve));

  if (passCurve > 0.06) {
    root.setAttribute('data-pass-isolated', '');
  } else {
    root.removeAttribute('data-pass-isolated');
  }
}

export function clearPassIsolation(): void {
  const root = document.documentElement;
  root.style.removeProperty('--trabalhos-pass-curve');
  root.removeAttribute('data-pass-isolated');
}
