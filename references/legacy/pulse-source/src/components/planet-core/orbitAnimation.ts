import { OrbitParticle } from "./orbitParticles";

export function animateOrbit(particles: OrbitParticle[], time: number) {
    particles.forEach((p, index) => {
        const speed = 0.08 + (index * 0.002);
        const angle = p.angle + time * speed;
        p.mesh.position.x = Math.cos(angle) * p.radius;
        p.mesh.position.y = 0;
        p.mesh.position.z = Math.sin(angle) * 1.15;
    });
}
