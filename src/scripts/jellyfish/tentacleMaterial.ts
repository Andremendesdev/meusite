import * as THREE from 'three';

const TENTACLE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const TENTACLE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uEmissive;
  uniform float uEmissiveIntensity;
  uniform float uOpacity;
  uniform float uRootFade;
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float ndv = abs(dot(normalize(vNormal), viewDir));
    float fresnel = pow(1.0 - ndv, 1.8);

    // vUv.y = 0 na junção com a campânula — dissolve a entrada do tentáculo
    float along = vUv.y;
    float rootAlpha = mix(0.55, 1.0, smoothstep(0.0, uRootFade, along));
    // Fade tips slightly
    float tipFade = smoothstep(1.0, 0.72, along);

    vec3 base = uColor * (0.68 + fresnel * 0.95);
    vec3 tint = uEmissive * uEmissiveIntensity * (0.52 + fresnel * 0.58);

    float streak = sin(along * 28.0 - uTime * 2.8 + vUv.x * 18.0) * 0.5 + 0.5;
    float whiteSpec = pow(fresnel, 3.2) * streak * (0.22 + uEmissiveIntensity * 0.18);
    float tipGlint = pow(fresnel, 5.0) * tipFade * 0.16;

    vec3 col = base + tint + vec3(1.0) * (whiteSpec + tipGlint);

    float alpha = uOpacity * rootAlpha * tipFade * (0.42 + fresnel * 0.52);
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(col, alpha);
  }
`;

/** Material translúcido com fade na raiz (junção com a campânula). */
export function createTentacleMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color('#d855f7') },
      uEmissive: { value: new THREE.Color('#f0abfc') },
      uEmissiveIntensity: { value: 0.58 },
      uOpacity: { value: 0.52 },
      uRootFade: { value: 0.18 },
      uTime: { value: 0 },
    },
    vertexShader: TENTACLE_VERTEX,
    fragmentShader: TENTACLE_FRAGMENT,
  });
}
