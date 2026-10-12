import * as THREE from "three";

export function createStars(scene: THREE.Scene) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const sizes = [];

    for (let i = 0; i < 400; i++) {
        const x = (Math.random() - 0.5) * 50;
        const y = (Math.random() - 0.5) * 50;
        const z = (Math.random() - 0.5) * 50;
        
        // Don't place stars inside the planet area
        if (Math.sqrt(x*x + y*y + z*z) < 10) continue;

        vertices.push(x, y, z);
        sizes.push(Math.random());
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        color: 0x7B4DFF,
        size: 0.04,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });

    const stars = new THREE.Points(geometry, material);
    scene.add(stars);
    return stars;
}
