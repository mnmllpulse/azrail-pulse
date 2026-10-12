export const PLANET_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const PLANET_FRAGMENT = `
  uniform vec3 color;
  uniform vec3 rimColor;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    // Мягкое затенение
    float dotProduct = max(dot(normal, vec3(0.5, 0.5, 1.0)), 0.0);
    
    // Rim light (свечение по краям)
    float rim = 1.0 - max(dot(viewDir, normal), 0.0);
    rim = pow(rim, 4.0);
    
    vec3 finalColor = mix(color, rimColor, rim * 0.5);
    finalColor += rimColor * rim;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const ATMOSPHERE_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const ATMOSPHERE_FRAGMENT = `
  uniform vec3 color;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    float intensity = pow(0.7 - dot(normal, viewDir), 6.0);
    gl_FragColor = vec4(color, intensity);
  }
`;
