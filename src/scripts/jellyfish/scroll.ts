import { blendStates, SECTION_KEYS, type JellyfishState, type SectionKey } from './states';
import { getTrabalhosLayoutProgress, getSobreLayoutProgress } from '../trabalhosPass';

interface TrackedSection {
  key: SectionKey;
  el: HTMLElement;
}

/**
 * Tracks scroll position against the four content sections and produces a
 * smoothly blended jellyfish state plus overall scroll progress/velocity.
 * Weighting is a triangular falloff centered on each section's midpoint, so
 * the closer a section is to the viewport center, the more it dominates the
 * blend — this is what makes transitions between phases feel continuous
 * rather than a hard state switch.
 */
export class ScrollController {
  private sections: TrackedSection[] = [];
  private weights: Partial<Record<SectionKey, number>> = {};
  private dominantKey: SectionKey = 'hero';
  private scrollProgress = 0;
  private scrollVelocity = 0;
  private smoothedVelocity = 0;
  private trabalhosLayoutTarget = 0;
  private trabalhosLayoutSmoothed = 0;
  private sobreLayoutTarget = 0;
  private sobreLayoutSmoothed = 0;
  private lastScrollY = window.scrollY;
  private onScroll = () => this.recompute();
  private onResize = () => this.recompute();

  constructor() {
    for (const key of SECTION_KEYS) {
      const el = document.querySelector<HTMLElement>(`[data-jellyfish-section="${key}"]`);
      if (el) this.sections.push({ key, el });
    }
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize, { passive: true });
    this.recompute();
  }

  private recompute() {
    const viewportH = window.innerHeight;
    const viewportCenter = viewportH / 2;
    const weights: Partial<Record<SectionKey, number>> = {};
    let total = 0;
    let bestKey: SectionKey = this.dominantKey;
    let bestWeight = -1;

    for (const { key, el } of this.sections) {
      const rect = el.getBoundingClientRect();
      const sectionCenter = rect.top + rect.height / 2;
      const distance = Math.abs(sectionCenter - viewportCenter);
      const falloff = viewportH * 1.35;
      const w = Math.max(0, 1 - distance / falloff);
      weights[key] = w;
      total += w;
      if (w > bestWeight) {
        bestWeight = w;
        bestKey = key;
      }
    }

    if (total > 0) {
      for (const key of SECTION_KEYS) {
        if (weights[key] !== undefined) weights[key] = weights[key]! / total;
      }
    }

    this.weights = weights;
    this.dominantKey = bestKey;

    const doc = document.documentElement;
    const maxScroll = Math.max(1, doc.scrollHeight - viewportH);
    this.scrollProgress = Math.min(1, Math.max(0, window.scrollY / maxScroll));

    const delta = window.scrollY - this.lastScrollY;
    this.lastScrollY = window.scrollY;
    this.scrollVelocity = delta;
  }

  /** Call once per frame to keep the smoothed velocity decaying naturally. */
  tick(dt: number) {
    this.smoothedVelocity += (this.scrollVelocity - this.smoothedVelocity) * Math.min(1, dt * 6);
    this.scrollVelocity *= 0.7;

    this.trabalhosLayoutTarget = this.computeTrabalhosLayoutProgress();
    this.trabalhosLayoutSmoothed +=
      (this.trabalhosLayoutTarget - this.trabalhosLayoutSmoothed) * Math.min(1, dt * 6);

    this.sobreLayoutTarget = getSobreLayoutProgress();
    this.sobreLayoutSmoothed +=
      (this.sobreLayoutTarget - this.sobreLayoutSmoothed) * Math.min(1, dt * 6);
  }

  getBlendedState(): JellyfishState {
    return blendStates(this.weights);
  }

  getActiveSectionKey(): SectionKey {
    return this.dominantKey;
  }

  getScrollProgress(): number {
    return this.scrollProgress;
  }

  /**
   * 0 no topo da hero (água-viva distante) → 1 após rolar ~1 viewport dentro da hero.
   */
  getHeroIntroProgress(): number {
    const hero = this.sections.find((s) => s.key === 'hero')?.el;
    if (!hero) return 1;

    const viewportH = window.innerHeight;
    const scrollable = Math.max(0, hero.offsetHeight - viewportH);
    if (scrollable <= 0) return 1;

    const scrolled = Math.min(scrollable, Math.max(0, -hero.getBoundingClientRect().top));
    const t = scrolled / scrollable;
    return this.smoothstep(t);
  }

  /**
   * 0 → 1 passagem hero→trabalhos: no meio desloca à esquerda com zoom; no fim volta ao normal.
   * Começa no fim da hero, antes da seção seguinte entrar na tela.
   */
  getTrabalhosLayoutProgress(): number {
    return this.trabalhosLayoutSmoothed;
  }

  /**
   * 0 → 1 passagem trabalhos→sobre: mesmo ritual (esquerda + zoom; conteúdo some no pico).
   */
  getSobreLayoutProgress(): number {
    return this.sobreLayoutSmoothed;
  }

  private computeTrabalhosLayoutProgress(): number {
    return getTrabalhosLayoutProgress(this.getHeroIntroProgress());
  }

  /** Peso 0..1 de uma seção no blend atual (soma dos pesos ≈ 1). */
  getSectionWeight(key: SectionKey): number {
    return this.weights[key] ?? 0;
  }

  private smoothstep(t: number): number {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  }

  /** Smoothed pixels-per-frame scroll velocity, signed (positive = scrolling down). */
  getScrollVelocity(): number {
    return this.smoothedVelocity;
  }

  destroy() {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
  }
}
