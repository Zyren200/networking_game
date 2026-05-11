# TowerNet: Packet-Protocol Defense System

A futuristic tower defense game where you defend a server from waves of malicious data packets using OSI-layer security towers.

## 🎮 Game Overview

**TowerNet** is an educational tower defense game that teaches network security concepts through gameplay. Deploy different network defense towers representing real OSI layer protocols to intercept, slow, and destroy incoming packet threats.

## 📁 Project Files

### Core Files
- **`towernet.html`** - Main HTML structure and UI markup
- **`towernet.css`** - Complete styling (1000+ lines)
- **`towernet.js`** - Game logic and mechanics (1200+ lines)

### Original File
- **`towernet (1).html`** - Original combined file (backup)

## 🚀 How to Play

### Starting the Game
1. Open `towernet.html` in a web browser
2. Enter your operator callsign to initialize the system
3. Read "HOW TO PLAY" for detailed instructions

### Game Mechanics

#### Towers (OSI Layers)
- **🌐 Router (Layer 3)** - 50 coins
  - Steady IP-level damage
  - Medium range and fire rate
  
- **🔥 Firewall (Layer 4)** - 75 coins
  - Inspects port headers
  - Slows packets by 45% on hit
  
- **🛡️ IDS Sensor (Layer 2)** - 80 coins
  - Monitors Ethernet frames
  - Area-of-effect burst damage
  
- **🦠 Antivirus (Layer 7)** - 100 coins
  - Deep payload inspection
  - +20 bonus damage vs malware packets

#### Enemy Packets
- **TCP Packet** - Normal speed, low HP
- **UDP Flood** - Fast, fragile
- **HTTP Request** - Balanced threat
- **Malware** - Multiple layers, high HP
- **DDoS Packet** - Slow but tanky
- **Ransomware** - Boss-level threat

#### Game Flow
1. Deploy towers strategically on the grid
2. Click "LAUNCH WAVE" to start packet spawning
3. Defend the central server from attacks
4. Earn coins by destroying packets
5. Upgrade towers for better performance
6. Complete 10 waves to win

### Controls
- **Click tower buttons** → Select tower type
- **Click empty grid cell** → Place tower
- **Click tower** → Select for upgrade/sell
- **2× SPEED button** → Toggle game speed
- **⬆ UPGRADE** → Enhance selected tower
- **$ SELL** → Refund tower

## 💡 Strategy Tips

- **Layered Defense**: Place multiple towers to cover packet paths
- **Upgrade Early**: Enhanced towers deal better damage
- **Wave Prediction**: Each wave gets progressively harder
- **Resource Management**: Balance tower purchases with upgrades
- **Hover for Info**: Check OSI layer details on towers

## 🎯 Game Features

- **Dynamic Wave System** - 10 progressively harder waves
- **Tower Upgrades** - Each tower has 2 upgrade levels
- **Real-time Rendering** - Canvas-based graphics with particle effects
- **Responsive Design** - Works on desktop and mobile devices
- **Detailed Logging** - System messages track all game events
- **Score Tracking** - Coins earned, packets destroyed, waves survived

## 📊 Game Stats

- **Grid Size**: 18×11 tiles
- **Total Waves**: 10
- **Packet Types**: 6 (TCP, UDP, HTTP, Malware, DDoS, Ransomware)
- **Tower Types**: 4 (Router, Firewall, IDS, Antivirus)
- **Upgrades per Tower**: 2 levels per tower

## 🌐 Technical Details

### Architecture
- **Pure Vanilla JavaScript** - No dependencies required
- **Canvas Rendering** - High-performance 2D graphics
- **State Management** - Single game object (G) tracks all state
- **Responsive Layout** - CSS Grid and Flexbox

### Key Functions

#### Game Loop
- `gameLoop()` - Main update and render cycle
- `update(dt)` - Physics and game logic
- `render()` - Canvas drawing

#### Game Systems
- `updateSpawner()` - Packet spawning
- `updatePackets()` - Packet movement and pathfinding
- `updateTowers()` - Tower targeting and firing
- `updateProjectiles()` - Projectile physics
- `dealDamage()` - Damage and layer stripping

#### UI Management
- `showScreen()` - Screen navigation
- `selectTower()` - Tower selection
- `upgradeTower()` - Tower upgrades
- `sellTower()` - Tower selling

## 🎨 Styling

- **Theme**: Futuristic cyberpunk aesthetic
- **Colors**: Neon cyan, purple, orange, pink
- **Font**: Orbitron (headings), Share Tech Mono (body)
- **Responsive**: Adapts to mobile (max-width: 640px)
- **Animations**: Scanning lines, pulse effects, floating damage numbers

## 📱 Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support (touch-optimized)

## 🔧 Setup Instructions

1. **Extract files** to your web server directory
2. **Ensure all three files** are in the same folder:
   - `towernet.html`
   - `towernet.css`
   - `towernet.js`
3. **Open `towernet.html`** in a browser
4. **Start playing!**

## 📝 File Structure

```
towernet/
├── towernet.html          # HTML structure
├── towernet.css           # Styles (1000+ lines)
├── towernet.js            # Game logic (1200+ lines)
├── towernet (1).html      # Original combined file
└── README.md              # This file
```

## 🎓 Educational Value

This game teaches:
- **OSI Model** - 7 network layers
- **Network Protocols** - IP, TCP, UDP, Ethernet, DNS, SMTP, HTTP
- **Security Concepts** - Firewalls, IDS, Antivirus, DDoS
- **Game Design** - Tower defense mechanics, difficulty scaling
- **Web Development** - Canvas API, game loops, state management

## 🔐 Security Notes

- Game runs entirely client-side (no server required)
- No data collection or transmission
- Safe to play offline
- No external dependencies

## 📄 License

Created as an educational game project.

## 🎮 Enjoy!

Deploy your defenses, block the malicious packets, and keep your server secure!

---

**TowerNet**: Defending networks, one packet at a time. 🛡️
