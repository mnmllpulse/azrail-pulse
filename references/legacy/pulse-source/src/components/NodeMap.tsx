import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useSystemState } from '../contexts/SystemStateContext';

export const NodeMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeNodes, systemActivity, uiPreferences } = useSystemState();
  const isLight = uiPreferences.theme === 'light';

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    camera.position.z = 5;

    // Create central core
    const coreGeometry = new THREE.IcosahedronGeometry(1, 2);
    const coreMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(uiPreferences.pulsePrimary),
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(core);

    // Create nodes
    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);

    const nodes: THREE.Mesh[] = [];
    const nodeGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const nodeMaterial = new THREE.MeshBasicMaterial({ 
      color: new THREE.Color(uiPreferences.pulseAccent) 
    });

    const updateNodes = () => {
      // Clear existing nodes
      while(nodeGroup.children.length > 0){ 
        nodeGroup.remove(nodeGroup.children[0]); 
      }
      nodes.length = 0;

      for (let i = 0; i < activeNodes; i++) {
        const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
        const phi = Math.acos(-1 + (2 * i) / activeNodes);
        const theta = Math.sqrt(activeNodes * Math.PI) * phi;
        
        node.position.setFromSphericalCoords(2.5, phi, theta);
        nodeGroup.add(node);
        nodes.push(node);

        // Add connection lines
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          node.position
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ 
          color: new THREE.Color(uiPreferences.pulsePrimary),
          transparent: true,
          opacity: 0.2
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        nodeGroup.add(line);
      }
    };

    updateNodes();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    let animationId: number;
    const animate = (time: number) => {
      core.rotation.y += 0.01 * (1 + systemActivity);
      core.rotation.z += 0.005;
      nodeGroup.rotation.y -= 0.005 * (1 + systemActivity);
      
      const pulse = Math.sin(time * 0.002) * 0.1 + 0.9;
      core.scale.set(pulse, pulse, pulse);

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);
    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      coreGeometry.dispose();
      coreMaterial.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      renderer.dispose();
    };
  }, [activeNodes, systemActivity, uiPreferences.pulsePrimary, uiPreferences.pulseAccent]);

  return <div ref={containerRef} className="w-full h-full min-h-[300px]" />;
};
