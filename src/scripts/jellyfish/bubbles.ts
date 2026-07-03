import * as THREE from 'three';
import type { JellyfishState } from './states';

/** World Z plane where bubbles live — same depth band as the jellyfish. */
export const BUBBLE_PLANE_Z = 0;

interface Bubble {
  x: number;
  y: number;
  z: number;
  vy: number;
}

function createBubbleTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  const body = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.46);
  body.addColorStop(0, 'rgba(255,255,255,0.45)');
  body.addColorStop(0.5, 'rgba(200,240,255,0.2)');
  body.addColorStop(1, 'rgba(34,211,238,0)');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.44, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.36, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(cx - 9, cy - 10, 5.5, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Rising bubbles spawned along the bottom of the viewport, floating straight up.
 */
export class BubbleField {
  readonly object = new THREE.Group();
  private readonly count: number;
  private readonly bubbles: Bubble[] = [];
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.PointsMaterial;
  private readonly texture: THREE.CanvasTexture;
  private readonly points: THREE.Points;
  private boundsWidth = 12;
  private boundsHeight = 8;
  private initialized = false;
  private readonly tintScratch = new THREE.Color('#e8f8ff');

  constructor(count: number) {
    this.count = count;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.bubbles.push({ x: 0, y: -999, z: BUBBLE_PLANE_Z, vy: 0.13 });
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.texture = createBubbleTexture();
    this.material = new THREE.PointsMaterial({
      size: 0.2,
      map: this.texture,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      color: new THREE.Color('#e8f8ff'),
      opacity: 0.82,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    this.object.add(this.points);
  }

  private updateBounds(camera: THREE.PerspectiveCamera) {
    const distance = camera.position.z - BUBBLE_PLANE_Z;
    const vFov = (camera.fov * Math.PI) / 180;
    this.boundsHeight = 2 * Math.tan(vFov / 2) * distance;
    this.boundsWidth = this.boundsHeight * camera.aspect;
  }

  private respawn(bubble: Bubble, camera: THREE.PerspectiveCamera, yOffset = 0) {
    const marginX = this.boundsWidth * 0.46;
    bubble.x = camera.position.x + (Math.random() - 0.5) * marginX * 2;
    bubble.y = camera.position.y - this.boundsHeight * 0.5 + yOffset;
    bubble.z = BUBBLE_PLANE_Z + (Math.random() - 0.5) * 1.8;
    bubble.vy = 0.1 + Math.random() * 0.12;
  }

  private seedInitial(camera: THREE.PerspectiveCamera) {
    for (let i = 0; i < this.count; i++) {
      const spread = Math.random() * this.boundsHeight * 0.95;
      this.respawn(this.bubbles[i], camera, spread);
    }
    this.initialized = true;
  }

  update(
    dt: number,
    _time: number,
    state: JellyfishState,
    camera: THREE.PerspectiveCamera,
    scrollProgress: number,
    mouseWorld: THREE.Vector3 | null = null
  ) {
    this.updateBounds(camera);
    if (!this.initialized) this.seedInitial(camera);

    const positions = this.geometry.attributes.position as THREE.BufferAttribute;
    const depthMix = Math.min(1, state.waterDepth + scrollProgress * 0.35);
    const intensity = THREE.MathUtils.clamp(
      0.45 + state.waterIntensity * 0.4 + depthMix * 0.35,
      0.35,
      1.4
    );
    const motion = dt > 0 ? 1 : 0;

    const bottom = camera.position.y - this.boundsHeight * 0.5;
    const top = camera.position.y + this.boundsHeight * 0.5;
    const marginX = this.boundsWidth * 0.48;
    const repulseRadius = 1.55;
    const repulseRadiusSq = repulseRadius * repulseRadius;

    for (let i = 0; i < this.count; i++) {
      const bubble = this.bubbles[i];

      if (bubble.y < bottom - 0.5 || bubble.y > top + 0.5) {
        this.respawn(bubble, camera);
      }

      bubble.y += bubble.vy * dt * motion;

      if (mouseWorld && motion > 0) {
        const dx = bubble.x - mouseWorld.x;
        const dy = bubble.y - mouseWorld.y;
        const dz = bubble.z - mouseWorld.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < repulseRadiusSq && distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const push = ((1 - dist / repulseRadius) ** 1.6) * 3.6 * dt;
          bubble.x += (dx / dist) * push;
          bubble.y += (dy / dist) * push * 0.35;
          bubble.z += (dz / dist) * push * 0.85;
        }
      }

      const minX = camera.position.x - marginX;
      const maxX = camera.position.x + marginX;
      bubble.x = THREE.MathUtils.clamp(bubble.x, minX, maxX);

      if (bubble.y > top) {
        this.respawn(bubble, camera);
      }

      positions.setXYZ(i, bubble.x, bubble.y, bubble.z);
    }

    positions.needsUpdate = true;
    this.geometry.computeBoundingSphere();

    this.material.opacity = THREE.MathUtils.clamp(0.55 + intensity * 0.32, 0.5, 0.95);
    this.material.size = 0.16 + intensity * 0.08;
    this.material.color.copy(this.tintScratch).lerp(state.bellColor, depthMix * 0.12);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
