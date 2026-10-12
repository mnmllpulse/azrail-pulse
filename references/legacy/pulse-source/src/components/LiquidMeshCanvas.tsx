import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useSystemState } from '../contexts/SystemStateContext';

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uPulseIntensity;
  uniform float uDistortionSpeed;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform bool uIsLight;
  varying vec2 vUv;

  // Simple noise function
  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float t = uTime * uDistortionSpeed;
    
    float noise1 = sin(p.x * 3.0 + t) * cos(p.y * 4.0 - t * 0.5);
    float noise2 = sin(p.y * 2.0 - t * 0.8) * cos(p.x * 5.0 + t * 0.3);
    float pulse = sin(t * 2.0) * 0.5 + 0.5;
    pulse *= uPulseIntensity;
    
    float finalNoise = (noise1 + noise2) * 0.5;
    finalNoise += pulse * 0.2;
    
    vec3 color = mix(uColor1, uColor2, finalNoise * 0.5 + 0.5);
    
    if (uIsLight) {
      gl_FragColor = vec4(color, 0.05 + pulse * 0.05);
    } else {
      gl_FragColor = vec4(color, 0.15 + pulse * 0.1);
    }
  }
`;

export const LiquidMeshCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { systemActivity, pulseFrequency, uiPreferences } = useSystemState();
  const isLight = uiPreferences.theme === 'light';
  const simplicityMode = uiPreferences.simplicityMode;

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPulseIntensity: { value: 0 },
    uDistortionSpeed: { value: 0 },
    uColor1: { value: new THREE.Color(uiPreferences.pulsePrimary) },
    uColor2: { value: new THREE.Color(uiPreferences.pulseAccent) },
    uIsLight: { value: isLight }
  }), [isLight]); // We'll update others in frame loop

  useEffect(() => {
    if (simplicityMode || !containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: uniforms,
      transparent: true,
      blending: isLight ? THREE.MultiplyBlending : THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let animationId: number;
    const animate = (time: number) => {
      uniforms.uTime.value = time * 0.001;
      uniforms.uPulseIntensity.value = systemActivity;
      uniforms.uDistortionSpeed.value = pulseFrequency * 0.5;
      uniforms.uColor1.value.set(uiPreferences.pulsePrimary);
      uniforms.uColor2.value.set(uiPreferences.pulseAccent);
      uniforms.uIsLight.value = isLight;

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [systemActivity, pulseFrequency, uiPreferences.pulsePrimary, uiPreferences.pulseAccent, isLight, simplicityMode]);

  return <div ref={containerRef} className="fixed inset-0 pointer-events-none z-[-1]" />;
};
