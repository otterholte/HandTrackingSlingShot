# 🎯 Neon Slingshot - Hand Tracking Game

A cyberpunk-themed slingshot game with **real-time hand tracking** using your webcam! Pull back the slingshot with a pinch gesture and release to launch projectiles at targets.

![Neon Slingshot](https://img.shields.io/badge/Game-Slingshot-00f5ff?style=for-the-badge)
![Hand Tracking](https://img.shields.io/badge/Control-Hand%20Tracking-ff00ff?style=for-the-badge)
![Physics](https://img.shields.io/badge/Physics-Matter.js-ffff00?style=for-the-badge)

## ✨ Features

- **🖐️ Hand Tracking Controls** - Use MediaPipe to track your hand gestures in real-time
- **🎮 Mouse Fallback** - Play with mouse if camera isn't available
- **⚡ Physics Engine** - Realistic physics powered by Matter.js
- **🌆 Cyberpunk Aesthetic** - Neon colors, glowing effects, and scanline overlays
- **📊 10 Unique Levels** - Progressive difficulty with different challenges
- **⭐ Star Rating** - Earn up to 3 stars per level based on your score
- **🎵 Audio System** - Background music and sound effects

## 🎮 How to Play

### Hand Tracking Mode
1. Allow camera access when prompted
2. Hold your hand up with fingers spread
3. **Pinch** your thumb and index finger to grab the projectile
4. **Pull back** while pinching to aim
5. **Release** your fingers to launch!

### Mouse Mode
1. **Click** on the projectile to grab it
2. **Drag** to pull back and aim
3. **Release** to fire

## 🚀 Getting Started

### Play Online
Simply open `index.html` in a modern web browser (Chrome recommended for best hand tracking performance).

### Run Locally
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/HandTrackingSlingShot.git

# Navigate to directory
cd HandTrackingSlingShot

# Start a local server (Python)
python -m http.server 8080

# Or use Node.js
npx serve
```

Then open `http://localhost:8080` in your browser.

## 🛠️ Tech Stack

- **MediaPipe Hands** - Real-time hand tracking
- **Matter.js** - 2D physics engine
- **Canvas API** - Game rendering
- **Vanilla JavaScript** - No framework dependencies
- **CSS3** - Neon glow effects and animations

## 📁 Project Structure

```
HandTrackingSlingShot/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # Cyberpunk styling
├── js/
│   ├── main.js         # Game loop & state management
│   ├── handTracking.js # MediaPipe hand detection
│   ├── physics.js      # Matter.js physics setup
│   ├── renderer.js     # Canvas rendering
│   ├── slingshot.js    # Slingshot mechanics
│   ├── levels.js       # Level definitions
│   ├── ui.js           # UI management
│   └── audio.js        # Sound system
└── assets/
    └── sounds/         # Audio files
```

## 🎯 Levels

1. **Tutorial** - Learn the basics
2. **First Shot** - Simple target practice
3. **Stack Attack** - Knock down block stacks
4. **Fortress** - Break through defenses
5. **High Rise** - Tall structures
6. **Moving Target** - Hit moving enemies
7. **Domino** - Chain reactions
8. **Pyramid** - Classic pyramid destruction
9. **The Wall** - Massive barrier
10. **Final Boss** - Ultimate challenge

## 🎨 Controls

| Action | Hand Gesture | Mouse |
|--------|-------------|-------|
| Grab | Pinch (thumb + index) | Click |
| Aim | Move while pinching | Drag |
| Fire | Release pinch | Release click |
| Pause | - | ESC key |
| Restart | - | R key |

## 📜 License

MIT License - feel free to use and modify!

## 🙏 Credits

- [MediaPipe](https://mediapipe.dev/) - Hand tracking
- [Matter.js](https://brm.io/matter-js/) - Physics engine
- [Google Fonts](https://fonts.google.com/) - Orbitron & Rajdhani fonts

---

Made with 💜 and ✋ hand tracking magic


