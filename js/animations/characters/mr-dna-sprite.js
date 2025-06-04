/**
 * Mr. DNA Sprite Animation System
 * AAA-Quality character animation with sprite sheets and interactive behaviors
 * Features: State machine, smooth transitions, particle effects, interactive responses
 */

class MrDNASpriteAnimation {
    constructor(container) {
        this.container = container || document.body;
        this.element = null;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;

        // Animation state
        this.currentState = 'idle';
        this.previousState = null;
        this.stateStartTime = 0;
        this.frameIndex = 0;
        this.isTransitioning = false;

        // Position and movement
        this.position = { x: 100, y: window.innerHeight - 150 };
        this.velocity = { x: 0, y: 0 };
        this.targetPosition = { ...this.position };

        // Sprite configuration
        this.spriteConfig = {
            width: 64,
            height: 96,
            scale: 1.5,
            frameRate: 12 // FPS for sprite animation
        };

        // Animation states and frame sequences
        this.animations = {
            idle: {
                frames: [0, 1, 2, 3, 2, 1],
                duration: 2000,
                loop: true,
                frameWidth: 64,
                frameHeight: 96
            },
            talking: {
                frames: [4, 5, 6, 7, 6, 5],
                duration: 800,
                loop: true,
                frameWidth: 64,
                frameHeight: 96
            },
            waving: {
                frames: [8, 9, 10, 11, 10, 9],
                duration: 1200,
                loop: false,
                frameWidth: 64,
                frameHeight: 96
            },
            hopping: {
                frames: [12, 13, 14, 15],
                duration: 600,
                loop: false,
                frameWidth: 64,
                frameHeight: 96
            },
            explaining: {
                frames: [16, 17, 18, 19, 18, 17],
                duration: 1000,
                loop: true,
                frameWidth: 64,
                frameHeight: 96
            },
            excited: {
                frames: [20, 21, 22, 23, 22, 21],
                duration: 500,
                loop: true,
                frameWidth: 64,
                frameHeight: 96
            },
            leaving: {
                frames: [24, 25, 26, 27],
                duration: 800,
                loop: false,
                frameWidth: 64,
                frameHeight: 96
            },
            arriving: {
                frames: [28, 29, 30, 31],
                duration: 800,
                loop: false,
                frameWidth: 64,
                frameHeight: 96
            }
        };

        // Particle effects
        this.particles = [];
        this.maxParticles = 20;

        // Interactive properties
        this.isHovered = false;
        this.lastInteraction = 0;
        this.personality = {
            enthusiasm: 0.8,
            helpfulness: 0.9,
            chattiness: 0.7
        };

        // Performance tracking
        this.lastFrameTime = 0;
        this.frameCount = 0;

        // Bind methods
        this.animate = this.animate.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleResize = this.handleResize.bind(this);
    }

    /**
     * Initialize the Mr. DNA animation system
     */
    async init() {
        try {
            await this.createSpriteSheet();
            this.createElement();
            this.setupCanvas();
            this.setupEventListeners();
            this.startAnimation();

            console.log('🧬 Mr. DNA sprite animation initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Mr. DNA animation:', error);
            return false;
        }
    }

    /**
     * Create sprite sheet using procedural generation
     */
    async createSpriteSheet() {
        // Create a canvas for generating sprite frames
        const spriteCanvas = document.createElement('canvas');
        spriteCanvas.width = 64 * 8; // 8 frames per row
        spriteCanvas.height = 96 * 4; // 4 rows
        const spriteCtx = spriteCanvas.getContext('2d');

        // Generate each frame procedurally
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 8; col++) {
                const frameIndex = row * 8 + col;
                const x = col * 64;
                const y = row * 96;

                this.drawDNAFrame(spriteCtx, x, y, frameIndex);
            }
        }

        // Convert to image URL
        this.spriteSheetURL = spriteCanvas.toDataURL();

        // Create image element for rendering
        this.spriteImage = new Image();
        return new Promise((resolve, reject) => {
            this.spriteImage.onload = resolve;
            this.spriteImage.onerror = reject;
            this.spriteImage.src = this.spriteSheetURL;
        });
    }

    /**
     * Draw a single DNA character frame
     */
    drawDNAFrame(ctx, offsetX, offsetY, frameIndex) {
        const centerX = offsetX + 32;
        const centerY = offsetY + 48;

        // Calculate animation parameters based on frame
        const time = frameIndex * 0.2;
        const bounce = Math.sin(time * 3) * 2;
        const twist = Math.sin(time * 2) * 0.2;

        // Clear frame area
        ctx.clearRect(offsetX, offsetY, 64, 96);

        // Draw DNA helix body
        this.drawDNAHelix(ctx, centerX, centerY + bounce, twist, frameIndex);

        // Draw head
        this.drawDNAHead(ctx, centerX, centerY - 20 + bounce, frameIndex);

        // Draw expression based on animation state
        this.drawDNAExpression(ctx, centerX, centerY - 20 + bounce, frameIndex);

        // Add particle effects for certain frames
        if (frameIndex >= 16 && frameIndex <= 23) {
            this.drawDNAParticles(ctx, centerX, centerY, frameIndex);
        }
    }

    /**
     * Draw the DNA helix body
     */
    drawDNAHelix(ctx, x, y, twist, frame) {
        const helixHeight = 60;
        const helixWidth = 20;

        // Main body gradient
        const gradient = ctx.createLinearGradient(x - helixWidth/2, y, x + helixWidth/2, y + helixHeight);
        gradient.addColorStop(0, '#4A90E2');
        gradient.addColorStop(0.5, '#357ABD');
        gradient.addColorStop(1, '#2E5984');

        ctx.fillStyle = gradient;

        // Draw helix strands
        ctx.beginPath();
        for (let i = 0; i <= helixHeight; i += 2) {
            const progress = i / helixHeight;
            const waveX1 = x + Math.sin(progress * Math.PI * 4 + twist) * (helixWidth * 0.3);
            const waveX2 = x + Math.sin(progress * Math.PI * 4 + twist + Math.PI) * (helixWidth * 0.3);

            if (i === 0) {
                ctx.moveTo(waveX1, y + i);
            } else {
                ctx.lineTo(waveX1, y + i);
            }
        }
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#4A90E2';
        ctx.stroke();

        // Second strand
        ctx.beginPath();
        for (let i = 0; i <= helixHeight; i += 2) {
            const progress = i / helixHeight;
            const waveX = x + Math.sin(progress * Math.PI * 4 + twist + Math.PI) * (helixWidth * 0.3);

            if (i === 0) {
                ctx.moveTo(waveX, y + i);
            } else {
                ctx.lineTo(waveX, y + i);
            }
        }
        ctx.strokeStyle = '#2E5984';
        ctx.stroke();

        // Cross-links (base pairs)
        for (let i = 0; i < 8; i++) {
            const linkY = y + (i * helixHeight / 8) + 5;
            const progress = i / 8;
            const x1 = x + Math.sin(progress * Math.PI * 4 + twist) * (helixWidth * 0.3);
            const x2 = x + Math.sin(progress * Math.PI * 4 + twist + Math.PI) * (helixWidth * 0.3);

            ctx.beginPath();
            ctx.moveTo(x1, linkY);
            ctx.lineTo(x2, linkY);
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#D4AC5A';
            ctx.stroke();
        }
    }

    /**
     * Draw the DNA character head
     */
    drawDNAHead(ctx, x, y, frame) {
        // Head circle
        const headRadius = 18;

        // Head gradient
        const headGradient = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, headRadius);
        headGradient.addColorStop(0, '#6AB7FF');
        headGradient.addColorStop(1, '#4A90E2');

        ctx.fillStyle = headGradient;
        ctx.beginPath();
        ctx.arc(x, y, headRadius, 0, Math.PI * 2);
        ctx.fill();

        // Head outline
        ctx.strokeStyle = '#2E5984';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    /**
     * Draw facial expressions
     */
    drawDNAExpression(ctx, x, y, frame) {
        // Determine expression based on frame range
        let expression = 'neutral';
        if (frame >= 4 && frame <= 7) expression = 'talking';
        else if (frame >= 8 && frame <= 11) expression = 'waving';
        else if (frame >= 12 && frame <= 15) expression = 'excited';
        else if (frame >= 16 && frame <= 19) expression = 'explaining';
        else if (frame >= 20 && frame <= 23) expression = 'very_excited';

        // Eyes
        const eyeY = y - 5;
        const eyeSize = expression === 'very_excited' ? 4 : 3;
        const eyeSpacing = 8;

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x - eyeSpacing/2, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.arc(x + eyeSpacing/2, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        const pupilSize = eyeSize * 0.6;
        ctx.fillStyle = '#2E5984';
        ctx.beginPath();
        ctx.arc(x - eyeSpacing/2, eyeY, pupilSize, 0, Math.PI * 2);
        ctx.arc(x + eyeSpacing/2, eyeY, pupilSize, 0, Math.PI * 2);
        ctx.fill();

        // Mouth based on expression
        ctx.strokeStyle = '#2E5984';
        ctx.lineWidth = 2;
        ctx.beginPath();

        switch (expression) {
            case 'talking':
                // Open mouth (oval)
                ctx.ellipse(x, y + 6, 4, 6, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#1A1A1A';
                ctx.fill();
                break;

            case 'excited':
            case 'very_excited':
                // Big smile
                ctx.arc(x, y + 2, 6, 0.2 * Math.PI, 0.8 * Math.PI);
                ctx.stroke();
                break;

            case 'explaining':
                // Thoughtful expression
                ctx.arc(x, y + 4, 4, 0.3 * Math.PI, 0.7 * Math.PI);
                ctx.stroke();
                break;

            default:
                // Neutral smile
                ctx.arc(x, y + 4, 5, 0.25 * Math.PI, 0.75 * Math.PI);
                ctx.stroke();
        }
    }

    /**
     * Draw particle effects around DNA
     */
    drawDNAParticles(ctx, x, y, frame) {
        const particleCount = 6;
        const time = frame * 0.1;

        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + time;
            const radius = 30 + Math.sin(time * 2 + i) * 5;
            const particleX = x + Math.cos(angle) * radius;
            const particleY = y + Math.sin(angle) * radius;

            // DNA base particle
            ctx.fillStyle = i % 2 === 0 ? '#FF6B6B' : '#4ECDC4';
            ctx.beginPath();
            ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
            ctx.fill();

            // Glow effect
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 4;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    /**
     * Create the main DOM element
     */
    createElement() {
        this.element = document.createElement('div');
        this.element.id = 'mr-dna-character';
        this.element.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: ${this.spriteConfig.width * this.spriteConfig.scale}px;
            height: ${this.spriteConfig.height * this.spriteConfig.scale}px;
            z-index: 1000;
            cursor: pointer;
            user-select: none;
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3));
        `;

        this.container.appendChild(this.element);
    }

    /**
     * Setup canvas for rendering
     */
    setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.spriteConfig.width * this.spriteConfig.scale;
        this.canvas.height = this.spriteConfig.height * this.spriteConfig.scale;
        this.canvas.style.cssText = `
            width: 100%;
            height: 100%;
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
        `;

        this.ctx = this.canvas.getContext('2d', {
            alpha: true,
            desynchronized: true
        });

        // Enable image smoothing for better quality
        this.ctx.imageSmoothingEnabled = false;

        this.element.appendChild(this.canvas);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Mouse interactions
        this.element.addEventListener('mouseenter', () => {
            this.isHovered = true;
            this.element.style.transform = 'scale(1.1) translateY(-5px)';

            if (this.currentState === 'idle') {
                this.changeState('excited');
            }
        });

        this.element.addEventListener('mouseleave', () => {
            this.isHovered = false;
            this.element.style.transform = 'scale(1) translateY(0)';

            if (this.currentState === 'excited') {
                this.changeState('idle');
            }
        });

        this.element.addEventListener('click', this.handleClick);

        // Global events
        window.addEventListener('resize', this.handleResize);
        document.addEventListener('mousemove', this.handleMouseMove);
    }

    /**
     * Handle click interactions
     */
    handleClick(event) {
        event.preventDefault();
        this.lastInteraction = Date.now();

        // Cycle through interactive states
        const interactiveStates = ['waving', 'explaining', 'excited'];
        const randomState = interactiveStates[Math.floor(Math.random() * interactiveStates.length)];

        this.changeState(randomState);

        // Emit custom event for external listeners
        this.element.dispatchEvent(new CustomEvent('mrDnaInteraction', {
            detail: { state: randomState, personality: this.personality }
        }));

        // Create celebration particles
        this.createCelebrationParticles();
    }

    /**
     * Handle mouse movement for eye tracking
     */
    handleMouseMove(event) {
        if (!this.isHovered) return;

        const rect = this.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const mouseX = event.clientX;
        const mouseY = event.clientY;

        // Calculate look direction (for future eye tracking feature)
        this.lookDirection = {
            x: (mouseX - centerX) / rect.width,
            y: (mouseY - centerY) / rect.height
        };
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Adjust position if near viewport edges
        const rect = this.element.getBoundingClientRect();
        const margin = 20;

        if (rect.right > window.innerWidth - margin) {
            this.position.x = window.innerWidth - rect.width - margin;
            this.updatePosition();
        }

        if (rect.bottom > window.innerHeight - margin) {
            this.position.y = window.innerHeight - rect.height - margin;
            this.updatePosition();
        }
    }

    /**
     * Change animation state
     */
    changeState(newState, force = false) {
        if (!force && this.isTransitioning) return;

        if (this.animations[newState] && this.currentState !== newState) {
            this.previousState = this.currentState;
            this.currentState = newState;
            this.stateStartTime = performance.now();
            this.frameIndex = 0;
            this.isTransitioning = true;

            console.log(`🧬 Mr. DNA state changed: ${this.previousState} → ${this.currentState}`);

            // Handle state-specific logic
            this.handleStateChange(newState);
        }
    }

    /**
     * Handle state-specific behaviors
     */
    handleStateChange(state) {
        switch (state) {
            case 'talking':
                this.startSpeaking();
                break;
            case 'leaving':
                this.moveToPosition({ x: -200, y: this.position.y });
                break;
            case 'arriving':
                this.moveToPosition({ x: 20, y: this.position.y });
                break;
            case 'hopping':
                this.addBounceEffect();
                break;
        }
    }

    /**
     * Start speaking animation
     */
    startSpeaking() {
        // This would integrate with the voice system
        console.log('🧬 Mr. DNA is speaking');
    }

    /**
     * Move to a new position smoothly
     */
    moveToPosition(newPosition) {
        this.targetPosition = { ...newPosition };

        // Animate position change
        const startPos = { ...this.position };
        const startTime = performance.now();
        const duration = 1000;

        const animateMove = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeInOutCubic(progress);

            this.position.x = startPos.x + (this.targetPosition.x - startPos.x) * easeProgress;
            this.position.y = startPos.y + (this.targetPosition.y - startPos.y) * easeProgress;

            this.updatePosition();

            if (progress < 1) {
                requestAnimationFrame(animateMove);
            }
        };

        requestAnimationFrame(animateMove);
    }

    /**
     * Add bounce effect
     */
    addBounceEffect() {
        this.element.style.animation = 'mrDnaBounce 0.6s ease-out';

        // Clean up animation class
        setTimeout(() => {
            this.element.style.animation = '';
        }, 600);
    }

    /**
     * Update DOM position
     */
    updatePosition() {
        this.element.style.left = this.position.x + 'px';
        this.element.style.bottom = (window.innerHeight - this.position.y - this.element.offsetHeight) + 'px';
    }

    /**
     * Create celebration particles
     */
    createCelebrationParticles() {
        const rect = this.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 8; i++) {
            const particle = {
                x: centerX,
                y: centerY,
                vx: (Math.random() - 0.5) * 8,
                vy: -Math.random() * 6 - 2,
                size: Math.random() * 4 + 2,
                color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][Math.floor(Math.random() * 4)],
                life: 1.0,
                decay: 0.02
            };

            this.particles.push(particle);
        }
    }

    /**
     * Start the main animation loop
     */
    startAnimation() {
        this.animate();
    }

    /**
     * Main animation loop
     */
    animate(currentTime) {
        if (!this.lastFrameTime) this.lastFrameTime = currentTime;

        const deltaTime = currentTime - this.lastFrameTime;
        const frameInterval = 1000 / this.spriteConfig.frameRate;

        // Update animation frame
        if (deltaTime >= frameInterval) {
            this.updateFrame(currentTime);
            this.updateParticles();
            this.render();

            this.lastFrameTime = currentTime;
            this.frameCount++;
        }

        // Handle state transitions
        this.checkStateTransitions(currentTime);

        this.animationId = requestAnimationFrame(this.animate);
    }

    /**
     * Update current animation frame
     */
    updateFrame(currentTime) {
        if (!this.animations[this.currentState]) return;

        const animation = this.animations[this.currentState];
        const elapsed = currentTime - this.stateStartTime;
        const progress = elapsed / animation.duration;

        if (animation.loop || progress < 1) {
            const loopProgress = animation.loop ? progress % 1 : Math.min(progress, 1);
            this.frameIndex = Math.floor(loopProgress * animation.frames.length);
        }
    }

    /**
     * Check for automatic state transitions
     */
    checkStateTransitions(currentTime) {
        const animation = this.animations[this.currentState];
        if (!animation) return;

        const elapsed = currentTime - this.stateStartTime;

        // Handle non-looping animations
        if (!animation.loop && elapsed >= animation.duration) {
            this.isTransitioning = false;

            // Return to appropriate default state
            if (['waving', 'hopping', 'explaining'].includes(this.currentState)) {
                this.changeState(this.isHovered ? 'excited' : 'idle');
            } else if (this.currentState === 'talking') {
                this.changeState('idle');
            }
        }

        // Auto-transition from excited back to idle if not hovered
        if (this.currentState === 'excited' && !this.isHovered && elapsed > 2000) {
            this.changeState('idle');
        }
    }

    /**
     * Update particle system
     */
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.3; // Gravity
            particle.life -= particle.decay;

            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * Render the current frame
     */
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.spriteImage.complete) return;

        // Get current animation and frame
        const animation = this.animations[this.currentState];
        if (!animation) return;

        const currentFrame = animation.frames[this.frameIndex] || 0;

        // Calculate source position on sprite sheet
        const sourceX = (currentFrame % 8) * animation.frameWidth;
        const sourceY = Math.floor(currentFrame / 8) * animation.frameHeight;

        // Render sprite frame
        this.ctx.drawImage(
            this.spriteImage,
            sourceX, sourceY,
            animation.frameWidth, animation.frameHeight,
            0, 0,
            this.canvas.width, this.canvas.height
        );

        // Render particles
        this.renderParticles();
    }

    /**
     * Render particle effects
     */
    renderParticles() {
        for (const particle of this.particles) {
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(
                particle.x - this.element.offsetLeft,
                particle.y - this.element.offsetTop,
                particle.size,
                0, Math.PI * 2
            );
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }

    /**
     * Easing function for smooth animations
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /**
     * Public API methods
     */

    /**
     * Trigger speaking animation
     */
    speak() {
        this.changeState('talking');
    }

    /**
     * Make Mr. DNA wave
     */
    wave() {
        this.changeState('waving');
    }

    /**
     * Start explaining animation
     */
    explain() {
        this.changeState('explaining');
    }

    /**
     * Make Mr. DNA leave the screen
     */
    leave() {
        this.changeState('leaving');
    }

    /**
     * Make Mr. DNA arrive on screen
     */
    arrive() {
        this.changeState('arriving');
    }

    /**
     * Set position manually
     */
    setPosition(x, y, animate = true) {
        if (animate) {
            this.moveToPosition({ x, y });
        } else {
            this.position = { x, y };
            this.updatePosition();
        }
    }

    /**
     * Get current state information
     */
    getState() {
        return {
            current: this.currentState,
            isTransitioning: this.isTransitioning,
            position: { ...this.position },
            isHovered: this.isHovered
        };
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('mousemove', this.handleMouseMove);

        // Remove DOM elements
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        console.log('🧬 Mr. DNA sprite animation destroyed');
    }
}

// Add CSS animations for enhanced effects
const mrDnaStyles = document.createElement('style');
mrDnaStyles.textContent = `
    @keyframes mrDnaBounce {
        0% { transform: scale(1) translateY(0); }
        30% { transform: scale(1.1) translateY(-20px); }
        50% { transform: scale(1.05) translateY(-10px); }
        70% { transform: scale(1.08) translateY(-15px); }
        100% { transform: scale(1) translateY(0); }
    }

    #mr-dna-character:hover {
        filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.4))
                brightness(1.1)
                saturate(1.2);
    }
`;
document.head.appendChild(mrDnaStyles);

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MrDNASpriteAnimation;
}

// Global assignment for direct script loading
if (typeof window !== 'undefined') {
    window.MrDNASpriteAnimation = MrDNASpriteAnimation;
}
