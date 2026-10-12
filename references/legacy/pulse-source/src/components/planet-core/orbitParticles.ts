import * as THREE from "three";

export interface OrbitParticle {
    mesh: THREE.Mesh;
    angle: number;
    radius: number;
}

export function createOrbitParticles(scene: THREE.Scene) {
    const group = new THREE.Group();
    const particles: OrbitParticle[] = [];

    for (let i = 0; i < 12; i++) {
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.015, 16, 16),
            new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                transparent: true,
                opacity: 1.0
            })
        );
        
        // Glow effect
        const glowSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 16, 16),
            new THREE.MeshBasicMaterial({
                color: 0xB066FF,
                transparent: true,
                opacity: 0.3
            })
        );
        sphere.add(glowSphere);
        group.add(sphere);
        particles.push({
            mesh: sphere,
            angle: (Math.PI * 2 / 12) * i,
            radius: 2.75 + (Math.random() * 0.45)
        });
    }

    scene.add(group);
    return {
        group,
        particles
    };
}
