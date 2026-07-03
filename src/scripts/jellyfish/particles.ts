import * as THREE from 'three';
import type { JellyfishState } from './states';
import { createParticleMaterial } from './particleMaterial';

const TRAIL_LAYERS = 3;
const HISTORY_SLOTS = 4;
const HISTORY_SAMPLE_EVERY = 3;
const SPARKLE_RATIO = 0.08;

function createGlowTexture(bright = false): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  if (bright) {
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,240,255,0.95)');
    gradient.addColorStop(0.45, 'rgba(240,171,252,0.75)');
    gradient.addColorStop(1, 'rgba(34,211,238,0)');
  } else {
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.28, 'rgba(240,171,252,0.85)');
    gradient.addColorStop(0.55, 'rgba(232,121,249,0.55)');
    gradient.addColorStop(1, 'rgba(34,211,238,0)');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Bioluminescent particles orbiting the jellyfish. A single parametric
 * motion formula blends orbit / spiral / burst behaviour continuously from
 * the current state, so transitions between sections never pop. A few
 * trailing "ghost" layers sampled from recent position history add the
 * faint streaking look without a full GPU trail shader.
 */
export class ParticleField {
  readonly object = new THREE.Group();
  private readonly count: number;
  private readonly sparkleCount: number;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly texture: THREE.CanvasTexture;
  private readonly points: THREE.Points;
  private readonly sparkleGeometry: THREE.BufferGeometry;
  private readonly sparkleMaterial: THREE.ShaderMaterial;
  private readonly sparkleTexture: THREE.CanvasTexture;
  private readonly sparklePoints: THREE.Points;
  private readonly trailPoints: THREE.Points[] = [];
  private readonly trailGeometries: THREE.BufferGeometry[] = [];
  private readonly trailMaterials: THREE.PointsMaterial[] = [];
  private readonly history: Float32Array[] = [];
  private historyCursor = 0;
  private frameCount = 0;
  private glowBoost = 0;
  private readonly hotColor = new THREE.Color('#ffffff');

  private readonly angles: Float32Array;
  private readonly radii: Float32Array;
  private readonly speeds: Float32Array;
  private readonly emitSpeeds: Float32Array;
  private readonly phases: Float32Array;
  private readonly verticalOffsets: Float32Array;
  private readonly bobPhases: Float32Array;
  private readonly sparkleAngles: Float32Array;
  private readonly sparkleRadii: Float32Array;
  private readonly sparkleSpeeds: Float32Array;
  private readonly sparklePhases: Float32Array;
  private readonly sparkleEmitSpeeds: Float32Array;
  private readonly sparkleLifePhases: Float32Array;
  private readonly lifeAttr: THREE.BufferAttribute;
  private readonly sparkleLifeAttr: THREE.BufferAttribute;

  constructor(count: number) {
    this.count = count;
    this.sparkleCount = Math.max(4, Math.floor(count * SPARKLE_RATIO));
    const positions = new Float32Array(count * 3);
    const life = new Float32Array(count);
    this.angles = new Float32Array(count);
    this.radii = new Float32Array(count);
    this.speeds = new Float32Array(count);
    this.emitSpeeds = new Float32Array(count);
    this.phases = new Float32Array(count);
    this.verticalOffsets = new Float32Array(count);
    this.bobPhases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.angles[i] = Math.random() * Math.PI * 2;
      this.radii[i] = 0.2 + Math.random() * 0.8;
      this.speeds[i] = 0.5 + Math.random() * 1.0;
      this.emitSpeeds[i] = 0.32 + Math.random() * 0.58;
      this.phases[i] = Math.random();
      life[i] = this.phases[i];
      this.verticalOffsets[i] = (Math.random() - 0.5) * 1.4;
      this.bobPhases[i] = Math.random() * Math.PI * 2;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.lifeAttr = new THREE.BufferAttribute(life, 1);
    this.geometry.setAttribute('aLife', this.lifeAttr);

    this.texture = createGlowTexture(false);
    this.material = createParticleMaterial(this.texture, 1);

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.object.add(this.points);

    const sparklePositions = new Float32Array(this.sparkleCount * 3);
    const sparkleLife = new Float32Array(this.sparkleCount);
    this.sparkleAngles = new Float32Array(this.sparkleCount);
    this.sparkleRadii = new Float32Array(this.sparkleCount);
    this.sparkleSpeeds = new Float32Array(this.sparkleCount);
    this.sparklePhases = new Float32Array(this.sparkleCount);
    this.sparkleEmitSpeeds = new Float32Array(this.sparkleCount);
    this.sparkleLifePhases = new Float32Array(this.sparkleCount);

    for (let i = 0; i < this.sparkleCount; i++) {
      this.sparkleAngles[i] = Math.random() * Math.PI * 2;
      this.sparkleRadii[i] = 0.1 + Math.random() * 0.45;
      this.sparkleSpeeds[i] = 0.9 + Math.random() * 1.6;
      this.sparklePhases[i] = Math.random() * Math.PI * 2;
      this.sparkleEmitSpeeds[i] = 0.45 + Math.random() * 0.75;
      this.sparkleLifePhases[i] = Math.random();
      sparkleLife[i] = this.sparkleLifePhases[i];
    }

    this.sparkleGeometry = new THREE.BufferGeometry();
    this.sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
    this.sparkleLifeAttr = new THREE.BufferAttribute(sparkleLife, 1);
    this.sparkleGeometry.setAttribute('aLife', this.sparkleLifeAttr);
    this.sparkleTexture = createGlowTexture(true);
    this.sparkleMaterial = createParticleMaterial(this.sparkleTexture, 1.15);
    this.sparklePoints = new THREE.Points(this.sparkleGeometry, this.sparkleMaterial);
    this.sparklePoints.frustumCulled = false;
    this.sparklePoints.visible = false;
    this.object.add(this.sparklePoints);

    for (let i = 0; i < TRAIL_LAYERS; i++) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
      const material = new THREE.PointsMaterial({
        size: 0.12,
        map: this.texture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        color: new THREE.Color('#f0abfc'),
        opacity: 0,
      });
      const mesh = new THREE.Points(geometry, material);
      mesh.frustumCulled = false;
      this.trailGeometries.push(geometry);
      this.trailMaterials.push(material);
      this.trailPoints.push(mesh);
      this.object.add(mesh);
    }

    for (let i = 0; i < HISTORY_SLOTS; i++) {
      this.history.push(positions.slice());
    }
  }

  /** 0..1 — how much nearby particles are lighting up the bell this frame. */
  getBellGlowBoost(): number {
    return this.glowBoost;
  }

  private sampleEmission(
    phase: number,
    angle: number,
    speed: number,
    radiusMix: number,
    vertOffset: number,
    bobPhase: number,
    time: number,
    state: JellyfishState,
    center: THREE.Vector3,
    index: number,
    isSparkle: boolean
  ): [number, number, number, number] {
    const t = phase;
    const ease = t * t * (3 - 2 * t);

    const core = isSparkle ? 0.03 + radiusMix * 0.05 : 0.04 + radiusMix * 0.08;
    const reach =
      core + state.particleSpread * (isSparkle ? 0.18 + radiusMix * 0.32 : 0.2 + radiusMix * 0.42);
    const radius = core + (reach - core) * ease;

    const orbitMul = isSparkle ? 3.0 : 2.35;
    const orbitAngle = angle + time * state.particleSpeed * speed * orbitMul + ease * Math.PI * 2;
    const spiralWobble =
      Math.sin(orbitAngle * 2.2 + index * 0.55) * state.particleSpiral * radius * (isSparkle ? 0.28 : 0.38);
    const burstPulse = Math.sin(time * 1.6 + index * 0.35) * 0.5 + 0.5;
    const r = radius + spiralWobble + burstPulse * state.particleBurst * (isSparkle ? 0.35 : 0.45);

    const px = center.x + Math.cos(orbitAngle) * r;
    const pz = center.z + Math.sin(orbitAngle) * r * (isSparkle ? 0.42 : 0.52);
    const py =
      center.y +
      vertOffset * ease * (isSparkle ? 0.35 : 0.45) +
      Math.sin(time * (isSparkle ? 0.75 : 0.55) + bobPhase) * 0.16 * ease;

    return [px, py, pz, t];
  }

  private applyMouseRepulsion(
    px: number,
    py: number,
    pz: number,
    mouseWorld: THREE.Vector3 | null,
    dt: number
  ): [number, number, number] {
    if (!mouseWorld || dt <= 0) return [px, py, pz];

    const dx = px - mouseWorld.x;
    const dy = py - mouseWorld.y;
    const dz = pz - mouseWorld.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const radius = 1.9;
    const radiusSq = radius * radius;

    if (distSq >= radiusSq || distSq <= 1e-6) return [px, py, pz];

    const dist = Math.sqrt(distSq);
    const push = ((1 - dist / radius) ** 1.55) * 4.4 * dt;
    return [
      px + (dx / dist) * push,
      py + (dy / dist) * push * 0.38,
      pz + (dz / dist) * push * 0.88,
    ];
  }

  private applyScrollDrift(
    px: number,
    py: number,
    pz: number,
    life: number,
    index: number,
    scrollInfluence: number,
    dt: number
  ): [number, number, number] {
    if (Math.abs(scrollInfluence) < 0.001 || dt <= 0) return [px, py, pz];

    const scrollLife = Math.max(0, (life - 0.18) / 0.62);
    const depth = 0.45 + this.radii[index] * 0.55;
    const angle = this.angles[index] + index * 0.37;

    py -= scrollInfluence * dt * (2.4 + scrollLife * 3.2) * depth;
    px += Math.cos(angle) * scrollInfluence * dt * (1.4 + scrollLife * 1.1);
    pz += Math.sin(angle) * scrollInfluence * dt * (0.9 + scrollLife * 0.8);

    return [px, py, pz];
  }

  update(
    dt: number,
    time: number,
    state: JellyfishState,
    center: THREE.Vector3,
    mouseWorld: THREE.Vector3 | null = null,
    scrollInfluence = 0
  ) {
    const positions = this.geometry.attributes.position as THREE.BufferAttribute;
    const sparklePositions = this.sparkleGeometry.attributes.position as THREE.BufferAttribute;
    let nearEnergy = 0;
    const nearRadius = 2.1;

    for (let i = 0; i < this.count; i++) {
      const emitRate = this.emitSpeeds[i] * (0.55 + state.particleSpeed * 1.6);
      this.phases[i] = (this.phases[i] + dt * emitRate) % 1;

      let [px, py, pz, life] = this.sampleEmission(
        this.phases[i],
        this.angles[i],
        this.speeds[i],
        this.radii[i],
        this.verticalOffsets[i],
        this.bobPhases[i],
        time,
        state,
        center,
        i,
        false
      );

      [px, py, pz] = this.applyMouseRepulsion(px, py, pz, mouseWorld, dt);
      [px, py, pz] = this.applyScrollDrift(px, py, pz, life, i, scrollInfluence, dt);

      positions.setXYZ(i, px, py, pz);
      this.lifeAttr.setX(i, life);

      const dx = px - center.x;
      const dy = py - center.y;
      const dz = pz - center.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const twinkle = Math.sin(time * 2.8 + this.bobPhases[i] * 1.4) * 0.5 + 0.5;
      const glowLife = Math.max(0, (life - 0.28) / 0.55);
      if (dist < nearRadius && glowLife > 0) {
        nearEnergy += (1 - dist / nearRadius) * (0.55 + twinkle * 0.45) * glowLife;
      }
    }
    positions.needsUpdate = true;
    this.lifeAttr.needsUpdate = true;

    for (let i = 0; i < this.sparkleCount; i++) {
      const emitRate = this.sparkleEmitSpeeds[i] * (0.7 + state.particleSpeed * 1.9);
      this.sparkleLifePhases[i] = (this.sparkleLifePhases[i] + dt * emitRate) % 1;

      let [px, py, pz, life] = this.sampleEmission(
        this.sparkleLifePhases[i],
        this.sparkleAngles[i],
        this.sparkleSpeeds[i],
        this.sparkleRadii[i],
        0,
        this.sparklePhases[i],
        time,
        state,
        center,
        i,
        true
      );

      [px, py, pz] = this.applyMouseRepulsion(px, py, pz, mouseWorld, dt);

      sparklePositions.setXYZ(i, px, py, pz);
      this.sparkleLifeAttr.setX(i, life);

      const dx = px - center.x;
      const dy = py - center.y;
      const dz = pz - center.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const pulse = Math.sin(time * 3.4 + this.sparklePhases[i]) * 0.5 + 0.5;
      const glowLife = Math.max(0, (life - 0.22) / 0.5);
      nearEnergy += (1 - Math.min(1, dist / 1.4)) * (0.85 + pulse * 0.35) * glowLife;
    }
    sparklePositions.needsUpdate = true;
    this.sparkleLifeAttr.needsUpdate = true;

    const targetGlow = Math.min(0.62, nearEnergy / (this.count * 0.16 + this.sparkleCount * 0.3));
    this.glowBoost = THREE.MathUtils.lerp(this.glowBoost, targetGlow, Math.min(1, dt * 4));

    const twinkleGlobal = Math.sin(time * 2.2) * 0.5 + 0.5;
    this.hotColor.set('#f5d0fe').lerp(state.bellColor, 0.65);

    (this.material.uniforms.uColor.value as THREE.Color).copy(state.bellColor).lerp(this.hotColor, 0.22 + twinkleGlobal * 0.1);
    (this.material.uniforms.uHotColor.value as THREE.Color).copy(this.hotColor);
    this.material.uniforms.uOpacity.value = 0.18 + state.emissiveIntensity * 0.05;
    this.material.uniforms.uSizeScale.value = 0.42 + state.particleSpeed * 0.06;

    (this.sparkleMaterial.uniforms.uColor.value as THREE.Color).copy(state.bellColor).lerp(this.hotColor, 0.5);
    (this.sparkleMaterial.uniforms.uHotColor.value as THREE.Color).copy(this.hotColor);
    this.sparkleMaterial.uniforms.uOpacity.value = 0.45 + state.emissiveIntensity * 0.1;
    this.sparkleMaterial.uniforms.uSizeScale.value = 0.85 + state.emissiveIntensity * 0.08;

    this.frameCount++;
    if (this.frameCount % HISTORY_SAMPLE_EVERY === 0) {
      const slot = this.history[this.historyCursor];
      slot.set(positions.array as Float32Array);
      this.historyCursor = (this.historyCursor + 1) % HISTORY_SLOTS;
    }

    for (let layer = 0; layer < TRAIL_LAYERS; layer++) {
      const slotIndex = (this.historyCursor - 1 - layer + HISTORY_SLOTS * 2) % HISTORY_SLOTS;
      const geometry = this.trailGeometries[layer];
      (geometry.attributes.position as THREE.BufferAttribute).array.set(this.history[slotIndex]);
      geometry.attributes.position.needsUpdate = true;
      const material = this.trailMaterials[layer];
      material.color.copy(state.bellColor).lerp(this.hotColor, 0.2);
      material.opacity = state.particleTrail * 0.22 * (1 - layer / TRAIL_LAYERS);
      material.size = 0.06;
    }
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
    this.sparkleGeometry.dispose();
    this.sparkleMaterial.dispose();
    this.sparkleTexture.dispose();
    for (const g of this.trailGeometries) g.dispose();
    for (const m of this.trailMaterials) m.dispose();
  }
}
