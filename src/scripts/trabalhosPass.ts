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

function getApproachProgress(target: HTMLElement, gate: number): number {
  if (gate <= 0) return 0;

  const viewportH = window.innerHeight;
  const top = target.getBoundingClientRect().top;
  const start = viewportH * 1.85;
  const end = viewportH * 0.12;
  const scrollT = smootherstep((start - top) / (start - end));
  return scrollT * gate;
}

/** 1 quando a seção trabalhos foi deixada para trás — libera o ritual para sobre. */
function getTrabalhosExitGate(): number {
  const trabalhos = document.querySelector<HTMLElement>('[data-jellyfish-section="trabalhos"]');
  if (!trabalhos) return 0;

  const viewportH = window.innerHeight;
  const bottom = trabalhos.getBoundingClientRect().bottom;
  const releaseStart = viewportH * 0.92;
  const releaseEnd = viewportH * 0.18;
  return smoothstep((releaseStart - bottom) / (releaseStart - releaseEnd));
}

/**
 * 0 → 1 na passagem hero→trabalhos (esquerda + zoom no meio; conteúdo some no pico).
 */
export function getTrabalhosLayoutProgress(heroIntroProgress: number): number {
  const trabalhos = document.querySelector<HTMLElement>('[data-jellyfish-section="trabalhos"]');
  if (!trabalhos) return 0;

  const introGate = smoothstep((heroIntroProgress - 0.62) / 0.18);
  return getApproachProgress(trabalhos, introGate);
}

/**
 * 0 → 1 na passagem trabalhos→sobre — só depois de sair de trabalhos, antes de entrar em sobre.
 */
export function getSobreLayoutProgress(): number {
  const sobre = document.querySelector<HTMLElement>('[data-jellyfish-section="sobre"]');
  if (!sobre) return 0;

  const exitGate = getTrabalhosExitGate();
  if (exitGate <= 0) return 0;

  return getApproachProgress(sobre, exitGate);
}

/** 0 no início/fim da passagem, 1 no meio — sincroniza com o movimento da água-viva. */
export function getPassCurve(progress: number): number {
  const c = Math.min(1, Math.max(0, progress));
  return Math.sin(c * Math.PI);
}

/** @deprecated use getPassCurve */
export const getTrabalhosPassCurve = getPassCurve;

/** Passagem trabalhos→sobre: 0→1 e permanece (não volta à direita). */
export function getSobrePassHold(progress: number): number {
  const c = Math.min(1, Math.max(0, progress));
  return c * c * (3 - 2 * c);
}

/** 1 quando a seção sobre foi deixada para trás — libera a saída da água-viva no contato. */
function getSobreExitGate(): number {
  const sobre = document.querySelector<HTMLElement>('[data-jellyfish-section="sobre"]');
  if (!sobre) return 0;

  const viewportH = window.innerHeight;
  const bottom = sobre.getBoundingClientRect().bottom;
  const releaseStart = viewportH * 0.92;
  const releaseEnd = viewportH * 0.18;
  return smoothstep((releaseStart - bottom) / (releaseStart - releaseEnd));
}

/**
 * 0 → 1 ao entrar em contato — só depois de sair do sobre; controla sumiço da água-viva.
 */
export function getContatoExitProgress(): number {
  const contato = document.querySelector<HTMLElement>('[data-jellyfish-section="contato"]');
  if (!contato) return 0;

  const exitGate = getSobreExitGate();
  if (exitGate <= 0) return 0;

  return getApproachProgress(contato, exitGate);
}

/** Pico ativo entre várias passagens (só uma costuma dominar por vez). */
export function getCombinedPassCurve(heroProgress: number, sobreProgress = 0): number {
  let peak = getPassCurve(heroProgress);
  peak = Math.max(peak, getPassCurve(sobreProgress));
  return peak;
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
