import * as THREE from "three";
import vertexShader from "./shaders/planetVertex.glsl";
import fragmentShader from "./shaders/planetFragment.glsl";

export function createPlanet(scene: THREE.Scene) {
    const geometry = new THREE.SphereGeometry(
        2,
        256,
        256
    );
    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            uTime: {
                value: 0
            }
        }
    });
    const planet = new THREE.Mesh(
        geometry,
        material
    );
    scene.add(planet);
    return planet;
}
