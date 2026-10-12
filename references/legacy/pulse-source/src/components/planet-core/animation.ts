import * as THREE from "three";
import { animateOrbit } from "./orbitAnimation";
import { OrbitParticle } from "./orbitParticles";

export function animate(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    planet: THREE.Mesh,
    rings: THREE.Group,
    atmosphere: THREE.Mesh,
    pulse: THREE.Mesh | THREE.Line,
    orbit: { group: THREE.Group; particles: OrbitParticle[] },
    composer?: any
) {
    let animationId: number;
    const clock = new THREE.Clock();
    
    // API State
    const state = {
        mode: 'idle',
        speedMultiplier: 1.0,
        pulseIntensity: 1.0
    };

    function loop() {
        animationId = requestAnimationFrame(loop);
        const elapsed = clock.getElapsedTime();

        // 1. Planet logic
        const targetRotationSpeed = 0.0002 * state.speedMultiplier; // Slower rotation
        planet.rotation.y += targetRotationSpeed;
        
        // Breathing effect (Live Respiration - Cubic Bezier like sine wave)
        const breathingPhase = Math.sin(elapsed * 0.4);
        const breathingScale = 1.0 + breathingPhase * 0.02; // A=0.02, B=0.4
        planet.scale.set(breathingScale, breathingScale, breathingScale);

        if (planet.material instanceof THREE.ShaderMaterial) {
            planet.material.uniforms.uTime.value = elapsed;
        }

        // 2. Rings
        rings.rotation.z += 0.00012 * state.speedMultiplier;
        rings.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
                if (child.material.uniforms.uTime) {
                    child.material.uniforms.uTime.value = elapsed;
                }
            }
        });

        // 3. Atmosphere (Synchronized Breathing)
        atmosphere.rotation.y += 0.00055;
        const atmosBreathingScale = 1.02 + breathingPhase * 0.03;
        atmosphere.scale.set(atmosBreathingScale, atmosBreathingScale, atmosBreathingScale);

        // 4. Pulse
        if (pulse.material instanceof THREE.ShaderMaterial) {
            pulse.material.uniforms.uTime.value = elapsed;
        }

        // 5. Orbit Particles
        if (orbit && orbit.particles) {
            animateOrbit(orbit.particles, elapsed);
        }

        // 6. Camera Floating
        const camRange = 0.15;
        camera.position.x = Math.sin(elapsed * 0.4) * camRange;
        camera.position.y = Math.cos(elapsed * 0.4) * camRange;
        camera.lookAt(0, 0, 0);

        if (composer) {
            composer.render();
        } else {
            renderer.render(scene, camera);
        }
    }

    loop();

    // Return control API
    return {
        stop: () => cancelAnimationFrame(animationId),
        setMode: (mode: string) => {
            state.mode = mode;
            switch(mode) {
                case 'thinking':
                    state.speedMultiplier = 2.5;
                    state.pulseIntensity = 2.0;
                    break;
                case 'speaking':
                    state.speedMultiplier = 1.2;
                    state.pulseIntensity = 1.5;
                    break;
                case 'idle':
                default:
                    state.speedMultiplier = 1.0;
                    state.pulseIntensity = 1.0;
                    break;
            }
        }
    };
}
