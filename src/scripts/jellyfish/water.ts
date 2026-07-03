import * as THREE from 'three';
import { NOISE_GLSL } from './noise.glsl';
import type { JellyfishState } from './states';

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uMotion;
  uniform float uDepth;
  uniform float uScrollVelocity;
  uniform float uQuality;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uAbyssColor;
  uniform vec3 uAccentColor;
  ${NOISE_GLSL}

  float caustics(vec2 uv, float time, float motion) {
    vec2 flow = vec2(time * 0.04 * motion, -time * 0.03 * motion);
    float c1 = snoise(uv * 3.2 + flow) * 0.5 + 0.5;
    float c2 = snoise(uv * 6.4 - flow * 1.3 + vec2(1.7, 0.4)) * 0.5 + 0.5;
    float c = mix(c1, c2, 0.45);
    if (uQuality > 0.5) {
      float c3 = snoise(uv * 9.8 + flow * 0.7) * 0.5 + 0.5;
      c = mix(c, c3, 0.35);
    }
    return pow(c, 1.6);
  }

  void main() {
    vec2 uv = vUv;
    float depth = 1.0 - uv.y;
    float depthPow = mix(0.92, 1.62, uDepth);
    float depthCurve = pow(depth, depthPow);
    float motion = 0.72 + uMotion * 0.55;
    float abyssMask = smoothstep(0.0, 0.58, uv.y);

    vec3 deepMix = mix(uDeepColor, uAbyssColor, uDepth * 0.82);
    vec3 base = mix(uShallowColor, deepMix, depthCurve);

    float surfaceGlow = (1.0 - depthCurve) * (1.0 - depthCurve);
    base += mix(uShallowColor, uAccentColor, 0.5) * surfaceGlow * 0.36 * max(uIntensity, 0.38) * (1.0 - uDepth * 0.35);
    base += vec3(0.02, 0.04, 0.09) * surfaceGlow * (0.24 + uIntensity * 0.16) * (1.0 - uDepth * 0.4);

    float t = uTime * motion;
    float shimmer = snoise(uv * 1.8 + vec2(t * 0.012, -t * 0.009)) * 0.5 + 0.5;
    base += uAccentColor * shimmer * 0.11 * uIntensity * (0.4 + surfaceGlow * 0.6) * abyssMask;

    float scrollRipple = uScrollVelocity * 0.0012;
    vec2 rippleUv = uv + vec2(
      sin(uv.y * 12.0 + t * 0.85) * scrollRipple,
      cos(uv.x * 10.0 - t * 0.72) * scrollRipple * 0.6
    );
    rippleUv += vec2(
      sin(uv.x * 4.5 + t * 0.35) * 0.008 * uMotion,
      cos(uv.y * 3.8 - t * 0.28) * 0.006 * uMotion
    );

    float caust = caustics(rippleUv, t, motion);
    float caustMask = smoothstep(0.05, 0.95, uv.y) * (0.45 + depthCurve * 0.55);
    vec3 caustLight = mix(uAccentColor, uShallowColor, 0.25) * caust * caustMask * 0.62 * uIntensity;
    caustLight *= abyssMask * (1.0 - uDepth * 0.62);
    base += caustLight;

    float rays = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float ray = sin((uv.x + fi * 0.31) * 8.0 + t * 0.22 + fi) * 0.5 + 0.5;
      ray *= smoothstep(0.0, 0.68, 1.0 - uv.y);
      ray *= snoise(vec2(uv.x * 2.0 + fi, uv.y * 3.0 - t * 0.12)) * 0.5 + 0.5;
      rays += ray * (0.16 - fi * 0.03);
    }
    base += uAccentColor * rays * uIntensity * abyssMask * (1.0 - uDepth * 0.5);

    float bottomAbyss = smoothstep(0.5, 0.0, uv.y) * uDepth;
    base = mix(base, uAbyssColor, bottomAbyss * 0.62);
    base *= 1.0 - bottomAbyss * 0.18;

    float vignette = smoothstep(0.0, 0.25, uv.x) * smoothstep(1.0, 0.75, uv.x);
    vignette *= smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.85, uv.y);
    base *= 0.9 + vignette * 0.1;

    float alpha = mix(0.86, 0.99, uIntensity) * (0.86 + depthCurve * 0.14);
    alpha = mix(alpha, min(0.98, alpha + 0.08), bottomAbyss);
    gl_FragColor = vec4(base, alpha);
  }
`;

const scratchShallow = new THREE.Color();
const scratchDeep = new THREE.Color();
const scratchAbyss = new THREE.Color('#000206');
const scratchAccent = new THREE.Color('#1a8fb0');
const WATER_SHALLOW = new THREE.Color('#0a2540');

/**
 * Fullscreen underwater backdrop: depth gradient, caustics, soft light rays.
 * Strongest in hero, subtler in other sections via `state.waterIntensity`.
 */
export class WaterBackdrop {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor(coarsePointer: boolean) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 1 },
        uMotion: { value: 1 },
        uDepth: { value: 0 },
        uScrollVelocity: { value: 0 },
        uQuality: { value: coarsePointer ? 0 : 1 },
        uDeepColor: { value: new THREE.Color('#020610') },
        uShallowColor: { value: new THREE.Color('#0c2842') },
        uAbyssColor: { value: new THREE.Color('#000206') },
        uAccentColor: { value: new THREE.Color('#1a8fb0') },
      },
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = -20;
    this.mesh.frustumCulled = false;
  }

  fit(camera: THREE.PerspectiveCamera, depth: number) {
    this.mesh.position.z = depth;
    const distance = camera.position.z - depth;
    const vFov = (camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * camera.aspect;
    this.mesh.scale.set(width, height, 1);
  }

  update(time: number, state: JellyfishState, scrollVelocity: number, scrollProgress = 0) {
    const uniforms = this.material.uniforms;
    const depth = Math.min(1, state.waterDepth + scrollProgress * 0.42);
    uniforms.uTime.value = time;
    uniforms.uIntensity.value = state.waterIntensity;
    uniforms.uMotion.value = state.waterMotion;
    uniforms.uDepth.value = depth;
    uniforms.uScrollVelocity.value = scrollVelocity;

    scratchAbyss.copy(state.fogColor).multiplyScalar(0.34);
    scratchDeep.copy(state.fogColor).lerp(scratchAbyss, depth * 0.88);
    scratchShallow.copy(WATER_SHALLOW).lerp(scratchAccent, 0.22).multiplyScalar(0.32);
    scratchShallow.lerp(state.bellColor, 0.03);
    scratchShallow.lerp(scratchDeep, depth * 0.58);
    (uniforms.uDeepColor.value as THREE.Color).copy(scratchDeep);
    (uniforms.uShallowColor.value as THREE.Color).copy(scratchShallow);
    (uniforms.uAbyssColor.value as THREE.Color).copy(scratchAbyss);
    (uniforms.uAccentColor.value as THREE.Color).copy(scratchAccent).lerp(state.bellColor, 0.2);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
