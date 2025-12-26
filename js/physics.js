// ========================================
// PHYSICS MODULE
// Matter.js physics engine setup and management
// ========================================

const Physics = (function() {
    // Matter.js modules
    const Engine = Matter.Engine;
    const Render = Matter.Render;
    const World = Matter.World;
    const Bodies = Matter.Bodies;
    const Body = Matter.Body;
    const Events = Matter.Events;
    const Composite = Matter.Composite;
    const Vector = Matter.Vector;
    
    // Configuration
    const CONFIG = {
        GRAVITY: { x: 0, y: 1 },
        WALL_THICKNESS: 200,           // Thick walls to prevent tunneling
        RESTITUTION: 0.6,
        FRICTION: 0.3,
        COLLISION_FORCE_THRESHOLD: 5,
        MAX_VELOCITY: 45,              // Cap projectile speed to prevent tunneling
        PHYSICS_SUBSTEPS: 3            // Sub-stepping for better collision detection
    };
    
    // Collision categories
    const CATEGORIES = {
        GROUND: 0x0001,
        WALL: 0x0002,
        PROJECTILE: 0x0004,
        BLOCK: 0x0008,
        TARGET: 0x0010,
        OBSTACLE: 0x0020
    };
    
    // State
    let engine = null;
    let world = null;
    let bounds = { width: 0, height: 0 };
    let walls = [];
    let blocks = [];
    let targets = [];
    let projectile = null;
    let isRunning = false;
    
    // Callbacks
    let onBlockDestroyed = null;
    let onTargetHit = null;
    let onProjectileStopped = null;
    
    // Initialize physics engine
    function init(width, height) {
        bounds.width = width;
        bounds.height = height;
        
        // Create engine
        engine = Engine.create({
            gravity: CONFIG.GRAVITY
        });
        world = engine.world;
        
        // Create boundaries
        createBoundaries();
        
        // Set up collision events
        setupCollisionEvents();
        
        isRunning = true;
        console.log('Physics engine initialized');
    }
    
    // Create world boundaries (ground and walls)
    function createBoundaries() {
        const { width, height } = bounds;
        const t = CONFIG.WALL_THICKNESS;
        
        // Ground - extends beyond screen horizontally
        const ground = Bodies.rectangle(
            width / 2, height + t / 2,
            width + t * 4, t,
            {
                isStatic: true,
                label: 'ground',
                collisionFilter: { category: CATEGORIES.GROUND },
                friction: 0.8,
                render: { fillStyle: '#00f5ff' }
            }
        );
        
        // Left wall - extends beyond screen vertically
        const leftWall = Bodies.rectangle(
            -t / 2, height / 2,
            t, height + t * 4,
            {
                isStatic: true,
                label: 'wall',
                collisionFilter: { category: CATEGORIES.WALL },
                restitution: 0.8,
                render: { fillStyle: '#00f5ff' }
            }
        );
        
        // Right wall (back wall) - extends beyond screen vertically
        const rightWall = Bodies.rectangle(
            width + t / 2, height / 2,
            t, height + t * 4,
            {
                isStatic: true,
                label: 'wall',
                collisionFilter: { category: CATEGORIES.WALL },
                restitution: 0.8,
                render: { fillStyle: '#00f5ff' }
            }
        );
        
        // Top wall (ceiling) - extends beyond screen horizontally
        const ceiling = Bodies.rectangle(
            width / 2, -t / 2,
            width + t * 4, t,
            {
                isStatic: true,
                label: 'ceiling',
                collisionFilter: { category: CATEGORIES.WALL },
                restitution: 0.8,
                render: { fillStyle: '#00f5ff' }
            }
        );
        
        walls = [ground, leftWall, rightWall, ceiling];
        World.add(world, walls);
    }
    
    // Set up collision events
    function setupCollisionEvents() {
        Events.on(engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            
            for (const pair of pairs) {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;
                
                // Check for projectile collisions
                const projectileBody = [bodyA, bodyB].find(b => b.label === 'projectile');
                const otherBody = projectileBody === bodyA ? bodyB : bodyA;
                
                if (projectileBody && otherBody) {
                    handleProjectileCollision(projectileBody, otherBody, pair);
                }
            }
        });
    }
    
    // Handle projectile collision
    function handleProjectileCollision(projectile, other, pair) {
        // Calculate collision force
        const relativeVelocity = Vector.sub(projectile.velocity, other.velocity || { x: 0, y: 0 });
        const force = Vector.magnitude(relativeVelocity);
        
        if (other.label === 'block' && force > CONFIG.COLLISION_FORCE_THRESHOLD) {
            // Mark block for destruction based on force
            if (!other.hitCount) other.hitCount = 0;
            other.hitCount++;
            
            // Reduce health
            if (!other.health) other.health = other.maxHealth || 1;
            other.health -= force * 0.1;
            
            if (other.health <= 0 && onBlockDestroyed) {
                onBlockDestroyed(other);
            }
        }
        
        if (other.label === 'target') {
            if (onTargetHit) {
                onTargetHit(other);
            }
        }
    }
    
    // Create a block
    function createBlock(x, y, width, height, options = {}) {
        const block = Bodies.rectangle(x, y, width, height, {
            label: 'block',
            collisionFilter: { 
                category: CATEGORIES.BLOCK,
                mask: CATEGORIES.GROUND | CATEGORIES.WALL | CATEGORIES.PROJECTILE | CATEGORIES.BLOCK
            },
            restitution: options.restitution || CONFIG.RESTITUTION,
            friction: options.friction || CONFIG.FRICTION,
            density: options.density || 0.001,
            render: { 
                fillStyle: options.color || '#00f5ff',
                strokeStyle: options.strokeColor || '#00f5ff'
            },
            maxHealth: options.health || 1,
            health: options.health || 1,
            blockType: options.type || 'normal',
            points: options.points || 100
        });
        
        blocks.push(block);
        World.add(world, block);
        return block;
    }
    
    // Create a target (special block that must be hit)
    function createTarget(x, y, radius, options = {}) {
        const target = Bodies.circle(x, y, radius, {
            label: 'target',
            collisionFilter: { 
                category: CATEGORIES.TARGET,
                mask: CATEGORIES.GROUND | CATEGORIES.WALL | CATEGORIES.PROJECTILE | CATEGORIES.BLOCK
            },
            restitution: 0.5,
            friction: 0.3,
            density: 0.002,
            render: { 
                fillStyle: options.color || '#ff00ff',
                strokeStyle: '#ff00ff'
            },
            isTarget: true,
            points: options.points || 500,
            targetId: options.id || Math.random().toString(36).substr(2, 9)
        });
        
        targets.push(target);
        World.add(world, target);
        return target;
    }
    
    // Create an obstacle (static, cannot be destroyed)
    function createObstacle(x, y, width, height, options = {}) {
        const obstacle = Bodies.rectangle(x, y, width, height, {
            isStatic: true,
            label: 'obstacle',
            collisionFilter: { 
                category: CATEGORIES.OBSTACLE,
                mask: CATEGORIES.PROJECTILE | CATEGORIES.BLOCK | CATEGORIES.TARGET
            },
            restitution: options.restitution || 0.8,
            friction: options.friction || 0.2,
            render: { 
                fillStyle: options.color || '#444466',
                strokeStyle: '#666688'
            }
        });
        
        World.add(world, obstacle);
        return obstacle;
    }
    
    // Create projectile (rock)
    function createProjectile(x, y, radius = 20) {
        if (projectile) {
            World.remove(world, projectile);
        }
        
        projectile = Bodies.circle(x, y, radius, {
            label: 'projectile',
            collisionFilter: { 
                category: CATEGORIES.PROJECTILE,
                mask: CATEGORIES.GROUND | CATEGORIES.WALL | CATEGORIES.BLOCK | CATEGORIES.TARGET | CATEGORIES.OBSTACLE
            },
            restitution: 0.5,
            friction: 0.3,
            density: 0.004,
            render: { 
                fillStyle: '#ff6600',
                strokeStyle: '#ffaa00'
            }
        });
        
        // Make it static until launched
        Body.setStatic(projectile, true);
        
        World.add(world, projectile);
        return projectile;
    }
    
    // Launch projectile
    function launchProjectile(velocity) {
        if (!projectile) return;
        
        Body.setStatic(projectile, false);
        Body.setVelocity(projectile, velocity);
        
        // Track how long the ball has been slow/stopped
        let slowFrames = 0;
        const SLOW_THRESHOLD = 0.8;      // Velocity threshold to consider "slow"
        const SLOW_FRAMES_NEEDED = 4;    // Number of consecutive slow checks before reset (4 * 250ms = 1 second)
        
        // Set up stopped detection
        let stoppedCheckInterval = setInterval(() => {
            if (projectile && !projectile.isStatic) {
                const speed = Vector.magnitude(projectile.velocity);
                const pos = projectile.position;
                
                // Check if ball went off-screen (with margin)
                const offScreenMargin = 200;
                const isOffScreen = pos.x < -offScreenMargin || 
                                   pos.x > bounds.width + offScreenMargin ||
                                   pos.y < -offScreenMargin ||
                                   pos.y > bounds.height + offScreenMargin;
                
                // Check if ball is moving slowly (stopped on ground, obstacle, or anywhere)
                if (speed < SLOW_THRESHOLD) {
                    slowFrames++;
                } else {
                    slowFrames = 0;  // Reset if ball starts moving again
                }
                
                // Trigger stopped if: slow for long enough OR went off-screen
                if (slowFrames >= SLOW_FRAMES_NEEDED || isOffScreen) {
                    clearInterval(stoppedCheckInterval);
                    if (onProjectileStopped) {
                        onProjectileStopped(projectile);
                    }
                }
            } else {
                clearInterval(stoppedCheckInterval);
            }
        }, 250);
    }
    
    // Move projectile (while aiming)
    function moveProjectile(x, y) {
        if (projectile && projectile.isStatic) {
            Body.setPosition(projectile, { x, y });
        }
    }
    
    // Remove a body from the world
    function removeBody(body) {
        World.remove(world, body);
        
        // Remove from tracking arrays
        blocks = blocks.filter(b => b !== body);
        targets = targets.filter(t => t !== body);
        
        if (body === projectile) {
            projectile = null;
        }
    }
    
    // Clear all dynamic bodies (blocks, targets, projectile)
    function clearLevel() {
        // Remove all blocks
        for (const block of blocks) {
            World.remove(world, block);
        }
        blocks = [];
        
        // Remove all targets
        for (const target of targets) {
            World.remove(world, target);
        }
        targets = [];
        
        // Remove projectile
        if (projectile) {
            World.remove(world, projectile);
            projectile = null;
        }
        
        // Remove all non-wall bodies
        const allBodies = Composite.allBodies(world);
        for (const body of allBodies) {
            if (!walls.includes(body)) {
                World.remove(world, body);
            }
        }
    }
    
    // Update physics (call each frame)
    function update(delta = 1000 / 60) {
        if (isRunning && engine) {
            // Clamp projectile velocity to prevent tunneling
            if (projectile && !projectile.isStatic) {
                const vel = projectile.velocity;
                const speed = Vector.magnitude(vel);
                
                if (speed > CONFIG.MAX_VELOCITY) {
                    const scale = CONFIG.MAX_VELOCITY / speed;
                    Body.setVelocity(projectile, {
                        x: vel.x * scale,
                        y: vel.y * scale
                    });
                }
            }
            
            // Sub-stepping: run multiple smaller physics steps for better collision detection
            const subDelta = delta / CONFIG.PHYSICS_SUBSTEPS;
            for (let i = 0; i < CONFIG.PHYSICS_SUBSTEPS; i++) {
                Engine.update(engine, subDelta);
                
                // Re-check velocity after each sub-step
                if (projectile && !projectile.isStatic) {
                    const vel = projectile.velocity;
                    const speed = Vector.magnitude(vel);
                    
                    if (speed > CONFIG.MAX_VELOCITY) {
                        const scale = CONFIG.MAX_VELOCITY / speed;
                        Body.setVelocity(projectile, {
                            x: vel.x * scale,
                            y: vel.y * scale
                        });
                    }
                }
            }
        }
    }
    
    // Get all bodies for rendering
    function getBodies() {
        return {
            walls,
            blocks,
            targets,
            projectile,
            all: Composite.allBodies(world)
        };
    }
    
    // Set callbacks
    function setCallbacks(callbacks) {
        if (callbacks.onBlockDestroyed) onBlockDestroyed = callbacks.onBlockDestroyed;
        if (callbacks.onTargetHit) onTargetHit = callbacks.onTargetHit;
        if (callbacks.onProjectileStopped) onProjectileStopped = callbacks.onProjectileStopped;
    }
    
    // Pause/resume
    function pause() {
        isRunning = false;
    }
    
    function resume() {
        isRunning = true;
    }
    
    // Get projectile
    function getProjectile() {
        return projectile;
    }
    
    // Get targets
    function getTargets() {
        return targets;
    }
    
    // Get blocks
    function getBlocks() {
        return blocks;
    }
    
    // Resize
    function resize(width, height) {
        bounds.width = width;
        bounds.height = height;
        
        const t = CONFIG.WALL_THICKNESS;
        
        // Update wall positions (ground, leftWall, rightWall, ceiling)
        if (walls.length >= 4) {
            // Ground - below screen
            Body.setPosition(walls[0], { x: width / 2, y: height + t / 2 });
            // Left wall - stays at left
            Body.setPosition(walls[1], { x: -t / 2, y: height / 2 });
            // Right wall - at right edge
            Body.setPosition(walls[2], { x: width + t / 2, y: height / 2 });
            // Ceiling - above screen
            Body.setPosition(walls[3], { x: width / 2, y: -t / 2 });
        }
    }
    
    // Cleanup
    function destroy() {
        if (engine) {
            World.clear(world);
            Engine.clear(engine);
        }
        engine = null;
        world = null;
        walls = [];
        blocks = [];
        targets = [];
        projectile = null;
        isRunning = false;
    }
    
    // Public API
    return {
        init,
        update,
        createBlock,
        createTarget,
        createObstacle,
        createProjectile,
        launchProjectile,
        moveProjectile,
        removeBody,
        clearLevel,
        getBodies,
        getProjectile,
        getTargets,
        getBlocks,
        setCallbacks,
        pause,
        resume,
        resize,
        destroy,
        CATEGORIES,
        CONFIG
    };
})();

