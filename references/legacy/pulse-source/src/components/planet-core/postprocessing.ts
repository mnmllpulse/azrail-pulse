import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import * as THREE from "three";
import { CONFIG } from "./config";

const ChromaticAberrationShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "amount": { value: 0.0015 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float amount;
        varying vec2 vUv;
        void main() {
            vec2 offset = vec2(amount, 0.0);
            vec4 cr = texture2D(tDiffuse, vUv + offset);
            vec4 cg = texture2D(tDiffuse, vUv);
            vec4 cb = texture2D(tDiffuse, vUv - offset);
            gl_FragColor = vec4(cr.r, cg.g, cb.b, cg.a);
        }
    `
};

export function createComposer(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
) {
    const composer = new EffectComposer(renderer);
    
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        CONFIG.bloom.strength,
        CONFIG.bloom.radius,
        CONFIG.bloom.threshold
    );
    composer.addPass(bloomPass);

    const chromaticPass = new ShaderPass(ChromaticAberrationShader);
    composer.addPass(chromaticPass);

    return composer;
}
