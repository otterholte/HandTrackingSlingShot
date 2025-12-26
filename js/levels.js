// ========================================
// LEVELS MODULE
// Level definitions and management
// ========================================

const Levels = (function() {
    // Level definitions
    const LEVEL_DATA = [
        // Level 1: First Strike (Tutorial)
        {
            id: 1,
            name: "First Strike",
            description: "Knock down the tower to learn the basics",
            shots: 3,
            targetScore: 500,
            stars: [300, 500, 800],
            setup: function(width, height) {
                const groundY = height - 20;
                const centerX = width * 0.7;
                
                // Simple tower of blocks
                const blockWidth = 40;
                const blockHeight = 80;
                const gap = 2;
                
                // Base blocks (2 pillars)
                Physics.createBlock(centerX - 50, groundY - blockHeight/2, blockWidth, blockHeight, {
                    type: 'normal', health: 2, points: 100, color: '#00f5ff'
                });
                Physics.createBlock(centerX + 50, groundY - blockHeight/2, blockWidth, blockHeight, {
                    type: 'normal', health: 2, points: 100, color: '#00f5ff'
                });
                
                // Top beam
                Physics.createBlock(centerX, groundY - blockHeight - 20, 140, 30, {
                    type: 'normal', health: 1, points: 100, color: '#00f5ff'
                });
                
                // Target on top
                Physics.createTarget(centerX, groundY - blockHeight - 60, 25, {
                    points: 500, color: '#ff00ff'
                });
            }
        },
        
        // Level 2: Twin Towers
        {
            id: 2,
            name: "Twin Towers",
            description: "Destroy both structures with limited shots",
            shots: 3,
            targetScore: 1000,
            stars: [600, 1000, 1500],
            setup: function(width, height) {
                const groundY = height - 20;
                
                // Left tower
                const leftX = width * 0.55;
                createTower(leftX, groundY, 3, '#00f5ff');
                Physics.createTarget(leftX, groundY - 280, 20, { points: 400 });
                
                // Right tower
                const rightX = width * 0.8;
                createTower(rightX, groundY, 3, '#00ff88');
                Physics.createTarget(rightX, groundY - 280, 20, { points: 400 });
            }
        },
        
        // Level 3: The Fortress
        {
            id: 3,
            name: "The Fortress",
            description: "Hit targets behind protective barriers",
            shots: 4,
            targetScore: 1200,
            stars: [800, 1200, 1800],
            setup: function(width, height) {
                const groundY = height - 20;
                const fortressX = width * 0.7;
                
                // Protective wall (obstacle - cannot be destroyed)
                Physics.createObstacle(fortressX - 80, groundY - 150, 30, 300, {
                    color: '#333355'
                });
                
                // Blocks inside fortress
                Physics.createBlock(fortressX + 30, groundY - 40, 60, 80, {
                    type: 'normal', health: 1, points: 150, color: '#ff1493'
                });
                Physics.createBlock(fortressX + 100, groundY - 40, 60, 80, {
                    type: 'normal', health: 1, points: 150, color: '#ff1493'
                });
                Physics.createBlock(fortressX + 65, groundY - 100, 100, 30, {
                    type: 'normal', health: 1, points: 150, color: '#ff1493'
                });
                
                // Targets inside (need to arc shots over wall)
                Physics.createTarget(fortressX + 30, groundY - 150, 22, { points: 500 });
                Physics.createTarget(fortressX + 100, groundY - 150, 22, { points: 500 });
            }
        },
        
        // Level 4: Moving Target
        {
            id: 4,
            name: "Moving Target",
            description: "Hit targets on moving platforms",
            shots: 5,
            targetScore: 1500,
            stars: [1000, 1500, 2200],
            movingPlatforms: true,
            setup: function(width, height) {
                const groundY = height - 20;
                
                // Static base structure
                const baseX = width * 0.75;
                Physics.createBlock(baseX - 60, groundY - 40, 40, 80, {
                    type: 'strong', health: 3, points: 100, color: '#00ff88'
                });
                Physics.createBlock(baseX + 60, groundY - 40, 40, 80, {
                    type: 'strong', health: 3, points: 100, color: '#00ff88'
                });
                
                // Targets at different heights
                Physics.createTarget(width * 0.6, groundY - 100, 25, { 
                    points: 400,
                    movingY: true,
                    moveRange: 100,
                    moveSpeed: 0.002
                });
                
                Physics.createTarget(width * 0.75, groundY - 200, 25, { 
                    points: 400,
                    movingX: true,
                    moveRange: 80,
                    moveSpeed: 0.003
                });
                
                Physics.createTarget(width * 0.85, groundY - 150, 25, { 
                    points: 400,
                    movingY: true,
                    moveRange: 60,
                    moveSpeed: 0.0025
                });
                
                // Blocks that can fall on targets
                Physics.createBlock(baseX, groundY - 120, 160, 30, {
                    type: 'weak', health: 1, points: 200, color: '#ffff00'
                });
            }
        },
        
        // Level 5: Ricochet Master
        {
            id: 5,
            name: "Ricochet Master",
            description: "Use bounces to hit hidden targets",
            shots: 4,
            targetScore: 2000,
            stars: [1500, 2000, 3000],
            setup: function(width, height) {
                const groundY = height - 20;
                
                // Bouncy walls (placed strategically)
                Physics.createObstacle(width * 0.5, height * 0.3, 150, 20, {
                    color: '#4444aa', restitution: 0.95
                });
                
                Physics.createObstacle(width * 0.75, height * 0.5, 20, 150, {
                    color: '#4444aa', restitution: 0.95
                });
                
                // Angled ramp
                const ramp = Physics.createObstacle(width * 0.6, height * 0.65, 200, 20, {
                    color: '#4444aa', restitution: 0.9
                });
                Matter.Body.setAngle(ramp, -Math.PI / 6);
                
                // Hidden targets behind obstacles
                Physics.createTarget(width * 0.9, height * 0.25, 25, { points: 600 });
                Physics.createTarget(width * 0.55, height * 0.15, 25, { points: 600 });
                Physics.createTarget(width * 0.85, height * 0.7, 25, { points: 600 });
                
                // Blocks that reveal path
                Physics.createBlock(width * 0.65, groundY - 50, 80, 100, {
                    type: 'weak', health: 1, points: 150, color: '#ff6600'
                });
                Physics.createBlock(width * 0.8, groundY - 150, 60, 60, {
                    type: 'weak', health: 1, points: 150, color: '#ff6600'
                });
            }
        }
    ];
    
    // Helper function to create a standard tower
    function createTower(centerX, groundY, levels, color) {
        const blockWidth = 30;
        const blockHeight = 60;
        
        for (let level = 0; level < levels; level++) {
            const y = groundY - blockHeight / 2 - (level * (blockHeight + 20));
            const blocksInLevel = levels - level;
            const startX = centerX - ((blocksInLevel - 1) * (blockWidth + 10)) / 2;
            
            for (let i = 0; i < blocksInLevel; i++) {
                const x = startX + i * (blockWidth + 10);
                Physics.createBlock(x, y, blockWidth, blockHeight, {
                    type: level === 0 ? 'strong' : 'normal',
                    health: level === 0 ? 2 : 1,
                    points: 100 + level * 50,
                    color: color
                });
                
                // Add horizontal block between vertical ones
                if (i < blocksInLevel - 1 && level < levels - 1) {
                    Physics.createBlock(
                        x + (blockWidth + 10) / 2,
                        y - blockHeight / 2 - 10,
                        blockWidth + 10,
                        15,
                        { type: 'weak', health: 1, points: 50, color: color }
                    );
                }
            }
        }
    }
    
    // Current state
    let currentLevel = 1;
    let unlockedLevels = [1];
    let levelScores = {};
    let levelStars = {};
    
    // Moving targets animation
    let movingTargets = [];
    let levelStartTime = 0;
    
    // Load level
    function loadLevel(levelId) {
        const level = LEVEL_DATA.find(l => l.id === levelId);
        if (!level) {
            console.error('Level not found:', levelId);
            return null;
        }
        
        currentLevel = levelId;
        levelStartTime = Date.now();
        movingTargets = [];
        
        // Clear previous level
        Physics.clearLevel();
        
        // Get screen dimensions
        const { width, height } = Renderer.getDimensions();
        
        // Run level setup
        level.setup(width, height);
        
        // Store moving targets for animation
        const targets = Physics.getTargets();
        for (const target of targets) {
            if (target.movingX || target.movingY) {
                movingTargets.push({
                    body: target,
                    startX: target.position.x,
                    startY: target.position.y,
                    movingX: target.movingX || false,
                    movingY: target.movingY || false,
                    moveRange: target.moveRange || 50,
                    moveSpeed: target.moveSpeed || 0.002
                });
            }
        }
        
        console.log('Loaded level:', level.name);
        return level;
    }
    
    // Update moving targets
    function updateMovingTargets() {
        const elapsed = Date.now() - levelStartTime;
        
        for (const mt of movingTargets) {
            let newX = mt.startX;
            let newY = mt.startY;
            
            if (mt.movingX) {
                newX = mt.startX + Math.sin(elapsed * mt.moveSpeed) * mt.moveRange;
            }
            if (mt.movingY) {
                newY = mt.startY + Math.sin(elapsed * mt.moveSpeed) * mt.moveRange;
            }
            
            Matter.Body.setPosition(mt.body, { x: newX, y: newY });
        }
    }
    
    // Get current level data
    function getCurrentLevel() {
        return LEVEL_DATA.find(l => l.id === currentLevel);
    }
    
    // Get level by ID
    function getLevel(levelId) {
        return LEVEL_DATA.find(l => l.id === levelId);
    }
    
    // Get all levels
    function getAllLevels() {
        return LEVEL_DATA;
    }
    
    // Check if level is unlocked
    function isUnlocked(levelId) {
        return unlockedLevels.includes(levelId);
    }
    
    // Unlock level
    function unlockLevel(levelId) {
        if (!unlockedLevels.includes(levelId)) {
            unlockedLevels.push(levelId);
            saveprogress();
        }
    }
    
    // Complete level
    function completeLevel(levelId, score) {
        // Update best score
        if (!levelScores[levelId] || score > levelScores[levelId]) {
            levelScores[levelId] = score;
        }
        
        // Calculate stars
        const level = getLevel(levelId);
        let stars = 0;
        if (level) {
            if (score >= level.stars[0]) stars = 1;
            if (score >= level.stars[1]) stars = 2;
            if (score >= level.stars[2]) stars = 3;
        }
        
        if (!levelStars[levelId] || stars > levelStars[levelId]) {
            levelStars[levelId] = stars;
        }
        
        // Unlock next level
        if (levelId < LEVEL_DATA.length) {
            unlockLevel(levelId + 1);
        }
        
        saveprogress();
        
        return { score, stars, bestScore: levelScores[levelId] };
    }
    
    // Get stars for level
    function getLevelStars(levelId) {
        return levelStars[levelId] || 0;
    }
    
    // Get score for level
    function getLevelScore(levelId) {
        return levelScores[levelId] || 0;
    }
    
    // Save progress to localStorage
    function saveprogress() {
        try {
            localStorage.setItem('neonSlingshot_unlocked', JSON.stringify(unlockedLevels));
            localStorage.setItem('neonSlingshot_scores', JSON.stringify(levelScores));
            localStorage.setItem('neonSlingshot_stars', JSON.stringify(levelStars));
        } catch (e) {
            console.warn('Could not save progress:', e);
        }
    }
    
    // Load progress from localStorage
    function loadProgress() {
        try {
            const saved_unlocked = localStorage.getItem('neonSlingshot_unlocked');
            const saved_scores = localStorage.getItem('neonSlingshot_scores');
            const saved_stars = localStorage.getItem('neonSlingshot_stars');
            
            if (saved_unlocked) unlockedLevels = JSON.parse(saved_unlocked);
            if (saved_scores) levelScores = JSON.parse(saved_scores);
            if (saved_stars) levelStars = JSON.parse(saved_stars);
            
            // Ensure level 1 is always unlocked
            if (!unlockedLevels.includes(1)) unlockedLevels.push(1);
        } catch (e) {
            console.warn('Could not load progress:', e);
        }
    }
    
    // Reset all progress
    function resetProgress() {
        unlockedLevels = [1];
        levelScores = {};
        levelStars = {};
        saveprogress();
    }
    
    // Check if level is complete (all targets hit)
    function checkLevelComplete() {
        const targets = Physics.getTargets();
        return targets.length === 0;
    }
    
    // Initialize
    function init() {
        loadProgress();
    }
    
    // Public API
    return {
        init,
        loadLevel,
        updateMovingTargets,
        getCurrentLevel,
        getLevel,
        getAllLevels,
        isUnlocked,
        unlockLevel,
        completeLevel,
        getLevelStars,
        getLevelScore,
        checkLevelComplete,
        resetProgress,
        get currentLevelId() { return currentLevel; }
    };
})();

