import * as THREE from 'three';

export type SectionKey = 'hero' | 'trabalhos' | 'sobre' | 'contato';

export const SECTION_KEYS: SectionKey[] = ['hero', 'trabalhos', 'sobre', 'contato'];

export interface JellyfishState {
  /** Bell + emissive base color. */
  bellColor: THREE.Color;
  /** Fog / ambient backdrop color, sets the "mood" of the scene. */
  fogColor: THREE.Color;
  /** Overall glow strength on the bell and tentacles. */
  emissiveIntensity: number;
  /** Ambient light strength; darker in the "processo" state. */
  ambientIntensity: number;
  /** Bell pulse frequency (breathing speed). */
  pulseSpeed: number;
  /** Bell pulse amplitude (how much it swells/contracts). */
  pulseAmount: number;
  /** Random micro-deformation strength on the bell surface. */
  deformAmount: number;
  /** How far the bell rim flares open ("flower" bloom), 0 = closed dome. */
  flowerOpen: number;
  /** Tentacle length multiplier relative to base length. */
  tentacleLength: number;
  /** How loosely the tentacles drag/lag behind the body (0 = stiff, 1 = very loose). */
  tentacleDrag: number;
  /** Self-rotation speed around the vertical axis. */
  rotationSpeed: number;
  /** How much the swim path curves instead of going straight. */
  swimCurviness: number;
  /** Particle base speed. */
  particleSpeed: number;
  /** Particle orbit radius. */
  particleSpread: number;
  /** 0 = pure orbit, 1 = fully spiraling inward/outward. */
  particleSpiral: number;
  /** 0 = none, 1 = full explode/return burst pulsing. */
  particleBurst: number;
  /** Strength of the faint trailing ghosts behind each particle. */
  particleTrail: number;
  /** Intensity of the ambient current/wave shader behind the scene. */
  currentIntensity: number;
  /** Underwater backdrop strength (hero strongest, fades subtly elsewhere). */
  waterIntensity: number;
  /** Caustic / ripple animation speed for the water layer. */
  waterMotion: number;
  /** Ocean abyss strength at the bottom (0 = shallow, 1 = deep trench). */
  waterDepth: number;
  /** How intensely the head tracks and "stares" at the cursor. */
  gazeIntensity: number;
  /** Strength of electric flashes travelling along the tentacles. */
  flashIntensity: number;
}

function state(partial: JellyfishState): JellyfishState {
  return partial;
}

export const STATES: Record<SectionKey, JellyfishState> = {
  // Hero — idle, breathing, discreet gaze, never fully still.
  hero: state({
    bellColor: new THREE.Color('#e879f9'),
    fogColor: new THREE.Color('#000610'),
    emissiveIntensity: 0.68,
    ambientIntensity: 0.12,
    pulseSpeed: 0.55,
    pulseAmount: 0.06,
    deformAmount: 0.048,
    flowerOpen: 0.08,
    tentacleLength: 1.28,
    tentacleDrag: 0.9,
    rotationSpeed: 0.03,
    swimCurviness: 0.15,
    particleSpeed: 0.34,
    particleSpread: 1.85,
    particleSpiral: 0,
    particleBurst: 0,
    particleTrail: 0.28,
    currentIntensity: 0.02,
    waterIntensity: 0.38,
    waterMotion: 1.45,
    waterDepth: 0,
    gazeIntensity: 0.35,
    flashIntensity: 0,
  }),

  // Trabalhos / Portfolio — curious, brighter, longer tentacles, gentle self-rotation.
  trabalhos: state({
    bellColor: new THREE.Color('#f0abfc'),
    fogColor: new THREE.Color('#040c18'),
    emissiveIntensity: 0.55,
    ambientIntensity: 0.65,
    pulseSpeed: 0.75,
    pulseAmount: 0.09,
    deformAmount: 0.068,
    flowerOpen: 0.32,
    tentacleLength: 1.55,
    tentacleDrag: 0.86,
    rotationSpeed: 0.16,
    swimCurviness: 0.55,
    particleSpeed: 0.42,
    particleSpread: 3.4,
    particleSpiral: 0.15,
    particleBurst: 0,
    particleTrail: 0.55,
    currentIntensity: 0.18,
    waterIntensity: 0.55,
    waterMotion: 0.9,
    waterDepth: 0.25,
    gazeIntensity: 0.4,
    flashIntensity: 0.1,
  }),

  // Sobre / Processo — tentáculos agressivos, movimento omnidirecional.
  sobre: state({
    bellColor: new THREE.Color('#d946ef'),
    fogColor: new THREE.Color('#010408'),
    emissiveIntensity: 0.52,
    ambientIntensity: 0.22,
    pulseSpeed: 0.58,
    pulseAmount: 0.18,
    deformAmount: 0.11,
    flowerOpen: 0.2,
    tentacleLength: 1.72,
    tentacleDrag: 0.66,
    rotationSpeed: 0.07,
    swimCurviness: 0.32,
    particleSpeed: 0.28,
    particleSpread: 2.4,
    particleSpiral: 0.85,
    particleBurst: 0,
    particleTrail: 0.35,
    currentIntensity: 0.4,
    waterIntensity: 0.52,
    waterMotion: 1.12,
    waterDepth: 0.88,
    gazeIntensity: 0.55,
    flashIntensity: 0.22,
  }),

  // Contato / CTA — maximum bioluminescence, staring, ready to approach.
  contato: state({
    bellColor: new THREE.Color('#f0abfc'),
    fogColor: new THREE.Color('#020810'),
    emissiveIntensity: 1.25,
    ambientIntensity: 0.42,
    pulseSpeed: 0.95,
    pulseAmount: 0.1,
    deformAmount: 0.058,
    flowerOpen: 0.42,
    tentacleLength: 1.85,
    tentacleDrag: 0.78,
    rotationSpeed: 0.08,
    swimCurviness: 0.35,
    particleSpeed: 0.65,
    particleSpread: 3.8,
    particleSpiral: 0.1,
    particleBurst: 1,
    particleTrail: 0.4,
    currentIntensity: 0.55,
    waterIntensity: 0.82,
    waterMotion: 1.0,
    waterDepth: 1.0,
    gazeIntensity: 1,
    flashIntensity: 0.9,
  }),
};

const NUMERIC_KEYS: (keyof JellyfishState)[] = [
  'emissiveIntensity',
  'ambientIntensity',
  'pulseSpeed',
  'pulseAmount',
  'deformAmount',
  'flowerOpen',
  'tentacleLength',
  'tentacleDrag',
  'rotationSpeed',
  'swimCurviness',
  'particleSpeed',
  'particleSpread',
  'particleSpiral',
  'particleBurst',
  'particleTrail',
  'currentIntensity',
  'waterIntensity',
  'waterMotion',
  'waterDepth',
  'gazeIntensity',
  'flashIntensity',
];

const scratchColorA = new THREE.Color();
const scratchColorB = new THREE.Color();

/**
 * Blends N states together using a weight map (weights should sum to ~1).
 * Colors are blended in linear space via THREE.Color.lerp; numeric fields
 * are weighted-summed directly.
 */
export function blendStates(weights: Partial<Record<SectionKey, number>>): JellyfishState {
  const result = state({ ...STATES.hero });

  let bellColor = scratchColorA.copy(STATES.hero.bellColor).multiplyScalar(0);
  let fogColor = scratchColorB.copy(STATES.hero.fogColor).multiplyScalar(0);

  for (const key of NUMERIC_KEYS) {
    (result[key] as number) = 0;
  }

  let totalWeight = 0;
  for (const sectionKey of SECTION_KEYS) {
    const w = weights[sectionKey] ?? 0;
    if (w <= 0) continue;
    totalWeight += w;
    const s = STATES[sectionKey];
    bellColor.r += s.bellColor.r * w;
    bellColor.g += s.bellColor.g * w;
    bellColor.b += s.bellColor.b * w;
    fogColor.r += s.fogColor.r * w;
    fogColor.g += s.fogColor.g * w;
    fogColor.b += s.fogColor.b * w;
    for (const key of NUMERIC_KEYS) {
      (result[key] as number) += (s[key] as number) * w;
    }
  }

  if (totalWeight <= 0) {
    return { ...STATES.hero };
  }

  result.bellColor = new THREE.Color(bellColor.r / totalWeight, bellColor.g / totalWeight, bellColor.b / totalWeight);
  result.fogColor = new THREE.Color(fogColor.r / totalWeight, fogColor.g / totalWeight, fogColor.b / totalWeight);
  for (const key of NUMERIC_KEYS) {
    (result[key] as number) /= totalWeight;
  }

  return result;
}
