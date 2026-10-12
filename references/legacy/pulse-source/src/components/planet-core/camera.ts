import * as THREE from "three";
import { CONFIG } from "./config";

export function createCamera(){
    const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = CONFIG.cameraDistance;
    return camera;
}
