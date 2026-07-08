export type HeroChar = { char: string; index: number | null };

/** Divide texto em caracteres com índice para stagger CSS (`--char-index`). */
export function splitHeroChars(
  text: string,
  startIndex = 0
): { chars: HeroChar[]; nextIndex: number } {
  let index = startIndex;
  const chars = Array.from(text).map((char) => {
    if (char === ' ') {
      return { char, index: null };
    }
    const current = index;
    index += 1;
    return { char, index: current };
  });
  return { chars, nextIndex: index };
}

/** Atraso em ms para blocos após a última letra do display. */
export function heroTailDelay(charCount: number, baseMs = 80, staggerMs = 35, padMs = 90): number {
  return baseMs + charCount * staggerMs + padMs;
}
