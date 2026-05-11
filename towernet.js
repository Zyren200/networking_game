
// ================================================================
// CONSTANTS & CONFIG
// ================================================================
const TILE = 44;
const COLS = 18, ROWS = 11;
const CW = COLS * TILE; // 792
const CH = ROWS * TILE; // 484

// Path waypoints (tile coords)
const WAYPOINTS = [
  [0,5],[4,5],[4,2],[8,2],[8,8],[13,8],[13,4],[17,4]
];

// Build path tile set
function buildPathSet() {
  const s = new Set();
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    let [c0,r0] = WAYPOINTS[i], [c1,r1] = WAYPOINTS[i+1];
    if (c0 === c1) {
      let mn = Math.min(r0,r1), mx = Math.max(r0,r1);
      for (let r = mn; r <= mx; r++) s.add(`${c0},${r}`);
    } else {
      let mn = Math.min(c0,c1), mx = Math.max(c0,c1);
      for (let c = mn; c <= mx; c++) s.add(`${c},${r0}`);
    }
  }
  return s;
}
const PATH_SET = buildPathSet();
const SERVER_TILE = WAYPOINTS[WAYPOINTS.length - 1];

// ================================================================
// TOWER TYPES
// ================================================================
const TOWER_DEFS = {
  router: {
    name:'Router', layer:'Network (Layer 3)', protocol:'IP / ICMP',
    cost:50, damage:20, range:110, fireRate:1.5,
    color:'#00ccff', glow:'#00ccff',
    desc:'Routes packets using IP addressing. Consistent moderate damage.',
    emoji:'🌐',
    upgrades:[
      {cost:40,damage:28,range:115,fireRate:1.8,label:'BGP Routing'},
      {cost:60,damage:40,range:125,fireRate:2.2,label:'OSPF Optimized'}
    ]
  },
  firewall: {
    name:'Firewall', layer:'Transport (Layer 4)', protocol:'TCP / UDP',
    cost:75, damage:15, range:95, fireRate:2.0, slow:0.55,
    color:'#ff6600', glow:'#ff6600',
    desc:'Inspects port headers. Slows packets by 45% on hit.',
    emoji:'🔥',
    upgrades:[
      {cost:55,damage:22,range:105,fireRate:2.3,slow:0.4,label:'Deep Packet Inspect'},
      {cost:80,damage:32,range:115,fireRate:2.8,slow:0.25,label:'Next-Gen Firewall'}
    ]
  },
  ids: {
    name:'IDS Sensor', layer:'Data Link (Layer 2)', protocol:'MAC / Ethernet',
    cost:80, damage:14, range:105, fireRate:1.2, aoe:50,
    color:'#9900ff', glow:'#9900ff',
    desc:'Monitors Ethernet frames. Area-of-effect burst damage.',
    emoji:'🛡️',
    upgrades:[
      {cost:60,damage:20,range:115,fireRate:1.5,aoe:60,label:'Frame Analysis'},
      {cost:85,damage:30,range:125,fireRate:1.8,aoe:75,label:'IDS/IPS Hybrid'}
    ]
  },
  antivirus: {
    name:'Antivirus', layer:'Application (Layer 7)', protocol:'HTTP/DNS/SMTP',
    cost:100, damage:35, range:90, fireRate:0.9, bonusDmg:20,
    color:'#ff3399', glow:'#ff3399',
    desc:'Deep inspection of payload. +20 bonus damage vs malware packets.',
    emoji:'🦠',
    upgrades:[
      {cost:70,damage:50,range:100,fireRate:1.1,bonusDmg:30,label:'Heuristic Scan'},
      {cost:100,damage:70,range:110,fireRate:1.4,bonusDmg:50,label:'AI Threat Engine'}
    ]
  }
};

// ================================================================
// PACKET TYPES
// ================================================================
const PACKET_DEFS = {
  tcp:    {name:'TCP Packet',  layers:2, spd:55, hp:60,  reward:12, col:'#00ff88', type:'normal'},
  udp:    {name:'UDP Flood',   layers:1, spd:95, hp:35,  reward:8,  col:'#ffbb00', type:'fast'},
  http:   {name:'HTTP Request',layers:2, spd:60, hp:50,  reward:10, col:'#00ccff', type:'normal'},
  malware:{name:'Malware',     layers:3, spd:45, hp:120, reward:22, col:'#ff3366', type:'malicious'},
  ddos:   {name:'DDoS Packet', layers:4, spd:30, hp:220, reward:35, col:'#cc44ff', type:'heavy'},
  ransomware:{name:'Ransomware',layers:5,spd:25, hp:300, reward:50, col:'#ff6600', type:'boss'},
};

// ================================================================
// WAVE DEFINITIONS
// ================================================================
const WAVES = [
  [{t:'tcp',n:5,delay:1200}],
  [{t:'tcp',n:6,delay:1100},{t:'udp',n:3,delay:800}],
  [{t:'tcp',n:8,delay:1000},{t:'http',n:4,delay:900}],
  [{t:'udp',n:8,delay:700},{t:'malware',n:2,delay:1500}],
  [{t:'tcp',n:10,delay:900},{t:'malware',n:3,delay:1300}],
  [{t:'udp',n:10,delay:600},{t:'http',n:6,delay:800},{t:'malware',n:3,delay:1200}],
  [{t:'malware',n:6,delay:1000},{t:'ddos',n:2,delay:2000}],
  [{t:'tcp',n:12,delay:700},{t:'ddos',n:3,delay:1800},{t:'malware',n:4,delay:1100}],
  [{t:'ddos',n:5,delay:1500},{t:'malware',n:6,delay:1000},{t:'udp',n:8,delay:600}],
  [{t:'ransomware',n:3,delay:3000},{t:'ddos',n:6,delay:1200},{t:'malware',n:8,delay:900}],
];
const TOTAL_WAVES = WAVES.length;
const AUTO_WAVE_DELAY = 4;

// ================================================================
// GAME STATE
// ================================================================
let G = {};
let animFrame, lastTime = 0, gameSpeed = 1;

function initGameState(playerName) {
  G = {
    player: playerName,
    health: 100, maxHealth: 100,
    coins: 150, wave: 0, waveActive: false,
    towers: [], packets: [], projectiles: [], particles: [], dmgNums: [],
    towerGrid: {}, // key: "col,row" -> tower index
    selectedTowerType: null,
    selectedTowerIdx: -1,
    hoveredCell: null,
    preWaveActive: false,
    preWaveTimer: 0,
    nextWave: 1,
    waveQueue: [], spawnTimer: 0, spawnIdx: 0, spawnGroup: 0,
    score: 0, packetsDestroyed: 0, totalWaves: TOTAL_WAVES,
    gameOver: false, victory: false,
    logs: []
  };
}

// ================================================================
// CANVAS SETUP
// ================================================================
let canvas, ctx, hovCanvas, hovCtx;
function setupCanvas() {
  canvas = document.getElementById('gameCanvas');
  canvas.width = CW; canvas.height = CH;
  ctx = canvas.getContext('2d');
  hovCanvas = document.getElementById('hovOverlay');
  hovCanvas.width = CW; hovCanvas.height = CH;
  hovCtx = hovCanvas.getContext('2d');
  canvas.removeEventListener('pointerdown', onCanvasPointerDown);
  canvas.removeEventListener('pointermove', onCanvasPointerMove);
  canvas.removeEventListener('pointerleave', clearCanvasHover);
  canvas.removeEventListener('pointercancel', clearCanvasHover);
  canvas.addEventListener('pointerdown', onCanvasPointerDown);
  canvas.addEventListener('pointermove', onCanvasPointerMove);
  canvas.addEventListener('pointerleave', clearCanvasHover);
  canvas.addEventListener('pointercancel', clearCanvasHover);
  refreshCanvasLayout();
}

function getCanvasPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    mx: (e.clientX - rect.left) * scaleX,
    my: (e.clientY - rect.top) * scaleY,
    clientX: e.clientX,
    clientY: e.clientY
  };
}

function getCanvasDisplayScale() {
  const rect = canvas.getBoundingClientRect();
  return {
    x: rect.width / canvas.width,
    y: rect.height / canvas.height
  };
}

function toCanvasDisplayPoint(x, y) {
  const scale = getCanvasDisplayScale();
  return {
    x: x * scale.x,
    y: y * scale.y,
    scale
  };
}

function clearCanvasHover() {
  G.hoveredCell = null;
  renderHover();
  document.getElementById('osiTooltip').style.display = 'none';
}

function refreshCanvasLayout() {
  clearCanvasHover();
  document.querySelectorAll('.dmg-num').forEach(el => el.remove());
}

function onCanvasPointerDown(e) {
  if (e.cancelable) e.preventDefault();
  onCanvasHover(e);
  onCanvasClick(e);
}

function onCanvasPointerMove(e) {
  if (e.pointerType === 'touch' && !G.selectedTowerType && G.selectedTowerIdx === -1) return;
  onCanvasHover(e);
}

// ================================================================
// RENDERING
// ================================================================
function render() {
  ctx.clearRect(0, 0, CW, CH);
  drawBackground();
  drawPath();
  drawGrid();
  drawServer();
  drawTowers();
  drawPackets();
  drawProjectiles();
  drawParticles();
}

function drawBackground() {
  ctx.fillStyle = '#050b18';
  ctx.fillRect(0, 0, CW, CH);
  // Circuit pattern
  ctx.strokeStyle = '#080f20';
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c*TILE, 0); ctx.lineTo(c*TILE, CH); ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r*TILE); ctx.lineTo(CW, r*TILE); ctx.stroke();
  }
  // Subtle dot nodes at intersections
  ctx.fillStyle = '#0a1a30';
  for (let c = 0; c <= COLS; c++) for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.arc(c*TILE, r*TILE, 1.5, 0, Math.PI*2); ctx.fill();
  }
}

function drawPath() {
  // Path glow background
  PATH_SET.forEach(key => {
    const [c,r] = key.split(',').map(Number);
    ctx.fillStyle = '#080f28';
    ctx.fillRect(c*TILE+1, r*TILE+1, TILE-2, TILE-2);
  });
  // Path lane lines
  ctx.strokeStyle = '#0a2050';
  ctx.lineWidth = 2;
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const [c0,r0] = WAYPOINTS[i], [c1,r1] = WAYPOINTS[i+1];
    ctx.beginPath();
    ctx.moveTo(c0*TILE+TILE/2, r0*TILE+TILE/2);
    ctx.lineTo(c1*TILE+TILE/2, r1*TILE+TILE/2);
    ctx.stroke();
  }
  // Glowing center line
  ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 6;
  ctx.strokeStyle = '#003355'; ctx.lineWidth = 4;
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const [c0,r0] = WAYPOINTS[i], [c1,r1] = WAYPOINTS[i+1];
    ctx.beginPath();
    ctx.moveTo(c0*TILE+TILE/2, r0*TILE+TILE/2);
    ctx.lineTo(c1*TILE+TILE/2, r1*TILE+TILE/2);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  // Waypoint nodes
  WAYPOINTS.slice(1,-1).forEach(([c,r]) => {
    ctx.fillStyle = '#001a40';
    ctx.strokeStyle = '#004488';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(c*TILE+TILE/2, r*TILE+TILE/2, 8, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0066aa';
    ctx.beginPath(); ctx.arc(c*TILE+TILE/2, r*TILE+TILE/2, 3, 0, Math.PI*2); ctx.fill();
  });
  // Entry label
  ctx.fillStyle = '#005588'; ctx.font = '8px Share Tech Mono';
  ctx.fillText('IN', 4, WAYPOINTS[0][1]*TILE+TILE/2+3);
}

function drawGrid() {
  // Highlight buildable cells on hover
  if (G.hoveredCell) {
    const {c, r} = G.hoveredCell;
    const key = `${c},${r}`;
    const valid = !PATH_SET.has(key) && !G.towerGrid[key] && G.selectedTowerType;
    ctx.fillStyle = valid ? 'rgba(0,200,100,0.12)' : 'rgba(255,50,50,0.08)';
    ctx.strokeStyle = valid ? '#00cc66' : '#ff3344';
    ctx.lineWidth = 1;
    ctx.fillRect(c*TILE+1, r*TILE+1, TILE-2, TILE-2);
    ctx.strokeRect(c*TILE+1, r*TILE+1, TILE-2, TILE-2);
  }
}

function drawServer() {
  const [sc, sr] = SERVER_TILE;
  const cx = sc*TILE+TILE/2, cy = sr*TILE+TILE/2;
  const hp = G.health / G.maxHealth;
  const col = hp > 0.5 ? '#00ff88' : hp > 0.25 ? '#ffaa00' : '#ff3344';
  // Glow
  ctx.shadowColor = col; ctx.shadowBlur = 20;
  ctx.fillStyle = '#050b18'; ctx.strokeStyle = col; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(sc*TILE+4, sr*TILE+4, TILE-8, TILE-8, 4);
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  // Server emoji
  ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🖥️', cx, cy);
  // HP bar
  ctx.fillStyle = '#0a1a2e';
  ctx.fillRect(sc*TILE, sr*TILE-6, TILE, 4);
  ctx.fillStyle = col;
  ctx.fillRect(sc*TILE, sr*TILE-6, TILE*hp, 4);
}

function drawTowers() {
  G.towers.forEach((t, idx) => {
    const cx = t.c*TILE+TILE/2, cy = t.r*TILE+TILE/2;
    const def = TOWER_DEFS[t.type];
    // Range ring (if selected)
    if (G.selectedTowerIdx === idx) {
      ctx.strokeStyle = def.color+'44'; ctx.lineWidth = 1;
      ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.arc(cx, cy, t.range, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
    }
    // Tower base
    ctx.shadowColor = def.glow; ctx.shadowBlur = 12;
    ctx.fillStyle = '#070d1e'; ctx.strokeStyle = def.color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(t.c*TILE+4, t.r*TILE+4, TILE-8, TILE-8, 3);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    // Icon
    ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(def.emoji, cx, cy);
    // Level badge
    if (t.level > 0) {
      ctx.fillStyle = def.color; ctx.font = 'bold 8px Orbitron';
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText('▲'+t.level, t.c*TILE+TILE-4, t.r*TILE+3);
    }
    // Attack flash
    if (t.flashTimer > 0) {
      ctx.fillStyle = def.color+'33';
      ctx.beginPath(); ctx.arc(cx, cy, TILE/2-2, 0, Math.PI*2); ctx.fill();
    }
  });
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function drawPackets() {
  G.packets.forEach(p => {
    if (p.dead) return;
    const def = PACKET_DEFS[p.type];
    const layers = p.layersLeft;
    const maxL = def.layers;
    // Outer layer glow
    ctx.shadowColor = def.col; ctx.shadowBlur = 8 + layers*3;
    ctx.strokeStyle = def.col; ctx.lineWidth = 1.5;
    for (let l = 0; l < layers; l++) {
      const r = 10 + l*4;
      const alpha = 0.3 + l*0.1;
      ctx.strokeStyle = def.col + Math.floor(alpha*255).toString(16).padStart(2,'0');
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    // Core
    ctx.fillStyle = def.col + 'cc';
    ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI*2); ctx.fill();
    // HP bar
    const hpRatio = p.hp / p.maxHp;
    ctx.fillStyle = '#111'; ctx.fillRect(p.x-12, p.y-18, 24, 3);
    ctx.fillStyle = hpRatio > 0.6 ? '#00ff88' : hpRatio > 0.3 ? '#ffaa00' : '#ff3344';
    ctx.fillRect(p.x-12, p.y-18, 24*hpRatio, 3);
    // Slow indicator
    if (p.slowTimer > 0) {
      ctx.strokeStyle = '#66aaff88'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI*2); ctx.stroke();
    }
  });
  ctx.shadowBlur = 0;
}

function drawProjectiles() {
  G.projectiles.forEach(proj => {
    const def = TOWER_DEFS[proj.towerType];
    ctx.shadowColor = def.glow; ctx.shadowBlur = 8;
    ctx.strokeStyle = def.color; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(proj.x - proj.vx*3, proj.y - proj.vy*3);
    ctx.lineTo(proj.x, proj.y);
    ctx.stroke();
    // Tip dot
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(proj.x, proj.y, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
  });
}

function drawParticles() {
  G.particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function renderHover() {
  hovCtx.clearRect(0, 0, CW, CH);
  if (!G.hoveredCell || !G.selectedTowerType) return;
  const {c, r} = G.hoveredCell;
  const key = `${c},${r}`;
  if (!PATH_SET.has(key) && !G.towerGrid[key]) {
    const def = TOWER_DEFS[G.selectedTowerType];
    hovCtx.strokeStyle = def.color+'44'; hovCtx.lineWidth = 1;
    hovCtx.setLineDash([3,3]);
    hovCtx.beginPath();
    hovCtx.arc(c*TILE+TILE/2, r*TILE+TILE/2, def.range, 0, Math.PI*2);
    hovCtx.stroke();
    hovCtx.setLineDash([]);
  }
}

// ================================================================
// GAME LOGIC UPDATE
// ================================================================
function update(dt) {
  if (G.gameOver || G.victory) return;
  updatePreWave(dt);
  const simDt = dt * gameSpeed;
  updateSpawner(simDt);
  updatePackets(simDt);
  updateTowers(simDt);
  updateProjectiles(simDt);
  updateParticles(simDt);
  updateDmgNums(simDt);
  checkWaveEnd();
}

// Path position computation
function getPathPos(dist) {
  let traveled = 0;
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const [c0,r0] = WAYPOINTS[i], [c1,r1] = WAYPOINTS[i+1];
    const x0 = c0*TILE+TILE/2, y0 = r0*TILE+TILE/2;
    const x1 = c1*TILE+TILE/2, y1 = r1*TILE+TILE/2;
    const segLen = Math.hypot(x1-x0, y1-y0);
    if (traveled + segLen >= dist) {
      const t = (dist - traveled) / segLen;
      return {x: x0+(x1-x0)*t, y: y0+(y1-y0)*t};
    }
    traveled += segLen;
  }
  return null; // reached end
}

function getTotalPathLength() {
  let len = 0;
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const [c0,r0] = WAYPOINTS[i], [c1,r1] = WAYPOINTS[i+1];
    len += Math.hypot((c1-c0)*TILE, (r1-r0)*TILE);
  }
  return len;
}
const TOTAL_PATH_LEN = getTotalPathLength();

function updatePackets(dt) {
  G.packets.forEach(p => {
    if (p.dead) return;
    const spd = p.slowTimer > 0 ? p.speed * p.slowFactor : p.speed;
    p.dist += spd * dt;
    if (p.slowTimer > 0) p.slowTimer -= dt;
    const pos = getPathPos(p.dist);
    if (!pos) {
      // Reached server
      p.dead = true;
      const dmg = 10 + p.layersLeft * 5;
      G.health = Math.max(0, G.health - dmg);
      updateHUD();
      spawnParticles(SERVER_TILE[0]*TILE+TILE/2, SERVER_TILE[1]*TILE+TILE/2, '#ff3344', 8);
      addLog(`⚠ ${PACKET_DEFS[p.type].name} breached server! -${dmg}% integrity`);
      if (G.health <= 0) triggerGameOver();
    } else {
      p.x = pos.x; p.y = pos.y;
    }
  });
  G.packets = G.packets.filter(p => !p.dead);
}

function updateTowers(dt) {
  G.towers.forEach(t => {
    t.flashTimer = Math.max(0, (t.flashTimer||0) - dt);
    t.cooldown = Math.max(0, (t.cooldown||0) - dt);
    if (t.cooldown > 0) return;
    // Find target
    const cx = t.c*TILE+TILE/2, cy = t.r*TILE+TILE/2;
    let bestTarget = null, bestDist = Infinity;
    // Prioritize furthest along path
    G.packets.forEach(p => {
      if (p.dead) return;
      const d = Math.hypot(p.x-cx, p.y-cy);
      if (d <= t.range && p.dist > (bestTarget?.dist ?? -1)) {
        bestTarget = p; bestDist = d;
      }
    });
    if (!bestTarget) return;
    // Fire
    fireProjectile(t, bestTarget, cx, cy);
    t.cooldown = 1 / t.fireRate;
    t.flashTimer = 0.1;
  });
}

function fireProjectile(tower, target, sx, sy) {
  const def = TOWER_DEFS[tower.type];
  let dmg = tower.damage;
  if (tower.type === 'antivirus' && PACKET_DEFS[target.type].type === 'malicious') {
    dmg += tower.bonusDmg || 0;
  }
  if (tower.type === 'ids') {
    // AOE
    G.projectiles.push({x:sx,y:sy,tx:target.x,ty:target.y,
      vx:0,vy:0,speed:280,towerType:tower.type,
      dmg,tid:target.id,aoe:tower.aoe,slow:0,life:1});
  } else {
    G.projectiles.push({x:sx,y:sy,
      tx:target.x,ty:target.y,
      vx:0,vy:0,speed:320,towerType:tower.type,
      dmg,tid:target.id,
      slow:tower.type==='firewall'?(tower.slow||0.55):0,
      slowDur:tower.type==='firewall'?1.5:0,
      aoe:0,life:1});
  }
}

function updateProjectiles(dt) {
  G.projectiles.forEach(proj => {
    // Find target
    const target = G.packets.find(p => p.id === proj.tid);
    if (target && !target.dead) {
      proj.tx = target.x; proj.ty = target.y;
    }
    const dx = proj.tx - proj.x, dy = proj.ty - proj.y;
    const dist = Math.hypot(dx, dy);
    if (dist < proj.speed * dt * 1.5) {
      // Hit
      proj.life = 0;
      if (proj.aoe > 0) {
        // AOE damage
        G.packets.forEach(p => {
          if (p.dead) return;
          const d = Math.hypot(p.x-proj.tx, p.y-proj.ty);
          if (d <= proj.aoe) dealDamage(p, proj.dmg, proj.towerType);
        });
        spawnParticles(proj.tx, proj.ty, TOWER_DEFS[proj.towerType].color, 6);
        // Draw AoE ring briefly
        drawAoERing(proj.tx, proj.ty, proj.aoe, TOWER_DEFS[proj.towerType].color);
      } else if (target && !target.dead) {
        dealDamage(target, proj.dmg, proj.towerType);
        if (proj.slow > 0 && target) {
          target.slowFactor = proj.slow;
          target.slowTimer = proj.slowDur;
        }
        spawnParticles(proj.tx, proj.ty, TOWER_DEFS[proj.towerType].color, 4);
      }
    } else {
      proj.x += (dx/dist) * proj.speed * dt;
      proj.y += (dy/dist) * proj.speed * dt;
    }
  });
  G.projectiles = G.projectiles.filter(p => p.life > 0);
}

function dealDamage(packet, dmg, towerType) {
  packet.hp -= dmg;
  spawnDmgNum(packet.x, packet.y, dmg, TOWER_DEFS[towerType].color);
  // Remove layers
  const def = PACKET_DEFS[packet.type];
  const hpPerLayer = packet.maxHp / def.layers;
  packet.layersLeft = Math.ceil(packet.hp / hpPerLayer);
  packet.layersLeft = Math.max(0, Math.min(packet.layersLeft, def.layers));
  if (packet.hp <= 0) {
    packet.dead = true;
    G.coins += def.reward;
    G.score += def.reward * 10;
    G.packetsDestroyed++;
    updateHUD();
    spawnParticles(packet.x, packet.y, def.col, 10);
    addLog(`✓ ${def.name} destroyed [${def.layers} layers stripped] +${def.reward}¢`);
  }
}

let aoeFlashes = [];
function drawAoERing(x,y,r,col) { aoeFlashes.push({x,y,r,col,life:0.4}); }

function updateParticles(dt) {
  G.particles.forEach(p => {
    p.x += p.vx*dt; p.y += p.vy*dt;
    p.life -= dt * 1.5;
    p.size = Math.max(0, p.size - dt*3);
  });
  G.particles = G.particles.filter(p => p.life > 0);
  aoeFlashes.forEach(a => {
    a.life -= dt * 3;
    ctx.strokeStyle = a.col + Math.floor(a.life*255).toString(16).padStart(2,'0');
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(a.x, a.y, a.r*(1-a.life/0.4+0.5), 0, Math.PI*2); ctx.stroke();
  });
  aoeFlashes = aoeFlashes.filter(a => a.life > 0);
}

function updateDmgNums(dt) {
  document.querySelectorAll('.dmg-num').forEach(el => {
    const age = parseFloat(el.dataset.age || 0) + dt;
    el.dataset.age = age;
    if (age > 0.8) el.remove();
  });
}

// ================================================================
// SPAWNER
// ================================================================
function updateSpawner(dt) {
  if (!G.waveActive || G.spawnGroup >= G.waveQueue.length) return;
  G.spawnTimer -= dt * 1000;
  if (G.spawnTimer <= 0) {
    spawnNextPacket();
  }
}

function spawnNextPacket() {
  const wq = G.waveQueue;
  if (G.spawnGroup >= wq.length) return;
  let grp = wq[G.spawnGroup];
  spawnPacket(grp.t);
  grp.remaining--;
  G.spawnTimer = grp.delay;
  if (grp.remaining <= 0) {
    G.spawnGroup++;
    if (G.spawnGroup < wq.length) G.spawnTimer = 500;
  }
}

function spawnPacket(type) {
  const def = PACKET_DEFS[type];
  const startPos = getPathPos(0);
  const id = Math.random().toString(36).slice(2);
  G.packets.push({
    id, type,
    x: startPos.x, y: startPos.y,
    dist: 0,
    hp: def.hp, maxHp: def.hp,
    layersLeft: def.layers,
    speed: def.spd,
    slowFactor: 1, slowTimer: 0,
    dead: false
  });
}

function queueNextWave(delay = AUTO_WAVE_DELAY) {
  if (G.gameOver || G.victory || G.waveActive || G.preWaveActive || G.wave >= TOTAL_WAVES) return;
  G.preWaveActive = true;
  G.preWaveTimer = delay;
  G.nextWave = G.wave + 1;
  updateWaveWarning();
  updateWaveButton();
  addLog(`WARNING: Wave ${G.nextWave} detected. Auto-launch in ${Math.ceil(delay)}s`);
}

function updatePreWave(dt) {
  if (!G.preWaveActive || G.gameOver || G.victory) return;
  G.preWaveTimer = Math.max(0, G.preWaveTimer - dt);
  updateWaveWarning();
  updateWaveButton();
  updateHUD();
  if (G.preWaveTimer <= 0) {
    beginWave();
  }
}

function beginWave() {
  if (G.gameOver || G.victory || G.waveActive || !G.preWaveActive || G.nextWave > TOTAL_WAVES) return;
  G.preWaveActive = false;
  G.wave = G.nextWave;
  G.waveActive = true;
  G.spawnGroup = 0;
  G.spawnTimer = 500;
  const waveDef = WAVES[G.wave - 1];
  G.waveQueue = waveDef.map(g => ({t:g.t, remaining:g.n, delay:g.delay}));
  updateWaveWarning();
  updateWaveButton();
  updateHUD();
  addLog(`Wave ${G.wave}/${TOTAL_WAVES} incoming! Threat level: ${getThreatLevel(G.wave)}`);
}

function checkWaveEnd() {
  if (!G.waveActive) return;
  const spawnDone = G.spawnGroup >= G.waveQueue.length;
  if (spawnDone && G.packets.length === 0) {
    G.waveActive = false;
    const bonus = 25 + G.wave * 5;
    G.coins += bonus;
    G.score += bonus * 10;
    updateHUD();
    addLog(`🎯 Wave ${G.wave} cleared! +${bonus} coins bonus`);
    if (G.wave >= TOTAL_WAVES) {
      triggerVictory();
    } else {
      document.getElementById('startWaveBtn').disabled = false;
      document.getElementById('startWaveBtn').textContent = `▶ LAUNCH WAVE ${G.wave+1}`;
    }
  }
}

// ================================================================
// TOWER PLACEMENT
// ================================================================
function onCanvasClick(e) {
  if (!G.selectedTowerType && G.selectedTowerIdx === -1) return;
  const {mx, my} = getCanvasPointerPos(e);
  const c = Math.floor(mx / TILE), r = Math.floor(my / TILE);
  if (c < 0||c >= COLS||r < 0||r >= ROWS) return;
  const key = `${c},${r}`;

  if (G.selectedTowerType) {
    // Place tower
    if (PATH_SET.has(key)) { addLog('✗ Cannot place tower on network path'); return; }
    if (G.towerGrid[key] !== undefined) { addLog('✗ Cell occupied'); return; }
    const def = TOWER_DEFS[G.selectedTowerType];
    if (G.coins < def.cost) { addLog(`✗ Insufficient coins (need ${def.cost})`); return; }
    G.coins -= def.cost;
    const idx = G.towers.length;
    G.towers.push({
      c, r, type: G.selectedTowerType,
      damage: def.damage, range: def.range, fireRate: def.fireRate,
      slow: def.slow||0, aoe: def.aoe||0, bonusDmg: def.bonusDmg||0,
      cooldown: 0, flashTimer: 0, level: 0
    });
    G.towerGrid[key] = idx;
    updateHUD();
    addLog(`✓ ${def.name} deployed at [${c},${r}] · ${def.layer}`);
    spawnParticles(c*TILE+TILE/2, r*TILE+TILE/2, def.color, 8);
    selectTower(null);
  } else if (G.selectedTowerIdx !== -1) {
    // Deselect if clicking elsewhere
    const clickedIdx = G.towerGrid[key];
    if (clickedIdx !== undefined) {
      G.selectedTowerIdx = clickedIdx;
      updateTowerActionsPanel();
    } else {
      G.selectedTowerIdx = -1;
      document.getElementById('towerActions').style.display = 'none';
    }
  }

  // Check click on existing tower
  if (G.selectedTowerType === null) {
    const clickedIdx = G.towerGrid[key];
    if (clickedIdx !== undefined) {
      G.selectedTowerIdx = clickedIdx;
      updateTowerActionsPanel();
    }
  }
}

function onCanvasHover(e) {
  const {mx, my, clientX, clientY} = getCanvasPointerPos(e);
  const c = Math.floor(mx / TILE), r = Math.floor(my / TILE);
  G.hoveredCell = {c, r};
  renderHover();

  // Tooltip for towers
  const key = `${c},${r}`;
  const tIdx = G.towerGrid[key];
  const tooltip = document.getElementById('osiTooltip');
  if (tIdx !== undefined) {
    const t = G.towers[tIdx];
    const def = TOWER_DEFS[t.type];
    document.getElementById('ottTitle').textContent = def.name.toUpperCase();
    document.getElementById('ottDesc').textContent = def.desc;
    document.getElementById('ottLayer').style.background = def.color+'33';
    document.getElementById('ottLayer').style.border = '1px solid '+def.color;
    document.getElementById('ottLayer').style.color = def.color;
    document.getElementById('ottLayer').textContent = `OSI ${def.layer} · ${def.protocol}`;
    const wrap = document.getElementById('canvasWrap');
    const wRect = wrap.getBoundingClientRect();
    const tipWidth = Math.min(200, Math.max(160, wRect.width - 24));
    const left = Math.min(clientX - wRect.left + 12, Math.max(12, wRect.width - tipWidth - 12));
    const top = Math.max(12, clientY - wRect.top - 20);
    tooltip.style.left = left+'px';
    tooltip.style.top = top+'px';
    tooltip.style.display = 'block';
  } else {
    tooltip.style.display = 'none';
  }
}

// ================================================================
// TOWER ACTIONS
// ================================================================
function updateTowerActionsPanel() {
  const panel = document.getElementById('towerActions');
  if (G.selectedTowerIdx < 0) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  const t = G.towers[G.selectedTowerIdx];
  const def = TOWER_DEFS[t.type];
  const upg = def.upgrades[t.level];
  const upgradeBtn = document.getElementById('upgradeBtn');
  const sellBtn = document.getElementById('sellBtn');
  const sellVal = Math.floor(def.cost * 0.6 + (t.level > 0 ? def.upgrades[t.level-1].cost*0.5 : 0));
  document.getElementById('selectedInfo').innerHTML =
    `<span style="color:#6699cc">${def.name}</span> Lv${t.level+1}<br>
     DMG: <span style="color:#00ff88">${t.damage}</span> · 
     RNG: <span style="color:#00ccff">${t.range}</span> · 
     SPD: <span style="color:#ffaa00">${t.fireRate.toFixed(1)}/s</span><br>
     <span style="color:#3a6080">${def.layer}</span>`;
  if (upg) {
    upgradeBtn.disabled = G.coins < upg.cost;
    upgradeBtn.textContent = `⬆ ${upg.label} (${upg.cost}¢)`;
  } else {
    upgradeBtn.disabled = true;
    upgradeBtn.textContent = '⬆ MAX LEVEL';
  }
  sellBtn.textContent = `$ SELL (+${sellVal}¢)`;
}

function upgradeTower() {
  if (G.selectedTowerIdx < 0) return;
  const t = G.towers[G.selectedTowerIdx];
  const def = TOWER_DEFS[t.type];
  const upg = def.upgrades[t.level];
  if (!upg || G.coins < upg.cost) return;
  G.coins -= upg.cost;
  Object.assign(t, upg);
  t.level++;
  updateHUD(); updateTowerActionsPanel();
  addLog(`⬆ ${def.name} upgraded to Lv${t.level+1} · ${upg.label}`);
  spawnParticles(t.c*TILE+TILE/2, t.r*TILE+TILE/2, def.color, 12);
}

function sellTower() {
  if (G.selectedTowerIdx < 0) return;
  const t = G.towers[G.selectedTowerIdx];
  const def = TOWER_DEFS[t.type];
  const sellVal = Math.floor(def.cost * 0.6 + (t.level > 0 ? def.upgrades[t.level-1].cost*0.5 : 0));
  delete G.towerGrid[`${t.c},${t.r}`];
  G.towers.splice(G.selectedTowerIdx, 1);
  // Rebuild towerGrid
  G.towerGrid = {};
  G.towers.forEach((tw, i) => { G.towerGrid[`${tw.c},${tw.r}`] = i; });
  G.coins += sellVal;
  G.selectedTowerIdx = -1;
  document.getElementById('towerActions').style.display = 'none';
  updateHUD();
  addLog(`$ ${def.name} sold for ${sellVal} coins`);
}

// ================================================================
// WAVE / GAME FLOW
// ================================================================
function startWave() {
  if (G.waveActive || G.wave >= TOTAL_WAVES) return;
  G.wave++;
  G.waveActive = true;
  G.spawnGroup = 0;
  G.spawnTimer = 500;
  const waveDef = WAVES[G.wave - 1];
  G.waveQueue = waveDef.map(g => ({t:g.t, remaining:g.n, delay:g.delay}));
  document.getElementById('startWaveBtn').disabled = true;
  document.getElementById('startWaveBtn').textContent = 'WAVE IN PROGRESS...';
  updateHUD();
  addLog(`🌊 Wave ${G.wave}/${TOTAL_WAVES} incoming! Threat level: ${getThreatLevel(G.wave)}`);
}

function getThreatLevel(w) {
  if (w <= 2) return 'LOW';
  if (w <= 5) return 'MEDIUM';
  if (w <= 8) return 'HIGH';
  return '⚡ CRITICAL';
}

function triggerGameOver() {
  G.gameOver = true;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modalTitle').textContent = 'SERVER COMPROMISED';
  document.getElementById('modalTitle').className = 'modal-title lose';
  document.getElementById('modalSub').innerHTML =
    `${G.player}, your network defenses have been overwhelmed.<br>The server integrity has dropped to 0%.`;
  document.getElementById('modalStats').innerHTML =
    `<div class="m-stat"><div class="m-stat-v" style="color:#ff3344">${G.wave}</div><div class="m-stat-l">WAVES SURVIVED</div></div>
     <div class="m-stat"><div class="m-stat-v" style="color:#ffd700">${G.score.toLocaleString()}</div><div class="m-stat-l">SCORE</div></div>
     <div class="m-stat"><div class="m-stat-v" style="color:#00ccff">${G.packetsDestroyed}</div><div class="m-stat-l">PACKETS BLOCKED</div></div>
     <div class="m-stat"><div class="m-stat-v" style="color:#ff6600">${G.towers.length}</div><div class="m-stat-l">TOWERS DEPLOYED</div></div>`;
}

function triggerVictory() {
  G.victory = true;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modalTitle').textContent = 'NETWORK SECURED';
  document.getElementById('modalTitle').className = 'modal-title win';
  document.getElementById('modalSub').innerHTML =
    `Outstanding work, ${G.player}! All ${TOTAL_WAVES} attack waves have been repelled.<br>Server integrity: ${G.health}%`;
  document.getElementById('modalStats').innerHTML =
    `<div class="m-stat"><div class="m-stat-v" style="color:#00ff88">${G.health}%</div><div class="m-stat-l">FINAL INTEGRITY</div></div>
     <div class="m-stat"><div class="m-stat-v" style="color:#ffd700">${G.score.toLocaleString()}</div><div class="m-stat-l">FINAL SCORE</div></div>
     <div class="m-stat"><div class="m-stat-v" style="color:#00ccff">${G.packetsDestroyed}</div><div class="m-stat-l">PACKETS BLOCKED</div></div>
     <div class="m-stat"><div class="m-stat-v" style="color:#7b2fff">${G.coins}</div><div class="m-stat-l">COINS REMAINING</div></div>`;
}

// ================================================================
// HUD & UI HELPERS
// ================================================================
function updateHUD() {
  const hp = Math.max(0, G.health);
  document.getElementById('healthFill').style.width = hp+'%';
  document.getElementById('healthFill').style.background =
    hp > 60 ? 'linear-gradient(90deg,#00ff88,#00cc66)' :
    hp > 30 ? 'linear-gradient(90deg,#ffaa00,#ff8800)' :
              'linear-gradient(90deg,#ff3344,#cc1122)';
  document.getElementById('healthVal').textContent = hp+'%';
  document.getElementById('coinsVal').textContent = G.coins;
  document.getElementById('waveDisplay').textContent = `${G.wave} / ${TOTAL_WAVES}`;
}

function selectTower(type) {
  G.selectedTowerType = type;
  G.selectedTowerIdx = -1;
  document.getElementById('towerActions').style.display = 'none';
  ['router','firewall','ids','antivirus'].forEach(t => {
    document.getElementById('tbtn-'+t).classList.toggle('selected', t===type);
  });
  if (type) showTowerInfo(type);
  else hideTowerInfo();
  renderHover();
}

function showTowerInfo(type) {
  const def = TOWER_DEFS[type];
  document.getElementById('infoContent').innerHTML =
    `<div class="info-row"><span class="info-key">PROTOCOL</span><span class="info-val">${def.protocol}</span></div>
     <div class="info-row"><span class="info-key">LAYER</span><span class="info-val">${def.layer}</span></div>
     <div class="info-row"><span class="info-key">DAMAGE</span><span class="info-val">${def.damage}</span></div>
     <div class="info-row"><span class="info-key">RANGE</span><span class="info-val">${def.range}px</span></div>
     <div class="info-row"><span class="info-key">FIRE RATE</span><span class="info-val">${def.fireRate}/s</span></div>
     ${def.slow ? `<div class="info-row"><span class="info-key">SLOW</span><span class="info-val">${Math.round((1-def.slow)*100)}%</span></div>` : ''}
     ${def.aoe ? `<div class="info-row"><span class="info-key">AOE</span><span class="info-val">${def.aoe}px</span></div>` : ''}
     <div style="margin-top:6px;color:#2a5070;font-size:0.58rem;line-height:1.5;">${def.desc}</div>`;
}

function hideTowerInfo() {
  document.getElementById('infoContent').innerHTML =
    '<span style="color:#1a3a50;">Tap or hover a tower to see OSI layer details...</span>';
}

function addLog(msg) {
  const list = document.getElementById('logList');
  const li = document.createElement('li');
  li.className = 'new';
  li.textContent = msg;
  list.insertBefore(li, list.firstChild);
  setTimeout(() => li.classList.remove('new'), 500);
  while (list.children.length > 20) list.removeChild(list.lastChild);
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random()*Math.PI*2;
    const spd = 30 + Math.random()*60;
    G.particles.push({
      x, y, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd,
      color, size: 2+Math.random()*3, life: 0.8+Math.random()*0.4
    });
  }
}

function spawnDmgNum(x, y, dmg, color) {
  const wrap = document.getElementById('canvasWrap');
  const point = toCanvasDisplayPoint(x, y);
  const el = document.createElement('div');
  el.className = 'dmg-num';
  el.style.cssText = `left:${point.x - (6 * point.scale.x)}px;top:${point.y - (20 * point.scale.y)}px;color:${color};font-size:${Math.max(10, 12 * point.scale.x)}px;`;
  el.textContent = '-'+dmg;
  el.dataset.age = 0;
  wrap.appendChild(el);
}

function toggleSpeed() {
  gameSpeed = gameSpeed === 1 ? 2 : 1;
  const btn = document.getElementById('speedBtn');
  btn.textContent = gameSpeed === 2 ? '1× SPEED' : '2× SPEED';
  btn.classList.toggle('fast', gameSpeed === 2);
}

// ================================================================
// GAME LOOP
// ================================================================
function gameLoop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  render();
  animFrame = requestAnimationFrame(gameLoop);
}

// ================================================================
// SCREEN NAVIGATION
// ================================================================
function showScreen(id) {
  ['loadingScreen','welcomeScreen','usernameScreen','gameWrapper'].forEach(s => {
    document.getElementById(s).classList.add('hidden');
  });
  document.getElementById(id).classList.remove('hidden');
}

function showUsername() { showScreen('usernameScreen'); document.getElementById('usernameInput').focus(); }
function showHowToPlay() {
  addLog('📖 HOW TO PLAY: Select a tower from the right panel, then click an empty cell to place it.');
  alert('HOW TO PLAY\n\n• Select a tower type from the right panel\n• Click any empty grid cell to place it\n• Press "Launch Wave" to start enemy waves\n• Each enemy packet has OSI layers as shields\n• Different towers counter different packet types\n• Hover towers to see their OSI layer info\n\nTOWERS:\n🌐 Router (Layer 3) – Steady IP-level damage\n🔥 Firewall (Layer 4) – Slows packets on hit\n🛡 IDS (Layer 2) – Area-of-effect burst\n🦠 Antivirus (Layer 7) – +bonus vs malware\n\nPACKETS:\n✦ Malware packets require Antivirus for max damage\n✦ DDoS packets are slow but very tough\n✦ UDP floods are fast but fragile');
}

function startGame() {
  const name = document.getElementById('usernameInput').value.trim();
  if (!name) { document.getElementById('usernameError').textContent = 'CALLSIGN REQUIRED'; return; }
  if (name.length < 2) { document.getElementById('usernameError').textContent = 'MINIMUM 2 CHARACTERS'; return; }
  document.getElementById('playerName').textContent = name.toUpperCase();
  initGameState(name.toUpperCase());
  showScreen('gameWrapper');
  updateHUD();
  hideTowerInfo();
  addLog('⚡ TowerNet initialized. Deploy towers and launch the first wave.');
  addLog('📡 Server integrity: 100% · Coins: 150');
  setupCanvas();
  if (animFrame) cancelAnimationFrame(animFrame);
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function restartGame() {
  document.getElementById('modal').classList.add('hidden');
  showScreen('usernameScreen');
  document.getElementById('usernameInput').value = '';
  document.getElementById('usernameError').textContent = '';
  if (animFrame) cancelAnimationFrame(animFrame);
}

function updateWaveWarning() {
  const warning = document.getElementById('waveWarning');
  if (!warning) return;
  if (!G.preWaveActive || G.waveActive || G.gameOver || G.victory) {
    warning.classList.remove('show');
    return;
  }
  const seconds = Math.max(1, Math.ceil(G.preWaveTimer));
  document.getElementById('waveWarningTitle').textContent = `WAVE ${G.nextWave} INCOMING`;
  document.getElementById('waveWarningSub').textContent = `Threat level ${getThreatLevel(G.nextWave)} | Auto-launch in ${seconds}s`;
  warning.classList.add('show');
}

function updateWaveButton() {
  const btn = document.getElementById('startWaveBtn');
  if (!btn || !G || typeof G.wave === 'undefined') return;
  btn.classList.remove('warning');
  if (G.victory) {
    btn.disabled = true;
    btn.textContent = 'ALL WAVES CLEARED';
    return;
  }
  if (G.gameOver) {
    btn.disabled = true;
    btn.textContent = 'SERVER OFFLINE';
    return;
  }
  if (G.waveActive) {
    btn.disabled = true;
    btn.textContent = `WAVE ${G.wave} IN PROGRESS...`;
    return;
  }
  if (G.preWaveActive) {
    btn.disabled = false;
    btn.classList.add('warning');
    btn.textContent = `START WAVE ${G.nextWave} NOW (${Math.max(1, Math.ceil(G.preWaveTimer))}s)`;
    return;
  }
  if (G.wave < TOTAL_WAVES) {
    btn.disabled = false;
    btn.textContent = `QUEUE WAVE ${G.wave + 1}`;
    return;
  }
  btn.disabled = true;
  btn.textContent = 'AUTO MODE COMPLETE';
}

function updateHUD() {
  const hp = Math.max(0, G.health);
  document.getElementById('healthFill').style.width = hp+'%';
  document.getElementById('healthFill').style.background =
    hp > 60 ? 'linear-gradient(90deg,#00ff88,#00cc66)' :
    hp > 30 ? 'linear-gradient(90deg,#ffaa00,#ff8800)' :
              'linear-gradient(90deg,#ff3344,#cc1122)';
  document.getElementById('healthVal').textContent = hp+'%';
  document.getElementById('coinsVal').textContent = G.coins;
  document.getElementById('waveDisplay').textContent =
    G.preWaveActive && !G.waveActive ? `NEXT ${G.nextWave}/${TOTAL_WAVES}` : `${G.wave} / ${TOTAL_WAVES}`;
  updateWaveButton();
  updateWaveWarning();
}

function checkWaveEnd() {
  if (!G.waveActive) return;
  const spawnDone = G.spawnGroup >= G.waveQueue.length;
  if (spawnDone && G.packets.length === 0) {
    G.waveActive = false;
    const bonus = 25 + G.wave * 5;
    G.coins += bonus;
    G.score += bonus * 10;
    addLog(`Wave ${G.wave} cleared! +${bonus} coins bonus`);
    if (G.wave >= TOTAL_WAVES) {
      triggerVictory();
    } else {
      queueNextWave(AUTO_WAVE_DELAY);
    }
    updateHUD();
  }
}

function startWave(forceImmediate = true) {
  if (G.gameOver || G.victory || G.waveActive || G.wave >= TOTAL_WAVES) return;
  if (!G.preWaveActive) {
    queueNextWave(forceImmediate ? 0 : AUTO_WAVE_DELAY);
  }
  if (G.preWaveActive && forceImmediate) {
    G.preWaveTimer = 0;
    beginWave();
  }
}

function triggerGameOver() {
  G.gameOver = true;
  G.preWaveActive = false;
  updateWaveWarning();
  updateWaveButton();
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modalTitle').textContent = 'SERVER COMPROMISED';
  document.getElementById('modalTitle').className = 'modal-title lose';
  document.getElementById('modalSub').innerHTML =
    `${G.player}, your network defenses have been overwhelmed.<br>The server integrity has dropped to 0%.`;
  document.getElementById('modalStats').innerHTML =
    `<div class="m-stat"><div class="m-stat-v" style="color:#ff3344">${G.wave}</div><div class="m-stat-l">WAVES SURVIVED</div></div>
     <div class="m-stat"><div class="m-stat-v" style="color:#ffd700">${G.score.toLocaleString()}</div><div class="m-stat-l">SCORE</div></div>
     <div class="m-stat"><div class="m-stat-v" style="color:#00ccff">${G.packetsDestroyed}</div><div class="m-stat-l">PACKETS BLOCKED</div></div>
     <div class="m-stat"><div class="m-stat-v" style="color:#ff6600">${G.towers.length}</div><div class="m-stat-l">TOWERS DEPLOYED</div></div>`;
}

function triggerVictory() {
  G.victory = true;
  G.preWaveActive = false;
  updateWaveWarning();
  updateWaveButton();
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modalTitle').textContent = 'NETWORK SECURED';
  document.getElementById('modalTitle').className = 'modal-title win';
  document.getElementById('modalSub').innerHTML =
    `Outstanding work, ${G.player}! All ${TOTAL_WAVES} attack waves have been repelled.<br>Server integrity: ${G.health}%`;
  document.getElementById('modalStats').innerHTML =
    `<div class="m-stat"><div class="m-stat-v" style="color:#00ff88">${G.health}%</div><div class="m-stat-l">FINAL INTEGRITY</div></div>
     <div class="m-stat"><div class="m-stat-v" style="color:#ffd700">${G.score.toLocaleString()}</div><div class="m-stat-l">FINAL SCORE</div></div>
     <div class="m-stat"><div class="m-stat-v" style="color:#00ccff">${G.packetsDestroyed}</div><div class="m-stat-l">PACKETS BLOCKED</div></div>
     <div class="m-stat"><div class="m-stat-v" style="color:#7b2fff">${G.coins}</div><div class="m-stat-l">COINS REMAINING</div></div>`;
}

function startGame() {
  const name = document.getElementById('usernameInput').value.trim();
  if (!name) { document.getElementById('usernameError').textContent = 'CALLSIGN REQUIRED'; return; }
  if (name.length < 2) { document.getElementById('usernameError').textContent = 'MINIMUM 2 CHARACTERS'; return; }
  document.getElementById('playerName').textContent = name.toUpperCase();
  initGameState(name.toUpperCase());
  showScreen('gameWrapper');
  hideTowerInfo();
  setupCanvas();
  updateHUD();
  addLog('TowerNet initialized. Auto-wave mode armed.');
  addLog(`Server integrity: 100% | Coins: 150 | First wave in ${AUTO_WAVE_DELAY}s`);
  queueNextWave(AUTO_WAVE_DELAY);
  if (animFrame) cancelAnimationFrame(animFrame);
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// ================================================================
// LOADING SEQUENCE
// ================================================================
const LOAD_MESSAGES = [
  'INITIALIZING NETWORK STACK...',
  'LOADING OSI LAYER DEFINITIONS...',
  'CALIBRATING PACKET INSPECTOR...',
  'DEPLOYING DEFENSE PROTOCOLS...',
  'ACTIVATING THREAT DATABASE...',
  'SYSTEM READY.'
];
let loadStep = 0;
function runLoader() {
  const bar = document.getElementById('loadBar');
  const status = document.getElementById('loadStatus');
  const interval = setInterval(() => {
    loadStep++;
    const pct = (loadStep / LOAD_MESSAGES.length) * 100;
    bar.style.width = pct + '%';
    status.textContent = LOAD_MESSAGES[Math.min(loadStep, LOAD_MESSAGES.length-1)];
    if (loadStep >= LOAD_MESSAGES.length) {
      clearInterval(interval);
      setTimeout(() => showScreen('welcomeScreen'), 300);
    }
  }, 300);
}

// Key input for username
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('usernameInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') startGame();
  });
  setupCanvas();
  window.addEventListener('resize', refreshCanvasLayout);
  runLoader();
});
