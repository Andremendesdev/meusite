import * as THREE from 'three';

export interface JellyfishScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  ambient: THREE.AmbientLight;
  key: THREE.PointLight;
  rim: THREE.PointLight;
}

/** Builds the base scene graph: camera, fog, and the neon key/rim lights. */
export function createJellyfishScene(aspect: number): JellyfishScene {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000610, 0.115);

  const camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);
  camera.position.set(0, 0, 9);

  const ambient = new THREE.AmbientLight(0x061220, 0.14);

  const key = new THREE.PointLight(0xc06cd8, 0.92, 24, 2);
  key.position.set(1.8, 2.2, 5.0);

  const rim = new THREE.PointLight(0x0a1c32, 0.05, 22, 2);
  rim.position.set(-3, -2.2, -3.5);

  scene.add(ambient, key, rim);

  return { scene, camera, ambient, key, rim };
}
