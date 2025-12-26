// ========================================
// RENDERER MODULE
// Canvas rendering with neon glow effects
// ========================================

const Renderer = (function() {
    // Configuration
    const CONFIG = {
        GLOW_BLUR: 15,
        TRAIL_LENGTH: 20,
        PARTICLE_COUNT: 50
    };
    
    // Colors
    const COLORS = {
        background: '#0a0a0f',
        gridLine: 'rgba(0, 245, 255, 0.03)',
        cyan: '#00f5ff',
        magenta: '#ff00ff',
        yellow: '#ffff00',
        orange: '#ff6600',
        green: '#00ff88',
        pink: '#ff1493'
    };
    
    // State
    let canvas = null;
    let ctx = null;
    let width = 0;
    let height = 0;
    
    // Particle system
    let particles = [];
    
    // Projectile trail
    let trail = [];
    
    // Initialize renderer
    function init(canvasElement) {
        canvas = canvasElement;
        ctx = canvas.getContext('2d');
        
        resize();
        window.addEventListener('resize', resize);
        
        console.log('Renderer initialized');
    }
    
    // Resize canvas
    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }
    
    // Clear canvas
    function clear() {
        // Draw gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#0a0a0f');
        gradient.addColorStop(0.5, '#1a0a2e');
        gradient.addColorStop(1, '#0f0f1a');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        drawGrid();
    }
    
    // Draw background grid
    function drawGrid() {
        const gridSize = 50;
        
        ctx.strokeStyle = COLORS.gridLine;
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }
    
    // Draw ground line
    function drawGround() {
        const groundY = height - 2;
        
        ctx.strokeStyle = COLORS.cyan;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = COLORS.cyan;
        
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(width, groundY);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
    }
    
    // Draw slingshot
    function drawSlingshot(anchorX, anchorY, forkWidth = 60, forkHeight = 100) {
        const leftForkX = anchorX - forkWidth / 2;
        const rightForkX = anchorX + forkWidth / 2;
        const baseY = anchorY + forkHeight;
        const forkTopY = anchorY;
        
        ctx.strokeStyle = COLORS.cyan;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = COLORS.cyan;
        
        // Left fork
        ctx.beginPath();
        ctx.moveTo(anchorX, baseY);
        ctx.lineTo(anchorX - 10, anchorY + 40);
        ctx.lineTo(leftForkX, forkTopY);
        ctx.stroke();
        
        // Right fork
        ctx.beginPath();
        ctx.moveTo(anchorX, baseY);
        ctx.lineTo(anchorX + 10, anchorY + 40);
        ctx.lineTo(rightForkX, forkTopY);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        
        return {
            leftFork: { x: leftForkX, y: forkTopY },
            rightFork: { x: rightForkX, y: forkTopY },
            anchor: { x: anchorX, y: forkTopY }
        };
    }
    
    // Draw elastic band
    function drawElasticBand(leftFork, rightFork, projectilePos, isPulling) {
        if (!isPulling) {
            // Resting state - straight line between forks
            ctx.strokeStyle = COLORS.magenta;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 10;
            ctx.shadowColor = COLORS.magenta;
            
            ctx.beginPath();
            ctx.moveTo(leftFork.x, leftFork.y);
            ctx.lineTo(rightFork.x, rightFork.y);
            ctx.stroke();
        } else {
            // Pulled state - lines to projectile
            ctx.strokeStyle = COLORS.magenta;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 15;
            ctx.shadowColor = COLORS.magenta;
            
            // Left elastic
            ctx.beginPath();
            ctx.moveTo(leftFork.x, leftFork.y);
            ctx.lineTo(projectilePos.x, projectilePos.y);
            ctx.stroke();
            
            // Right elastic
            ctx.beginPath();
            ctx.moveTo(rightFork.x, rightFork.y);
            ctx.lineTo(projectilePos.x, projectilePos.y);
            ctx.stroke();
            
            // Glow effect at stretch points
            drawGlowPoint(leftFork.x, leftFork.y, 5, COLORS.magenta);
            drawGlowPoint(rightFork.x, rightFork.y, 5, COLORS.magenta);
        }
        
        ctx.shadowBlur = 0;
    }
    
    // Draw projectile (rock)
    function drawProjectile(x, y, radius, isAiming = false) {
        // Add to trail
        if (!isAiming) {
            trail.push({ x, y, alpha: 1 });
            if (trail.length > CONFIG.TRAIL_LENGTH) {
                trail.shift();
            }
        }
        
        // Draw trail
        drawTrail();
        
        // Outer glow
        ctx.beginPath();
        ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 102, 0, 0.2)';
        ctx.fill();
        
        // Main rock body
        const gradient = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, radius);
        gradient.addColorStop(0, '#ffaa00');
        gradient.addColorStop(0.5, '#ff6600');
        gradient.addColorStop(1, '#cc4400');
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 25;
        ctx.shadowColor = COLORS.orange;
        ctx.fill();
        
        // Inner highlight
        ctx.beginPath();
        ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 200, 0.5)';
        ctx.fill();
        
        // Neon outline
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.shadowBlur = 0;
    }
    
    // Draw projectile trail
    function drawTrail() {
        for (let i = 0; i < trail.length; i++) {
            const point = trail[i];
            const alpha = (i / trail.length) * 0.5;
            const radius = 5 + (i / trail.length) * 10;
            
            ctx.beginPath();
            ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 102, 0, ${alpha})`;
            ctx.fill();
        }
    }
    
    // Clear trail
    function clearTrail() {
        trail = [];
    }
    
    // Draw block
    function drawBlock(body) {
        const vertices = body.vertices;
        const health = body.health || 1;
        const maxHealth = body.maxHealth || 1;
        const healthPercent = health / maxHealth;
        
        // Determine color based on block type
        let color = COLORS.cyan;
        let glowColor = COLORS.cyan;
        
        if (body.blockType === 'strong') {
            color = COLORS.green;
            glowColor = COLORS.green;
        } else if (body.blockType === 'weak') {
            color = COLORS.pink;
            glowColor = COLORS.pink;
        }
        
        // Adjust opacity based on health
        const alpha = 0.3 + healthPercent * 0.7;
        
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();
        
        // Fill
        ctx.fillStyle = hexToRgba(color, alpha * 0.3);
        ctx.fill();
        
        // Glow outline
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10 * healthPercent;
        ctx.shadowColor = glowColor;
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        
        // Damage cracks if health is low
        if (healthPercent < 0.5) {
            drawCracks(body.position.x, body.position.y, 20, color);
        }
    }
    
    // Draw target
    function drawTarget(body) {
        const x = body.position.x;
        const y = body.position.y;
        const radius = body.circleRadius || 25;
        
        // Pulsing animation
        const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1;
        
        // Outer glow ring
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.5 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Main target
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, '#ff66ff');
        gradient.addColorStop(0.7, '#ff00ff');
        gradient.addColorStop(1, '#cc00cc');
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 30;
        ctx.shadowColor = COLORS.magenta;
        ctx.fill();
        
        // Inner rings
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffaaff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }
    
    // Draw obstacle
    function drawObstacle(body) {
        const vertices = body.vertices;
        
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();
        
        // Fill with dark color
        ctx.fillStyle = '#222233';
        ctx.fill();
        
        // Outline
        ctx.strokeStyle = '#444466';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Diagonal stripes pattern
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = '#333344';
        ctx.lineWidth = 1;
        
        const bounds = body.bounds;
        for (let i = bounds.min.x - 100; i < bounds.max.x + 100; i += 15) {
            ctx.beginPath();
            ctx.moveTo(i, bounds.min.y);
            ctx.lineTo(i + 100, bounds.max.y);
            ctx.stroke();
        }
        ctx.restore();
    }
    
    // Draw trajectory preview - calibrated to match actual ball path
    function drawTrajectory(startX, startY, velocityX, velocityY, steps = 150) {
        // Calibrated to match Matter.js physics engine
        // Matter.js applies gravity per frame (~60fps), accumulating velocity
        const gravity = 0.85;  // Reduced to compensate for velocity scaling
        const timeStep = 1.0;  // Simulation step
        
        let x = startX;
        let y = startY;
        // Scale velocity to match actual ball trajectory
        let vx = velocityX * 1.25;  // Increased to match actual ball distance
        let vy = velocityY * 1.25;
        
        // Collect points
        const points = [{ x, y }];
        
        for (let i = 0; i < steps; i++) {
            // Velocity update (Matter.js style)
            x += vx * timeStep;
            y += vy * timeStep;
            
            // Gravity pulls down
            vy += gravity * timeStep;
            
            // Stop if way out of bounds
            if (x < -100 || x > width + 100 || y > height + 100) break;
            
            points.push({ x, y });
        }
        
        // Draw trajectory line
        if (points.length > 1) {
            ctx.setLineDash([8, 12]);
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = COLORS.yellow;
            
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
            
            // Draw dots at intervals
            for (let i = 5; i < points.length; i += 10) {
                const p = points[i];
                const alpha = Math.max(0.2, 1 - (i / points.length));
                const dotSize = 4 + (1 - i / points.length) * 4;
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, dotSize, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = COLORS.yellow;
                ctx.fill();
            }
            ctx.shadowBlur = 0;
        }
    }
    
    // Draw power meter
    function drawPowerMeter(power, maxPower, x, y) {
        const barWidth = 150;
        const barHeight = 15;
        const fillPercent = power / maxPower;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Power fill with gradient
        const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(0.5, '#ffff00');
        gradient.addColorStop(1, '#ff0000');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth * fillPercent, barHeight);
        
        // Border
        ctx.strokeStyle = COLORS.cyan;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 5;
        ctx.shadowColor = COLORS.cyan;
        ctx.strokeRect(x, y, barWidth, barHeight);
        
        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Orbitron';
        ctx.fillText('POWER', x, y - 5);
        
        ctx.shadowBlur = 0;
    }
    
    // Draw particles
    function drawParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // gravity
            p.life -= p.decay;
            
            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(p.color, p.life);
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
    }
    
    // Spawn particles at position
    function spawnParticles(x, y, count, color, options = {}) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * (options.speed || 10),
                vy: (Math.random() - 0.5) * (options.speed || 10) - 3,
                size: options.size || 5 + Math.random() * 5,
                color: color,
                life: 1,
                decay: options.decay || 0.02 + Math.random() * 0.02
            });
        }
    }
    
    // Draw glow point
    function drawGlowPoint(x, y, radius, color) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    // Draw cracks
    function drawCracks(x, y, size, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            let cx = x, cy = y;
            for (let j = 0; j < 4; j++) {
                cx += (Math.random() - 0.5) * size;
                cy += (Math.random() - 0.5) * size;
                ctx.lineTo(cx, cy);
            }
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1;
    }
    
    // Draw hand cursor
    function drawHandCursor(x, y, isPinching, pinchStrength) {
        const size = 30;
        
        ctx.save();
        ctx.translate(x, y);
        
        if (isPinching) {
            // Pinching indicator
            ctx.beginPath();
            ctx.arc(0, 0, size * pinchStrength, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 0, ${0.3 + pinchStrength * 0.4})`;
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.yellow;
            ctx.shadowBlur = 20;
            ctx.shadowColor = COLORS.yellow;
            ctx.fill();
        } else {
            // Open hand indicator
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.strokeStyle = COLORS.cyan;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = COLORS.cyan;
            ctx.stroke();
            
            // Cross
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(10, 0);
            ctx.moveTo(0, -10);
            ctx.lineTo(0, 10);
            ctx.stroke();
        }
        
        ctx.restore();
        ctx.shadowBlur = 0;
    }
    
    // Draw all physics bodies
    function drawBodies(bodies) {
        // Draw blocks
        for (const block of bodies.blocks) {
            if (block.label === 'block') {
                drawBlock(block);
            }
        }
        
        // Draw targets
        for (const target of bodies.targets) {
            drawTarget(target);
        }
        
        // Draw obstacles
        for (const body of bodies.all) {
            if (body.label === 'obstacle') {
                drawObstacle(body);
            }
        }
    }
    
    // Helper: hex to rgba
    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    // Get dimensions
    function getDimensions() {
        return { width, height };
    }
    
    // Cleanup
    function destroy() {
        window.removeEventListener('resize', resize);
        particles = [];
        trail = [];
    }
    
    // Public API
    return {
        init,
        resize,
        clear,
        drawGround,
        drawSlingshot,
        drawElasticBand,
        drawProjectile,
        drawBlock,
        drawTarget,
        drawObstacle,
        drawTrajectory,
        drawPowerMeter,
        drawParticles,
        spawnParticles,
        drawHandCursor,
        drawBodies,
        clearTrail,
        getDimensions,
        destroy,
        COLORS
    };
})();

