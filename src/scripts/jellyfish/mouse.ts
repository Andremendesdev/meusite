import * as THREE from 'three';

const scratchVector = new THREE.Vector3();

/**
 * Tracks cursor position in normalized device coordinates and exposes
 * helpers to project it into world space (for head look-at) and to test
 * proximity against a DOM element (for the CTA "come closer" behaviour).
 * Only ever instantiated on fine-pointer devices; callers should not
 * construct this on touch devices.
 */
export class MouseController {
  private ndcX = 0;
  private ndcY = 0;
  private clientX = window.innerWidth / 2;
  private clientY = window.innerHeight / 2;
  private hasMoved = false;
  private onMove = (e: MouseEvent) => {
    this.clientX = e.clientX;
    this.clientY = e.clientY;
    this.ndcX = (e.clientX / window.innerWidth) * 2 - 1;
    this.ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
    this.hasMoved = true;
  };

  constructor() {
    window.addEventListener('mousemove', this.onMove, { passive: true });
  }

  /** Projects the cursor onto a plane at the given world-space Z depth. */
  getWorldTarget(camera: THREE.PerspectiveCamera, planeZ: number): THREE.Vector3 | null {
    if (!this.hasMoved) return null;
    scratchVector.set(this.ndcX, this.ndcY, 0.5).unproject(camera);
    const dir = scratchVector.sub(camera.position).normalize();
    const distance = (planeZ - camera.position.z) / dir.z;
    return camera.position.clone().add(dir.multiplyScalar(distance));
  }

  /** True when the cursor sits within `thresholdPx` of the element's center. */
  isNearElement(el: HTMLElement | null, thresholdPx = 260): boolean {
    if (!el || !this.hasMoved) return false;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = this.clientX - cx;
    const dy = this.clientY - cy;
    return Math.sqrt(dx * dx + dy * dy) < thresholdPx;
  }

  destroy() {
    window.removeEventListener('mousemove', this.onMove);
  }
}
