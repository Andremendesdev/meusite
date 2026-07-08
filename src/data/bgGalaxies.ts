export type GalaxyTone = 'cyan' | 'fuchsia' | 'blue';

export interface BgGalaxyConfig {
  x: string;
  y: string;
  size: number;
  rot: number;
  tone: GalaxyTone;
  opacity: number;
}

export const BG_GALAXIES: BgGalaxyConfig[] = [
  { x: '8%', y: '14%', size: 158, rot: -28, tone: 'cyan', opacity: 0.76 },
  { x: '78%', y: '11%', size: 132, rot: 18, tone: 'fuchsia', opacity: 0.72 },
  { x: '86%', y: '52%', size: 182, rot: -12, tone: 'blue', opacity: 0.66 },
  { x: '6%', y: '58%', size: 118, rot: 34, tone: 'fuchsia', opacity: 0.62 },
  { x: '22%', y: '78%', size: 148, rot: -8, tone: 'blue', opacity: 0.58 },
  { x: '64%', y: '82%', size: 102, rot: 22, tone: 'cyan', opacity: 0.64 },
  { x: '44%', y: '8%', size: 94, rot: -16, tone: 'fuchsia', opacity: 0.54 },
  { x: '52%', y: '68%', size: 88, rot: 40, tone: 'cyan', opacity: 0.52 },
  { x: '34%', y: '38%', size: 80, rot: -34, tone: 'blue', opacity: 0.48 },
];
