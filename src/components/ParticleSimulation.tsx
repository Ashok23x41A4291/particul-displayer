import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { SimulationSettings } from '../types';

const createParticleTexture = (shape: 'sphere' | 'cube' | 'star') => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  ctx.clearRect(0, 0, 64, 64);
  
  if (shape === 'sphere') {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  } else if (shape === 'cube') {
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fillRect(12, 12, 40, 40);
  } else if (shape === 'star') {
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.beginPath();
    const cx = 32;
    const cy = 32;
    const spikes = 5;
    const outerRadius = 28;
    const innerRadius = 12;
    
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
};

interface Props {
  settings: SimulationSettings;
  spinTrigger?: number;
  viewAngle?: number;
  topView?: boolean;
}

const ParticleSimulation: React.FC<Props> = ({ settings, spinTrigger = 0, viewAngle = 0, topView = false }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const frameIdRef = useRef<number>(0);
  const settingsRef = useRef(settings);
  const targetRotationRef = useRef<number | null>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);

  const textures = useMemo(() => {
    return {
      sphere: createParticleTexture('sphere'),
      cube: createParticleTexture('cube'),
      star: createParticleTexture('star'),
    };
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
    if (materialRef.current && textures[settings.particleShape]) {
      materialRef.current.map = textures[settings.particleShape];
      materialRef.current.needsUpdate = true;
    }
  }, [settings, textures]);

  useEffect(() => {
    if (spinTrigger > 0 && particlesRef.current) {
      targetRotationRef.current = particlesRef.current.rotation.y + Math.PI * 2;
    }
  }, [spinTrigger]);

  useEffect(() => {
    if (cameraRef.current) {
      const radius = 15;
      if (topView) {
        cameraRef.current.position.set(0, radius, 0);
        cameraRef.current.up.set(0, 0, -1); // Up is -Z so it looks correct from top
        cameraRef.current.lookAt(0, 0, 0);
        cameraRef.current.translateX(5); // Shift camera right so formation appears on the left
      } else {
        const angleRad = (viewAngle * Math.PI) / 180;
        cameraRef.current.position.x = Math.sin(angleRad) * radius;
        cameraRef.current.position.z = Math.cos(angleRad) * radius;
        cameraRef.current.position.y = 0; // Center vertically
        cameraRef.current.up.set(0, 1, 0); // Reset up vector
        cameraRef.current.lookAt(0, 0, 0);
        cameraRef.current.translateX(5); // Shift camera right so formation appears on the left
      }
    }
  }, [viewAngle, topView]);

  const MAX_PARTICLES = 100000;

  useEffect(() => {
    if (particlesRef.current) {
      const colors = particlesRef.current.geometry.attributes.color.array as Float32Array;
      
      const shapePalettes = {
        sphere: [0x00ffff, 0xff00ff], // Cyan/Magenta
        helix: [0x00ff88, 0x0088ff], // Emerald/Blue
        tornado: [0x8a2be2, 0x00ffff], // BlueViolet/Cyan
        galaxy: [0xffaa00, 0xff0055], // Orange/Pink
        cube: [0x00ffcc, 0x0033ff], // Teal/Deep Blue
        torus: [0xff00ff, 0xffaa00], // Magenta/Orange
        wave: [0x0088ff, 0x00ff88], // Blue/Emerald
        implosion: [0xff0000, 0xffaa00], // Red/Orange
      };

      const themePalettes = {
        neon: [0xff00ff, 0x00ffff],
        fire: [0xff4500, 0xffd700],
        ocean: [0x00008b, 0x00ffff],
        monochrome: [0xffffff, 0x444444],
        cyberpunk: [0xfcee0a, 0x00ffcc],
      };

      let palette;
      if (settings.colorPalette === 'default') {
        palette = shapePalettes[settings.shape as keyof typeof shapePalettes] || [0xffffff, 0x888888];
      } else {
        palette = themePalettes[settings.colorPalette as keyof typeof themePalettes] || [0xffffff, 0x888888];
      }

      const c1 = new THREE.Color(palette[0]);
      const c2 = new THREE.Color(palette[1]);
      const finalColor = new THREE.Color();
      
      for (let i = 0; i < MAX_PARTICLES; i++) {
        // Create a gradient based on the particle index with some randomness
        const mix = (i / MAX_PARTICLES) + (Math.random() * 0.2 - 0.1);
        const clampedMix = Math.max(0, Math.min(1, mix));
        finalColor.copy(c1).lerp(c2, clampedMix);

        colors[i * 3] = finalColor.r;
        colors[i * 3 + 1] = finalColor.g;
        colors[i * 3 + 2] = finalColor.b;
      }
      
      particlesRef.current.geometry.attributes.color.needsUpdate = true;
    }
  }, [settings.shape, settings.colorPalette]);

  const particleData = useMemo(() => {
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const sizes = new Float32Array(MAX_PARTICLES);
    const phases = new Float32Array(MAX_PARTICLES);

    const colorPalettes = {
      sphere: [0x00ffff, 0xff00ff],
      helix: [0x00ff88, 0x0088ff],
      tornado: [0x8a2be2, 0x00ffff],
      galaxy: [0xffaa00, 0xff0055],
      cube: [0x00ffcc, 0x0033ff],
      torus: [0xff00ff, 0xffaa00],
      wave: [0x0088ff, 0x00ff88],
      implosion: [0xff0000, 0xffaa00],
    };
    const palette = colorPalettes[settings.shape as keyof typeof colorPalettes] || [0xffffff, 0x888888];
    const c1 = new THREE.Color(palette[0]);
    const c2 = new THREE.Color(palette[1]);
    const finalColor = new THREE.Color();

    for (let i = 0; i < MAX_PARTICLES; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const mix = (i / MAX_PARTICLES) + (Math.random() * 0.2 - 0.1);
      const clampedMix = Math.max(0, Math.min(1, mix));
      finalColor.copy(c1).lerp(c2, clampedMix);

      colors[i * 3] = finalColor.r;
      colors[i * 3 + 1] = finalColor.g;
      colors[i * 3 + 2] = finalColor.b;

      sizes[i] = 0.5 + Math.random() * 2.5;
      phases[i] = Math.random() * Math.PI * 2;
    }

    return { positions, colors, sizes, phases };
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || window.innerWidth;
    const height = mountRef.current.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      width / height,
      0.1,
      1000
    );
    const initialAngleRad = (viewAngle * Math.PI) / 180;
    const initialRadius = 15;
    camera.position.x = Math.sin(initialAngleRad) * initialRadius;
    camera.position.z = Math.cos(initialAngleRad) * initialRadius;
    camera.position.y = 0; // Center vertically
    camera.lookAt(0, 0, 0);
    camera.translateX(5); // Shift camera right so formation appears on the left
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true
    });
    renderer.autoClearColor = false;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Fade scene for trails
    const fadeScene = new THREE.Scene();
    const fadeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const fadeMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
    const fadePlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fadeMaterial);
    fadeScene.add(fadePlane);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(particleData.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(particleData.sizes, 1));
    geometry.setDrawRange(0, settingsRef.current.particleCount);

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
      map: textures[settingsRef.current.particleShape || 'sphere'],
    });
    materialRef.current = material;

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    // Apply initial colors
    const colors = particles.geometry.attributes.color.array as Float32Array;
    const shapePalettes = {
      sphere: [0x00ffff, 0xff00ff],
      helix: [0x00ff88, 0x0088ff],
      tornado: [0x8a2be2, 0x00ffff],
      galaxy: [0xffaa00, 0xff0055],
      cube: [0x00ffcc, 0x0033ff],
      torus: [0xff00ff, 0xffaa00],
      wave: [0x0088ff, 0x00ff88],
      implosion: [0xff0000, 0xffaa00],
    };
    const themePalettes = {
      neon: [0xff00ff, 0x00ffff],
      fire: [0xff4500, 0xffd700],
      ocean: [0x00008b, 0x00ffff],
      monochrome: [0xffffff, 0x444444],
      cyberpunk: [0xfcee0a, 0x00ffcc],
    };
    let palette;
    if (settingsRef.current.colorPalette === 'default') {
      palette = shapePalettes[settingsRef.current.shape as keyof typeof shapePalettes] || [0xffffff, 0x888888];
    } else {
      palette = themePalettes[settingsRef.current.colorPalette as keyof typeof themePalettes] || [0xffffff, 0x888888];
    }
    const c1 = new THREE.Color(palette[0]);
    const c2 = new THREE.Color(palette[1]);
    const finalColor = new THREE.Color();
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const mix = (i / MAX_PARTICLES) + (Math.random() * 0.2 - 0.1);
      const clampedMix = Math.max(0, Math.min(1, mix));
      finalColor.copy(c1).lerp(c2, clampedMix);
      colors[i * 3] = finalColor.r;
      colors[i * 3 + 1] = finalColor.g;
      colors[i * 3 + 2] = finalColor.b;
    }
    particles.geometry.attributes.color.needsUpdate = true;

    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      const newWidth = mountRef.current.clientWidth || window.innerWidth;
      const newHeight = mountRef.current.clientHeight || window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);

      if (particlesRef.current) {
        const currentSettings = settingsRef.current;
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        const time = Date.now() * 0.0005 * currentSettings.speed;
        
        particlesRef.current.geometry.setDrawRange(0, currentSettings.particleCount);

        for (let i = 0; i < currentSettings.particleCount; i++) {
          const idx = i * 3;
          const px = positions[idx];
          const py = positions[idx + 1];
          const pz = positions[idx + 2];
          const phase = particleData.phases[i];

          let tx = 0, ty = 0, tz = 0;

          if (currentSettings.shape === 'sphere') {
            const r = currentSettings.dimension;
            const phi = Math.acos(-1 + (2 * i) / currentSettings.particleCount);
            const theta = Math.sqrt(currentSettings.particleCount * Math.PI) * phi + time;
            tx = r * Math.cos(theta) * Math.sin(phi);
            ty = r * Math.sin(theta) * Math.sin(phi);
            tz = r * Math.cos(phi);
          } else if (currentSettings.shape === 'helix') {
            const r = currentSettings.dimension * 0.5;
            const angle = (i / 100) + time * 2;
            const y = (i / currentSettings.particleCount - 0.5) * currentSettings.dimension * 3;
            tx = Math.cos(angle) * r;
            ty = y;
            tz = Math.sin(angle) * r;
            // Double helix
            if (i % 2 === 0) {
              tx = Math.cos(angle + Math.PI) * r;
              tz = Math.sin(angle + Math.PI) * r;
            }
          } else if (currentSettings.shape === 'tornado') {
            const h = (i / currentSettings.particleCount);
            const r = h * currentSettings.dimension;
            const angle = time * 10 + h * 20;
            tx = Math.cos(angle) * r;
            ty = (h - 0.5) * currentSettings.dimension * 4;
            tz = Math.sin(angle) * r;
          } else if (currentSettings.shape === 'galaxy') {
            const r = (i / currentSettings.particleCount) * currentSettings.dimension * 2;
            const arms = 3;
            const angle = time + (i * 0.001) + (Math.floor(i / (currentSettings.particleCount / arms)) * (Math.PI * 2 / arms));
            const spiral = r * 0.5;
            tx = Math.cos(angle + r * 0.5) * r;
            ty = (Math.random() - 0.5) * 0.2;
            tz = Math.sin(angle + r * 0.5) * r;
          } else if (currentSettings.shape === 'cube') {
            const side = Math.ceil(Math.pow(currentSettings.particleCount, 1/3));
            const step = currentSettings.dimension * 2 / side;
            const x = (i % side);
            const y = Math.floor(i / side) % side;
            const z = Math.floor(i / (side * side));
            tx = (x * step) - currentSettings.dimension;
            ty = (y * step) - currentSettings.dimension;
            tz = (z * step) - currentSettings.dimension;
            // Add some rotation to the cube
            const cosT = Math.cos(time * 0.5);
            const sinT = Math.sin(time * 0.5);
            const tempX = tx * cosT - tz * sinT;
            tz = tx * sinT + tz * cosT;
            tx = tempX;
          } else if (currentSettings.shape === 'torus') {
            const R = currentSettings.dimension;
            const r = currentSettings.dimension * 0.3;
            const u = Math.random() * Math.PI * 2 + time;
            const v = (i / currentSettings.particleCount) * Math.PI * 2;
            tx = (R + r * Math.cos(v)) * Math.cos(u);
            ty = r * Math.sin(v);
            tz = (R + r * Math.cos(v)) * Math.sin(u);
          } else if (currentSettings.shape === 'wave') {
            const x = (i % 100) / 100 * currentSettings.dimension * 4 - currentSettings.dimension * 2;
            const z = Math.floor(i / 100) / (currentSettings.particleCount / 100) * currentSettings.dimension * 4 - currentSettings.dimension * 2;
            tx = x;
            tz = z;
            ty = Math.sin(x * 0.5 + time * 2) * Math.cos(z * 0.5 + time * 2) * currentSettings.dimension * 0.5;
          } else if (currentSettings.shape === 'implosion') {
            const r = (i / currentSettings.particleCount) * currentSettings.dimension * 2;
            const phi = Math.acos(-1 + (2 * i) / currentSettings.particleCount);
            const theta = Math.sqrt(currentSettings.particleCount * Math.PI) * phi;
            // Particles move towards center and reset
            const currentR = (r - (time * 5) % (currentSettings.dimension * 2) + currentSettings.dimension * 2) % (currentSettings.dimension * 2);
            tx = currentR * Math.cos(theta) * Math.sin(phi);
            ty = currentR * Math.sin(theta) * Math.sin(phi);
            tz = currentR * Math.cos(phi);
          }

          // Smooth transition
          positions[idx] += (tx - px) * 0.05;
          positions[idx + 1] += (ty - py) * 0.05;
          positions[idx + 2] += (tz - pz) * 0.05;

          // Add some jitter/movement
          positions[idx] += Math.sin(time + phase) * 0.01;
          positions[idx + 1] += Math.cos(time + phase) * 0.01;
          positions[idx + 2] += Math.sin(time * 0.5 + phase) * 0.01;
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
        
        if (targetRotationRef.current !== null) {
          particlesRef.current.rotation.y += 0.1 * currentSettings.speed;
          if (particlesRef.current.rotation.y >= targetRotationRef.current) {
            particlesRef.current.rotation.y = targetRotationRef.current;
            targetRotationRef.current = null;
          }
        } else {
          particlesRef.current.rotation.y += 0.002 * currentSettings.speed;
        }
      }

      renderer.autoClear = false;
      renderer.render(fadeScene, fadeCamera);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameIdRef.current);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      fadeMaterial.dispose();
      fadePlane.geometry.dispose();
      renderer.dispose();
    };
  }, [particleData]); // Only re-run if particleData changes (which is never, due to useMemo)

  return <div ref={mountRef} className="w-full h-full absolute inset-0 flex items-center justify-center" />;
};

export default ParticleSimulation;
