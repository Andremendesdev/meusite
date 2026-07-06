import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const FALLBACK_UP = new THREE.Vector3(1, 0, 0);
const CONSTRAINT_ITERATIONS = 4;
const CONSTRAINT_STIFFNESS = 0.46;
const MAX_SEGMENT_VELOCITY = 2.2;

function isFiniteVec3(v: THREE.Vector3) {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}

export interface TentacleOptions {
  segmentCount: number;
  baseSegmentLength: number;
  radialSegments: number;
  baseRadius: number;
  anchorLocal: THREE.Vector3;
  phase: number;
  material: THREE.Material;
  /** >1 = mais solto, com mais ondulação e menos restrição vertical */
  looseness?: number;
}

function buildTubeGeometry(pointCount: number, radialSegments: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertexCount = pointCount * radialSegments;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  for (let i = 0; i < pointCount; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const idx = i * radialSegments + j;
      uvs[idx * 2] = j / Math.max(1, radialSegments - 1);
      uvs[idx * 2 + 1] = i / Math.max(1, pointCount - 1);
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < pointCount - 1; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const jNext = (j + 1) % radialSegments;
      const a = i * radialSegments + j;
      const b = i * radialSegments + jNext;
      const c = (i + 1) * radialSegments + j;
      const d = (i + 1) * radialSegments + jNext;
      indices.push(a, c, b, b, c, d);
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * A single tentacle: a chain of verlet-integrated points pinned at the
 * anchor (bell rim) and left free everywhere else, so fast bell movement
 * (swimming, tilting) naturally leaves the tail lagging behind. Rendered
 * as a tapered procedural tube whose vertex buffer is rewritten in place
 * every frame — no per-frame allocation of geometry.
 */
export class Tentacle {
  readonly mesh: THREE.Mesh;
  private points: THREE.Vector3[];
  private prevPoints: THREE.Vector3[];
  private readonly segmentCount: number;
  private readonly baseSegmentLength: number;
  private readonly radialSegments: number;
  private readonly baseRadius: number;
  private readonly phase: number;
  readonly looseness: number;
  private readonly geometry: THREE.BufferGeometry;
  private readonly anchorLocal: THREE.Vector3;
  private worldSynced = false;

  constructor(opts: TentacleOptions) {
    this.segmentCount = opts.segmentCount;
    this.baseSegmentLength = opts.baseSegmentLength;
    this.radialSegments = opts.radialSegments;
    this.baseRadius = opts.baseRadius;
    this.phase = opts.phase;
    this.looseness = opts.looseness ?? 1;
    this.anchorLocal = opts.anchorLocal;

    const pointCount = this.segmentCount + 1;
    this.points = [];
    this.prevPoints = [];
    for (let i = 0; i < pointCount; i++) {
      const p = new THREE.Vector3(
        opts.anchorLocal.x,
        opts.anchorLocal.y - i * this.baseSegmentLength,
        opts.anchorLocal.z
      );
      this.points.push(p.clone());
      this.prevPoints.push(p.clone());
    }

    this.geometry = buildTubeGeometry(pointCount, this.radialSegments);
    this.mesh = new THREE.Mesh(this.geometry, opts.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
  }

  private resetChain(anchor: THREE.Vector3, segmentLength: number) {
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const prev = this.prevPoints[i];
      p.set(anchor.x, anchor.y - i * segmentLength, anchor.z);
      prev.copy(p);
    }
  }

  /**
   * @param anchorWorld current world-space position of this tentacle's rim anchor
   * @param lengthMultiplier grows/shrinks the rope without touching topology
   * @param dragFactor 0..1, higher = looser / more lag
   */
  update(
    dt: number,
    time: number,
    anchorWorld: THREE.Vector3,
    lengthMultiplier: number,
    dragFactor: number,
    scrollInfluence = 0
  ) {
    const segmentLength = this.baseSegmentLength * lengthMultiplier;
    const loosenessBoost = this.looseness - 1;
    const scrollAbs = Math.abs(scrollInfluence);

    this.points[0].copy(anchorWorld);
    this.prevPoints[0].copy(anchorWorld);

    if (!this.worldSynced || !isFiniteVec3(this.points[1])) {
      this.resetChain(anchorWorld, segmentLength);
      this.worldSynced = true;
      this.writeGeometry();
      return;
    }

    const effectiveDrag = Math.min(1, dragFactor + loosenessBoost * 0.42 + scrollAbs * 0.18);
    const damping = 0.86 + effectiveDrag * 0.09 - loosenessBoost * 0.04 - scrollAbs * 0.06;
    const waveStrength = 0.76 + effectiveDrag * 0.68 + loosenessBoost * 0.5 + scrollAbs * 0.45;
    const waveFreq = 0.68 + loosenessBoost * 0.38;
    const segmentWave = 0.58 + loosenessBoost * 0.34;
    const waveScale = (1.22 + loosenessBoost * 1.0) * (1 + scrollAbs * 0.38);
    const maxVel = MAX_SEGMENT_VELOCITY * (1 + loosenessBoost * 0.2);

    for (let i = 1; i < this.points.length; i++) {
      const point = this.points[i];
      const prev = this.prevPoints[i];
      const depthFactor = i / this.points.length;
      const segPhase = this.phase + i * 0.52;
      const segmentDamping = Math.min(0.96, damping + depthFactor * 0.03);

      let velX = (point.x - prev.x) * segmentDamping;
      let velY = (point.y - prev.y) * segmentDamping;
      let velZ = (point.z - prev.z) * segmentDamping;
      const velLen = Math.hypot(velX, velY, velZ);
      if (velLen > maxVel) {
        const scale = maxVel / velLen;
        velX *= scale;
        velY *= scale;
        velZ *= scale;
      }

      prev.copy(point);

      const scrollDepth = depthFactor * depthFactor;
      const scrollDrag = scrollInfluence * scrollDepth * dt;
      const scrollCurrentX = scrollDrag * (3.1 + depthFactor * 2.0) * Math.sin(segPhase * 0.85);
      const scrollCurrentY = scrollDrag * (4.8 + depthFactor * 4.0);
      const scrollCurrentZ = scrollDrag * (2.3 + depthFactor * 1.5) * Math.cos(segPhase * 0.9 + 0.4);

      const gravity = dt * (0.2 + depthFactor * 0.34 - loosenessBoost * 0.04);
      const buoyancy = dt * depthFactor * depthFactor * (0.02 + loosenessBoost * 0.012);

      const waveAmp = waveStrength * depthFactor * dt * waveScale;
      const travelPhase = time * waveFreq - i * segmentWave + this.phase;
      const undulateX = Math.sin(travelPhase) * waveAmp;
      const undulateZ = Math.cos(travelPhase * 1.08 + 0.5) * waveAmp * (0.82 + loosenessBoost * 0.2);
      const ripple =
        Math.sin(time * (0.38 + loosenessBoost * 0.3) + segPhase + depthFactor * 2.2) *
        waveAmp *
        (0.42 + loosenessBoost * 0.34);
      const rippleMixX = 0.62 + loosenessBoost * 0.28;
      const rippleMixZ = 0.58 + loosenessBoost * 0.26;

      point.x += velX + undulateX + ripple * rippleMixX + scrollCurrentX;
      point.y += velY - gravity + buoyancy - scrollCurrentY;
      point.z += velZ + undulateZ + ripple * rippleMixZ + scrollCurrentZ;

      if (loosenessBoost > 0) {
        const secondaryPhase = time * 0.52 - i * 0.44 + this.phase * 1.15;
        const secondaryAmp = waveAmp * 0.62;
        point.x += Math.sin(secondaryPhase) * secondaryAmp;
        point.z += Math.cos(secondaryPhase * 1.08 + 0.35) * secondaryAmp * 0.86;
      }
    }

    for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
      for (let i = 0; i < this.points.length - 1; i++) {
        const p1 = this.points[i];
        const p2 = this.points[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = p2.z - p1.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001;
        const diff = ((dist - segmentLength) / dist) * CONSTRAINT_STIFFNESS;
        const cx = dx * diff;
        const cy = dy * diff;
        const cz = dz * diff;
        if (i !== 0) {
          p1.x += cx;
          p1.y += cy;
          p1.z += cz;
        }
        p2.x -= cx;
        p2.y -= cy;
        p2.z -= cz;
      }
      this.points[0].copy(anchorWorld);
    }

    for (let i = 1; i < this.points.length; i++) {
      const point = this.points[i];
      const parent = this.points[i - 1];
      const maxY = parent.y + segmentLength * (0.05 + loosenessBoost * 0.1);
      if (point.y > maxY) {
        point.y = THREE.MathUtils.lerp(point.y, maxY, Math.max(0.05, 0.06 - loosenessBoost * 0.025));
      }
    }

    let corrupted = !isFiniteVec3(anchorWorld);
    for (let i = 1; i < this.points.length; i++) {
      if (!isFiniteVec3(this.points[i])) corrupted = true;
    }
    if (corrupted) this.resetChain(anchorWorld, segmentLength);

    this.writeGeometry();
  }

  private buildFrame(
    prev: THREE.Vector3,
    next: THREE.Vector3,
    tangent: THREE.Vector3,
    normal: THREE.Vector3,
    binormal: THREE.Vector3
  ): boolean {
    tangent.subVectors(next, prev);
    if (!Number.isFinite(tangent.x) || tangent.lengthSq() < 1e-10) {
      tangent.set(0, -1, 0);
    }
    tangent.normalize();

    const upRef = Math.abs(tangent.dot(UP)) > 0.92 ? FALLBACK_UP : UP;
    normal.crossVectors(upRef, tangent);
    if (normal.lengthSq() < 1e-10) normal.crossVectors(FALLBACK_UP, tangent);
    if (normal.lengthSq() < 1e-10) normal.set(1, 0, 0);
    normal.normalize();

    binormal.crossVectors(tangent, normal);
    if (binormal.lengthSq() < 1e-10) binormal.crossVectors(tangent, FALLBACK_UP);
    if (binormal.lengthSq() < 1e-10) binormal.set(0, 0, 1);
    binormal.normalize();

    return (
      Number.isFinite(normal.x) &&
      Number.isFinite(binormal.x) &&
      Number.isFinite(tangent.x)
    );
  }

  private writeGeometry() {
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const tangent = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const binormal = new THREE.Vector3();
    const offset = new THREE.Vector3();
    const count = this.points.length;

    for (let i = 0; i < count; i++) {
      const prev = this.points[Math.max(0, i - 1)];
      const next = this.points[Math.min(count - 1, i + 1)];
      const point = this.points[i];

      const t = i / Math.max(1, count - 1);
      const rootMask = t <= 0 ? 0 : Math.min(1, t / 0.11);
      const rootSmooth = rootMask * rootMask * (3 - 2 * rootMask);
      const radius = this.baseRadius * (1 - t * 0.75) * rootSmooth;

      if (!isFiniteVec3(point) || !isFiniteVec3(prev) || !isFiniteVec3(next)) {
        for (let j = 0; j < this.radialSegments; j++) {
          const idx = i * this.radialSegments + j;
          const px = isFiniteVec3(point) ? point.x : prev.x;
          const py = isFiniteVec3(point) ? point.y : prev.y;
          const pz = isFiniteVec3(point) ? point.z : prev.z;
          posAttr.setXYZ(idx, px, py, pz);
        }
        continue;
      }

      if (!this.buildFrame(prev, next, tangent, normal, binormal)) continue;

      for (let j = 0; j < this.radialSegments; j++) {
        const angle = (j / this.radialSegments) * Math.PI * 2;
        offset
          .copy(normal)
          .multiplyScalar(Math.cos(angle) * radius)
          .addScaledVector(binormal, Math.sin(angle) * radius);
        const idx = i * this.radialSegments + j;
        posAttr.setXYZ(idx, point.x + offset.x, point.y + offset.y, point.z + offset.z);
      }
    }

    posAttr.needsUpdate = true;

    let boundsOk = true;
    for (const p of this.points) {
      if (!isFiniteVec3(p)) {
        boundsOk = false;
        break;
      }
    }
    if (boundsOk) {
      this.geometry.computeVertexNormals();
      this.geometry.computeBoundingSphere();
    }
  }

  /** Tip position in world space — useful for spawning flash/particle effects. */
  getTipPosition(target: THREE.Vector3) {
    return target.copy(this.points[this.points.length - 1]);
  }

  dispose() {
    this.geometry.dispose();
  }
}
