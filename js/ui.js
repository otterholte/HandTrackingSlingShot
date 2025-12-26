// ========================================
// UI MODULE
// User interface and game state management
// ========================================

const UI = (function() {
    // DOM Elements
    let elements = {};
    
    // State
    let currentScreen = 'loading';
    
    // Menu hand navigation state
    let menuCursor = null;
    let hoveredButton = null;
    let isPinching = false;
    let pinchCooldown = false;  // Prevent rapid-fire clicks
    
    // Initialize UI
    function init() {
        // Cache DOM elements
        elements = {
            // Screens
            loadingScreen: document.getElementById('loading-screen'),
            mainMenu: document.getElementById('main-menu'),
            levelSelect: document.getElementById('level-select'),
            instructions: document.getElementById('instructions'),
            gameContainer: document.getElementById('game-container'),
            
            // Overlays
            pauseMenu: document.getElementById('pause-menu'),
            levelComplete: document.getElementById('level-complete'),
            gameOver: document.getElementById('game-over'),
            
            // HUD elements
            currentLevel: document.getElementById('current-level'),
            levelNameHud: document.getElementById('level-name-hud'),
            score: document.getElementById('score'),
            shotsRemaining: document.getElementById('shots-remaining'),
            
            // Hand status
            handIndicator: document.getElementById('hand-indicator'),
            handStatusText: document.getElementById('hand-status-text'),
            gestureText: document.getElementById('gesture-text'),
            
            // Level complete
            finalScoreValue: document.getElementById('final-score-value'),
            starsDisplay: document.querySelector('.stars-display'),
            
            // Buttons
            startBtn: document.getElementById('start-btn'),
            levelsBtn: document.getElementById('levels-btn'),
            instructionsBtn: document.getElementById('instructions-btn'),
            backToMenu: document.getElementById('back-to-menu'),
            backFromInstructions: document.getElementById('back-from-instructions'),
            pauseBtn: document.getElementById('pause-btn'),
            resumeBtn: document.getElementById('resume-btn'),
            restartBtn: document.getElementById('restart-btn'),
            quitBtn: document.getElementById('quit-btn'),
            nextLevelBtn: document.getElementById('next-level-btn'),
            replayBtn: document.getElementById('replay-btn'),
            menuBtn: document.getElementById('menu-btn'),
            retryBtn: document.getElementById('retry-btn'),
            gameOverMenuBtn: document.getElementById('game-over-menu-btn'),
            
            // Level buttons
            levelGrid: document.querySelector('.level-grid'),
            
            // Menu hand cursor
            menuHandCursor: document.getElementById('menu-hand-cursor')
        };
        
        menuCursor = elements.menuHandCursor;
        
        setupEventListeners();
        console.log('UI initialized');
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Main menu buttons
        elements.startBtn.addEventListener('click', () => {
            Game.startGame(1);
        });
        
        elements.levelsBtn.addEventListener('click', () => {
            showScreen('levelSelect');
            updateLevelButtons();
        });
        
        elements.instructionsBtn.addEventListener('click', () => {
            showScreen('instructions');
        });
        
        // Back buttons
        elements.backToMenu.addEventListener('click', () => {
            showScreen('mainMenu');
        });
        
        elements.backFromInstructions.addEventListener('click', () => {
            showScreen('mainMenu');
        });
        
        // Pause menu
        elements.pauseBtn.addEventListener('click', () => {
            Game.pauseGame();
        });
        
        elements.resumeBtn.addEventListener('click', () => {
            Game.resumeGame();
        });
        
        elements.restartBtn.addEventListener('click', () => {
            Game.restartLevel();
        });
        
        elements.quitBtn.addEventListener('click', () => {
            Game.quitToMenu();
        });
        
        // Level complete
        elements.nextLevelBtn.addEventListener('click', () => {
            Game.nextLevel();
        });
        
        elements.replayBtn.addEventListener('click', () => {
            Game.restartLevel();
        });
        
        elements.menuBtn.addEventListener('click', () => {
            Game.quitToMenu();
        });
        
        // Game over
        elements.retryBtn.addEventListener('click', () => {
            Game.restartLevel();
        });
        
        elements.gameOverMenuBtn.addEventListener('click', () => {
            Game.quitToMenu();
        });
        
        // Level select buttons
        elements.levelGrid.addEventListener('click', (e) => {
            const levelBtn = e.target.closest('.level-btn');
            if (levelBtn && !levelBtn.classList.contains('locked')) {
                const levelId = parseInt(levelBtn.dataset.level);
                Game.startGame(levelId);
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (currentScreen === 'game') {
                    if (elements.pauseMenu.classList.contains('hidden')) {
                        Game.pauseGame();
                    } else {
                        Game.resumeGame();
                    }
                }
            }
            
            if (e.key === 'r' || e.key === 'R') {
                if (currentScreen === 'game') {
                    Game.restartLevel();
                }
            }
        });
    }
    
    // Show screen
    function showScreen(screen) {
        // Hide all screens
        elements.loadingScreen.classList.add('hidden');
        elements.mainMenu.classList.add('hidden');
        elements.levelSelect.classList.add('hidden');
        elements.instructions.classList.add('hidden');
        elements.gameContainer.classList.add('hidden');
        
        // Hide overlays
        elements.pauseMenu.classList.add('hidden');
        elements.levelComplete.classList.add('hidden');
        elements.gameOver.classList.add('hidden');
        
        // Always hide tutorial/hand prompt when switching screens
        hideHandPrompt();
        
        // Show requested screen
        switch (screen) {
            case 'loading':
                elements.loadingScreen.classList.remove('hidden');
                break;
            case 'mainMenu':
                elements.mainMenu.classList.remove('hidden');
                break;
            case 'levelSelect':
                elements.levelSelect.classList.remove('hidden');
                break;
            case 'instructions':
                elements.instructions.classList.remove('hidden');
                break;
            case 'game':
                elements.gameContainer.classList.remove('hidden');
                break;
        }
        
        currentScreen = screen;
    }
    
    // Update level select buttons
    function updateLevelButtons() {
        const levelBtns = elements.levelGrid.querySelectorAll('.level-btn');
        
        levelBtns.forEach(btn => {
            const levelId = parseInt(btn.dataset.level);
            const isUnlocked = Levels.isUnlocked(levelId);
            const stars = Levels.getLevelStars(levelId);
            
            // Update locked state
            if (isUnlocked) {
                btn.classList.remove('locked');
            } else {
                btn.classList.add('locked');
            }
            
            // Update completed state
            if (stars > 0) {
                btn.classList.add('completed');
            } else {
                btn.classList.remove('completed');
            }
            
            // Add star display if completed
            let starsEl = btn.querySelector('.level-stars');
            if (stars > 0) {
                if (!starsEl) {
                    starsEl = document.createElement('div');
                    starsEl.className = 'level-stars';
                    btn.appendChild(starsEl);
                }
                starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
                starsEl.style.color = '#ffff00';
                starsEl.style.fontSize = '0.8rem';
                starsEl.style.marginTop = '0.3rem';
            } else if (starsEl) {
                starsEl.remove();
            }
        });
    }
    
    // Update HUD
    function updateHUD(levelId, levelName, score, shots) {
        elements.currentLevel.textContent = levelId.toString().padStart(2, '0');
        elements.levelNameHud.textContent = levelName;
        elements.score.textContent = score.toString();
        elements.shotsRemaining.textContent = shots.toString();
    }
    
    // Update score
    function updateScore(score) {
        elements.score.textContent = score.toString();
        
        // Flash effect
        elements.score.style.transform = 'scale(1.2)';
        setTimeout(() => {
            elements.score.style.transform = 'scale(1)';
        }, 100);
    }
    
    // Update shots
    function updateShots(shots) {
        elements.shotsRemaining.textContent = shots.toString();
        
        // Warning color if low
        if (shots <= 1) {
            elements.shotsRemaining.style.color = '#ff4444';
        } else {
            elements.shotsRemaining.style.color = '#00f5ff';
        }
    }
    
    // Update hand status
    function updateHandStatus(isConnected, statusText) {
        if (isConnected) {
            elements.handIndicator.classList.add('connected');
            elements.handIndicator.classList.remove('disconnected');
        } else {
            elements.handIndicator.classList.remove('connected');
            elements.handIndicator.classList.add('disconnected');
        }
        elements.handStatusText.textContent = statusText;
    }
    
    // Update gesture indicator
    function updateGesture(gestureText) {
        elements.gestureText.textContent = gestureText;
    }
    
    // Show pause menu
    function showPauseMenu() {
        elements.pauseMenu.classList.remove('hidden');
    }
    
    // Hide pause menu
    function hidePauseMenu() {
        elements.pauseMenu.classList.add('hidden');
    }
    
    // Show level complete
    function showLevelComplete(score, stars, isLastLevel) {
        elements.levelComplete.classList.remove('hidden');
        elements.finalScoreValue.textContent = score.toString();
        
        // Update stars
        const starEls = elements.starsDisplay.querySelectorAll('.star');
        starEls.forEach((star, i) => {
            star.classList.remove('active');
            if (i < stars) {
                setTimeout(() => {
                    star.classList.add('active');
                }, i * 300);
            }
        });
        
        // Hide next level button if last level
        if (isLastLevel) {
            elements.nextLevelBtn.textContent = 'YOU WIN!';
            elements.nextLevelBtn.disabled = true;
        } else {
            elements.nextLevelBtn.textContent = 'NEXT LEVEL';
            elements.nextLevelBtn.disabled = false;
        }
    }
    
    // Hide level complete
    function hideLevelComplete() {
        elements.levelComplete.classList.add('hidden');
    }
    
    // Show game over
    function showGameOver(message) {
        elements.gameOver.classList.remove('hidden');
        const msgEl = elements.gameOver.querySelector('.game-over-message');
        if (msgEl) msgEl.textContent = message || 'Out of shots!';
    }
    
    // Hide game over
    function hideGameOver() {
        elements.gameOver.classList.add('hidden');
    }
    
    // Update loading progress
    function updateLoadingProgress(percent, text) {
        const progressBar = elements.loadingScreen.querySelector('.loader-progress');
        const loaderText = elements.loadingScreen.querySelector('.loader-text');
        
        if (progressBar) {
            progressBar.style.width = percent + '%';
            progressBar.style.animation = 'none';
        }
        if (loaderText && text) {
            loaderText.textContent = text;
        }
    }
    
    // Get current screen
    function getCurrentScreen() {
        return currentScreen;
    }
    
    // Show simple hand prompt - no dark overlay, just a hint
    // Returns a promise that resolves when hand is ready (but before pinch)
    async function showTutorialCountdown() {
        const overlay = document.getElementById('tutorial-overlay');
        const content = document.getElementById('tutorial-content');
        
        if (!overlay || !content) return;
        
        // Check if hand tracking is enabled
        const handTrackingEnabled = Game.isHandTrackingEnabled();
        
        // Show the overlay (CSS now has transparent background by default)
        overlay.classList.remove('hidden');
        
        if (handTrackingEnabled) {
            // Show simple prompt for hand tracking
            content.innerHTML = `
                <div class="hand-prompt">
                    <span class="prompt-icon">✋</span>
                    <span class="prompt-text">Hand up & fingers open</span>
                </div>
            `;
            
            // Wait for hand with fingers open
            await waitForCondition(() => {
                const data = HandTracking.getHandData();
                return HandTracking.isTracking() && !data.isPinching;
            }, 50);
            
            // Update prompt - ready to grab
            content.innerHTML = `
                <div class="hand-prompt ready">
                    <span class="prompt-icon">🤏</span>
                    <span class="prompt-text">Pinch to grab!</span>
                </div>
            `;
        } else {
            // Mouse mode - show click prompt
            content.innerHTML = `
                <div class="hand-prompt ready">
                    <span class="prompt-icon">🖱️</span>
                    <span class="prompt-text">Click to grab!</span>
                </div>
            `;
            
            // Brief delay then hide
            await sleep(800);
            hideHandPrompt();
        }
        
        // DON'T wait for pinch here - return immediately
        // The game is now running, so when they pinch/click, slingshot will grab
        // We'll hide the prompt when they start pulling
    }
    
    // Hide the hand prompt
    function hideHandPrompt() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }
    
    // Helper: wait for a condition to be true
    function waitForCondition(conditionFn, checkInterval = 100) {
        return new Promise(resolve => {
            const check = () => {
                if (conditionFn()) {
                    resolve();
                } else {
                    setTimeout(check, checkInterval);
                }
            };
            check();
        });
    }
    
    // Helper: sleep
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // ========================================
    // MENU HAND NAVIGATION
    // ========================================
    
    // Update menu cursor position based on hand data
    function updateMenuCursor(handData) {
        if (!menuCursor) return;
        
        // Check if any overlay is visible during game
        const overlayVisible = !elements.pauseMenu.classList.contains('hidden') ||
                              !elements.levelComplete.classList.contains('hidden') ||
                              !elements.gameOver.classList.contains('hidden');
        
        // Show cursor on menu screens OR when game overlays are visible
        const showCursor = (currentScreen !== 'game' && currentScreen !== 'loading') || overlayVisible;
        
        if (!showCursor || !handData || !handData.pinchPosition) {
            menuCursor.classList.add('hidden');
            clearHoveredButton();
            return;
        }
        
        // Show and position cursor
        menuCursor.classList.remove('hidden');
        menuCursor.style.left = handData.pinchPosition.x + 'px';
        menuCursor.style.top = handData.pinchPosition.y + 'px';
        
        // Update pinching state visual
        if (handData.isPinching) {
            menuCursor.classList.add('pinching');
        } else {
            menuCursor.classList.remove('pinching');
        }
        
        // Check for button hover
        checkButtonHover(handData.pinchPosition.x, handData.pinchPosition.y);
    }
    
    // Check if cursor is hovering over a button
    function checkButtonHover(x, y) {
        // Get all interactive buttons based on current screen
        let buttons = [];
        
        switch (currentScreen) {
            case 'mainMenu':
                buttons = [
                    elements.startBtn,
                    elements.levelsBtn,
                    elements.instructionsBtn
                ];
                break;
            case 'levelSelect':
                buttons = Array.from(document.querySelectorAll('.level-btn:not(.locked)'));
                buttons.push(elements.backToMenu);
                break;
            case 'instructions':
                buttons = [elements.backFromInstructions];
                break;
        }
        
        // Also check overlay buttons if visible
        if (!elements.pauseMenu.classList.contains('hidden')) {
            buttons = [elements.resumeBtn, elements.restartBtn, elements.quitBtn];
        }
        if (!elements.levelComplete.classList.contains('hidden')) {
            buttons = [elements.nextLevelBtn, elements.replayBtn, elements.menuBtn];
        }
        if (!elements.gameOver.classList.contains('hidden')) {
            buttons = [elements.retryBtn, elements.gameOverMenuBtn];
        }
        
        // Find button under cursor
        let foundButton = null;
        
        for (const btn of buttons) {
            if (!btn) continue;
            const rect = btn.getBoundingClientRect();
            
            if (x >= rect.left && x <= rect.right && 
                y >= rect.top && y <= rect.bottom) {
                foundButton = btn;
                break;
            }
        }
        
        // Update hover state
        if (foundButton !== hoveredButton) {
            clearHoveredButton();
            
            if (foundButton) {
                foundButton.classList.add('hand-hover');
                menuCursor.classList.add('hovering');
                hoveredButton = foundButton;
            }
        }
    }
    
    // Clear hover state
    function clearHoveredButton() {
        if (hoveredButton) {
            hoveredButton.classList.remove('hand-hover');
            hoveredButton = null;
        }
        if (menuCursor) {
            menuCursor.classList.remove('hovering');
        }
    }
    
    // Handle menu pinch start (attempt to click button)
    function handleMenuPinchStart(handData) {
        // Only handle on menu screens
        if (currentScreen === 'game' && 
            elements.pauseMenu.classList.contains('hidden') &&
            elements.levelComplete.classList.contains('hidden') &&
            elements.gameOver.classList.contains('hidden')) {
            return false;  // Let game handle pinch
        }
        
        if (pinchCooldown) return false;
        
        // If hovering over a button, click it
        if (hoveredButton) {
            pinchCooldown = true;
            
            // Visual feedback - add a quick flash
            hoveredButton.style.transform = 'scale(0.95)';
            setTimeout(() => {
                if (hoveredButton) {
                    hoveredButton.style.transform = '';
                }
            }, 100);
            
            // Trigger click
            hoveredButton.click();
            
            // Cooldown to prevent double-clicks
            setTimeout(() => {
                pinchCooldown = false;
            }, 500);
            
            return true;  // Consumed the pinch
        }
        
        return false;  // Didn't consume the pinch
    }
    
    // Handle menu pinch end
    function handleMenuPinchEnd(handData) {
        isPinching = false;
    }
    
    // Hide menu cursor (e.g., when entering game)
    function hideMenuCursor() {
        if (menuCursor) {
            menuCursor.classList.add('hidden');
        }
        clearHoveredButton();
    }
    
    // Show menu cursor
    function showMenuCursor() {
        // Will be shown by updateMenuCursor when hand is detected
    }
    
    // Public API
    return {
        init,
        showScreen,
        updateLevelButtons,
        updateHUD,
        updateScore,
        updateShots,
        updateHandStatus,
        updateGesture,
        showPauseMenu,
        hidePauseMenu,
        showLevelComplete,
        hideLevelComplete,
        showGameOver,
        hideGameOver,
        updateLoadingProgress,
        getCurrentScreen,
        showTutorialCountdown,
        hideHandPrompt,
        // Menu hand navigation
        updateMenuCursor,
        handleMenuPinchStart,
        handleMenuPinchEnd,
        hideMenuCursor,
        showMenuCursor
    };
})();

