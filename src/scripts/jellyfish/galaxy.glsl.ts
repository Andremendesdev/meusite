import { NOISE_GLSL } from './noise.glsl';

/** Hash + estrelas cintilantes + poeira nebulosa para superfícies bioluminescentes. */
export const GALAXY_GLSL = `
${NOISE_GLSL}

float galaxyHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float galaxyHash3(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

// Estrela pontual com halo e cruz de brilho (mais visível)
float galaxyStar(vec2 cell, vec2 f, float time, float density) {
  float h = galaxyHash(cell + density * 0.17);
  if (h < 0.62) return 0.0;

  float rarity = smoothstep(0.62, 0.98, h);
  vec2 starPos = vec2(galaxyHash(cell + 1.7), galaxyHash(cell + 2.3)) - 0.5;
  vec2 d = f - starPos * 0.55;
  float dist = length(d);

  float twinkleA = sin(time * (3.0 + h * 11.0) + h * 6.283) * 0.5 + 0.5;
  float twinkleB = sin(time * (7.5 + h * 16.0) + h * 12.5) * 0.5 + 0.5;
  float twinkle = mix(twinkleA, twinkleB, 0.5) * 0.55 + 0.45;

  float core = smoothstep(0.14, 0.0, dist);
  float halo = smoothstep(0.32, 0.02, dist) * 0.65;
  float cross = exp(-abs(d.x) * 28.0) * exp(-abs(d.y) * 28.0) * 0.45;

  return (core * 1.4 + halo + cross) * twinkle * (0.35 + rarity * 0.65);
}

float galaxyStarField(vec2 uv, float density, float time) {
  vec2 gridUv = uv * density;
  vec2 cell = floor(gridUv);
  vec2 f = fract(gridUv);
  return galaxyStar(cell, f, time, density);
}

// Cintilação contínua — sempre visível entre as estrelas
float galaxyShimmer(vec2 uv, float time) {
  float s1 = sin(uv.x * 38.0 + time * 2.8) * sin(uv.y * 31.0 - time * 2.2);
  float s2 = sin(uv.x * 24.0 - time * 3.6) * sin(uv.y * 44.0 + time * 2.9);
  float s3 = sin(uv.x * 52.0 + time * 4.4 + uv.y * 8.0);
  float sparkle = pow(max(0.0, s1 * s2 + s3 * 0.35), 5.5);
  float pulse = sin(time * 1.6 + uv.x * 6.0 + uv.y * 5.0) * 0.5 + 0.5;
  return sparkle * (0.45 + pulse * 0.55);
}

float galaxyNebula(vec3 pos, float time) {
  vec2 p = pos.xz * 3.2 + pos.y * 2.0;
  float n1 = snoise(p + time * 0.12) * 0.5 + 0.5;
  float n2 = snoise(p * 2.8 - time * 0.15 + 4.2) * 0.5 + 0.5;
  float n3 = snoise(p * 6.0 + time * 0.09) * 0.5 + 0.5;
  return pow(n1 * n2, 1.2) * (0.55 + n3 * 0.45);
}

vec3 galaxyPalette(float hue) {
  vec3 cyan = vec3(0.35, 0.95, 1.0);
  vec3 magenta = vec3(1.0, 0.45, 0.98);
  vec3 violet = vec3(0.78, 0.42, 1.0);
  vec3 white = vec3(1.0, 0.98, 1.0);

  float band = fract(hue);
  if (band < 0.33) return mix(cyan, violet, band * 3.0);
  if (band < 0.66) return mix(violet, magenta, (band - 0.33) * 3.0);
  return mix(magenta, white, (band - 0.66) * 3.0);
}

vec3 galaxyBellSparkle(vec3 localPos, float time, float intensity) {
  float theta = atan(localPos.z, localPos.x);
  vec2 bellUv = vec2(theta * 3.5, localPos.y * 7.0 + localPos.x * 2.0);

  float starsA = galaxyStarField(bellUv, 10.0, time);
  float starsB = galaxyStarField(bellUv * 1.4 + 3.7, 13.0, time + 1.4);
  float stars = starsA + starsB;

  float shimmer = galaxyShimmer(bellUv * 2.2, time);
  float nebula = galaxyNebula(localPos, time);
  float dust = pow(nebula, 1.4) * 0.85;

  float hue = galaxyHash3(floor(localPos * 7.0));
  vec3 starColor = galaxyPalette(hue + time * 0.06);
  vec3 dustColor = mix(galaxyPalette(hue + 0.35), vec3(0.45, 0.82, 1.0), 0.45);

  vec3 sparkle = starColor * stars * 3.2;
  sparkle += starColor * shimmer * 1.8;
  sparkle += dustColor * dust * 1.1;
  return sparkle * intensity;
}

vec3 galaxyTentacleSparkle(vec2 uv, vec3 worldPos, float time, float intensity) {
  vec2 tentUv = vec2(uv.x * 7.0 + worldPos.z * 3.0, uv.y * 16.0 + worldPos.x * 2.5);

  float starsA = galaxyStarField(tentUv, 11.0, time);
  float starsB = galaxyStarField(tentUv * 1.25 + vec2(5.1, 2.8), 14.0, time + 0.9);
  float stars = starsA + starsB;

  float shimmer = galaxyShimmer(tentUv * 1.8, time);
  float nebula = galaxyNebula(worldPos * 0.6, time);
  float dust = pow(nebula, 1.3) * smoothstep(0.05, 0.3, uv.y) * 0.9;

  float hue = galaxyHash3(floor(vec3(tentUv, uv.y * 3.0)));
  vec3 starColor = galaxyPalette(hue + time * 0.07);
  vec3 dustColor = mix(galaxyPalette(hue + 0.5), vec3(0.4, 0.88, 1.0), 0.4);

  vec3 sparkle = starColor * stars * 2.8;
  sparkle += starColor * shimmer * 1.6;
  sparkle += dustColor * dust * 0.95;
  return sparkle * intensity;
}
`;
