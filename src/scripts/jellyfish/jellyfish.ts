import * as THREE from 'three';
import { Tentacle } from './tentacle';
import {
  createBellContourMaterial,
  createBellShellMaterial,
  createOrbCoreMaterial,
} from './bellMaterial';
import { createTentacleMaterial } from './tentacleMaterial';
import { HeadParticleHalo } from './headParticles';
import type { JellyfishState } from './states';

const SWIM_RANGE = 3.4;
const HERO_LIFT = 0.85;
const HERO_X_OFFSET = 3.9;
const HERO_Y_OFFSET = 1.08;
const HERO_X_DESKTOP_EXTRA = 4.7;
const HERO_Y_DESKTOP_EXTRA = 1.22;
const DESKTOP_MIN_WIDTH = 1024;
const HERO_INTRO_SCALE_START = 0.7;
const HERO_INTRO_Z_START = -2.4;
const TRABALHOS_X_OFFSET = 3.35;
const TENTACLE_ATTACH_HEIGHT = 0.18;
const TENTACLE_ATTACH_RADIUS_SCALE = 0.86;
const GAZE_MAX = 0.32;
const TILT_MAX = 0.52;

export interface JellyfishOptions {
  tentacleCount: number;
  tentacleSegments: number;
  headParticleCount?: number;
}

export interface JellyfishUpdateContext {
  scrollVelocity: number;
  /** Velocidade de scroll normalizada para física dos tentáculos. */
  scrollInfluence: number;
  scrollProgress: number;
  /** 0 = distante no topo da hero, 1 = tamanho final após scroll intro. */
  heroIntroProgress: number;
  /** 0..1 progresso scroll-driven: encolhe e move à direita ao entrar em trabalhos. */
  trabalhosLayoutProgress: number;
  mouseTarget: THREE.Vector3 | null;
  /** Velocidade do cursor em unidades de mundo por segundo. */
  mouseSpeed: number;
  nearCTA: boolean;
  /** Cursor perto do CTA da hero — a criatura acena em moss. */
  nearHeroCta: boolean;
  /** 0..1 glow contributed by nearby bioluminescent particles. */
  particleGlow: number;
}

interface GlowLayer {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  basePositions: Float32Array;
  pulseFactor: number;
}

function createCenteredSphere(radius: number, widthSeg: number, heightSeg: number, centerY: number) {
  const geometry = new THREE.SphereGeometry(radius, widthSeg, heightSeg);
  const basePositions = (geometry.attributes.position.array as Float32Array).slice();
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    positions.setY(i, positions.getY(i) + centerY);
  }
  geometry.computeVertexNormals();
  return { geometry, basePositions };
}

/**
 * The creature itself: a translucent pulsing bell with a ring of physically
 * simulated tentacles. `group` carries the bell and drives the "acting"
 * transform (swim position, tilt, gaze, self-rotation); the tentacles live
 * in a separate root at identity so their anchors can be driven from the
 * bell's world position while the rest of the rope lags behind naturally.
 */
export class Jellyfish {
  readonly group: THREE.Group;
  readonly tentacleRoot: THREE.Group;
  private readonly bellMesh: THREE.Mesh;
  private readonly contourMesh: THREE.Mesh;
  private readonly outerHaloMesh: THREE.Mesh;
  private readonly outerHaloMaterial: THREE.ShaderMaterial;
  private readonly coreMesh: THREE.Mesh;
  private readonly coreGeometry: THREE.BufferGeometry;
  private readonly bellGeometry: THREE.BufferGeometry;
  private readonly basePositions: Float32Array;
  private readonly baseCorePositions: Float32Array;
  private readonly bellMaterial: THREE.ShaderMaterial;
  private readonly contourMaterial: THREE.ShaderMaterial;
  private readonly coreMaterial: THREE.ShaderMaterial;
  private readonly radianceLayers: GlowLayer[];
  private readonly tentacleMaterial: THREE.ShaderMaterial;
  private readonly innerLight: THREE.PointLight;
  private readonly headParticles: HeadParticleHalo;
  private readonly whiteAccent = new THREE.Color('#ffffff');
  private readonly tentacles: Tentacle[] = [];
  private readonly tentacleAnchors: THREE.Vector3[] = [];
  private readonly tentacleAngles: number[] = [];
  private readonly rimRadius: number;
  private readonly tentacleAttachY: number;
  private readonly tentacleAttachRadius: number;
  private readonly bellTopY: number;
  private readonly bellBottomY: number;

  private bobPhase = Math.random() * Math.PI * 2;
  private currentTilt = 0;
  private currentGazeYaw = 0;
  private currentGazePitch = 0;
  private selfRotation = 0;
  private approachZ = 0;
  private trabalhosLayoutSmoothed = 0;
  private displayColor = new THREE.Color('#e879f9');
  private readonly hotFuchsia = new THREE.Color('#f0abfc');
  private displayEmissive = 0.5;
  private flashTimer = 0;
  private flashBoost = 0;
  private hoverAmount = 0;
  private heroCtaAmount = 0;
  private readonly baseNeon = new THREE.Color('#c994e8');
  private readonly hoverColor = new THREE.Color('#22d3ee');
  private readonly hoverNeon = new THREE.Color('#67e8f9');
  private readonly mossBell = new THREE.Color('#4f9e66');
  private readonly mossBright = new THREE.Color('#6ecf8a');
  private readonly activeNeon = new THREE.Color('#e879f9');
  private readonly mouseScratch = new THREE.Vector3();

  constructor(opts: JellyfishOptions) {
    const radius = 1.08;
    const thetaLength = Math.PI * 0.62;
    this.bellGeometry = new THREE.SphereGeometry(radius, 40, 28, 0, Math.PI * 2, 0, thetaLength);
    this.basePositions = (this.bellGeometry.attributes.position.array as Float32Array).slice();

    this.bellTopY = radius;
    this.bellBottomY = radius * Math.cos(thetaLength);
    const rimRadius = radius * Math.sin(thetaLength);
    this.rimRadius = rimRadius;
    this.tentacleAttachY = this.bellBottomY + (this.bellTopY - this.bellBottomY) * TENTACLE_ATTACH_HEIGHT;
    this.tentacleAttachRadius =
      Math.sqrt(Math.max(0, radius * radius - this.tentacleAttachY * this.tentacleAttachY)) *
      TENTACLE_ATTACH_RADIUS_SCALE;
    const coreCenterY = this.bellBottomY + (this.bellTopY - this.bellBottomY) * 0.55;

    this.bellMaterial = createBellShellMaterial(this.bellTopY, this.bellBottomY, coreCenterY);
    this.contourMaterial = createBellContourMaterial(this.bellTopY, this.bellBottomY, 0.12);
    this.outerHaloMaterial = createBellContourMaterial(this.bellTopY, this.bellBottomY, 0.58);

    const coreRadius = radius * 0.38;
    this.coreMaterial = createOrbCoreMaterial(coreCenterY, coreRadius);

    this.radianceLayers = [] as GlowLayer[];

    this.tentacleMaterial = createTentacleMaterial();

    this.bellMesh = new THREE.Mesh(this.bellGeometry, this.bellMaterial);
    this.bellMesh.frustumCulled = false;
    this.bellMesh.renderOrder = 0;

    this.contourMesh = new THREE.Mesh(this.bellGeometry, this.contourMaterial);
    this.contourMesh.frustumCulled = false;
    this.contourMesh.renderOrder = -1;
    this.contourMesh.visible = true;

    this.outerHaloMesh = new THREE.Mesh(this.bellGeometry, this.outerHaloMaterial);
    this.outerHaloMesh.frustumCulled = false;
    this.outerHaloMesh.renderOrder = -2;

    const coreSphere = createCenteredSphere(coreRadius, 24, 18, coreCenterY);
    this.coreGeometry = coreSphere.geometry;
    this.baseCorePositions = coreSphere.basePositions;

    this.coreMesh = new THREE.Mesh(this.coreGeometry, this.coreMaterial);
    this.coreMesh.frustumCulled = false;
    this.coreMesh.renderOrder = 2;
    this.coreMesh.visible = true;

    this.innerLight = new THREE.PointLight(0xf472b6, 1.1, 5.5, 2);
    this.innerLight.position.set(0, coreCenterY, 0);

    this.group = new THREE.Group();
    this.group.add(this.innerLight);
    this.group.add(this.outerHaloMesh);
    this.group.add(this.contourMesh);
    this.group.add(this.coreMesh);
    this.group.add(this.bellMesh);

    this.headParticles = new HeadParticleHalo(
      opts.headParticleCount ?? 28,
      radius,
      this.bellTopY,
      this.bellBottomY
    );
    this.group.add(this.headParticles.points);

    this.tentacleRoot = new THREE.Group();

    const tentacleCount = opts.tentacleCount;
    let leftIdx = 0;
    let rightIdx = 0;
    let minX = Infinity;
    let maxX = -Infinity;

    for (let i = 0; i < tentacleCount; i++) {
      const angle = (i / tentacleCount) * Math.PI * 2;
      const rimX = Math.cos(angle);
      if (rimX < minX) {
        minX = rimX;
        leftIdx = i;
      }
      if (rimX > maxX) {
        maxX = rimX;
        rightIdx = i;
      }
    }

    for (let i = 0; i < tentacleCount; i++) {
      const angle = (i / tentacleCount) * Math.PI * 2;
      const isLooseSide = i === leftIdx || i === rightIdx;
      const anchorLocal = new THREE.Vector3(
        Math.cos(angle) * this.tentacleAttachRadius,
        this.tentacleAttachY,
        Math.sin(angle) * this.tentacleAttachRadius
      );
      this.tentacleAngles.push(angle);
      this.tentacleAnchors.push(anchorLocal);

      const tentacle = new Tentacle({
        segmentCount: opts.tentacleSegments,
        baseSegmentLength: 0.3,
        radialSegments: 6,
        baseRadius: 0.068,
        anchorLocal,
        phase: (i / tentacleCount) * Math.PI * 2 + Math.random() * 0.6,
        material: this.tentacleMaterial,
        looseness: isLooseSide ? 1.7 : 1,
      });
      this.tentacles.push(tentacle);
      this.tentacleRoot.add(tentacle.mesh);
    }
  }

  update(dt: number, time: number, state: JellyfishState, ctx: JellyfishUpdateContext) {
    let targetHover = 0;
    if (ctx.mouseTarget) {
      this.mouseScratch.copy(ctx.mouseTarget).sub(this.group.position);
      const dist = this.mouseScratch.length();
      const hoverRadius = 2.4;
      targetHover = THREE.MathUtils.clamp(1 - dist / hoverRadius, 0, 1);
      targetHover *= targetHover;
    }
    this.hoverAmount = THREE.MathUtils.lerp(this.hoverAmount, targetHover, Math.min(1, dt * 11));

    const targetHeroCta = ctx.nearHeroCta ? 1 : 0;
    this.heroCtaAmount = THREE.MathUtils.lerp(this.heroCtaAmount, targetHeroCta, Math.min(1, dt * 9));

    this.displayColor.lerp(state.bellColor, Math.min(1, dt * 2.2));

    const heroPresence =
      (1 - ctx.trabalhosLayoutProgress) * THREE.MathUtils.smoothstep(ctx.heroIntroProgress, 0.25, 0.95);
    if (heroPresence > 0.001) {
      this.displayColor.lerp(this.mossBell, heroPresence * 0.38);
    }

    if (this.hoverAmount > 0.001) {
      const hoverTint = this.heroCtaAmount > 0.15 ? this.mossBright : this.hoverColor;
      this.displayColor.lerp(hoverTint, this.hoverAmount * (0.55 + this.heroCtaAmount * 0.28));
    }
    if (this.heroCtaAmount > 0.001) {
      this.displayColor.lerp(this.mossBright, this.heroCtaAmount * 0.22);
    }

    this.activeNeon.copy(this.baseNeon).lerp(this.hoverNeon, this.hoverAmount);
    this.displayEmissive = THREE.MathUtils.lerp(
      this.displayEmissive,
      state.emissiveIntensity + this.hoverAmount * 0.18,
      Math.min(1, dt * 2.2)
    );

    this.flashTimer -= dt;
    if (this.flashTimer <= 0 && state.flashIntensity > 0.15) {
      this.flashBoost = 1;
      this.flashTimer = THREE.MathUtils.lerp(0.6, 0.1, state.flashIntensity);
    }
    this.flashBoost *= 0.86;

    const pulse = Math.sin(time * state.pulseSpeed * Math.PI * 2) * (state.pulseAmount + this.heroCtaAmount * 0.045);
    const emissive = Math.min(
      0.42,
      this.displayEmissive +
        this.flashBoost * state.flashIntensity * 0.5 +
        this.hoverAmount * 0.08 +
        this.heroCtaAmount * 0.12
    );

    const shellColor = this.bellMaterial.uniforms.uColor.value as THREE.Color;
    const coreColor = this.bellMaterial.uniforms.uCoreColor.value as THREE.Color;
    const neonUniform = this.bellMaterial.uniforms.uNeonColor.value as THREE.Color;

    shellColor.copy(this.displayColor).lerp(this.hotFuchsia, 0.18);
    coreColor.copy(this.displayColor).lerp(this.hotFuchsia, 0.55 + this.hoverAmount * 0.15);
    coreColor.lerp(this.whiteAccent, 0.18 + this.hoverAmount * 0.08);
    neonUniform.copy(this.displayColor).lerp(this.hotFuchsia, 0.65 + this.hoverAmount * 0.12);

    this.bellMaterial.uniforms.uPulse.value = pulse;
    this.bellMaterial.uniforms.uTime.value = time;
    this.bellMaterial.uniforms.uEmissive.value = Math.min(0.55, emissive * 0.75 + this.hoverAmount * 0.08);
    this.bellMaterial.uniforms.uOrbGlow.value = 0.95 + emissive * 0.62 + this.hoverAmount * 0.14;

    this.contourMaterial.uniforms.uPulse.value = pulse;
    this.contourMaterial.uniforms.uTime.value = time;
    this.contourMaterial.uniforms.uEmissive.value = Math.min(0.42, emissive * 0.62);
    (this.contourMaterial.uniforms.uNeonColor.value as THREE.Color)
      .copy(this.displayColor)
      .lerp(this.hotFuchsia, 0.65 + this.hoverAmount * 0.1);
    this.contourMaterial.uniforms.uIntensity.value =
      0.18 + emissive * 0.08 + this.hoverAmount * 0.04;

    this.outerHaloMaterial.uniforms.uPulse.value = pulse;
    this.outerHaloMaterial.uniforms.uTime.value = time;
    this.outerHaloMaterial.uniforms.uEmissive.value = Math.min(0.55, emissive * 0.78);
    (this.outerHaloMaterial.uniforms.uNeonColor.value as THREE.Color)
      .copy(this.displayColor)
      .lerp(this.hotFuchsia, 0.55);
    this.outerHaloMaterial.uniforms.uIntensity.value =
      0.28 + emissive * 0.14 + this.hoverAmount * 0.06;

    this.coreMaterial.uniforms.uPulse.value = pulse;
    this.coreMaterial.uniforms.uEmissive.value = Math.min(0.72, emissive * 0.88 + this.hoverAmount * 0.14);
    (this.coreMaterial.uniforms.uNeonColor.value as THREE.Color)
      .copy(this.displayColor)
      .lerp(this.hotFuchsia, 0.62);
    (this.coreMaterial.uniforms.uCoreColor.value as THREE.Color)
      .copy(this.hotFuchsia)
      .lerp(this.whiteAccent, 0.52 + this.hoverAmount * 0.18);

    const innerStrength = 1.1 + emissive * 0.95 + this.hoverAmount * 0.28 + this.heroCtaAmount * 0.35;
    this.innerLight.color.copy(this.hotFuchsia).lerp(this.mossBright, 0.12 + heroPresence * 0.32 + this.heroCtaAmount * 0.32);
    this.innerLight.color.lerp(this.whiteAccent, 0.18 + this.hoverAmount * 0.1);
    this.innerLight.intensity = innerStrength;

    const tentacleEmissive = emissive * 0.55 + this.hoverAmount * 0.1 + 0.12;
    (this.tentacleMaterial.uniforms.uColor.value as THREE.Color)
      .copy(this.displayColor)
      .lerp(this.hotFuchsia, 0.22);
    (this.tentacleMaterial.uniforms.uEmissive.value as THREE.Color)
      .copy(this.displayColor)
      .lerp(this.hotFuchsia, 0.72);
    this.tentacleMaterial.uniforms.uEmissiveIntensity.value = Math.min(0.92, tentacleEmissive);
    this.tentacleMaterial.uniforms.uTime.value = time;

    this.outerHaloMesh.visible = true;
    this.deformBell(time, state);
    this.moveAndOrient(dt, time, state, ctx);

    this.group.updateMatrixWorld(true);
    let mouseLocal: THREE.Vector3 | null = null;
    if (ctx.mouseTarget) {
      mouseLocal = this.mouseScratch.copy(ctx.mouseTarget);
      this.group.worldToLocal(mouseLocal);
    }
    this.headParticles.update(dt, time, mouseLocal, ctx.mouseSpeed, heroPresence + this.heroCtaAmount * 0.35);

    const anchorWorld = new THREE.Vector3();
    for (let i = 0; i < this.tentacles.length; i++) {
      anchorWorld.copy(this.tentacleAnchors[i]);
      this.group.localToWorld(anchorWorld);
      const tentacle = this.tentacles[i];
      const lengthMul = state.tentacleLength * (tentacle.looseness > 1 ? 1.12 : 1);
      tentacle.update(dt, time, anchorWorld, lengthMul, state.tentacleDrag, ctx.scrollInfluence);
    }
  }

  private sampleBellWaves(
    bx: number,
    by: number,
    bz: number,
    time: number,
    state: JellyfishState,
    globalPulse: number
  ) {
    const heightRange = this.bellTopY - this.bellBottomY;
    const depthNorm = THREE.MathUtils.clamp((this.bellTopY - by) / heightRange, 0, 1);
    const flowerScale = 1 + state.flowerOpen * depthNorm * depthNorm;
    const theta = Math.atan2(bz, bx);
    const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
    const phi = Math.acos(THREE.MathUtils.clamp(by / len, -1, 1));
    const hash = Math.sin(theta * 5.17 + phi * 3.71) * 0.5 + 0.5;

    const waveAmp = state.deformAmount * (0.38 + depthNorm * 1.45);
    const travel = time * 1.05;

    const wave1 = Math.sin(theta * 3.0 - travel + this.bobPhase) * Math.sin(phi * 4.0 + time * 0.52);
    const wave2 =
      Math.sin(theta * 5.0 + time * 0.78 + hash * Math.PI * 2) * Math.cos(phi * 3.0 - time * 0.62);
    const wave3 = Math.sin(theta * 2.0 - time * 0.45 + phi * 2.2);
    const rimFlutter = depthNorm * depthNorm * Math.sin(theta * 6.0 - travel * 1.4 + this.bobPhase * 0.6);

    const displacement =
      (wave1 * 0.48 + wave2 * 0.3 + wave3 * 0.2 + rimFlutter * 0.32) * waveAmp * 2.45;

    const nx = bx / len;
    const ny = by / len;
    const nz = bz / len;
    const tx = -Math.sin(theta);
    const tz = Math.cos(theta);
    const tangential = Math.sin(theta * 4.0 - travel * 1.6) * waveAmp * depthNorm * 0.38;

    return {
      px: bx * globalPulse * flowerScale + nx * displacement + tx * tangential,
      py: by * globalPulse + ny * displacement * 0.58,
      pz: bz * globalPulse * flowerScale + nz * displacement + tz * tangential,
    };
  }

  private updateRimAnchors(time: number, state: JellyfishState, globalPulse: number) {
    for (let i = 0; i < this.tentacleAngles.length; i++) {
      const angle = this.tentacleAngles[i];
      const bx = Math.cos(angle) * this.tentacleAttachRadius;
      const bz = Math.sin(angle) * this.tentacleAttachRadius;
      const { px, py, pz } = this.sampleBellWaves(bx, this.tentacleAttachY, bz, time, state, globalPulse);
      this.tentacleAnchors[i].set(px, py, pz);
    }
  }

  private deformBell(time: number, state: JellyfishState) {
    const positions = this.bellGeometry.attributes.position as THREE.BufferAttribute;
    const corePositions = this.coreGeometry.attributes.position as THREE.BufferAttribute;
    const globalPulse = 1 + Math.sin(time * state.pulseSpeed * Math.PI * 2) * state.pulseAmount;

    for (let i = 0; i < positions.count; i++) {
      const bx = this.basePositions[i * 3];
      const by = this.basePositions[i * 3 + 1];
      const bz = this.basePositions[i * 3 + 2];
      const { px, py, pz } = this.sampleBellWaves(bx, by, bz, time, state, globalPulse);
      positions.setXYZ(i, px, py, pz);
    }

    this.updateRimAnchors(time, state, globalPulse);

    const corePulse = 1 + Math.sin(time * state.pulseSpeed * Math.PI * 2) * state.pulseAmount * 0.75;
    for (let i = 0; i < corePositions.count; i++) {
      const bx = this.baseCorePositions[i * 3];
      const by = this.baseCorePositions[i * 3 + 1];
      const bz = this.baseCorePositions[i * 3 + 2];
      corePositions.setXYZ(i, bx * corePulse, by * corePulse, bz * corePulse);
    }

    for (const layer of this.radianceLayers) {
      const positions = layer.geometry.attributes.position as THREE.BufferAttribute;
      const layerPulse = 1 + Math.sin(time * state.pulseSpeed * Math.PI * 2) * state.pulseAmount * layer.pulseFactor;
      for (let i = 0; i < positions.count; i++) {
        const bx = layer.basePositions[i * 3];
        const by = layer.basePositions[i * 3 + 1];
        const bz = layer.basePositions[i * 3 + 2];
        positions.setXYZ(i, bx * layerPulse, by * layerPulse, bz * layerPulse);
      }
      positions.needsUpdate = true;
      layer.geometry.computeVertexNormals();
    }

    positions.needsUpdate = true;
    corePositions.needsUpdate = true;
    this.bellGeometry.computeVertexNormals();
    this.coreGeometry.computeVertexNormals();
  }

  private moveAndOrient(dt: number, time: number, state: JellyfishState, ctx: JellyfishUpdateContext) {
    const bob = Math.sin(time * 0.5 + this.bobPhase) * 0.16;
    const heroLift = HERO_LIFT * Math.max(0, 1 - ctx.heroIntroProgress);
    const swimY = -SWIM_RANGE / 2 + SWIM_RANGE * ctx.scrollProgress + heroLift + bob;
    const curve = Math.sin(ctx.scrollProgress * Math.PI * 2.4 + time * 0.12) * state.swimCurviness * 1.1;

    const intro = ctx.heroIntroProgress;
    this.trabalhosLayoutSmoothed = THREE.MathUtils.lerp(
      this.trabalhosLayoutSmoothed,
      ctx.trabalhosLayoutProgress,
      Math.min(1, dt * 6.5)
    );
    const trabalhos = this.trabalhosLayoutSmoothed;
    const heroScale = THREE.MathUtils.lerp(HERO_INTRO_SCALE_START, 1, intro);
    const heroZ = THREE.MathUtils.lerp(HERO_INTRO_Z_START, 0, intro);
    const distantScale = THREE.MathUtils.lerp(heroScale, HERO_INTRO_SCALE_START, trabalhos);
    const distantZ = THREE.MathUtils.lerp(heroZ, HERO_INTRO_Z_START, trabalhos);
    const heroAlign =
      (1 - trabalhos) * THREE.MathUtils.lerp(0.4, 1, THREE.MathUtils.smoothstep(intro, 0.15, 0.9));
    const isDesktop = window.innerWidth >= DESKTOP_MIN_WIDTH;
    const heroX = HERO_X_OFFSET + (isDesktop ? HERO_X_DESKTOP_EXTRA : 0);
    const heroY = HERO_Y_OFFSET + (isDesktop ? HERO_Y_DESKTOP_EXTRA : 0);
    const posX = THREE.MathUtils.lerp(curve + heroX * heroAlign, TRABALHOS_X_OFFSET, trabalhos);
    const posY = swimY + heroY * heroAlign;

    const approachTarget = ctx.nearCTA || ctx.nearHeroCta ? 1 : 0;
    this.approachZ = THREE.MathUtils.lerp(this.approachZ, approachTarget, Math.min(1, dt * (ctx.nearHeroCta ? 3.2 : 2)));

    this.group.position.set(posX, posY, distantZ + this.approachZ * 1.1);

    this.selfRotation += dt * state.rotationSpeed;

    const targetTilt = THREE.MathUtils.clamp(-ctx.scrollVelocity * 0.055, -TILT_MAX, TILT_MAX);
    this.currentTilt = THREE.MathUtils.lerp(this.currentTilt, targetTilt, 1 - Math.pow(0.0008, dt));

    let targetYaw = 0;
    let targetPitch = 0;
    if (ctx.mouseTarget) {
      const dir = ctx.mouseTarget.clone().sub(this.group.position);
      const gazeMul = state.gazeIntensity * (1 + this.heroCtaAmount * 0.75);
      targetYaw = THREE.MathUtils.clamp(dir.x * 0.12, -GAZE_MAX, GAZE_MAX) * gazeMul;
      targetPitch = THREE.MathUtils.clamp(-dir.y * 0.1, -GAZE_MAX, GAZE_MAX) * gazeMul;
    }
    this.currentGazeYaw = THREE.MathUtils.lerp(this.currentGazeYaw, targetYaw, 1 - Math.pow(0.001, dt));
    this.currentGazePitch = THREE.MathUtils.lerp(this.currentGazePitch, targetPitch, 1 - Math.pow(0.001, dt));

    const scale = distantScale * (1 + this.approachZ * 0.08);
    this.group.scale.setScalar(scale);
    this.group.rotation.set(this.currentGazePitch, this.selfRotation + this.currentGazeYaw, this.currentTilt);
  }

  getCenter(target: THREE.Vector3): THREE.Vector3 {
    return target.copy(this.group.position);
  }

  dispose() {
    this.bellGeometry.dispose();
    this.coreGeometry.dispose();
    this.bellMaterial.dispose();
    this.contourMaterial.dispose();
    this.outerHaloMaterial.dispose();
    this.coreMaterial.dispose();
    for (const layer of this.radianceLayers) {
      layer.geometry.dispose();
      layer.material.dispose();
    }
    this.tentacleMaterial.dispose();
    this.headParticles.dispose();
    for (const tentacle of this.tentacles) tentacle.dispose();
  }
}
