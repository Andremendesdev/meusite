import * as THREE from 'three';

const PARTICLE_VERTEX = /* glsl */ `
  attribute float aLife;
  uniform float uSizeScale;

  varying float vLife;

  void main() {
    vLife = aLife;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float emerge = smoothstep(0.0, 0.28, aLife);
    float dissolve = 1.0 - smoothstep(0.72, 1.0, aLife);
    float size = mix(0.6, 12.0, emerge) * dissolve * uSizeScale;
    gl_PointSize = size * (280.0 / max(-mvPosition.z, 0.1));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform vec3 uHotColor;
  uniform float uOpacity;

  varying float vLife;

  void main() {
    float emerge = smoothstep(0.0, 0.24, vLife);
    float dissolve = 1.0 - smoothstep(0.7, 1.0, vLife);
    float alpha = emerge * dissolve;

    vec3 darkCore = vec3(0.015, 0.004, 0.035);
    vec3 lit = mix(uColor, uHotColor, emerge * 0.42);
    vec3 col = mix(darkCore, lit, emerge);

    vec4 tex = texture2D(uMap, gl_PointCoord);
    float a = tex.a * alpha * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(col * tex.rgb, a);
  }
`;

export function createParticleMaterial(map: THREE.Texture, sizeScale = 1): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uMap: { value: map },
      uColor: { value: new THREE.Color('#e879f9') },
      uHotColor: { value: new THREE.Color('#f5d0fe') },
      uOpacity: { value: 0.78 },
      uSizeScale: { value: sizeScale },
    },
    vertexShader: PARTICLE_VERTEX,
    fragmentShader: PARTICLE_FRAGMENT,
  });
}
