import * as THREE from "three";

const RING_VERTEX = `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

const RING_FRAGMENT = `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    uniform float uTime;

    void main() {
        // Radial distance from ring center (UV center is 0.5, 0.5)
        vec2 st = vUv - vec2(0.5);
        float r = length(st) * 2.0; // 0.0 at center, 1.0 at outer edge

        // Ring inner/outer bounds
        if (r < 0.55 || r > 0.98) discard;

        // Concentric ring grooves (Saturn gap style)
        float ringPattern = sin(r * 110.0) * 0.5 + 0.5;
        float mainBand = smoothstep(0.55, 0.62, r) * smoothstep(0.98, 0.85, r);

        // Core bright glowing streak (Image 2 style)
        float coreBeam = smoothstep(0.72, 0.76, r) * smoothstep(0.80, 0.76, r);
        float outerLine = smoothstep(0.91, 0.93, r) * smoothstep(0.95, 0.93, r);

        vec3 darkPurple  = vec3(0.25, 0.08, 0.55);
        vec3 neonViolet  = vec3(0.68, 0.32, 0.98); // #a855f7
        vec3 brightCyan  = vec3(0.38, 0.85, 1.0);  // #38bdf8
        vec3 coreWhite   = vec3(0.96, 0.94, 1.0);

        vec3 ringColor = mix(darkPurple, neonViolet, ringPattern * 0.8);
        ringColor = mix(ringColor, brightCyan, coreBeam * 0.8 + outerLine * 0.6);
        ringColor += coreWhite * pow(coreBeam, 1.5) * 1.8;

        float alpha = (mainBand * 0.75 + coreBeam * 0.5 + outerLine * 0.4);
        gl_FragColor = vec4(ringColor, alpha);
    }
`;

export function createRings(scene: THREE.Scene) {
    const group = new THREE.Group();

    // 1. Thick Neon Ring Disc (Image 2 style)
    const ringGeo = new THREE.RingGeometry(2.7, 4.3, 128);
    const ringMat = new THREE.ShaderMaterial({
        vertexShader: RING_VERTEX,
        fragmentShader: RING_FRAGMENT,
        uniforms: {
            uTime: { value: 0 }
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const mainRing = new THREE.Mesh(ringGeo, ringMat);
    mainRing.rotation.x = Math.PI / 2.3;
    mainRing.rotation.y = 0.2;
    group.add(mainRing);

    // 2. Fine Orbit Accent Line Loops
    const ringConfigs = [
        { rx: 3.1, ry: 3.1, rot: [Math.PI / 2.3, 0.2, 0], color: 0xc084fc, opacity: 0.5 },
        { rx: 4.5, ry: 4.5, rot: [Math.PI / 2.2, 0.15, 0.1], color: 0x38bdf8, opacity: 0.35 }
    ];

    ringConfigs.forEach(config => {
        const curve = new THREE.EllipseCurve(0, 0, config.rx, config.rx, 0, 2 * Math.PI, false, 0);
        const points = curve.getPoints(256);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const material = new THREE.LineBasicMaterial({
            color: config.color,
            transparent: true,
            opacity: config.opacity,
            blending: THREE.AdditiveBlending
        });

        const ringLine = new THREE.LineLoop(geometry, material);
        ringLine.rotation.set(config.rot[0], config.rot[1], config.rot[2]);
        group.add(ringLine);
    });

    scene.add(group);
    return group;
}
