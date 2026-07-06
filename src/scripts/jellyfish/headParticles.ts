import * as THREE from 'three';

const NEON_PURPLE = '#c026d3';
const NEON_HOT = '#e879f9';
const MOSS_GLOW = '#5fa872';
const OCEAN_CYAN = '#22d3ee';
const OCEAN_BLUE = '#38bdf8';

function createNeonBubbleTexture(): THREE.CanvasTexture {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.44;

  const body = ctx.createRadialGradient(cx - 6, cy - 8, 0, cx, cy, radius);
  body.addColorStop(0, 'rgba(255,255,255,0.95)');
  body.addColorStop(0.18, 'rgba(240,171,252,0.82)');
  body.addColorStop(0.45, 'rgba(192,38,211,0.55)');
  body.addColorStop(0.72, 'rgba(168,85,247,0.28)');
  body.addColorStop(1, 'rgba(88,28,135,0)');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(232,121,249,0.92)';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.82, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(cx - 11, cy - 13, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(240,171,252,0.55)';
  ctx.beginPath();
  ctx.arc(cx + 10, cy + 12, 4, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const BUBBLE_VERTEX = /* glsl */ `
  attribute float aScale;
  uniform float uSize;

  varying float vShine;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float perspective = 340.0 / max(-mvPosition.z, 0.1);
    gl_PointSize = uSize * aScale * perspective;
    gl_Position = projectionMatrix * mvPosition;
    vShine = aScale;
  }
`;

const BUBBLE_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform vec3 uHotColor;
  uniform float uOpacity;

  varying float vShine;

  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    float alpha = tex.a * uOpacity;
    if (alpha < 0.004) discard;
    vec3 col = mix(uColor, uHotColor, tex.r * 0.55 + vShine * 0.12);
    gl_FragColor = vec4(col * tex.rgb, alpha);
  }
`;

interface HeadParticle {
  restX: number;
  restY: number;
  restZ: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  velX: number;
  velY: number;
  velZ: number;
  phase: number;
  scale: number;
}

/**
 * Bolhas neon roxas ao redor da campânula (faixa lateral). Reagem ao movimento
 * do cursor espalhando-se radialmente e voltando suavemente ao repouso.
 */
export class HeadParticleHalo {
  readonly points: THREE.Points;
  private readonly count: number;
  private readonly particles: HeadParticle[];
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly texture: THREE.CanvasTexture;
  private readonly scaleAttr: THREE.BufferAttribute;
  private readonly hotColor = new THREE.Color(NEON_HOT);
  private readonly mossColor = new THREE.Color(MOSS_GLOW);
  private readonly oceanColor = new THREE.Color(OCEAN_CYAN);
  private readonly oceanHot = new THREE.Color(OCEAN_BLUE);

  constructor(
    count: number,
    bellRadius: number,
    bellTopY: number,
    bellBottomY: number
  ) {
    this.count = count;
    this.particles = [];
    this.texture = createNeonBubbleTexture();

    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2 + Math.random() * 0.7;
      // Faixa lateral da campânula — meio da cabeça, não o ápice.
      const heightT = 0.14 + Math.random() * 0.48;
      const bellY = bellBottomY + (bellTopY - bellBottomY) * heightT;
      const yClamped = THREE.MathUtils.clamp(bellY, -bellRadius + 0.02, bellRadius - 0.02);
      const ringR = Math.sqrt(Math.max(0, bellRadius * bellRadius - yClamped * yClamped));
      const outset = 1.34 + Math.random() * 0.42;
      const radialWobble = 1 + (Math.random() - 0.5) * 0.16;
      const restX = Math.cos(theta) * ringR * outset * radialWobble;
      const restY = yClamped + (Math.random() - 0.5) * 0.16;
      const restZ = Math.sin(theta) * ringR * outset * radialWobble;
      const scale = 0.72 + Math.random() * 0.18;

      this.particles.push({
        restX,
        restY,
        restZ,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        velX: 0,
        velY: 0,
        velZ: 0,
        phase: Math.random() * Math.PI * 2,
        scale,
      });

      positions[i * 3] = restX;
      positions[i * 3 + 1] = restY;
      positions[i * 3 + 2] = restZ;
      scales[i] = scale;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.scaleAttr = new THREE.BufferAttribute(scales, 1);
    this.geometry.setAttribute('aScale', this.scaleAttr);

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uMap: { value: this.texture },
        uColor: { value: new THREE.Color(NEON_PURPLE) },
        uHotColor: { value: new THREE.Color(NEON_HOT) },
        uOpacity: { value: 0.72 },
        uSize: { value: 0.22 },
      },
      vertexShader: BUBBLE_VERTEX,
      fragmentShader: BUBBLE_FRAGMENT,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
  }

  update(
    dt: number,
    time: number,
    mouseLocal: THREE.Vector3 | null,
    _mouseSpeed: number,
    mossBlend = 0,
    oceanBlend = 0
  ) {
    if (!Number.isFinite(dt) || dt <= 0) return;

    const positions = this.geometry.attributes.position as THREE.BufferAttribute;
    const spring = 7.5;
    const damp = Math.exp(-dt * 5.2);

    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];
      const wobble = Math.sin(time * 1.4 + p.phase) * 0.07;
      const floatY = Math.sin(time * 0.9 + p.phase * 1.3) * 0.06;

      const restX = p.restX + wobble;
      const restY = p.restY + floatY;
      const restZ = p.restZ + wobble * 0.85;

      if (mouseLocal) {
        const px = restX + p.offsetX;
        const py = restY + p.offsetY;
        const pz = restZ + p.offsetZ;
        const dx = px - mouseLocal.x;
        const dy = py - mouseLocal.y;
        const dz = pz - mouseLocal.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const radius = 1.6;
        if (distSq < radius * radius && distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const push = ((1 - dist / radius) ** 1.5) * 1.6 * dt;
          p.velX += (dx / dist) * push;
          p.velY += (dy / dist) * push * 0.35;
          p.velZ += (dz / dist) * push;
        }
      }

      const toRestX = restX - (restX + p.offsetX);
      const toRestY = restY - (restY + p.offsetY);
      const toRestZ = restZ - (restZ + p.offsetZ);
      p.velX += toRestX * spring * dt;
      p.velY += toRestY * spring * dt;
      p.velZ += toRestZ * spring * dt;

      p.velX *= damp;
      p.velY *= damp;
      p.velZ *= damp;

      p.offsetX += p.velX * dt;
      p.offsetY += p.velY * dt;
      p.offsetZ += p.velZ * dt;

      const maxOffset = 0.55;
      const offLen = Math.sqrt(p.offsetX * p.offsetX + p.offsetY * p.offsetY + p.offsetZ * p.offsetZ);
      if (offLen > maxOffset) {
        const scale = maxOffset / offLen;
        p.offsetX *= scale;
        p.offsetY *= scale;
        p.offsetZ *= scale;
      }

      const x = restX + p.offsetX;
      const y = restY + p.offsetY;
      const z = restZ + p.offsetZ;
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        p.offsetX = 0;
        p.offsetY = 0;
        p.offsetZ = 0;
        p.velX = 0;
        p.velY = 0;
        p.velZ = 0;
        positions.setXYZ(i, restX, restY, restZ);
        continue;
      }

      positions.setXYZ(i, x, y, z);

      const breathe = 1 + Math.sin(time * 2.2 + p.phase) * 0.035;
      this.scaleAttr.setX(i, p.scale * breathe);
    }

    positions.needsUpdate = true;
    this.scaleAttr.needsUpdate = true;

    const pulse = 0.97 + Math.sin(time * 2.6) * 0.03;
    const moss = THREE.MathUtils.clamp(mossBlend, 0, 1);
    const ocean = THREE.MathUtils.clamp(oceanBlend, 0, 1);
    (this.material.uniforms.uColor.value as THREE.Color)
      .set(NEON_PURPLE)
      .lerp(this.mossColor, moss * 0.55 * (1 - ocean * 0.9))
      .lerp(this.oceanColor, ocean * 0.88);
    (this.material.uniforms.uHotColor.value as THREE.Color)
      .copy(this.hotColor)
      .lerp(this.mossColor, moss * 0.4 * (1 - ocean * 0.85))
      .lerp(this.oceanHot, ocean * 0.82);
    this.material.uniforms.uOpacity.value = 0.92 + Math.sin(time * 2.2) * 0.06;
    this.material.uniforms.uSize.value = 0.28 * pulse;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
