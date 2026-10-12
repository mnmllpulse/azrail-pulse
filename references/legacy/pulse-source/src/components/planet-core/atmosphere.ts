import * as THREE from "three";

const ATMOSPHERE_VERTEX = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const ATMOSPHERE_FRAGMENT = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform vec3 uColor;
    
    void main() {
        float dotNV = dot(vNormal, vec3(0, 0, 1.0));
        float intensity = pow(0.65 - dotNV, 3.5) * 1.2;
        float rim = pow(max(1.0 - dotNV, 0.0), 4.0) * 0.8;
        
        float alpha = clamp(intensity + rim, 0.0, 0.85);
        gl_FragColor = vec4(uColor, alpha);
    }
`;

export function createAtmosphere(scene: THREE.Scene) {
    const geometry = new THREE.SphereGeometry(2.12, 128, 128);
    const material = new THREE.ShaderMaterial({
        vertexShader: ATMOSPHERE_VERTEX,
        fragmentShader: ATMOSPHERE_FRAGMENT,
        uniforms: {
            uColor: { value: new THREE.Color(0xa855f7) }
        },
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const atmosphere = new THREE.Mesh(geometry, material);
    scene.add(atmosphere);
    return atmosphere;
}
