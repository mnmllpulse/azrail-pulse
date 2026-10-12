import * as THREE from "three";

export function createLights(scene: THREE.Scene){
    const ambient = new THREE.AmbientLight(
        0xffffff,
        0.45
    );
    scene.add(ambient);
    
    const light = new THREE.DirectionalLight(
        0x7B4DFF,
        4
    );
    light.position.set(
        5,
        3,
        5
    );
    scene.add(light);
}
