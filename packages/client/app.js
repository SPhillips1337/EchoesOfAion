// ==========================================================================
// 🌌 ECHOES OF AION: HOLOGRAPHIC COMMAND DECK APPLICATION CONTROLLER
// ==========================================================================

let gameState = null;
let playerEmpireId = null;
let actionsQueue = [];

// Three.js 3D Viewport Global Context
let scene, camera, renderer, controls;
let starMeshes = [];
let starLaneLines = [];
let fleetMarkers = [];
let planetOrbitGroups = [];
let selectedStarId = null;
let animationFrameId = null;

// Speech Synthesis Advisor Context
let advisorMuted = false;
let advisorTypingTimeout = null;

// Space Canvas Background Particle Context
let spaceVoidCanvas, spaceVoidCtx, spaceParticles = [];

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    initSpaceVoidBackground();
    initAdvisorSystem();
});

// ==========================================================================
// 🎙️ SPEECH SYNTHESIS ADVISOR SYSTEM
// ==========================================================================
function initAdvisorSystem() {
    const muteBtn = document.getElementById('advisorMuteBtn');
    const avatarBtn = document.getElementById('advisorAvatarBtn');

    // Read cached state
    advisorMuted = localStorage.getItem('aion_advisor_muted') === 'true';
    updateAdvisorUI();

    muteBtn.addEventListener('click', () => {
        advisorMuted = !advisorMuted;
        localStorage.setItem('aion_advisor_muted', advisorMuted);
        updateAdvisorUI();
        if (!advisorMuted) {
            speakAdvisor("Advisor channel re-established. Vocal synthesizer active.");
        } else {
            window.speechSynthesis.cancel();
        }
    });

    avatarBtn.addEventListener('click', () => {
        speakAdvisor("Advisor unit reporting. Standing by for strategic galactic telemetry.");
    });
}

function updateAdvisorUI() {
    const muteBtn = document.getElementById('advisorMuteBtn');
    const statusPill = document.getElementById('advisorStatus');

    if (advisorMuted) {
        muteBtn.textContent = '🔇';
        statusPill.textContent = 'MUTED';
        statusPill.className = 'advisor-status-pill muted';
    } else {
        muteBtn.textContent = '🔊';
        statusPill.textContent = 'ACTIVE';
        statusPill.className = 'advisor-status-pill active';
    }
}

function speakAdvisor(text) {
    if (advisorTypingTimeout) clearTimeout(advisorTypingTimeout);

    // 1. Text Subtitle Typewriter Effect
    const textContainer = document.getElementById('advisorText');
    textContainer.textContent = '';
    let charIndex = 0;

    function typeChar() {
        if (charIndex < text.length) {
            textContainer.textContent += text.charAt(charIndex);
            charIndex++;
            advisorTypingTimeout = setTimeout(typeChar, 25);
        }
    }
    typeChar();

    // 2. Audio Vocal Synthesizer (SpeechSynthesis)
    if (advisorMuted) return;

    // Cancel active voices to avoid overlaps
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Fetch system voices and pick a premium mechanical digital assistant voice
    const voices = window.speechSynthesis.getVoices();
    const systemVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Natural') || v.lang === 'en-US');
    if (systemVoice) {
        utterance.voice = systemVoice;
    }

    utterance.pitch = 0.85; // Mechanical / Authoritative lower tone
    utterance.rate = 1.05;  // Cybernetic pace
    window.speechSynthesis.speak(utterance);
}

// ==========================================================================
// ✨ COSMIC SPACE VOID DECORATIVE BACKGROUND
// ==========================================================================
function initSpaceVoidBackground() {
    spaceVoidCanvas = document.getElementById('spaceVoidBackground');
    spaceVoidCtx = spaceVoidCanvas.getContext('2d');

    resizeSpaceVoid();
    window.addEventListener('resize', resizeSpaceVoid);

    // Generate particle clusters
    for (let i = 0; i < 120; i++) {
        spaceParticles.push({
            x: Math.random() * spaceVoidCanvas.width,
            y: Math.random() * spaceVoidCanvas.height,
            size: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.7 + 0.3,
            pulseSpeed: Math.random() * 0.02 + 0.005,
            angle: Math.random() * Math.PI * 2
        });
    }

    animateSpaceVoid();
}

function resizeSpaceVoid() {
    spaceVoidCanvas.width = window.innerWidth;
    spaceVoidCanvas.height = window.innerHeight;
}

function animateSpaceVoid() {
    spaceVoidCtx.clearRect(0, 0, spaceVoidCanvas.width, spaceVoidCanvas.height);

    // Draw space dust nebula gradients
    const gradient = spaceVoidCtx.createRadialGradient(
        spaceVoidCanvas.width / 2, spaceVoidCanvas.height / 2, 100,
        spaceVoidCanvas.width / 2, spaceVoidCanvas.height / 2, spaceVoidCanvas.width
    );
    gradient.addColorStop(0, '#090714');
    gradient.addColorStop(1, '#020204');
    spaceVoidCtx.fillStyle = gradient;
    spaceVoidCtx.fillRect(0, 0, spaceVoidCanvas.width, spaceVoidCanvas.height);

    // Render and pulse particles
    for (const p of spaceParticles) {
        p.angle += p.pulseSpeed;
        const currentOpacity = p.opacity + Math.sin(p.angle) * 0.15;

        spaceVoidCtx.beginPath();
        spaceVoidCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        spaceVoidCtx.fillStyle = `rgba(0, 210, 255, ${Math.max(0.1, Math.min(1, currentOpacity))})`;
        spaceVoidCtx.shadowBlur = p.size * 3;
        spaceVoidCtx.shadowColor = '#00d2ff';
        spaceVoidCtx.fill();
        spaceVoidCtx.shadowBlur = 0; // reset
    }

    requestAnimationFrame(animateSpaceVoid);
}

// ==========================================================================
// 🔗 BIND DOM INTERACTION ACTIONS
// ==========================================================================
function initEventListeners() {
    document.getElementById('createGameForm').addEventListener('submit', createGame);
    document.getElementById('addActionBtn').addEventListener('click', addAction);
    document.getElementById('submitTurnBtn').addEventListener('click', submitTurn);

    // Camera action listeners
    document.getElementById('zoomIn').addEventListener('click', () => adjustZoom(0.3));
    document.getElementById('zoomOut').addEventListener('click', () => adjustZoom(-0.3));
    document.getElementById('resetCameraBtn').addEventListener('click', resetCamera);
    document.getElementById('closeHudBtn').addEventListener('click', closeStarHud);
}

// ==========================================================================
// 🛸 INTERACTIVE 3D WEBGL GALAXY COMMAND VIEWPORT (THREE.JS)
// ==========================================================================
function init3DCommandDeck() {
    const container = document.getElementById('galaxyMap');
    if (!container) return;

    // Clear legacy flat container contents
    container.innerHTML = '';

    // Initialize WebGL Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020204, 0.005);

    // Perspective Camera
    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 1, 1000);
    camera.position.set(0, 75, 95);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Camera Controls (Pointer assignments swapped to match ThreeDeeCity)
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1; // Restrict camera below galaxy disk base
    controls.minDistance = 15;
    controls.maxDistance = 250;

    controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,       // Left pans coordinates
        MIDDLE: THREE.MOUSE.DOLLY,   // Scroll zooms orbits
        RIGHT: THREE.MOUSE.ROTATE    // Right rotates view deck
    };

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00d2ff, 0.8);
    dirLight.position.set(10, 50, 20);
    scene.add(dirLight);

    // Ambient Starfield inside WebGL
    const starGeom = new THREE.BufferGeometry();
    const starCount = 400;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
        starPos[i] = (Math.random() - 0.5) * 400;
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
        color: 0xdee5ff,
        size: 0.6,
        transparent: true,
        opacity: 0.4
    });
    const starPoints = new THREE.Points(starGeom, starMat);
    scene.add(starPoints);

    // Handle Window Resize
    window.addEventListener('resize', () => {
        if (!container || !camera || !renderer) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Bind Canvas Click Raycasting Selection
    renderer.domElement.addEventListener('click', handleCommandDeckClick);

    // Start Render Loop
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animate3DDeck();
}

function animate3DDeck() {
    animationFrameId = requestAnimationFrame(animate3DDeck);

    // Rotate planetary orbits in three dimensions
    for (const orbitGroup of planetOrbitGroups) {
        orbitGroup.rotation.y += orbitGroup.userData.speed;
    }

    controls.update();
    renderer.render(scene, camera);
}

// Swapped click raycasting selection
function handleCommandDeckClick(e) {
    const container = document.getElementById('galaxyMap');
    const rect = container.getBoundingClientRect();

    const mouse = new THREE.Vector2();
    mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Check hit on star meshes
    const intersects = raycaster.intersectObjects(starMeshes);
    if (intersects.length > 0) {
        const starMesh = intersects[0].object;
        selectStarSystem(starMesh.userData.starId);
    }
}

// Camera Glide smooth travel travel
function glideCameraTo(targetPos) {
    const startPos = camera.position.clone();
    const duration = 800; // ms
    const startTime = performance.now();

    // Offset camera slightly behind target star position
    const destination = new THREE.Vector3(targetPos.x, targetPos.y + 25, targetPos.z + 35);

    function updateGlide(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Cubic ease-out interpolation
        const ease = 1 - Math.pow(1 - progress, 3);

        camera.position.lerpVectors(startPos, destination, ease);
        controls.target.lerpVectors(controls.target.clone(), targetPos, ease);

        if (progress < 1) {
            requestAnimationFrame(updateGlide);
        }
    }
    requestAnimationFrame(updateGlide);
}

// Adjust camera zoom manually
function adjustZoom(delta) {
    const zoomVector = new THREE.Vector3();
    camera.getWorldDirection(zoomVector);
    camera.position.addScaledVector(zoomVector, delta * 30);
}

function resetCamera() {
    speakAdvisor("Resetting strategic grid interface views.");
    glideCameraTo(new THREE.Vector3(0, 0, 0));
    controls.target.set(0, 0, 0);
}

// ==========================================================================
// 🚀 CREATING AND RENDER STATE UPDATES
// ==========================================================================
async function createGame(e) {
    e.preventDefault();

    const options = {
        name: document.getElementById('gameName').value,
        starCount: parseInt(document.getElementById('starCount').value),
        empireCount: parseInt(document.getElementById('empireCount').value),
        playerEmpireName: document.getElementById('playerEmpireName').value,
        playerColor: document.getElementById('playerColor').value
    };

    try {
        const response = await fetch('/api/games/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options)
        });

        if (!response.ok) throw new Error('Failed to create game');

        gameState = sanitizeGameState(await response.json());
        playerEmpireId = gameState.empires[0].id;

        document.getElementById('gameSetup').style.display = 'none';
        document.getElementById('gameMain').style.display = 'flex';

        // Launch 3D Deck context
        init3DCommandDeck();
        renderGame();

        // advisor event speak
        speakAdvisor(`Galactic Command engine online. Welcome back, Commander of the ${options.playerEmpireName}. Establish planetary structures to consolidate our local space sector.`);
    } catch (err) {
        alert('Error creating game: ' + err.message);
    }
}

function renderGame() {
    updateHeader();
    renderEmpireInfo();
    renderResources();
    renderVictoryProgress();
    renderGalaxyMap3D();
    populateSelects();
}

function updateHeader() {
    document.getElementById('turnDisplay').textContent = `Turn: ${gameState.currentTurn}`;
    const playerEmpire = gameState.empires.find(e => e.id === playerEmpireId);
    document.getElementById('empireDisplay').textContent = `Empire: ${playerEmpire?.name || 'Player'}`;
}

function renderEmpireInfo() {
    const empire = gameState.empires.find(e => e.id === playerEmpireId);
    const planets = gameState.planets.filter(p => p.colonized_by_empire_id === playerEmpireId);
    const fleets = gameState.fleets.filter(f => f.empire_id === playerEmpireId);

    document.getElementById('empireInfo').innerHTML = `
        <div class="empire-stat">
            <span class="label">Planetary Nodes</span>
            <span>${planets.length}</span>
        </div>
        <div class="empire-stat">
            <span class="label">Fleet Signatures</span>
            <span>${fleets.length}</span>
        </div>
        <div class="empire-stat">
            <span class="label">Total Ship Units</span>
            <span>${fleets.reduce((sum, f) => sum + Object.values(f.composition).reduce((a, b) => a + b, 0), 0)}</span>
        </div>
        <div class="empire-stat">
            <span class="label">Stellar Sectors Explored</span>
            <span>${empire?.explored_systems?.length || 0} / ${gameState.stars.length}</span>
        </div>
    `;
}

function renderResources() {
    const planets = gameState.planets.filter(p => p.colonized_by_empire_id === playerEmpireId);

    const minerals = planets.reduce((sum, p) => sum + (p.resources?.minerals || 0), 0);
    const credits = planets.reduce((sum, p) => sum + (p.resources?.credits || 0), 0);
    const food = planets.reduce((sum, p) => sum + (p.resources?.food || 0), 0);
    const energy = planets.reduce((sum, p) => sum + (p.resources?.energy || 0), 0);
    const trade = planets.reduce((sum, p) => sum + (p.resources?.trade || 0), 0);

    document.getElementById('resourcesInfo').innerHTML = `
        <div class="resource-bar">
            <div class="resource-item">
                <div class="value">${minerals}</div>
                <div class="name">Minerals</div>
            </div>
            <div class="resource-item">
                <div class="value">${credits}</div>
                <div class="name">Credits</div>
            </div>
        </div>
        <div class="resource-bar">
            <div class="resource-item">
                <div class="value">${food}</div>
                <div class="name">Food</div>
            </div>
            <div class="resource-item">
                <div class="value">${energy}</div>
                <div class="name">Energy</div>
            </div>
            <div class="resource-item">
                <div class="value">${trade}</div>
                <div class="name">Trade</div>
            </div>
        </div>
    `;
}

function renderVictoryProgress() {
    const labels = {
        domination: 'Domination Systems',
        conquest: 'Eliminate Rivals',
        technological: 'Science Advancement',
        economic: 'Reserve Target Credits',
        exploration: 'Galactic Horizon Scans'
    };

    let html = '';
    const controlledStars = gameState.planets.filter(p => p.colonized_by_empire_id === playerEmpireId).length;
    const totalStars = gameState.stars.length;
    const dominationPct = totalStars > 0 ? (controlledStars / totalStars * 100) : 0;

    html += `<div class="victory-bar">
        <div class="label"><span>${labels.domination}</span><span>${Math.round(dominationPct)}%</span></div>
        <div class="progress-track"><div class="progress-fill" style="width: ${dominationPct}%"></div></div>
    </div>`;

    const rivalCount = gameState.empires.filter(e => e.id !== playerEmpireId).length;
    const conquestPct = rivalCount === 0 ? 100 : 0;
    html += `<div class="victory-bar">
        <div class="label"><span>${labels.conquest}</span><span>${rivalCount} active threats</span></div>
        <div class="progress-track"><div class="progress-fill" style="width: ${100 - conquestPct}%"></div></div>
    </div>`;

    const empire = gameState.empires.find(e => e.id === playerEmpireId);
    const techProgress = empire?.research?.progress || 0;
    html += `<div class="victory-bar">
        <div class="label"><span>${labels.technological}</span><span>${Math.round(techProgress * 100)}%</span></div>
        <div class="progress-track"><div class="progress-fill" style="width: ${techProgress * 100}%"></div></div>
    </div>`;

    const credits = gameState.planets.filter(p => p.colonized_by_empire_id === playerEmpireId).reduce((sum, p) => sum + (p.resources?.credits || 0), 0);
    const economicPct = Math.min(credits / 10000 * 100, 100);
    html += `<div class="victory-bar">
        <div class="label"><span>${labels.economic}</span><span>${credits} / 10000</span></div>
        <div class="progress-track"><div class="progress-fill" style="width: ${economicPct}%"></div></div>
    </div>`;

    const exploredPct = totalStars > 0 ? ((empire?.explored_systems?.length || 0) / totalStars * 100) : 0;
    html += `<div class="victory-bar">
        <div class="label"><span>${labels.exploration}</span><span>${Math.round(exploredPct)}%</span></div>
        <div class="progress-track"><div class="progress-fill" style="width: ${exploredPct}%"></div></div>
    </div>`;

    document.getElementById('victoryProgress').innerHTML = html;
}

// ==========================================================================
// 🌌 3D WEBGL GALAXY MAP POPULATION LOGIC (GLOWING BODIES)
// ==========================================================================
// Helper to hash string IDs into deterministic integers (resolves NaN on UUID modulo)
function getStringHash(str) {
    let hash = 0;
    if (!str) return hash;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

// Ensure game state coordinates are valid numbers to prevent NaN rendering
function sanitizeGameState(state) {
    if (!state) return null;
    if (state.stars && Array.isArray(state.stars)) {
        state.stars.forEach(s => {
            s.x_coord = parseFloat(s.x_coord);
            s.y_coord = parseFloat(s.y_coord);
        });
    }
    return state;
}

function renderGalaxyMap3D() {
    if (!scene || !gameState || !gameState.stars || gameState.stars.length === 0) return;

    // Coerce coordinates as safety fallback
    gameState.stars.forEach(s => {
        s.x_coord = parseFloat(s.x_coord);
        s.y_coord = parseFloat(s.y_coord);
    });

    // Clear active meshes
    for (const mesh of starMeshes) scene.remove(mesh);
    for (const line of starLaneLines) scene.remove(line);
    for (const f of fleetMarkers) scene.remove(f);
    for (const p of planetOrbitGroups) scene.remove(p);

    starMeshes = [];
    starLaneLines = [];
    fleetMarkers = [];
    planetOrbitGroups = [];

    // Scale Coordinates into 3D world space bounds
    const minX = Math.min(...gameState.stars.map(s => s.x_coord));
    const maxX = Math.max(...gameState.stars.map(s => s.x_coord));
    const minY = Math.min(...gameState.stars.map(s => s.y_coord));
    const maxY = Math.max(...gameState.stars.map(s => s.y_coord));

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = 75; // Map coordinate scaling

    function to3DX(x) { return ((x - minX) / rangeX - 0.5) * scale; }
    function to3DZ(y) { return ((y - minY) / rangeY - 0.5) * scale; }

    // 1. Draw Star Lanes (Hyperspace highway tunnels)
    for (const lane of gameState.starLanes) {
        const s1 = gameState.stars.find(s => s.id === lane.source_star_id);
        const s2 = gameState.stars.find(s => s.id === lane.destination_star_id);
        if (!s1 || !s2) continue;

        // Swapped 3D heights offset based on system seed ID to look organic (using deterministic hash)
        const seed1 = getStringHash(s1.id);
        const seed2 = getStringHash(s2.id);
        const y1 = (seed1 % 5 - 2) * 3;
        const y2 = (seed2 % 5 - 2) * 3;

        const pos1 = new THREE.Vector3(to3DX(s1.x_coord), y1, to3DZ(s1.y_coord));
        const pos2 = new THREE.Vector3(to3DX(s2.x_coord), y2, to3DZ(s2.y_coord));

        const points = [pos1, pos2];
        const lineGeom = new THREE.BufferGeometry().setFromPoints(points);

        // Glowing cyan-purple cosmic lines
        const lineMat = new THREE.LineBasicMaterial({
            color: 0x9d4edd,
            transparent: true,
            opacity: 0.35,
            linewidth: 1.5
        });
        const line = new THREE.Line(lineGeom, lineMat);
        scene.add(line);
        starLaneLines.push(line);
    }

    // 2. Draw Spherical Stars and rotating child planets
    const empire = gameState.empires.find(e => e.id === playerEmpireId);
    const exploredSet = new Set(empire?.explored_systems || []);

    for (const star of gameState.stars) {
        const x = to3DX(star.x_coord);
        const z = to3DZ(star.y_coord);
        const seed = getStringHash(star.id);
        const y = (seed % 5 - 2) * 3; // Seeded height

        // Define system color scheme based on colonization state
        let starColor = 0x494847; // Unexplored gray
        let glowColor = 0x101018;
        let isPlayerSystem = false;

        if (exploredSet.has(star.id)) {
            const planet = gameState.planets.find(p => p.star_id === star.id && p.colonized_by_empire_id === playerEmpireId);
            if (planet) {
                starColor = 0x00ff88; // Colonized Green
                glowColor = 0x00ff88;
                isPlayerSystem = true;
            } else {
                starColor = 0x00d2ff; // Explored Nebula Cyan
                glowColor = 0x00d2ff;
            }
        }

        // Core Star Mesh
        const starGeom = new THREE.SphereGeometry(2.2, 20, 20);
        const starMat = new THREE.MeshBasicMaterial({ color: starColor });
        const starMesh = new THREE.Mesh(starGeom, starMat);
        starMesh.position.set(x, y, z);
        starMesh.userData = { starId: star.id, name: star.name, position: starMesh.position };

        scene.add(starMesh);
        starMeshes.push(starMesh);

        // Interactive halo rings around colonized/selected stars
        if (isPlayerSystem || star.id === selectedStarId) {
            const ringGeom = new THREE.RingGeometry(3.5, 3.8, 24);
            const ringMat = new THREE.MeshBasicMaterial({
                color: glowColor,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(x, y, z);
            scene.add(ring);
            starLaneLines.push(ring); // Track to clean up later
        }

        // Add tiny orbiting 3D planet dots if system is explored
        if (exploredSet.has(star.id)) {
            const planets = gameState.planets.filter(p => p.star_id === star.id);
            const systemOrbitGroup = new THREE.Group();
            systemOrbitGroup.position.set(x, y, z);
            systemOrbitGroup.userData = { speed: (seed % 3 + 1) * 0.008 };

            planets.forEach((p, idx) => {
                const distance = 4.2 + idx * 1.5;
                const pColor = p.colonized_by_empire_id === playerEmpireId ? 0x00ff88 : 0x00d2ff;

                const pGeom = new THREE.SphereGeometry(0.5, 8, 8);
                const pMat = new THREE.MeshBasicMaterial({ color: pColor });
                const pMesh = new THREE.Mesh(pGeom, pMat);

                // Position offset inside orbital radius ring
                const angle = (idx * Math.PI * 2) / planets.length;
                pMesh.position.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);

                systemOrbitGroup.add(pMesh);
            });

            scene.add(systemOrbitGroup);
            planetOrbitGroups.push(systemOrbitGroup);
        }
    }

    // 3. Draw Fleet indicator beacons
    for (const fleet of gameState.fleets) {
        const star = gameState.stars.find(s => s.id === fleet.star_id);
        if (!star) continue;

        const x = to3DX(star.x_coord);
        const z = to3DZ(star.y_coord);
        const seed = getStringHash(star.id);
        const y = (seed % 5 - 2) * 3 + 4.5; // Hover beacon floating over stars

        const fleetGeom = new THREE.ConeGeometry(0.8, 2.2, 4);


        const isPlayerFleet = gameState.empires.find(e => e.id === fleet.empire_id)?.player_type === 'human';
        const fColor = isPlayerFleet ? 0x00ff88 : 0xff5555;

        const fleetMat = new THREE.MeshBasicMaterial({ color: fColor });
        const fleetMesh = new THREE.Mesh(fleetGeom, fleetMat);
        fleetMesh.position.set(x, y, z);

        // Point flight nose down to emphasize command grid targets
        fleetMesh.rotation.x = Math.PI;

        scene.add(fleetMesh);
        fleetMarkers.push(fleetMesh);
    }
}

// ==========================================================================
// 🛰️ TACTICAL SELECTION HUD DRAWER
// ==========================================================================
function selectStarSystem(starId) {
    selectedStarId = starId;

    // Redraw galaxy system halos and select indicators
    renderGalaxyMap3D();

    const star = gameState.stars.find(s => s.id === starId);
    if (!star) return;

    // 1. Smooth glide coordinate camera view
    const starMesh = starMeshes.find(m => m.userData.starId === starId);
    if (starMesh) {
        glideCameraTo(starMesh.position);
    }

    // 2. Auto-populate tactical dispatch target selector dropdown
    const targetSelect = document.getElementById('targetSelect');
    if (targetSelect) {
        targetSelect.value = starId;
    }

    // 3. Render Floating details HUD panel
    const hud = document.getElementById('selectedStarHud');
    hud.style.display = 'block';

    document.getElementById('hudStarName').textContent = star.name.toUpperCase();
    document.getElementById('hudStarCoords').textContent = `X: ${star.x_coord}, Z: ${star.y_coord}`;

    const empire = gameState.empires.find(e => e.id === playerEmpireId);
    const explored = new Set(empire?.explored_systems || []).has(starId);

    const listContainer = document.getElementById('hudPlanetsList');
    if (!explored) {
        listContainer.innerHTML = `
            <div class="hud-metric" style="color: var(--text-secondary); text-align: center; display: block; padding: 12px 0;">
                SECTOR UNEXPLORED<br>
                <span style="font-size: 0.65rem;">Dispatch scouts to synchronize telemetry</span>
            </div>
        `;
        return;
    }

    const planets = gameState.planets.filter(p => p.star_id === starId);
    let html = `<p class="input-label" style="margin-top: 10px;">PLANETARY BODIES</p>`;

    planets.forEach((p, idx) => {
        let colonistLabel = '<span class="hud-planet-colonist text-secondary">UNCOLONIZED</span>';
        if (p.colonized_by_empire_id) {
            const isMe = p.colonized_by_empire_id === playerEmpireId;
            const empireColor = isMe ? 'var(--tertiary)' : 'var(--error)';
            const name = isMe ? 'OWNED' : 'FOREIGN ENTITY';
            colonistLabel = `<span class="hud-planet-colonist" style="color: ${empireColor}; background: rgba(0,0,0,0.3); border: 1.5px solid ${empireColor};">${name}</span>`;
        }

        html += `
            <div class="hud-planet-row">
                <span>Planet ${star.name}-${String.fromCharCode(65 + idx)}</span>
                ${colonistLabel}
            </div>
        `;
    });

    listContainer.innerHTML = html;
}

function closeStarHud() {
    document.getElementById('selectedStarHud').style.display = 'none';
    selectedStarId = null;
    renderGalaxyMap3D();
}

// ==========================================================================
// ⇄ DISPATCH ACTIONS & ORDER MATRIX QUEUE
// ==========================================================================
function populateSelects() {
    const sourceSelect = document.getElementById('sourceSelect');
    const targetSelect = document.getElementById('targetSelect');

    sourceSelect.innerHTML = '<option value="">Select Command Origin...</option>';
    targetSelect.innerHTML = '<option value="">Select Destination Sector...</option>';

    const myFleets = gameState.fleets.filter(f => f.empire_id === playerEmpireId);
    for (const fleet of myFleets) {
        const star = gameState.stars.find(s => s.id === fleet.star_id);
        const shipCount = Object.values(fleet.composition).reduce((a, b) => a + b, 0);
        sourceSelect.innerHTML += `<option value="${fleet.id}">${fleet.name} @ ${star?.name || 'Sector Hub'} (${shipCount} units)</option>`;
    }

    for (const star of gameState.stars) {
        targetSelect.innerHTML += `<option value="${star.id}">${star.name}</option>`;
    }

    // Match current selection
    if (selectedStarId) {
        targetSelect.value = selectedStarId;
    }
}

function addAction() {
    const actionType = document.getElementById('actionType').value;
    const sourceId = document.getElementById('sourceSelect').value;
    const targetId = document.getElementById('targetSelect').value;

    if (!sourceId) {
        speakAdvisor("Command alert. Action rejected. Source node must be specified.");
        alert('Please select a source');
        return;
    }

    let action = {
        type: actionType,
        turnNumber: gameState.currentTurn
    };

    let eventVoiceText = "Order dispatched. Synching commands matrix.";

    switch (actionType) {
        case 'MOVE_FLEET':
            if (!targetId) { speakAdvisor("Alert. Target destination sector required."); alert('Select destination'); return; }
            action.payload = { fleetId: sourceId, destinationStarId: targetId };

            const destStar = gameState.stars.find(s => s.id === targetId);
            eventVoiceText = `Orders dispatched. Flight coordinates mapped to the ${destStar?.name || 'target'} system. Engage hyperdrive core.`;
            break;

        case 'COLONIZE_PLANET':
            const fleet = gameState.fleets.find(f => f.id === sourceId);
            const planet = gameState.planets.find(p => p.star_id === fleet?.star_id && !p.colonized_by_empire_id);
            if (!planet) {
                speakAdvisor("Strategic error. No uncolonized planetary bodies available at the selected fleet signature.");
                alert('No uncolonized planet at fleet location');
                return;
            }
            action.payload = { fleetId: sourceId, planetId: planet.id };
            eventVoiceText = "Initiating colony sequence operations. Orbital drops launched. A new world joins our dominion.";
            break;

        case 'BUILD_STRUCTURE':
            const colonizedPlanet = gameState.planets.find(p => p.colonized_by_empire_id === playerEmpireId);
            if (!colonizedPlanet) { speakAdvisor("Alert. We possess no planetary colonies capable of orbital construction."); alert('No colonized planet'); return; }
            action.payload = { planetId: colonizedPlanet.id, structureType: 'mine', shipType: 'scout' };
            eventVoiceText = "Dispatching constructor craft units. Initiating deep crust mining structures.";
            break;

        case 'CONSTRUCT_SHIP':
            const shipyardPlanet = gameState.planets.find(p => p.colonized_by_empire_id === playerEmpireId);
            if (!shipyardPlanet) { speakAdvisor("Alert. Shipyard facilities must be established first."); alert('No colonized planet'); return; }
            action.payload = { planetId: shipyardPlanet.id, structureType: 'mine', shipType: 'scout' };
            eventVoiceText = "Orbital drydock active. Fabricating additional scout ships. Power systems online.";
            break;

        case 'START_RESEARCH':
            action.payload = { empireId: playerEmpireId, techId: 'adv_mining' };
            eventVoiceText = "Research labs active. Decrypting new telemetry equations to refine mining yields.";
            break;

        case 'ESTABLISH_TRADE_ROUTE':
            const planets = gameState.planets.filter(p => p.colonized_by_empire_id === playerEmpireId);
            if (planets.length < 2) { speakAdvisor("Alert. Trade route matrices require at least two colonized planets."); alert('Need 2 colonized planets'); return; }
            action.payload = { empireId: playerEmpireId, sourcePlanetId: planets[0].id, destinationPlanetId: planets[1].id };
            eventVoiceText = "Commercial hyper-lines synchronized. Trade transports are launching cargo systems.";
            break;
    }

    actionsQueue.push(action);
    renderActionsQueue();
    speakAdvisor(eventVoiceText);
}

function renderActionsQueue() {
    const container = document.getElementById('actionsQueue');
    container.innerHTML = actionsQueue.map((a, i) => {
        let text = a.type.replace('_', ' ');
        return `
            <div class="action-item">
                <span>${i + 1}. ${text}</span>
                <button onclick="removeAction(${i})" style="background:none;border:none;color:var(--error);cursor:pointer;font-weight:bold;font-size:0.9rem;">✕</button>
            </div>
        `;
    }).join('');
}

function removeAction(index) {
    actionsQueue.splice(index, 1);
    renderActionsQueue();
    speakAdvisor("Dispelling queued command order.");
}

// ==========================================================================
// 🪐 SUBMIT TURN & STRATEGIC DISCOVERIES
// ==========================================================================
async function submitTurn() {
    if (actionsQueue.length === 0) {
        speakAdvisor("Turn execution postponed. No commands currently lined up in our queue.");
        alert('No actions to submit');
        return;
    }

    speakAdvisor("Orders dispatched to imperial fleet units. Initiating turn telemetry cycle calculations.");

    try {
        const response = await fetch('/api/turns/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gameId: gameState.gameId,
                empireId: playerEmpireId,
                actions: actionsQueue
            })
        });

        if (!response.ok) throw new Error('Failed to submit turn');

        const result = await response.json();

        gameState = sanitizeGameState(result.newState);
        actionsQueue = [];

        renderGame();
        renderTurnResults(result);

        // Custom Advisor comments on turn outcome!
        setTimeout(() => {
            if (result.victory) {
                speakAdvisor("Domination sequence completed. The galaxy bends to our absolute sovereign will. Victory is ours!");
            } else if (result.battleResult && result.battleResult.shipsDestroyed > 0) {
                speakAdvisor(`Telemetry alert, Commander. Battle engagements occurred. ${result.battleResult.shipsDestroyed} foreign ship signals have been extinguished.`);
            } else {
                speakAdvisor(`Galactic telemetry shift complete. Enter Turn ${gameState.currentTurn}. Sector grids are stable. Resource channels are updated.`);
            }
        }, 1200);

    } catch (err) {
        alert('Error submitting turn: ' + err.message);
    }
}

function renderTurnResults(result) {
    const panel = document.getElementById('feedbackPanel');
    panel.style.display = 'block';

    let html = `<p>Imperial Directive execution for Turn ${result.newState.currentTurn - 1} completed.</p>`;

    if (result.victory) {
        html += `<p style="color: var(--tertiary); font-weight: bold; font-family: 'Outfit'; font-size: 1rem; margin-top: 8px;">🎉 IMPERIAL DOMINATION ACHIEVED: ${result.victory.victoryType.toUpperCase()}</p>`;
    }

    if (result.battleResult) {
        const destroyed = result.battleResult.shipsDestroyed || 0;
        const color = destroyed > 0 ? 'var(--error)' : 'var(--text-secondary)';
        html += `<p style="color: ${color}; font-weight: 500;">Combat units lost in sector: ${destroyed} vessels</p>`;
    } else {
        html += `<p style="color: var(--text-secondary);">No hostiles intersected our fleet boundaries.</p>`;
    }

    document.getElementById('turnResults').innerHTML = html;

    // Auto fadeout telemetry card
    setTimeout(() => {
        panel.style.display = 'none';
    }, 7000);
}