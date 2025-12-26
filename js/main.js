// ========================================
// MAIN GAME MODULE
// Game initialization, loop, and state management
// ========================================

const Game = (function() {
    // Game states
    const STATES = {
        LOADING: 'loading',
        MENU: 'menu',
        PLAYING: 'playing',
        PAUSED: 'paused',
        LEVEL_COMPLETE: 'level_complete',
        GAME_OVER: 'game_over'
    };
    
    // State
    let gameState = STATES.LOADING;
    let currentLevelId = 1;
    let score = 0;
    let shotsRemaining = 3;
    let totalShots = 3;
    let isInitialized = false;
    let useMouseControls = false;
    let handTrackingEnabled = true;
    
    // DOM elements
    let gameCanvas = null;
    let videoElement = null;
    let handCanvas = null;
    
    // Animation frame
    let animationFrameId = null;
    let lastTime = 0;
    
    // Destroyed blocks/targets tracking
    let destroyedTargets = new Set();
    
    // Initialize game
    async function init() {
        console.log('Initializing game...');
        
        try {
            // Get DOM elements
            gameCanvas = document.getElementById('game-canvas');
            videoElement = document.getElementById('video-feed');
            handCanvas = document.getElementById('hand-canvas');
            
            if (!gameCanvas || !videoElement || !handCanvas) {
                throw new Error('Required DOM elements not found');
            }
            
            // Set canvas sizes
            handCanvas.width = 200;
            handCanvas.height = 150;
            
            // Update loading progress
            updateLoading(10, 'Initializing UI...');
            
            // Initialize UI
            UI.init();
            
            // Setup global toggle controls
            setupGlobalControls();
            
            updateLoading(20, 'Starting renderer...');
            
            // Initialize renderer
            Renderer.init(gameCanvas);
            
            updateLoading(30, 'Setting up physics...');
            
            // Initialize physics
            const { width, height } = Renderer.getDimensions();
            Physics.init(width, height);
            
            // Set physics callbacks
            Physics.setCallbacks({
                onBlockDestroyed: handleBlockDestroyed,
                onTargetHit: handleTargetHit,
                onProjectileStopped: handleProjectileStopped
            });
            
            updateLoading(40, 'Loading levels...');
            
            // Initialize levels
            Levels.init();
            
            updateLoading(50, 'Initializing slingshot...');
            
            // Initialize slingshot
            Slingshot.init(width, height);
            Slingshot.setCallbacks({
                onLaunch: handleLaunch,
                onGrab: () => {
                    UI.hideHandPrompt();  // Hide "Pinch to grab" prompt
                    UI.updateGesture('Aiming...');
                },
                onRelease: () => UI.updateGesture('Ready')
            });
            
            updateLoading(60, 'Starting hand tracking...');
            
            // Initialize hand tracking
            await initHandTracking();
            
            updateLoading(100, 'Ready!');
            
            isInitialized = true;
            
            // Show menu
            setTimeout(() => {
                UI.showScreen('mainMenu');
                gameState = STATES.MENU;
            }, 500);
            
            console.log('Game initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            updateLoading(100, 'Error: ' + error.message);
        }
    }
    
    // Helper to update loading
    function updateLoading(percent, text) {
        const progressBar = document.querySelector('.loader-progress');
        const loaderText = document.querySelector('.loader-text');
        
        if (progressBar) {
            progressBar.style.width = percent + '%';
        }
        if (loaderText) {
            loaderText.textContent = text;
        }
        console.log(`Loading ${percent}%: ${text}`);
    }
    
    // Initialize hand tracking with retries
    async function initHandTracking() {
        console.log('Initializing hand tracking...');
        
        updateLoading(65, 'Requesting camera permission...');
        
        try {
            // First, request camera permission directly
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                } 
            });
            
            // Attach stream to video element
            videoElement.srcObject = stream;
            await videoElement.play();
            
            console.log('Camera access granted');
            updateLoading(75, 'Loading hand detection models...');
            
            // Now initialize MediaPipe Hands
            await HandTracking.init(videoElement, handCanvas);
            
            // Set hand tracking callbacks
            HandTracking.setCallbacks({
                onHandDetected: () => {
                    UI.updateHandStatus(true, 'Hand detected');
                },
                onHandLost: () => {
                    UI.updateHandStatus(false, 'No hand detected');
                    UI.updateGesture('Ready');
                    UI.hideMenuCursor();
                },
                onPinchStart: handlePinchStart,
                onPinchMove: handlePinchMove,
                onPinchEnd: handlePinchEnd,
                onHandUpdate: handleHandUpdate
            });
            
            UI.updateHandStatus(true, 'Hand tracking ready');
            console.log('Hand tracking enabled');
            
        } catch (error) {
            console.error('Hand tracking failed:', error);
            console.log('Falling back to mouse controls');
            
            // Fallback to mouse
            useMouseControls = true;
            UI.updateHandStatus(false, 'Mouse mode (camera unavailable)');
            UI.updateGesture('Click to grab');
            
            // Hide video elements
            videoElement.style.display = 'none';
            handCanvas.style.display = 'none';
            
            setupMouseControls();
        }
    }
    
    // Start game with specific level
    async function startGame(levelId) {
        currentLevelId = levelId;
        const level = Levels.loadLevel(levelId);
        
        if (!level) {
            console.error('Failed to load level', levelId);
            return;
        }
        
        // Reset game state
        score = 0;
        shotsRemaining = level.shots;
        totalShots = level.shots;
        destroyedTargets.clear();
        
        // Update slingshot position
        const { width, height } = Renderer.getDimensions();
        Slingshot.updatePosition(width, height);
        Slingshot.resetProjectile();
        
        // Create projectile in physics
        const anchor = Slingshot.getAnchor();
        Physics.createProjectile(anchor.x, anchor.y, Slingshot.CONFIG.PROJECTILE_RADIUS);
        
        // Clear any existing trail
        Renderer.clearTrail();
        
        // Update UI
        UI.updateHUD(levelId, level.name, score, shotsRemaining);
        UI.showScreen('game');
        UI.hidePauseMenu();
        UI.hideLevelComplete();
        UI.hideGameOver();
        UI.hideMenuCursor();  // Hide menu cursor during gameplay
        
        // Start game loop
        if (!animationFrameId) {
            lastTime = performance.now();
            gameLoop(lastTime);
        }
        
        // Show hand prompt (waits for hand to be ready)
        gameState = STATES.PAUSED;
        Physics.pause();
        
        await UI.showTutorialCountdown();
        
        // Start playing - prompt shows "Pinch to grab" but game is active
        // When they pinch, slingshot will grab and we hide the prompt
        gameState = STATES.PLAYING;
        Physics.resume();
        
        console.log('Started level:', level.name);
    }
    
    // Main game loop
    function gameLoop(currentTime) {
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;
        
        // Clear canvas
        Renderer.clear();
        
        if (gameState === STATES.PLAYING || gameState === STATES.PAUSED) {
            // Update physics (only when playing)
            if (gameState === STATES.PLAYING) {
                Physics.update(deltaTime);
                
                // Update moving targets
                Levels.updateMovingTargets();
            }
            
            // Draw ground
            Renderer.drawGround();
            
            // Draw all physics bodies
            const bodies = Physics.getBodies();
            Renderer.drawBodies(bodies);
            
            // Draw projectile if launched
            const projectile = Physics.getProjectile();
            if (projectile && Slingshot.isProjectileLaunched()) {
                Renderer.drawProjectile(
                    projectile.position.x,
                    projectile.position.y,
                    projectile.circleRadius || 20,
                    false
                );
            }
            
            // Draw slingshot
            Slingshot.render();
            
            // Draw particles
            Renderer.drawParticles();
            
            // Draw hand cursor ONLY when pinching but NOT pulling the slingshot
            if (HandTracking.isTracking() && gameState === STATES.PLAYING && !useMouseControls) {
                const handData = HandTracking.getHandData();
                // Show cursor when pinching, but hide it while pulling slingshot (ball is already visible)
                if (handData.isPinching && !Slingshot.isPullingBack()) {
                    Renderer.drawHandCursor(
                        handData.pinchPosition.x,
                        handData.pinchPosition.y,
                        handData.isPinching,
                        handData.pinchStrength
                    );
                }
            }
        }
        
        // Continue loop
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    // Handle pinch start
    function handlePinchStart(handData) {
        // Ignore if hand tracking is disabled
        if (!handTrackingEnabled) return;
        
        // First, try menu navigation (handles menus, overlays, etc.)
        if (UI.handleMenuPinchStart(handData)) {
            return;  // Menu consumed the pinch
        }
        
        if (gameState !== STATES.PLAYING) return;
        
        if (Slingshot.canGrabProjectile()) {
            const grabbed = Slingshot.handlePinchStart(handData);
            if (grabbed) {
                UI.updateGesture('Pinching - Pull back!');
            }
        }
    }
    
    // Handle pinch move
    function handlePinchMove(handData) {
        // Ignore if hand tracking is disabled
        if (!handTrackingEnabled) return;
        
        if (gameState !== STATES.PLAYING) return;
        
        Slingshot.handlePinchMove(handData);
        
        // Update projectile position in physics
        const pos = Slingshot.getProjectilePosition();
        Physics.moveProjectile(pos.x, pos.y);
        
        // Update gesture text with power
        const power = Math.round(Slingshot.getPower() * 100);
        UI.updateGesture(`Power: ${power}%`);
    }
    
    // Handle pinch end
    function handlePinchEnd(handData) {
        // Ignore if hand tracking is disabled
        if (!handTrackingEnabled) return;
        
        // Notify UI of pinch end (for menu navigation)
        UI.handleMenuPinchEnd(handData);
        
        if (gameState !== STATES.PLAYING) return;
        
        const velocity = Slingshot.handlePinchEnd(handData);
        
        if (velocity) {
            // Already handled by onLaunch callback
        } else {
            UI.updateGesture('Ready');
        }
    }
    
    // Handle hand update
    function handleHandUpdate(handData) {
        // Ignore if hand tracking is disabled
        if (!handTrackingEnabled) return;
        
        // Always update menu cursor (UI will decide if it should show)
        UI.updateMenuCursor(handData);
        
        // Update gesture display based on state (only during gameplay)
        if (gameState === STATES.PLAYING) {
            if (!handData.isPinching && !Slingshot.isPullingBack()) {
                if (Slingshot.canGrabProjectile()) {
                    // Check if near projectile
                    const projPos = Slingshot.getProjectilePosition();
                    const dx = handData.pinchPosition.x - projPos.x;
                    const dy = handData.pinchPosition.y - projPos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < Slingshot.CONFIG.GRAB_DISTANCE) {
                        UI.updateGesture('Pinch to grab!');
                    } else {
                        UI.updateGesture('Move to rock');
                    }
                }
            }
        }
    }
    
    // Handle projectile launch
    function handleLaunch(velocity, position) {
        console.log('Launching projectile:', velocity);
        
        // Launch in physics
        Physics.launchProjectile(velocity);
        
        // Clear trail
        Renderer.clearTrail();
        
        // Spawn launch particles
        Renderer.spawnParticles(position.x, position.y, 20, '#ff6600', {
            speed: 15,
            decay: 0.03
        });
        
        UI.updateGesture('Fired!');
    }
    
    // Handle block destroyed
    function handleBlockDestroyed(block) {
        console.log('Block destroyed:', block);
        
        // Add score
        const points = block.points || 100;
        score += points;
        UI.updateScore(score);
        
        // Spawn particles
        Renderer.spawnParticles(
            block.position.x,
            block.position.y,
            15,
            Renderer.COLORS.cyan,
            { speed: 8, size: 4 }
        );
        
        // Remove block after short delay
        setTimeout(() => {
            Physics.removeBody(block);
        }, 100);
    }
    
    // Handle target hit
    function handleTargetHit(target) {
        if (destroyedTargets.has(target.targetId)) return;
        destroyedTargets.add(target.targetId);
        
        console.log('Target hit:', target);
        
        // Add score
        const points = target.points || 500;
        score += points;
        UI.updateScore(score);
        
        // Big particle explosion
        Renderer.spawnParticles(
            target.position.x,
            target.position.y,
            30,
            Renderer.COLORS.magenta,
            { speed: 12, size: 6, decay: 0.015 }
        );
        
        // Remove target
        setTimeout(() => {
            Physics.removeBody(target);
            
            // Check for level complete
            checkLevelComplete();
        }, 50);
    }
    
    // Handle projectile stopped
    function handleProjectileStopped(projectile) {
        console.log('Projectile stopped');
        
        // Decrease shots
        shotsRemaining--;
        UI.updateShots(shotsRemaining);
        
        // Check game state
        setTimeout(() => {
            if (Levels.checkLevelComplete()) {
                // Level complete!
                levelComplete();
            } else if (shotsRemaining <= 0) {
                // Game over
                gameOver();
            } else {
                // Reset for next shot
                resetForNextShot();
            }
        }, 500);
    }
    
    // Reset for next shot
    async function resetForNextShot() {
        // Remove old projectile
        const oldProjectile = Physics.getProjectile();
        if (oldProjectile) {
            Physics.removeBody(oldProjectile);
        }
        
        // Reset slingshot
        Slingshot.resetProjectile();
        Slingshot.enableGrab();
        
        // Create new projectile
        const anchor = Slingshot.getAnchor();
        Physics.createProjectile(anchor.x, anchor.y, Slingshot.CONFIG.PROJECTILE_RADIUS);
        
        // Clear trail
        Renderer.clearTrail();
        
        // Show hand prompt (waits for hand to be ready)
        gameState = STATES.PAUSED;
        Physics.pause();
        
        await UI.showTutorialCountdown();
        
        // Start playing - when they pinch, slingshot grabs and hides prompt
        gameState = STATES.PLAYING;
        Physics.resume();
        
        UI.updateGesture('Ready');
    }
    
    // Check level complete
    function checkLevelComplete() {
        if (Levels.checkLevelComplete()) {
            levelComplete();
        }
    }
    
    // Level complete
    function levelComplete() {
        gameState = STATES.LEVEL_COMPLETE;
        UI.hideHandPrompt();  // Hide hand prompt
        
        // Calculate results
        const result = Levels.completeLevel(currentLevelId, score);
        
        // Show level complete UI
        const isLastLevel = currentLevelId >= Levels.getAllLevels().length;
        UI.showLevelComplete(score, result.stars, isLastLevel);
        
        console.log('Level complete! Score:', score, 'Stars:', result.stars);
    }
    
    // Game over
    function gameOver() {
        gameState = STATES.GAME_OVER;
        UI.hideHandPrompt();  // Hide hand prompt
        UI.showGameOver('Out of shots!');
        
        console.log('Game over! Final score:', score);
    }
    
    // Pause game
    function pauseGame() {
        if (gameState === STATES.PLAYING) {
            gameState = STATES.PAUSED;
            Physics.pause();
            UI.hideHandPrompt();  // Hide hand prompt when pausing
            UI.showPauseMenu();
        }
    }
    
    // Resume game
    function resumeGame() {
        if (gameState === STATES.PAUSED) {
            gameState = STATES.PLAYING;
            Physics.resume();
            UI.hidePauseMenu();
        }
    }
    
    // Restart level
    function restartLevel() {
        UI.hidePauseMenu();
        UI.hideLevelComplete();
        UI.hideGameOver();
        startGame(currentLevelId);
    }
    
    // Next level
    function nextLevel() {
        const nextLevelId = currentLevelId + 1;
        if (nextLevelId <= Levels.getAllLevels().length) {
            UI.hideLevelComplete();
            startGame(nextLevelId);
        } else {
            // All levels complete, go to menu
            quitToMenu();
        }
    }
    
    // Quit to menu
    function quitToMenu() {
        gameState = STATES.MENU;
        Physics.pause();
        Physics.clearLevel();
        UI.hideHandPrompt();  // Make sure hand prompt is hidden
        UI.showScreen('mainMenu');
        
        // Stop game loop
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }
    
    // Handle window resize
    function handleResize() {
        Renderer.resize();
        const { width, height } = Renderer.getDimensions();
        Physics.resize(width, height);
        Slingshot.updatePosition(width, height);
    }
    
    // Setup mouse controls as fallback
    function setupMouseControls() {
        let isMouseDown = false;
        
        gameCanvas.addEventListener('mousedown', (e) => {
            if (gameState !== STATES.PLAYING) return;
            
            const rect = gameCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const handData = {
                pinchPosition: { x, y },
                isPinching: true,
                pinchStrength: 1
            };
            
            if (Slingshot.canGrabProjectile()) {
                const grabbed = Slingshot.handlePinchStart(handData);
                if (grabbed) {
                    isMouseDown = true;
                    UI.updateGesture('Drag to aim...');
                }
            }
        });
        
        gameCanvas.addEventListener('mousemove', (e) => {
            if (!isMouseDown || gameState !== STATES.PLAYING) return;
            
            const rect = gameCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const handData = {
                pinchPosition: { x, y },
                isPinching: true,
                pinchStrength: 1
            };
            
            Slingshot.handlePinchMove(handData);
            
            const pos = Slingshot.getProjectilePosition();
            Physics.moveProjectile(pos.x, pos.y);
            
            const power = Math.round(Slingshot.getPower() * 100);
            UI.updateGesture(`Power: ${power}%`);
        });
        
        gameCanvas.addEventListener('mouseup', (e) => {
            if (!isMouseDown || gameState !== STATES.PLAYING) return;
            
            isMouseDown = false;
            
            const rect = gameCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const handData = {
                pinchPosition: { x, y },
                isPinching: false,
                pinchStrength: 0
            };
            
            const velocity = Slingshot.handlePinchEnd(handData);
            
            if (velocity) {
                UI.updateGesture('Fired!');
            } else {
                UI.updateGesture('Click to grab');
            }
        });
        
        // Touch support for mobile
        gameCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            gameCanvas.dispatchEvent(mouseEvent);
        });
        
        gameCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            gameCanvas.dispatchEvent(mouseEvent);
        });
        
        gameCanvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            gameCanvas.dispatchEvent(mouseEvent);
        });
        
        console.log('Mouse controls initialized');
    }
    
    // Setup global toggle controls (music, hand tracking)
    function setupGlobalControls() {
        const musicToggle = document.getElementById('music-toggle');
        const handToggle = document.getElementById('hand-toggle');
        
        // Music toggle
        if (musicToggle) {
            musicToggle.addEventListener('click', () => {
                // Initialize audio on first click (required by browsers)
                Audio.init();
                
                const isPlaying = Audio.toggle();
                
                if (isPlaying) {
                    musicToggle.classList.add('active');
                    musicToggle.querySelector('.toggle-icon').textContent = '🔊';
                } else {
                    musicToggle.classList.remove('active');
                    musicToggle.querySelector('.toggle-icon').textContent = '🔇';
                }
            });
        }
        
        // Hand tracking toggle
        if (handToggle) {
            handToggle.addEventListener('click', () => {
                handTrackingEnabled = !handTrackingEnabled;
                
                if (handTrackingEnabled) {
                    handToggle.classList.add('active');
                    handToggle.querySelector('.toggle-icon').textContent = '✋';
                    videoElement.style.display = '';
                    handCanvas.style.display = '';
                    UI.updateHandStatus(HandTracking.isTracking(), 
                        HandTracking.isTracking() ? 'Hand detected' : 'No hand detected');
                } else {
                    handToggle.classList.remove('active');
                    handToggle.querySelector('.toggle-icon').textContent = '🖱️';
                    videoElement.style.display = 'none';
                    handCanvas.style.display = 'none';
                    UI.updateHandStatus(false, 'Mouse mode');
                    UI.hideMenuCursor();
                }
                
                // Always have mouse controls available as backup
                if (!useMouseControls) {
                    setupMouseControls();
                    useMouseControls = true;
                }
            });
        }
        
        console.log('Global controls initialized');
    }
    
    // Check if hand tracking is enabled
    function isHandTrackingEnabled() {
        return handTrackingEnabled && !useMouseControls;
    }
    
    // Initialize on page load
    window.addEventListener('load', init);
    window.addEventListener('resize', handleResize);
    
    // Public API
    return {
        init,
        startGame,
        pauseGame,
        resumeGame,
        restartLevel,
        nextLevel,
        quitToMenu,
        getState: () => gameState,
        getScore: () => score,
        isHandTrackingEnabled: () => handTrackingEnabled,
        STATES
    };
})();
