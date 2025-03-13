// 3D Earth Visualization - Clock Widget Design
document.addEventListener('DOMContentLoaded', function() {
    // Check if the earth container exists
    const container = document.getElementById('earth-container');
    if (!container) return;

    // Initialize clock display
    const clockElement = document.querySelector('.time-clock');
    const dateElement = document.querySelector('.time-date');
    
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        // Format: 16:48
        clockElement.textContent = `${hours}:${minutes}`;
        
        // Format: 10月8日 周五
        const month = now.getMonth() + 1;
        const date = now.getDate();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = dayNames[now.getDay()];
        
        dateElement.textContent = `${month}.${date}  ${dayOfWeek}`;
    }
    
    // Update clock immediately and then every second
    updateClock();
    setInterval(updateClock, 1000);

    // Set up scene
    const scene = new THREE.Scene();
    
    // Set up camera
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000); // Use actual aspect ratio
    camera.position.z = 2.5;
    
    // Set up renderer with better quality
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        logarithmicDepthBuffer: true 
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0); // Transparent background
    container.appendChild(renderer.domElement);
    
    // Create Earth
    const earthGeometry = new THREE.SphereGeometry(0.8, 64, 64);
    
    // Load Earth texture
    const textureLoader = new THREE.TextureLoader();
    
    // Earth texture
    const earthTexture = textureLoader.load('/images/earth_texture.jpg', function() {
        console.log('Earth texture loaded successfully');
    }, undefined, function() {
        console.error('Failed to load Earth texture');
        earthMaterial.color.set(0x1a3a6f); // Darker blue fallback color
    });
    
    // Create clouds texture for more realism
    const cloudTexture = new THREE.TextureLoader().load('/images/1200px-Earth-clouds.png', undefined, undefined, function() {
        console.error('Failed to load cloud texture');
    });
    
    // Create Earth material with more realistic shading
    const earthMaterial = new THREE.MeshPhongMaterial({
        map: earthTexture,
        bumpScale: 0.15,
        specular: new THREE.Color(0x222222),
        shininess: 15,
        emissive: new THREE.Color(0x112244),
        emissiveIntensity: 0.1
    });
    
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.rotation.y = Math.PI * 0.5; // Show a specific side of Earth
    earth.rotation.x = Math.PI * 0.1; // Slight tilt
    scene.add(earth);
    
    // Create atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(0.92, 64, 64);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
        color: 0x5a8dce,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
    });
    
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);
    
    // Add clouds layer
    const cloudsGeometry = new THREE.SphereGeometry(0.82, 64, 64);
    const cloudsMaterial = new THREE.MeshPhongMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.15
    });
    
    const clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    scene.add(clouds);
    
    // Moon has been removed
    
    // Orbital rings have been removed
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // Add directional light (like the sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);
    
    // Add subtle point light for highlights
    const pointLight = new THREE.PointLight(0xffffff, 0.3);
    pointLight.position.set(2, 1, 3);
    scene.add(pointLight);
    
    // Add stars to the background
    function addStars() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.02,
            transparent: true,
            opacity: 0.7
        });
        
        const starsVertices = [];
        for (let i = 0; i < 1000; i++) {
            const x = (Math.random() - 0.5) * 10;
            const y = (Math.random() - 0.5) * 10;
            const z = (Math.random() - 0.5) * 10;
            
            // Make sure stars are not too close to the Earth
            if (Math.sqrt(x*x + y*y + z*z) < 2) continue;
            
            starsVertices.push(x, y, z);
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        scene.add(stars);
    }
    
    addStars();
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Very slow Earth rotation
        earth.rotation.y += 0.0003;
        atmosphere.rotation.y = earth.rotation.y;
        
        // Slow clouds rotation (slightly faster than Earth)
        if (clouds) {
            clouds.rotation.y += 0.0004;
        }
        
        renderer.render(scene, camera);
    }
    
    animate();
    
    // Handle window resize
    window.addEventListener('resize', function() {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
    
    // Force initial sizing
    renderer.setSize(container.clientWidth, container.clientHeight);
});
