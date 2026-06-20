import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * ThreeGlobe — Cinematic neural traffic globe
 * Props:
 *   zoom          – camera z distance (default 200)
 *   rotationSpeed – base Y rotation per frame (default 0.001)
 *   variant       – 'hero' (large, cursor reactive) | 'ambient' (small, quiet)
 */
export const ThreeGlobe = ({
  zoom = 200,
  rotationSpeed = 0.001,
  variant = 'ambient',
}) => {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const SAHARA   = 0xc2652a;
    const LINEN    = 0xfbe8d8;
    const RADIUS   = 80;
    const isHero   = variant === 'hero';

    /* ─── Renderer ─── */
    const w = container.clientWidth;
    const h = container.clientHeight;
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
    camera.position.z = zoom;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    /* ─── Globe Group (everything rotates together) ─── */
    const group = new THREE.Group();
    group.scale.setScalar(isHero ? 0.85 : 1.0); // start small for spring entry
    scene.add(group);

    /* ─── Core Wireframe Sphere ─── */
    const sphereGeo = new THREE.SphereGeometry(RADIUS, 48, 48);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: LINEN,
      transparent: true,
      opacity: 0.08,
      wireframe: true,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    group.add(sphere);

    /* ─── Atmosphere Glow Layers ─── */
    [
      { r: RADIUS + 3,  op: 0.07, side: THREE.BackSide  },
      { r: RADIUS + 10, op: 0.03, side: THREE.BackSide  },
    ].forEach(({ r, op, side }) => {
      const g = new THREE.SphereGeometry(r, 32, 32);
      const m = new THREE.MeshBasicMaterial({ color: SAHARA, transparent: true, opacity: op, side });
      group.add(new THREE.Mesh(g, m));
    });

    /* ─── Helper: lat/lon → XYZ on sphere ─── */
    const latLonToVec3 = (lat, lon, r = RADIUS) => {
      const phi   = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
         r * Math.cos(phi),
         r * Math.sin(phi) * Math.sin(theta)
      );
    };

    /* ─── Network Nodes — Bengaluru key intersections ─── */
    const hotspotCoords = [
      [12.9751, 77.5939], // Majestic
      [12.9174, 77.6233], // Silk Board
      [12.9352, 77.6245], // Koramangala
      [12.9698, 77.7499], // Whitefield
      [12.8458, 77.6604], // Electronic City
      [13.0435, 77.5971], // Hebbal
      [12.9591, 77.6974], // Marathahalli
    ];

    // Extra random nodes to fill the globe
    const allNodePositions = [];
    hotspotCoords.forEach(([lat, lon]) => {
      allNodePositions.push(latLonToVec3(lat, lon));
    });
    for (let i = 0; i < 70; i++) {
      const lat = (Math.random() - 0.5) * 160;
      const lon = (Math.random() - 0.5) * 360;
      allNodePositions.push(latLonToVec3(lat, lon));
    }

    // Render all as instanced mesh for performance
    const dotGeo = new THREE.SphereGeometry(0.55, 6, 6);
    const dotMat = new THREE.MeshBasicMaterial({ color: SAHARA, transparent: true, opacity: 0.75 });
    const dummy  = new THREE.Object3D();
    const dotMesh = new THREE.InstancedMesh(dotGeo, dotMat, allNodePositions.length);
    allNodePositions.forEach((pos, i) => {
      dummy.position.copy(pos);
      // Hotspot nodes slightly larger
      const scale = i < hotspotCoords.length ? 1.8 : 1.0;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      dotMesh.setMatrixAt(i, dummy.matrix);
    });
    dotMesh.instanceMatrix.needsUpdate = true;
    group.add(dotMesh);

    /* ─── Connection Lines between hotspot nodes ─── */
    const lineMat = new THREE.LineBasicMaterial({
      color: SAHARA,
      transparent: true,
      opacity: 0.18,
    });
    const connectionPairs = [
      [0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 3], [4, 2], [1, 6]
    ];
    connectionPairs.forEach(([a, b]) => {
      const curve = new THREE.CatmullRomCurve3([
        allNodePositions[a],
        allNodePositions[a].clone().add(allNodePositions[b]).normalize().multiplyScalar(RADIUS * 1.12),
        allNodePositions[b],
      ]);
      const pts = curve.getPoints(24);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      group.add(new THREE.Line(geo, lineMat));
    });

    /* ─── Traffic Arc Particles ─── */
    const particleMat = new THREE.MeshBasicMaterial({ color: SAHARA, transparent: true, opacity: 0.9 });
    const particleGeo = new THREE.SphereGeometry(0.7, 4, 4);
    const arcParticles = [];

    connectionPairs.slice(0, 6).forEach(([a, b]) => {
      const numParticles = 2;
      for (let k = 0; k < numParticles; k++) {
        const mesh  = new THREE.Mesh(particleGeo, particleMat.clone());
        const curve = new THREE.CatmullRomCurve3([
          allNodePositions[a],
          allNodePositions[a].clone().add(allNodePositions[b]).normalize().multiplyScalar(RADIUS * 1.14),
          allNodePositions[b],
        ]);
        group.add(mesh);
        arcParticles.push({
          mesh,
          curve,
          t: (k / numParticles) + Math.random() * 0.1,
          speed: 0.0018 + Math.random() * 0.0012,
        });
      }
    });

    /* ─── Pulse Rings at Hotspots ─── */
    const pulseRings = [];
    hotspotCoords.slice(0, 5).forEach(([lat, lon]) => {
      const pos    = latLonToVec3(lat, lon, RADIUS + 0.5);
      const normal = pos.clone().normalize();
      const ringGeo = new THREE.RingGeometry(1, 1.6, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: SAHARA,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      // Orient ring to face outward from sphere center
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      group.add(ring);
      pulseRings.push({
        mesh: ring,
        scale: 1.0 + Math.random() * 0.5, // stagger start
        baseOpacity: 0.85,
        phaseOffset: Math.random() * Math.PI * 2,
      });
    });

    /* ─── Lighting ─── */
    const keyLight = new THREE.PointLight(SAHARA, 1.4, 600);
    keyLight.position.set(120, 100, 150);
    scene.add(keyLight);
    scene.add(new THREE.AmbientLight(LINEN, 0.35));

    /* ─── Spring physics state ─── */
    let currentScale   = isHero ? 0.85 : 1.0;
    const targetScale  = 1.0;
    let entryStarted   = false;
    const entryDelay   = 500; // ms

    // Cursor parallax
    const mouse    = { x: 0, y: 0 };
    const targetRot = { x: 0, y: 0 };
    const currentRot = { x: 0, y: 0 };
    const MAX_PARALLAX = 5 * (Math.PI / 180); // 5 degrees

    const handleMouse = (e) => {
      if (!isHero) return;
      mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
      targetRot.y = mouse.x * MAX_PARALLAX;
      targetRot.x = mouse.y * MAX_PARALLAX;
    };
    if (isHero) window.addEventListener('mousemove', handleMouse, { passive: true });

    /* ─── Visibility Pause (performance) ─── */
    let isPaused = false;
    const obs = new IntersectionObserver(
      ([entry]) => { isPaused = !entry.isIntersecting; },
      { threshold: 0.01 }
    );
    obs.observe(container);

    /* ─── Animation Loop ─── */
    let raf;
    let frame = 0;
    const t0  = performance.now();

    const animate = () => {
      if (isPaused) { raf = requestAnimationFrame(animate); return; }
      raf = requestAnimationFrame(animate);
      frame++;
      const elapsed = performance.now() - t0;

      /* Entry spring */
      if (isHero) {
        if (!entryStarted && elapsed >= entryDelay) entryStarted = true;
        if (entryStarted && Math.abs(currentScale - targetScale) > 0.0001) {
          currentScale += (targetScale - currentScale) * 0.04;
          group.scale.setScalar(currentScale);
        }
        /* Cursor parallax lerp */
        const LERP = 0.04;
        currentRot.x += (targetRot.x - currentRot.x) * LERP;
        currentRot.y += (targetRot.y - currentRot.y) * LERP;
      }

      /* Base rotation */
      group.rotation.y += rotationSpeed;
      group.rotation.x = currentRot.x;

      /* Pulse rings */
      pulseRings.forEach((r) => {
        const phase = (elapsed * 0.0006 + r.phaseOffset) % (Math.PI * 2);
        const t     = (Math.sin(phase) + 1) / 2; // 0→1→0
        r.mesh.scale.setScalar(1 + t * 2.2);
        r.mesh.material.opacity = r.baseOpacity * (1 - t);
      });

      /* Arc particles */
      arcParticles.forEach((p) => {
        p.t += p.speed;
        if (p.t > 1) p.t -= 1;
        const pos = p.curve.getPoint(p.t);
        p.mesh.position.copy(pos);
        // Fade in/out at arc endpoints
        const fade = Math.sin(p.t * Math.PI);
        p.mesh.material.opacity = fade * 0.95;
      });

      renderer.render(scene, camera);
    };
    animate();

    /* ─── Resize ─── */
    const onResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    /* ─── Cleanup ─── */
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
      window.removeEventListener('resize', onResize);
      if (isHero) window.removeEventListener('mousemove', handleMouse);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      [sphereGeo, dotGeo, particleGeo].forEach(g => g.dispose());
      [sphereMat, dotMat, particleMat, lineMat].forEach(m => m.dispose());
      pulseRings.forEach(r => { r.mesh.geometry.dispose(); r.mesh.material.dispose(); });
    };
  }, [zoom, rotationSpeed, variant]);

  return <div ref={mountRef} className="w-full h-full" />;
};
