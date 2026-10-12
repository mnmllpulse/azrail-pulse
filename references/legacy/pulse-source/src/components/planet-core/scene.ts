import * as THREE from "three";
import { CONFIG } from "./config";

export function createScene(){
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.background);
    return scene;
}
