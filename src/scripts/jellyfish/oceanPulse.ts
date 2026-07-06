/** Flash ciano no meio da passagem hero→trabalhos; 0 no início e no fim (sin 0→1→0). */
export function transitionOceanPulse(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return Math.sin(c * Math.PI);
}
