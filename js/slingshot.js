// ========================================
// SLINGSHOT MODULE
// Slingshot mechanics and projectile launching
// ========================================

const Slingshot = (function() {
    // Configuration
    const CONFIG = {
        ANCHOR_X_PERCENT: 0.22,      // Slingshot position (% of screen width) - moved right to avoid camera
        ANCHOR_Y_PERCENT: 0.7,       // Slingshot position (% of screen height)
        FORK_WIDTH: 60,
        FORK_HEIGHT: 100,
        MAX_PULL_DISTANCE: 350,      // Max pull for power calculation
        MIN_PULL_DISTANCE: 20,
        POWER_MULTIPLIER: 0.18,      // Launch power multiplier (reduced)
        PROJECTILE_RADIUS: 20,
        MIN_HOLD_TIME: 1500          // Minimum hold time in ms before shot can be released
    };
    
    // State
    let anchorX = 0;
    let anchorY = 0;
    let slingshotParts = null;
    let projectilePos = { x: 0, y: 0 };
    let projectileRadius = CONFIG.PROJECTILE_RADIUS;
    
    let isGrabbing = false;
    let isPulling = false;
    let pullDistance = 0;
    let pullAngle = 0;
    let power = 0;
    
    let canGrab = true;
    let projectileLaunched = false;
    
    // Track where the hand was when pinch started
    let grabStartPos = { x: 0, y: 0 };
    
    // Track hold time for minimum aim duration
    let grabStartTime = 0;
    let holdDuration = 0;
    
    // Callbacks
    let onLaunch = null;
    let onGrab = null;
    let onRelease = null;
    
    // Initialize slingshot
    function init(screenWidth, screenHeight) {
        updatePosition(screenWidth, screenHeight);
        resetProjectile();
        
        console.log('Slingshot initialized at', anchorX, anchorY);
    }
    
    // Update position based on screen size
    function updatePosition(screenWidth, screenHeight) {
        anchorX = screenWidth * CONFIG.ANCHOR_X_PERCENT;
        anchorY = screenHeight * CONFIG.ANCHOR_Y_PERCENT;
        
        // Update slingshot parts
        slingshotParts = {
            leftFork: { x: anchorX - CONFIG.FORK_WIDTH / 2, y: anchorY },
            rightFork: { x: anchorX + CONFIG.FORK_WIDTH / 2, y: anchorY },
            anchor: { x: anchorX, y: anchorY }
        };
    }
    
    // Reset projectile to starting position
    function resetProjectile() {
        projectilePos = {
            x: anchorX,
            y: anchorY
        };
        isGrabbing = false;
        isPulling = false;
        pullDistance = 0;
        pullAngle = 0;
        power = 0;
        projectileLaunched = false;
        canGrab = true;
        grabStartPos = { x: 0, y: 0 };
        grabStartTime = 0;
        holdDuration = 0;
    }
    
    // Handle pinch start (attempt to grab)
    // Pinch ANYWHERE to grab - ball is always grabbed at slingshot
    function handlePinchStart(handData) {
        if (!canGrab || projectileLaunched) return false;
        
        // Store where the hand was when pinch started
        grabStartPos = {
            x: handData.pinchPosition.x,
            y: handData.pinchPosition.y
        };
        
        // Record grab start time for minimum hold duration
        grabStartTime = Date.now();
        holdDuration = 0;
        
        isGrabbing = true;
        isPulling = true;
        
        // Ball stays at anchor initially
        projectilePos = { x: anchorX, y: anchorY };
        
        if (onGrab) onGrab();
        return true;
    }
    
    // Handle pinch move (pulling back)
    // Pull is relative to where hand STARTED, not absolute position
    function handlePinchMove(handData) {
        if (!isGrabbing || !isPulling) return;
        
        // Update hold duration
        holdDuration = Date.now() - grabStartTime;
        
        const handX = handData.pinchPosition.x;
        const handY = handData.pinchPosition.y;
        
        // Calculate pull vector: how far hand moved from grab start position
        const dx = handX - grabStartPos.x;
        const dy = handY - grabStartPos.y;
        
        // Calculate distance and angle of the pull
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Clamp distance
        pullDistance = Math.min(distance, CONFIG.MAX_PULL_DISTANCE);
        
        // Calculate angle (direction hand moved from start)
        pullAngle = Math.atan2(dy, dx);
        
        // Position projectile: move it in the SAME direction as hand movement
        // (pull down-left = ball goes down-left from anchor)
        if (pullDistance > CONFIG.MIN_PULL_DISTANCE) {
            projectilePos = {
                x: anchorX + Math.cos(pullAngle) * pullDistance,
                y: anchorY + Math.sin(pullAngle) * pullDistance
            };
        } else {
            projectilePos = {
                x: anchorX,
                y: anchorY
            };
        }
        
        // Calculate power (0 to 1)
        power = Math.max(0, (pullDistance - CONFIG.MIN_PULL_DISTANCE) / 
            (CONFIG.MAX_PULL_DISTANCE - CONFIG.MIN_PULL_DISTANCE));
    }
    
    // Handle pinch end (release/launch)
    function handlePinchEnd(handData) {
        if (!isGrabbing) return null;
        
        // Update final hold duration
        holdDuration = Date.now() - grabStartTime;
        
        isGrabbing = false;
        isPulling = false;
        
        // Check if held long enough AND pulled far enough to launch
        const heldLongEnough = holdDuration >= CONFIG.MIN_HOLD_TIME;
        const pulledFarEnough = pullDistance > CONFIG.MIN_PULL_DISTANCE;
        
        if (pulledFarEnough && heldLongEnough) {
            // Calculate launch velocity (opposite direction of pull)
            const launchAngle = pullAngle + Math.PI; // Opposite direction
            const launchPower = power * CONFIG.POWER_MULTIPLIER * CONFIG.MAX_PULL_DISTANCE;
            
            const velocity = {
                x: Math.cos(launchAngle) * launchPower,
                y: Math.sin(launchAngle) * launchPower
            };
            
            projectileLaunched = true;
            canGrab = false;
            
            if (onLaunch) onLaunch(velocity, projectilePos);
            if (onRelease) onRelease();
            
            return velocity;
        } else {
            // Not held long enough or not pulled far enough, reset
            resetProjectile();
            if (onRelease) onRelease();
            return null;
        }
    }
    
    // Get trajectory preview points
    function getTrajectoryPreview() {
        if (!isPulling || pullDistance < CONFIG.MIN_PULL_DISTANCE) return null;
        
        // Calculate launch parameters
        const launchAngle = pullAngle + Math.PI;
        const launchPower = power * CONFIG.POWER_MULTIPLIER * CONFIG.MAX_PULL_DISTANCE;
        
        return {
            startX: projectilePos.x,
            startY: projectilePos.y,
            velocityX: Math.cos(launchAngle) * launchPower,
            velocityY: Math.sin(launchAngle) * launchPower
        };
    }
    
    // Render slingshot and projectile
    function render() {
        // Draw slingshot frame
        const parts = Renderer.drawSlingshot(
            anchorX, 
            anchorY, 
            CONFIG.FORK_WIDTH, 
            CONFIG.FORK_HEIGHT
        );
        
        // Draw elastic band
        Renderer.drawElasticBand(
            parts.leftFork,
            parts.rightFork,
            projectilePos,
            isPulling
        );
        
        // Draw projectile if not launched
        if (!projectileLaunched) {
            Renderer.drawProjectile(
                projectilePos.x,
                projectilePos.y,
                projectileRadius,
                true // isAiming
            );
        }
        
        // Draw trajectory preview if pulling
        if (isPulling && pullDistance > CONFIG.MIN_PULL_DISTANCE) {
            const traj = getTrajectoryPreview();
            if (traj) {
                Renderer.drawTrajectory(
                    traj.startX,
                    traj.startY,
                    traj.velocityX,
                    traj.velocityY
                );
            }
            
            // Draw power meter
            Renderer.drawPowerMeter(
                power,
                1,
                anchorX - 75,
                anchorY + CONFIG.FORK_HEIGHT + 30
            );
            
            // Calculate current hold duration in real-time for visual display
            const currentHoldDuration = Date.now() - grabStartTime;
            const holdProgress = Math.min(currentHoldDuration / CONFIG.MIN_HOLD_TIME, 1);
            Renderer.drawHoldTimer(
                holdProgress,
                anchorX - 75,
                anchorY + CONFIG.FORK_HEIGHT + 60
            );
        }
    }
    
    // Set callbacks
    function setCallbacks(callbacks) {
        if (callbacks.onLaunch) onLaunch = callbacks.onLaunch;
        if (callbacks.onGrab) onGrab = callbacks.onGrab;
        if (callbacks.onRelease) onRelease = callbacks.onRelease;
    }
    
    // Getters
    function getAnchor() {
        return { x: anchorX, y: anchorY };
    }
    
    function getProjectilePosition() {
        return { ...projectilePos };
    }
    
    function getPower() {
        return power;
    }
    
    function isPullingBack() {
        return isPulling;
    }
    
    function isProjectileLaunched() {
        return projectileLaunched;
    }
    
    function canGrabProjectile() {
        return canGrab && !projectileLaunched;
    }
    
    // Enable grabbing (for next shot)
    function enableGrab() {
        canGrab = true;
        projectileLaunched = false;
    }
    
    // Public API
    return {
        init,
        updatePosition,
        resetProjectile,
        handlePinchStart,
        handlePinchMove,
        handlePinchEnd,
        render,
        setCallbacks,
        getAnchor,
        getProjectilePosition,
        getPower,
        isPullingBack,
        isProjectileLaunched,
        canGrabProjectile,
        enableGrab,
        CONFIG
    };
})();

