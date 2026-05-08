let gameState = null;
let playerEmpireId = null;
let actionsQueue = [];
let mapScale = 1;
let mapOffsetX = 0;
let mapOffsetY = 0;

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
});

function initEventListeners() {
    document.getElementById('createGameForm').addEventListener('submit', createGame);
    document.getElementById('addActionBtn').addEventListener('click', addAction);
    document.getElementById('submitTurnBtn').addEventListener('click', submitTurn);
    document.getElementById('zoomIn').addEventListener('click', () => adjustZoom(0.2));
    document.getElementById('zoomOut').addEventListener('click', () => adjustZoom(-0.2));
}

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
        
        gameState = await response.json();
        playerEmpireId = gameState.empires[0].id;
        
        document.getElementById('gameSetup').style.display = 'none';
        document.getElementById('gameMain').style.display = 'flex';
        
        renderGame();
    } catch (err) {
        alert('Error creating game: ' + err.message);
    }
}

function renderGame() {
    updateHeader();
    renderEmpireInfo();
    renderResources();
    renderVictoryProgress();
    renderGalaxyMap();
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
            <span class="label">Planets</span>
            <span>${planets.length}</span>
        </div>
        <div class="empire-stat">
            <span class="label">Fleets</span>
            <span>${fleets.length}</span>
        </div>
        <div class="empire-stat">
            <span class="label">Ships</span>
            <span>${fleets.reduce((sum, f) => sum + Object.values(f.composition).reduce((a, b) => a + b, 0), 0)}</span>
        </div>
        <div class="empire-stat">
            <span class="label">Explored</span>
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
    const victoryTypes = ['domination', 'conquest', 'technological', 'economic', 'exploration'];
    const labels = {
        domination: 'Domination (50% systems)',
        conquest: 'Conquest (eliminate rivals)',
        technological: 'Technology (complete research)',
        economic: 'Economic (10k credits)',
        exploration: 'Exploration (90% systems)'
    };
    
    let html = '';
    const controlledStars = gameState.planets.filter(p => p.colonized_by_empire_id === playerEmpireId).length;
    const totalStars = gameState.stars.length;
    const dominationPct = totalStars > 0 ? (controlledStars / totalStars * 100) : 0;
    
    html += `<div class="victory-bar">
        <div class="label"><span>${labels.domination}</span><span>${Math.round(dominationPct)}%</span></div>
        <div class="progress-fill" style="width: ${dominationPct}%"></div>
    </div>`;
    
    const rivalCount = gameState.empires.filter(e => e.id !== playerEmpireId).length;
    const conquestPct = rivalCount === 0 ? 100 : 0;
    html += `<div class="victory-bar">
        <div class="label"><span>${labels.conquest}</span><span>${rivalCount} rivals</span></div>
        <div class="progress-fill" style="width: ${100 - conquestPct}%"></div>
    </div>`;
    
    const empire = gameState.empires.find(e => e.id === playerEmpireId);
    const techProgress = empire?.research?.progress || 0;
    html += `<div class="victory-bar">
        <div class="label"><span>${labels.technological}</span><span>${Math.round(techProgress * 100)}%</span></div>
        <div class="progress-fill" style="width: ${techProgress * 100}%"></div>
    </div>`;
    
    const credits = gameState.planets.filter(p => p.colonized_by_empire_id === playerEmpireId).reduce((sum, p) => sum + (p.resources?.credits || 0), 0);
    const economicPct = Math.min(credits / 10000 * 100, 100);
    html += `<div class="victory-bar">
        <div class="label"><span>${labels.economic}</span><span>${credits}</span></div>
        <div class="progress-fill" style="width: ${economicPct}%"></div>
    </div>`;
    
    const exploredPct = totalStars > 0 ? ((empire?.explored_systems?.length || 0) / totalStars * 100) : 0;
    html += `<div class="victory-bar">
        <div class="label"><span>${labels.exploration}</span><span>${Math.round(exploredPct)}%</span></div>
        <div class="progress-fill" style="width: ${exploredPct}%"></div>
    </div>`;
    
    document.getElementById('victoryProgress').innerHTML = html;
}

function renderGalaxyMap() {
    const map = document.getElementById('galaxyMap');
    map.innerHTML = '';
    
    const mapWidth = map.clientWidth;
    const mapHeight = map.clientHeight;
    
    const minX = Math.min(...gameState.stars.map(s => s.x_coord));
    const maxX = Math.max(...gameState.stars.map(s => s.x_coord));
    const minY = Math.min(...gameState.stars.map(s => s.y_coord));
    const maxY = Math.max(...gameState.stars.map(s => s.y_coord));
    
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const padding = 50;
    const scaleX = (mapWidth - padding * 2) / rangeX;
    const scaleY = (mapHeight - padding * 2) / rangeY;
    const scale = Math.min(scaleX, scaleY) * 0.8;
    
    function toMapX(x) { return (x - minX) * scale + padding; }
    function toMapY(y) { return (y - minY) * scale + padding; }
    
    for (const lane of gameState.starLanes) {
        const s1 = gameState.stars.find(s => s.id === lane.source_star_id);
        const s2 = gameState.stars.find(s => s.id === lane.destination_star_id);
        if (!s1 || !s2) continue;
        
        const line = document.createElement('div');
        line.className = 'star-lane';
        
        const x1 = toMapX(s1.x_coord);
        const y1 = toMapY(s1.y_coord);
        const x2 = toMapX(s2.x_coord);
        const y2 = toMapY(s2.y_coord);
        
        const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        
        line.style.width = `${length}px`;
        line.style.left = `${x1}px`;
        line.style.top = `${y1}px`;
        line.style.transform = `rotate(${angle}deg)`;
        
        map.appendChild(line);
    }
    
    const empire = gameState.empires.find(e => e.id === playerEmpireId);
    const exploredSet = new Set(empire?.explored_systems || []);
    
    for (const star of gameState.stars) {
        const x = toMapX(star.x_coord);
        const y = toMapY(star.y_coord);
        
        const starDiv = document.createElement('div');
        starDiv.className = 'star-system';
        starDiv.style.left = `${x}px`;
        starDiv.style.top = `${y}px`;
        
        const starInner = document.createElement('div');
        starInner.className = 'star';
        
        if (exploredSet.has(star.id)) {
            starInner.classList.add('explored');
            const planet = gameState.planets.find(p => p.star_id === star.id && p.colonized_by_empire_id === playerEmpireId);
            if (planet) starInner.classList.add('colonized');
        }
        
        starDiv.appendChild(starInner);
        
        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = star.name;
        starDiv.appendChild(label);
        
        const planets = gameState.planets.filter(p => p.star_id === star.id);
        planets.forEach((p, i) => {
            const dot = document.createElement('div');
            dot.className = 'planet-dot';
            dot.style.left = `${20 + i * 10}px`;
            dot.style.top = '35px';
            if (p.colonized_by_empire_id === playerEmpireId) {
                dot.style.background = '#44ff88';
            } else if (exploredSet.has(star.id)) {
                dot.style.background = '#4488ff';
            }
            starDiv.appendChild(dot);
        });
        
        map.appendChild(starDiv);
    }
    
    for (const fleet of gameState.fleets) {
        const star = gameState.stars.find(s => s.id === fleet.star_id);
        if (!star) continue;
        
        const x = toMapX(star.x_coord);
        const y = toMapY(star.y_coord);
        
        const fleetDiv = document.createElement('div');
        fleetDiv.className = 'fleet-marker';
        fleetDiv.style.left = `${x + 10}px`;
        fleetDiv.style.top = `${y - 10}px`;
        
        const empire = gameState.empires.find(e => e.id === fleet.empire_id);
        if (empire?.player_type === 'human') {
            fleetDiv.style.background = '#44ff88';
        } else {
            fleetDiv.style.background = '#ff4444';
        }
        
        map.appendChild(fleetDiv);
    }
}

function populateSelects() {
    const sourceSelect = document.getElementById('sourceSelect');
    const targetSelect = document.getElementById('targetSelect');
    
    sourceSelect.innerHTML = '<option value="">Select Source...</option>';
    targetSelect.innerHTML = '<option value="">Select Target...</option>';
    
    const myFleets = gameState.fleets.filter(f => f.empire_id === playerEmpireId);
    for (const fleet of myFleets) {
        const star = gameState.stars.find(s => s.id === fleet.star_id);
        const shipCount = Object.values(fleet.composition).reduce((a, b) => a + b, 0);
        sourceSelect.innerHTML += `<option value="${fleet.id}">${fleet.name} @ ${star?.name || 'Unknown'} (${shipCount} ships)</option>`;
    }
    
    for (const star of gameState.stars) {
        targetSelect.innerHTML += `<option value="${star.id}">${star.name}</option>`;
    }
}

function addAction() {
    const actionType = document.getElementById('actionType').value;
    const sourceId = document.getElementById('sourceSelect').value;
    const targetId = document.getElementById('targetSelect').value;
    
    if (!sourceId) {
        alert('Please select a source');
        return;
    }
    
    let action = {
        type: actionType,
        turnNumber: gameState.currentTurn
    };
    
    switch (actionType) {
        case 'MOVE_FLEET':
            if (!targetId) { alert('Select destination'); return; }
            action.payload = { fleetId: sourceId, destinationStarId: targetId };
            break;
        case 'COLONIZE_PLANET':
            const fleet = gameState.fleets.find(f => f.id === sourceId);
            const planet = gameState.planets.find(p => p.star_id === fleet?.star_id && !p.colonized_by_empire_id);
            if (!planet) { alert('No uncolonized planet at fleet location'); return; }
            action.payload = { fleetId: sourceId, planetId: planet.id };
            break;
        case 'BUILD_STRUCTURE':
        case 'CONSTRUCT_SHIP':
            const colonizedPlanet = gameState.planets.find(p => p.colonized_by_empire_id === playerEmpireId);
            if (!colonizedPlanet) { alert('No colonized planet'); return; }
            action.payload = { planetId: colonizedPlanet.id, structureType: 'mine', shipType: 'scout' };
            break;
        case 'START_RESEARCH':
            action.payload = { empireId: playerEmpireId, techId: 'adv_mining' };
            break;
        case 'ESTABLISH_TRADE_ROUTE':
            const planets = gameState.planets.filter(p => p.colonized_by_empire_id === playerEmpireId);
            if (planets.length < 2) { alert('Need 2 colonized planets'); return; }
            action.payload = { empireId: playerEmpireId, sourcePlanetId: planets[0].id, destinationPlanetId: planets[1].id };
            break;
    }
    
    actionsQueue.push(action);
    renderActionsQueue();
}

function renderActionsQueue() {
    const container = document.getElementById('actionsQueue');
    container.innerHTML = actionsQueue.map((a, i) => `
        <div class="action-item">
            ${i + 1}. ${a.type}
            <button onclick="removeAction(${i})" style="float:right;background:none;border:none;color:#f44;cursor:pointer;">✕</button>
        </div>
    `).join('');
}

function removeAction(index) {
    actionsQueue.splice(index, 1);
    renderActionsQueue();
}

async function submitTurn() {
    if (actionsQueue.length === 0) {
        alert('No actions to submit');
        return;
    }
    
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
        
        gameState = result.newState;
        actionsQueue = [];
        
        renderGame();
        renderTurnResults(result);
        
    } catch (err) {
        alert('Error submitting turn: ' + err.message);
    }
}

function renderTurnResults(result) {
    const panel = document.getElementById('feedbackPanel');
    panel.style.display = 'block';
    
    let html = `<p>Turn ${result.newState.currentTurn} completed!</p>`;
    
    if (result.victory) {
        html += `<p style="color: var(--accent-yellow); font-weight: bold;">🎉 Victory! ${result.victory.victoryType}</p>`;
    }
    
    html += `<p>Ships destroyed: ${result.battleResult?.shipsDestroyed || 0}</p>`;
    
    document.getElementById('turnResults').innerHTML = html;
    
    setTimeout(() => {
        panel.style.display = 'none';
    }, 5000);
}

function adjustZoom(delta) {
    mapScale = Math.max(0.5, Math.min(2, mapScale + delta));
    renderGalaxyMap();
}