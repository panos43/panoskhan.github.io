// assets/3d-app.js
// ES module lazy-loaded at runtime. Imports production Three.js module and initializes a performant particle field.
import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

const canvas = document.getElementById('webgl-canvas');
if(!canvas){
  console.warn('3D canvas not found, aborting 3D init.');
} else {
  let renderer, scene, camera, particlesMesh, animationId;
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 720;
  const particlesCount = isMobile ? 300 : 900;

  function init(){
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !isMobile });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
      blending: THREE.AdditiveBlending
    });

    particlesMesh = new THREE.Points(geometry, material);
    scene.add(particlesMesh);

    // subtle ambient glow via additive sprite
    const sprite = new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/disc.png');
    material.map = sprite;

    // mouse
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth) - 0.5;
      mouseY = (e.clientY / window.innerHeight) - 0.5;
    });

    // resize
    window.addEventListener('resize', onResize);

    // tilt effect for UI cards
    initCardTilt();

    animate();
  }

  function animate(){
    const time = performance.now() * 0.0005;
    // slow drift
    particlesMesh.rotation.y = time * 0.07;
    particlesMesh.rotation.x = Math.sin(time * 0.3) * 0.02;

    // subtle parallax based on mouse
    const positions = particlesMesh.geometry.attributes.position.array;
    const len = positions.length/3;
    for(let i=0;i<len;i++){
      const i3 = i*3;
      // apply a tiny offset for organic movement
      positions[i3 + 0] += Math.sin(time + i) * 0.00002;
      positions[i3 + 1] += Math.cos(time + i*0.7) * 0.00002;
    }
    particlesMesh.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    animationId = requestAnimationFrame(animate);
  }

  function onResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function initCardTilt(){
    const cards = document.querySelectorAll('.glass-card');
    cards.forEach(card => {
      let raf = null;
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        const tiltX = (y * -1) * 8; // invert
        const tiltY = (x) * 8;
        if(raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(()=>{
          card.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(15px) scale3d(1.03,1.03,1.03)`;
        });
      });
      card.addEventListener('mouseleave', ()=>{
        if(raf) cancelAnimationFrame(raf);
        card.style.transform = '';
      });
    });
  }

  // initialize with a small delay so that CSS transitions have applied
  setTimeout(() => {
    try{
      init();
      // enable pointer events on canvas (so GPU interaction possible)
      canvas.style.pointerEvents = 'auto';
      canvas.removeAttribute('aria-hidden');
    } catch (err){
      console.error('3D init failed', err);
      if(animationId) cancelAnimationFrame(animationId);
    }
  }, 80);

  // Expose a cleanup hook in case the host wants to remove the scene later
  window.__PK_3D_CLEANUP = function(){
    if(animationId) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', onResize);
    // dispose geometries/materials
    if(particlesMesh){
      particlesMesh.geometry.dispose();
      if(particlesMesh.material.map) particlesMesh.material.map.dispose();
      particlesMesh.material.dispose();
      scene.remove(particlesMesh);
      particlesMesh = null;
    }
    if(renderer){
      renderer.dispose();
      renderer.forceContextLoss && renderer.forceContextLoss();
      renderer.domElement && (renderer.domElement.style.display = 'none');
    }
  }
}
