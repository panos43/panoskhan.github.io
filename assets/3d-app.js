// assets/3d-app.js
// ES module lazy-loaded at runtime. Imports production Three.js module and initializes a performant particle field.
import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

const canvas = document.getElementById('webgl-canvas');
if(!canvas){
  console.warn('3D canvas not found, aborting 3D init.');
} else {
  let renderer, scene, camera, particlesMesh, animationId;
  let resizeObserver;
  let isCleanedUp = false;
  
  // Event listeners to be cleaned up
  const eventListeners = [];
  
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 720;
  const particlesCount = isMobile ? 300 : 900;

  /**
   * Generate a simple particle sprite as data URI to avoid external CDN dependency
   */
  function generateParticleTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Radial gradient for soft particle glow
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    return new THREE.CanvasTexture(canvas);
  }

  function init(){
    // Enable antialias for desktop for better quality, disable on mobile for performance
    renderer = new THREE.WebGLRenderer({ 
      canvas: canvas, 
      alpha: true, 
      antialias: !isMobile,
      powerPreference: 'high-performance'
    });
    
    // Clamp pixel ratio: 1.5–2x is a good balance between quality and performance
    const targetPixelRatio = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(targetPixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 3;

    // Particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particlesCount * 3);
    for(let i = 0; i < particlesCount; i++){
      const i3 = i * 3;
      positions[i3 + 0] = (Math.random() - 0.5) * 12; // x
      positions[i3 + 1] = (Math.random() - 0.5) * 8;  // y
      positions[i3 + 2] = (Math.random() - 0.5) * 6;  // z
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: isMobile ? 0.01 : 0.02,
      color: new THREE.Color(0x00d4ff),
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: generateParticleTexture() // Use local generated texture instead of CDN
    });

    particlesMesh = new THREE.Points(geometry, material);
    scene.add(particlesMesh);

    // Resize handler
    const onResize = () => {
      if(isCleanedUp) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', onResize);
    eventListeners.push({ target: window, event: 'resize', handler: onResize });

    // Card tilt effect with throttling
    initCardTilt();

    // Start animation loop
    animate();
  }

  function animate(){
    if(isCleanedUp) return;
    
    const time = performance.now() * 0.0005;
    
    // Particle rotation for subtle drift
    particlesMesh.rotation.y = time * 0.07;
    particlesMesh.rotation.x = Math.sin(time * 0.3) * 0.02;

    // Removed: expensive per-particle position updates with imperceptible 0.00002 offsets
    // Removed: unused mouse tracking that never affected animation
    // The rotation alone provides sufficient organic movement.

    renderer.render(scene, camera);
    animationId = requestAnimationFrame(animate);
  }

  /**
   * Initialize card tilt with throttling to reduce repaints
   */
  function initCardTilt(){
    const cards = document.querySelectorAll('.glass-card');
    const THROTTLE_INTERVAL = 16; // ~60fps, one update per frame
    
    cards.forEach(card => {
      let lastUpdateTime = 0;
      let currentTiltX = 0;
      let currentTiltY = 0;

      const handleMouseMove = (e) => {
        const now = performance.now();
        
        // Throttle: only recalculate if enough time has passed
        if(now - lastUpdateTime < THROTTLE_INTERVAL) return;
        
        lastUpdateTime = now;
        
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        
        currentTiltX = (y * -1) * 8; // invert
        currentTiltY = (x) * 8;
        
        // Apply transform immediately (no RAF cancellation overhead)
        card.style.transform = `rotateX(${currentTiltX}deg) rotateY(${currentTiltY}deg) translateZ(15px) scale3d(1.03,1.03,1.03)`;
      };

      const handleMouseLeave = () => {
        card.style.transform = '';
        currentTiltX = 0;
        currentTiltY = 0;
      };
      
      card.addEventListener('mousemove', handleMouseMove);
      card.addEventListener('mouseleave', handleMouseLeave);
      
      eventListeners.push({ target: card, event: 'mousemove', handler: handleMouseMove });
      eventListeners.push({ target: card, event: 'mouseleave', handler: handleMouseLeave });
    });
  }

  /**
   * Use requestIdleCallback for initialization (with setTimeout fallback)
   * This defers 3D init until the browser is idle, preventing blocking of critical rendering
   */
  function scheduleInit() {
    if('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        try {
          init();
          canvas.style.pointerEvents = 'auto';
          canvas.removeAttribute('aria-hidden');
        } catch (err) {
          console.error('3D init failed:', err);
          cleanup();
        }
      }, { timeout: 2000 }); // Fallback timeout: init within 2 seconds max
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        try {
          init();
          canvas.style.pointerEvents = 'auto';
          canvas.removeAttribute('aria-hidden');
        } catch (err) {
          console.error('3D init failed:', err);
          cleanup();
        }
      }, 100);
    }
  }

  /**
   * Cleanup function: called automatically on exit or page unload
   */
  function cleanup() {
    if(isCleanedUp) return;
    isCleanedUp = true;

    // Cancel animation loop
    if(animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    // Remove all event listeners
    eventListeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    eventListeners.length = 0;

    // Clean up ResizeObserver if used
    if(resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }

    // Dispose Three.js resources
    if(particlesMesh) {
      particlesMesh.geometry.dispose();
      if(particlesMesh.material.map) {
        particlesMesh.material.map.dispose();
      }
      particlesMesh.material.dispose();
      if(scene) {
        scene.remove(particlesMesh);
      }
      particlesMesh = null;
    }

    if(renderer) {
      renderer.dispose();
      if(renderer.forceContextLoss) {
        renderer.forceContextLoss();
      }
      if(renderer.domElement) {
        renderer.domElement.style.display = 'none';
      }
      renderer = null;
    }

    if(scene) {
      scene = null;
    }

    if(camera) {
      camera = null;
    }

    console.log('3D experience cleaned up');
  }

  // Expose cleanup hook for external control
  window.__PK_3D_CLEANUP = cleanup;

  // Auto-cleanup on page unload to prevent memory leaks
  window.addEventListener('beforeunload', cleanup);

  // Schedule init to run when idle
  scheduleInit();
}
