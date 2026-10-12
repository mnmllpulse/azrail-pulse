import { CONFIG } from "./config";
import { createScene } from "./scene";
import { createCamera } from "./camera";
import { createRenderer } from "./renderer";
import { createPlanet } from "./planet";
import { createLights } from "./lights";
import { createAtmosphere } from "./atmosphere";
import { createRings } from "./rings";
import { createPulse } from "./pulse";
import { createStars } from "./stars";
import { createOrbitParticles } from "./orbitParticles";
import { createComposer } from "./postprocessing";
import { animate } from "./animation";
import * as THREE from 'three';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';

export class PlanetCore {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private container: HTMLElement;
  private planet: THREE.Mesh;
  private rings: THREE.Group;
  private atmosphere: THREE.Mesh;
  private pulse: THREE.Mesh | THREE.Line;
  private orbit: any;
  private api?: { setMode: (mode: string) => void };
  private stopAnimation?: () => void;
  private resizeHandler: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = createScene();
    this.camera = createCamera();
    this.renderer = createRenderer();
    this.composer = createComposer(this.renderer, this.scene, this.camera);

    // Append to container
    this.container.appendChild(this.renderer.domElement);

    // Add objects
    createLights(this.scene);
    this.planet = createPlanet(this.scene);
    this.atmosphere = createAtmosphere(this.scene);
    this.rings = createRings(this.scene);
    this.pulse = createPulse(this.scene);
    this.orbit = createOrbitParticles(this.scene);
    this.orbit.group.rotation.x = Math.PI / 2.4; // Align with rings
    createStars(this.scene);

    this.resizeHandler = () => this.onResize();
    this.init();
  }

  private init() {
    const controls = animate(
      this.renderer,
      this.scene,
      this.camera,
      this.planet,
      this.rings,
      this.atmosphere,
      this.pulse,
      this.orbit,
      this.composer
    );

    this.api = controls;
    this.stopAnimation = controls.stop;

    window.addEventListener('resize', this.resizeHandler);
    this.onResize(); // Initial resize
  }

  public setMode(mode: 'idle' | 'thinking' | 'speaking') {
    this.api?.setMode(mode);
  }

  private onResize() {
    const rect = this.container.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  public destroy() {
    if (this.stopAnimation) this.stopAnimation();
    window.removeEventListener('resize', this.resizeHandler);
    
    // Dispose composer
    if (this.composer) {
      this.composer.passes.forEach(pass => {
        if ((pass as any).dispose) (pass as any).dispose();
      });
      // @ts-ignore - EffectComposer might not have dispose in some @types versions but it does in implementation
      if (typeof this.composer.dispose === 'function') {
        this.composer.dispose();
      }
    }

    this.renderer.dispose();
    this.scene.traverse((object) => {
      const obj = object as any;
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m: any) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  public getScene() { return this.scene; }
}
