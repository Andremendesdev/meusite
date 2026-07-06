import * as THREE from 'three';
import { GALAXY_GLSL } from './galaxy.glsl';

const NEON = '#c994e8';
const NEON_HOT = '#f0abfc';

const BELL_VERTEX = /* glsl */ `
  uniform vec3 uOrbCenter;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying vec3 vToCore;

  void main() {
    vLocalPos = position;
    vToCore = uOrbCenter - position;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const BELL_FRAGMENT = /* glsl */ `
${GALAXY_GLSL}

  uniform vec3 uColor;
  uniform vec3 uCoreColor;
  uniform vec3 uNeonColor;
  uniform vec3 uOrbCenter;
  uniform float uPulse;
  uniform float uEmissive;
  uniform float uOpacity;
  uniform float uOrbGlow;
  uniform float uBellTop;
  uniform float uBellBottom;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying vec3 vToCore;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float ndv = abs(dot(normalize(vNormal), viewDir));
    float fresnel = pow(1.0 - ndv, 2.2);
    float edgeFresnel = pow(1.0 - ndv, 2.6);

    float heightRange = max(uBellTop - uBellBottom, 0.001);
    float heightNorm = clamp((vLocalPos.y - uBellBottom) / heightRange, 0.0, 1.0);

    // --- Rib lines: vertical meridians from apex to rim ---
    float theta = atan(vLocalPos.z, vLocalPos.x);
    float ribCount = 10.0;
    float rib = pow(max(0.0, cos(theta * ribCount)), 14.0);
    // Ribs are strongest near the top, fade at the very bottom opening
    float ribMask = heightNorm * smoothstep(0.0, 0.18, heightNorm);
    float ribStrength = rib * ribMask * (0.55 + uEmissive * 1.4);
    vec3 ribColor = mix(uNeonColor, uCoreColor, 0.55) * ribStrength;

    vec3 vivid = uColor * (1.1 + heightNorm * 0.18);
    vec3 fill = mix(uColor, uCoreColor, heightNorm * 0.42) * (0.22 + heightNorm * 0.14);
    vec3 body = vivid * (0.24 + fresnel * 0.52);
    vec3 highlightBase = mix(uColor, uCoreColor, heightNorm * 0.52 + fresnel * 0.14);
    vec3 highlight = mix(highlightBase, uNeonColor, edgeFresnel * 0.18) * fresnel * 0.32;

    float pulse = 1.0 + uPulse * 0.32;
    vec3 rim = uNeonColor * edgeFresnel * (0.08 + uEmissive * 0.1) * pulse;

    // --- Inner orb glow ---
    float coreDist = length(vToCore);
    float coreR = (uBellTop - uBellBottom) * 0.62;
    float inner = pow(smoothstep(coreR, 0.0, coreDist), 0.88);

    vec3 toCoreDir = normalize(vToCore);
    float faceCore = max(dot(normalize(vNormal), toCoreDir), 0.0);
    float viewThrough = pow(1.0 - ndv, 1.05);
    float subsurface = pow(faceCore, 1.4) * 0.55 + viewThrough * 0.45;
    float innerMask = inner * subsurface;

    vec3 innerGlow =
      mix(uCoreColor, uNeonColor, innerMask * 0.45) *
      innerMask * (0.52 + uEmissive * 0.72 + uOrbGlow * 0.82) * pulse;

    // --- Reflexos brancos (especular + glints na cúpula) ---
    vec3 n = normalize(vNormal);
    vec3 keyLight = normalize(vec3(-0.42, 0.88, 0.35));
    vec3 fillLight = normalize(vec3(0.55, 0.35, 0.78));
    vec3 halfKey = normalize(keyLight + viewDir);
    vec3 halfFill = normalize(fillLight + viewDir);
    float specKey = pow(max(dot(n, halfKey), 0.0), 56.0);
    float specFill = pow(max(dot(n, halfFill), 0.0), 28.0);
    vec3 specular = vec3(1.0) * (specKey * 0.42 + specFill * 0.16) * (0.55 + uEmissive * 0.35);

    float domeFacing = pow(max(dot(n, normalize(vec3(0.15, 0.92, 0.25))), 0.0), 10.0);
    float domeGlint = domeFacing * smoothstep(0.3, 0.98, heightNorm) * (0.38 + uEmissive * 0.22);

    float shimmer = sin(uTime * 1.8 + theta * 9.0 + heightNorm * 7.0) * 0.5 + 0.5;
    float ribGlint = pow(rib, 10.0) * ribMask * shimmer * (0.28 + uEmissive * 0.18);

    vec3 whiteRim = vec3(1.0) * pow(edgeFresnel, 3.2) * (0.14 + uEmissive * 0.1) * pulse;
    vec3 wetSheen = vec3(1.0) * pow(fresnel, 5.5) * smoothstep(0.25, 0.85, heightNorm) * 0.12;

    vec3 reflections = specular + vec3(domeGlint + ribGlint) + whiteRim + wetSheen;

    float galaxyIntensity = 1.1 + uEmissive * 1.2 + uOrbGlow * 0.35;
    vec3 galaxy = galaxyBellSparkle(vLocalPos, uTime, galaxyIntensity);
    galaxy *= 0.75 + fresnel * 0.35;

    vec3 finalColor = fill + body + highlight + rim + innerGlow + ribColor + reflections;
    finalColor *= 0.55;
    finalColor += galaxy * 1.6;

    float alpha = clamp(
      0.14 + fresnel * uOpacity * 0.52 + edgeFresnel * 0.09 +
      innerMask * 0.14 + ribStrength * 0.06 + specKey * 0.08 +
      length(galaxy) * 0.12,
      0.13, 0.82
    );

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const ORB_VERTEX = /* glsl */ `
  uniform vec3 uOrbCenter;

  varying vec3 vLocalPos;
  varying float vDist;

  void main() {
    vLocalPos = position;
    vDist = length(position - uOrbCenter);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ORB_CORE_FRAGMENT = /* glsl */ `
${GALAXY_GLSL}

  uniform vec3 uCoreColor;
  uniform vec3 uNeonColor;
  uniform float uOrbRadius;
  uniform float uPulse;
  uniform float uEmissive;
  uniform float uTime;

  varying vec3 vLocalPos;
  varying float vDist;

  void main() {
    float d = vDist;
    float r = uOrbRadius;
    float soft = smoothstep(r * 1.4, r * 0.02, d);
    float hot = smoothstep(r * 0.62, 0.0, d);

    float pulse = 1.0 + uPulse * 0.52;
    float strength = 0.72 + uEmissive * 0.88;

    // White-hot center blending out to neon color
    vec3 coreHot = mix(uNeonColor, vec3(1.0, 0.88, 0.96), hot * 0.72);
    vec3 color = mix(coreHot, uCoreColor, soft * (1.0 - hot)) * (0.78 + hot * 1.1) * strength * pulse;
    vec3 galaxy = galaxyBellSparkle(vLocalPos, uTime, 1.2 + uEmissive * 0.9) * hot;
    color += galaxy * 1.4;
    float alpha = soft * (0.32 + hot * 0.52) * strength * pulse;

    gl_FragColor = vec4(color, alpha);
  }
`;

// Parameterized vertex for contour + halo layers
const BELL_CONTOUR_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;

  uniform float uInflation;

  void main() {
    vLocalPos = position;
    vec3 n = normalize(normalMatrix * normal);
    vNormal = n;
    vec3 inflated = position + normal * uInflation;
    vec4 worldPos = modelMatrix * vec4(inflated, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const BELL_CONTOUR_FRAGMENT = /* glsl */ `
${GALAXY_GLSL}

  uniform vec3 uNeonColor;
  uniform float uPulse;
  uniform float uEmissive;
  uniform float uIntensity;
  uniform float uBellTop;
  uniform float uBellBottom;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float ndv = abs(dot(normalize(vNormal), viewDir));
    float rim = 1.0 - ndv;

    float heightRange = max(uBellTop - uBellBottom, 0.001);
    float heightNorm = clamp((vLocalPos.y - uBellBottom) / heightRange, 0.0, 1.0);
    float bottomBias = smoothstep(0.55, 0.98, heightNorm);

    float outer = smoothstep(0.08, 0.88, rim);
    float innerHole = smoothstep(0.02, 0.34, rim);
    float halo = pow(outer * innerHole, 1.08);
    halo = max(halo, bottomBias * smoothstep(0.12, 0.72, rim) * 0.48);

    float pulse = 1.0 + uPulse * 0.28;
    float strength = uIntensity * (0.72 + uEmissive * 0.46) * pulse;

    float alpha = halo * strength;
    if (alpha < 0.006) discard;

    float theta = atan(vLocalPos.z, vLocalPos.x);
    float glint = pow(halo, 2.2) * (0.55 + 0.45 * sin(uTime * 2.4 + theta * 6.0));
    vec3 galaxy = galaxyBellSparkle(vLocalPos, uTime, 0.9 + uEmissive * 0.85) * (0.5 + halo);
    vec3 shadow = mix(uNeonColor, vec3(1.0), glint * 0.42) * (0.28 + halo * 0.52) + galaxy;
    gl_FragColor = vec4(shadow, alpha);
  }
`;

const ORB_RADIANCE_FRAGMENT = /* glsl */ `
  uniform vec3 uNeonColor;
  uniform float uOrbRadius;
  uniform float uIntensity;
  uniform float uPulse;
  uniform float uEmissive;

  varying float vDist;

  void main() {
    float radial = vDist / uOrbRadius;
    float outer = smoothstep(1.12, 0.58, radial);
    float inner = smoothstep(0.06, 0.38, radial);
    float bloom = pow(outer * inner, 1.25);

    float pulse = 1.0 + uPulse * 0.5;
    float strength = uIntensity * (0.45 + uEmissive * 0.22) * pulse;
    float alpha = bloom * strength * 0.72;
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(uNeonColor * (0.52 + uEmissive * 0.1), alpha);
  }
`;

function orbUniforms(orbCenterY: number, orbRadius: number) {
  return {
    uOrbCenter: { value: new THREE.Vector3(0, orbCenterY, 0) },
    uOrbRadius: { value: orbRadius },
    uNeonColor: { value: new THREE.Color(NEON) },
    uCoreColor: { value: new THREE.Color(NEON_HOT) },
    uPulse: { value: 0 },
    uEmissive: { value: 0.7 },
    uTime: { value: 0 },
  };
}

export function createBellShellMaterial(
  bellTop: number,
  bellBottom: number,
  orbCenterY: number
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: BELL_VERTEX,
    fragmentShader: BELL_FRAGMENT,
    uniforms: {
      uColor: { value: new THREE.Color('#e879f9') },
      uCoreColor: { value: new THREE.Color('#fce7ff') },
      uNeonColor: { value: new THREE.Color(NEON) },
      uOrbCenter: { value: new THREE.Vector3(0, orbCenterY, 0) },
      uPulse: { value: 0 },
      uEmissive: { value: 0.7 },
      uOpacity: { value: 0.72 },
      uOrbGlow: { value: 1.1 },
      uBellTop: { value: bellTop },
      uBellBottom: { value: bellBottom },
      uTime: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

export function createOrbCoreMaterial(orbCenterY: number, orbRadius: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: ORB_VERTEX,
    fragmentShader: ORB_CORE_FRAGMENT,
    uniforms: orbUniforms(orbCenterY, orbRadius),
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
}

export function createBellContourMaterial(
  bellTop: number,
  bellBottom: number,
  inflation = 0.12
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: BELL_CONTOUR_VERTEX,
    fragmentShader: BELL_CONTOUR_FRAGMENT,
    uniforms: {
      uNeonColor: { value: new THREE.Color(NEON) },
      uPulse: { value: 0 },
      uEmissive: { value: 0.7 },
      uIntensity: { value: inflation > 0.2 ? 0.22 : 0.18 },
      uInflation: { value: inflation },
      uBellTop: { value: bellTop },
      uBellBottom: { value: bellBottom },
      uTime: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

export function createOrbRadianceMaterial(
  orbCenterY: number,
  shellRadius: number,
  intensity: number
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: ORB_VERTEX,
    fragmentShader: ORB_RADIANCE_FRAGMENT,
    uniforms: {
      uOrbCenter: { value: new THREE.Vector3(0, orbCenterY, 0) },
      uOrbRadius: { value: shellRadius },
      uNeonColor: { value: new THREE.Color(NEON) },
      uIntensity: { value: intensity },
      uPulse: { value: 0 },
      uEmissive: { value: 0.7 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** @deprecated use createOrbCoreMaterial */
export const createBellCoreMaterial = createOrbCoreMaterial;

/** @deprecated use createOrbRadianceMaterial */
export const createOrbHaloMaterial = (orbCenterY: number, shellRadius: number) =>
  createOrbRadianceMaterial(orbCenterY, shellRadius, 0.35);
