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
  uniform vec3 uColor;
  uniform float uIntensity;
  ${NOISE_GLSL}
  void main() {
    vec2 uv = vUv;
    float n1 = snoise(uv * 2.6 + vec2(uTime * 0.015, -uTime * 0.02)) * 0.5 + 0.5;
    float n2 = snoise(uv * 5.2 - vec2(uTime * 0.01, uTime * 0.008)) * 0.5 + 0.5;
    float currents = mix(n1, n2, 0.5);
    float waves = sin((uv.y + uTime * 0.08) * 14.0) * 0.5 + 0.5;
    float glow = currents * uIntensity * 0.18 + waves * uIntensity * uIntensity * 0.5;
    gl_FragColor = vec4(uColor * glow, glow);
  }
`;

/**
 * A fullscreen plane behind the jellyfish carrying an almost-imperceptible
 * noise-based current, which turns into synchronized light waves once
 * `currentIntensity` rises in the CTA state. Fit to the viewport on resize
 * so it always covers the frame regardless of aspect ratio.
 */
export class Environment {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor() {
    const geometry = new THREE.PlaneGeometry(1, 1);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#124878') },
        uIntensity: { value: 0.15 },
      },
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = -10;
    this.mesh.frustumCulled = false;
  }

  /** Resizes/positions the plane so it always fully covers the viewport at its depth. */
  fit(camera: THREE.PerspectiveCamera, depth: number) {
    this.mesh.position.z = depth;
    const distance = camera.position.z - depth;
    const vFov = (camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * camera.aspect;
    this.mesh.scale.set(width, height, 1);
  }

  update(time: number, state: JellyfishState) {
    const uniforms = this.material.uniforms;
    uniforms.uTime.value = time;
    (uniforms.uColor.value as THREE.Color).copy(state.fogColor).lerp(state.bellColor, 0.4);
    const waterAtten = THREE.MathUtils.lerp(1, 0.7, state.waterIntensity);
    uniforms.uIntensity.value = state.currentIntensity * waterAtten;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
