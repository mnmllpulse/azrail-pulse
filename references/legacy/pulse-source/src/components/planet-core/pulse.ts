import * as THREE from "three";
import vertexShader from "./shaders/pulseVertex.glsl";
import fragmentShader from "./shaders/pulseFragment.glsl";

export function createPulse(scene: THREE.Scene) {
    const geometry = new THREE.PlaneGeometry(
        8,
        1
    );
    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
            uTime: {
                value: 0
            }
        },
        vertexShader,
        fragmentShader
    });
    const pulse = new THREE.Mesh(
        geometry,
        material
    );
    pulse.position.z = 2.02;
    pulse.visible = false; // Disabled pulse as requested
    scene.add(pulse);
    return pulse;
}
