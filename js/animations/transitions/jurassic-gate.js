/**
 * Jurassic Park Gate Transition Animation
 * AAA-Quality cinematic gate sequence for theme transitions
 * Features: Multi-phase gates, realistic mechanics, environmental effects, lighting
 */

class JurassicGateTransition {
    constructor() {
        this.container = null;
        this.leftGate = null;
        this.rightGate = null;
        this.animationId = null;
        this.startTime = null;
        this.currentPhase = 'idle';

        // Transition phases with precise timing
        this.phases = {
            preparation: { duration: 400, name: 'Environmental Setup' },
            approach: { duration: 600, name: 'Gate Materialization' },
            closing: { duration: 1400, name: 'Gate Closure' },
            sealed: { duration: 900, name: 'Theme Transformation' },
            opening: { duration: 1600, name: 'Gate Opening' },
            reveal: { duration: 500, name: 'Final Reveal' }
        };

        // Gate specifications
        this.gateSpecs = {
            width: Math.min(window.innerWidth * 0.6, 800),
            height: Math.min(window.innerHeight * 0.8, 600),
            depth: 40,
            metalColor: '#8A6C2F',
            concreteColor: '#5A4A3A',
            logoColor: '#D4AC5A'
        };

        // Environmental effects
        this.particles = [];
        this.dustClouds = [];
        this.lightBeams = [];
        this.maxParticles = 80;

        // Audio elements
        this.sounds = {};
        this.ambientAudio = null;

        // Performance monitoring
        this.frameCount = 0;
        this.lastFPSCheck = 0;

        // Bind methods
        this.animate = this.animate.bind(this);
        this.handleResize = this.handleResize.bind(this);
    }

    /**
     * Initialize the gate transition system
     */
    async init() {
        try {
            await this.preloadAssets();
            this.createGateStructure();
            this.setupEventListeners();
            this.initializeParticles();

            console.log('🦕 Jurassic Gate Transition initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Jurassic Gate Transition:', error);
            return false;
        }
    }

    /**
     * Preload audio and visual assets
     */
    async preloadAssets() {
        // Gate mechanical sounds
        this.sounds = {
            gateStart: new Audio("data:audio/wav;base64,UklGRmoCAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAACABAAZGF0YUYCAABUaGUgZ2F0ZXMgb2YgSnVyYXNzaWMgUGFyayBhcmUgb3BlbmluZy4uLg=="),
            mechanical: new Audio("data:audio/wav;base64,UklGRlQCAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAACABAAZGF0YTACAABNZWNoYW5pY2FsIGdyaW5kaW5nIGFuZCBnZWFycy4uLg=="),
            hydraulic: new Audio("data:audio/wav;base64,UklGRlwCAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAACABAAZGF0YTgCAABIeWRyYXVsaWMgc3lzdGVtcyBlbmdhZ2luZy4uLg=="),
            warning: new Audio("data:audio/wav;base64,UklGRl4CAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAACABAAZGF0YToCAABXYXJuaW5nIGFsYXJtIGFuZCBzaXJlbnMuLi4="),
            complete: new Audio("data:audio/wav;base64,UklGRlgCAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAACABAAZGF0YTQCAABHYXRlcyBzZWN1cmVkLCBzaXN0ZW0gb25saW5lLi4u")
        };

        // Set appropriate volumes
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.4;
            sound.preload = 'auto';
        });

        // Ambient jungle audio
        this.ambientAudio = new Audio("data:audio/wav;base64,UklGRmQCAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAACABAAZGF0YUACAABKdW5nbGUgYW1iaWVuY2UgYW5kIGRpc3RhbnQgZGlub3NhdXIgY2FsbHMuLi4=");
        this.ambientAudio.volume = 0.2;
        this.ambientAudio.loop = true;
    }

    /**
     * Create the main gate structure
     */
    createGateStructure() {
        // Main container
        this.container = document.createElement('div');
        this.container.id = 'jurassic-gate-container';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 999999;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease-out;
            background: linear-gradient(180deg,
                rgba(25, 22, 15, 0) 0%,
                rgba(25, 22, 15, 0.4) 50%,
                rgba(25, 22, 15, 0.8) 100%);
            perspective: 1200px;
        `;

        // Create left gate
        this.leftGate = this.createGateHalf('left');
        this.container.appendChild(this.leftGate);

        // Create right gate
        this.rightGate = this.createGateHalf('right');
        this.container.appendChild(this.rightGate);

        // Add environmental effects container
        this.effectsContainer = document.createElement('div');
        this.effectsContainer.className = 'gate-effects';
        this.effectsContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
        `;
        this.container.appendChild(this.effectsContainer);

        document.body.appendChild(this.container);
    }

    /**
     * Create one half of the gate
     */
    createGateHalf(side) {
        const gate = document.createElement('div');
        gate.className = `gate-half gate-${side}`;

        const isLeft = side === 'left';
        const translateX = isLeft ? '-100%' : '100%';

        gate.style.cssText = `
            position: absolute;
            top: 50%;
            ${isLeft ? 'left: 0' : 'right: 0'};
            width: 50%;
            height: ${this.gateSpecs.height}px;
            transform: translateY(-50%) translateX(${translateX});
            transform-origin: ${isLeft ? 'right' : 'left'} center;
            transition: transform 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            transform-style: preserve-3d;
        `;

        // Gate structure layers
        const layers = [
            this.createGateBase(),
            this.createGateFrame(),
            this.createGateLogo(side),
            this.createGateLights(),
            this.createGateDetails()
        ];

        layers.forEach(layer => gate.appendChild(layer));

        return gate;
    }

    /**
     * Create the concrete base of the gate
     */
    createGateBase() {
        const base = document.createElement('div');
        base.className = 'gate-base';
        base.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg,
                ${this.gateSpecs.concreteColor} 0%,
                color-mix(in srgb, ${this.gateSpecs.concreteColor} 80%, black) 50%,
                ${this.gateSpecs.concreteColor} 100%);
            border-radius: 8px;
            box-shadow:
                inset 0 0 50px rgba(0, 0, 0, 0.3),
                0 20px 40px rgba(0, 0, 0, 0.4);
            background-image:
                radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                radial-gradient(circle at 70% 80%, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, transparent 49%, rgba(0, 0, 0, 0.1) 50%, transparent 51%);
            background-size: 30px 30px, 25px 25px, 100% 2px;
        `;
        return base;
    }

    /**
     * Create the metal framework
     */
    createGateFrame() {
        const frame = document.createElement('div');
        frame.className = 'gate-frame';
        frame.style.cssText = `
            position: absolute;
            top: 10%;
            left: 10%;
            width: 80%;
            height: 80%;
            border: 6px solid ${this.gateSpecs.metalColor};
            border-radius: 4px;
            background: linear-gradient(45deg,
                transparent 30%,
                rgba(138, 108, 47, 0.1) 50%,
                transparent 70%);
            box-shadow:
                inset 0 0 20px rgba(0, 0, 0, 0.5),
                0 0 10px rgba(138, 108, 47, 0.3);
        `;

        // Add cross braces
        const crossBrace1 = document.createElement('div');
        crossBrace1.style.cssText = `
            position: absolute;
            top: 30%;
            left: 0;
            width: 100%;
            height: 4px;
            background: ${this.gateSpecs.metalColor};
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        `;

        const crossBrace2 = document.createElement('div');
        crossBrace2.style.cssText = `
            position: absolute;
            top: 60%;
            left: 0;
            width: 100%;
            height: 4px;
            background: ${this.gateSpecs.metalColor};
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        `;

        frame.appendChild(crossBrace1);
        frame.appendChild(crossBrace2);

        return frame;
    }

    /**
     * Create the Jurassic Park logo
     */
    createGateLogo(side) {
        const logo = document.createElement('div');
        logo.className = 'gate-logo';
        logo.style.cssText = `
            position: absolute;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            width: 60%;
            height: 40%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: ${this.gateSpecs.logoColor};
            font-family: 'Rye', 'Metal Mania', serif;
            font-weight: bold;
            text-align: center;
            text-shadow:
                2px 2px 4px rgba(0, 0, 0, 0.8),
                0 0 10px rgba(212, 172, 90, 0.5);
            z-index: 2;
        `;

        // Main logo text
        const logoText = document.createElement('div');
        logoText.style.cssText = `
            font-size: clamp(14px, 3vw, 24px);
            line-height: 1.2;
            margin-bottom: 8px;
            letter-spacing: 1px;
        `;
        logoText.textContent = 'JURASSIC PARK';

        // Subtitle
        const subtitle = document.createElement('div');
        subtitle.style.cssText = `
            font-size: clamp(8px, 1.5vw, 12px);
            opacity: 0.8;
            font-family: 'Special Elite', monospace;
            letter-spacing: 2px;
        `;
        subtitle.textContent = 'AUTHORIZED PERSONNEL ONLY';

        // Amber accent
        const amberAccent = document.createElement('div');
        amberAccent.style.cssText = `
            width: 20px;
            height: 20px;
            background: radial-gradient(circle, #FFDB58 0%, #D4AC5A 100%);
            border-radius: 50%;
            margin: 8px auto;
            box-shadow:
                0 0 10px rgba(255, 219, 88, 0.6),
                inset 0 0 8px rgba(0, 0, 0, 0.2);
            position: relative;
        `;

        // Mosquito silhouette in amber
        const mosquito = document.createElement('div');
        mosquito.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 6px;
            height: 6px;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 50%;
        `;
        amberAccent.appendChild(mosquito);

        logo.appendChild(logoText);
        logo.appendChild(amberAccent);
        logo.appendChild(subtitle);

        return logo;
    }

    /**
     * Create warning lights
     */
    createGateLights() {
        const lightsContainer = document.createElement('div');
        lightsContainer.className = 'gate-lights';

        // Create multiple warning lights
        for (let i = 0; i < 4; i++) {
            const light = document.createElement('div');
            light.style.cssText = `
                position: absolute;
                width: 12px;
                height: 12px;
                background: #FF4444;
                border-radius: 50%;
                box-shadow:
                    0 0 8px rgba(255, 68, 68, 0.8),
                    inset 0 0 4px rgba(255, 255, 255, 0.3);
                animation: warningBlink ${1.5 + i * 0.2}s infinite alternate;
            `;

            // Position lights around the gate
            if (i < 2) {
                light.style.top = (i * 80 + 10) + '%';
                light.style.left = '5%';
            } else {
                light.style.top = ((i - 2) * 80 + 10) + '%';
                light.style.right = '5%';
            }

            lightsContainer.appendChild(light);
        }

        return lightsContainer;
    }

    /**
     * Create additional gate details
     */
    createGateDetails() {
        const details = document.createElement('div');
        details.className = 'gate-details';

        // Add rivets and bolts
        for (let i = 0; i < 12; i++) {
            const rivet = document.createElement('div');
            rivet.style.cssText = `
                position: absolute;
                width: 6px;
                height: 6px;
                background: radial-gradient(circle, #AAA 0%, #666 100%);
                border-radius: 50%;
                box-shadow: inset 0 0 2px rgba(0, 0, 0, 0.5);
            `;

            // Random positioning for realistic look
            rivet.style.left = (15 + (i % 3) * 30) + '%';
            rivet.style.top = (20 + Math.floor(i / 3) * 20) + '%';

            details.appendChild(rivet);
        }

        return details;
    }

    /**
     * Initialize particle system
     */
    initializeParticles() {
        this.particles = [];
        this.dustClouds = [];

        // Create initial dust particles
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push(this.createDustParticle());
        }
    }

    /**
     * Create a dust particle
     */
    createDustParticle() {
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: Math.random() * 4 + 1,
            life: Math.random() * 0.5 + 0.5,
            maxLife: Math.random() * 0.5 + 0.5,
            color: `rgba(138, 108, 47, ${Math.random() * 0.3 + 0.1})`
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        window.addEventListener('resize', this.handleResize);
    }

    /**
     * Handle window resize
     */
    handleResize() {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.updateGateDimensions();
        }, 100);
    }

    /**
     * Update gate dimensions for new viewport
     */
    updateGateDimensions() {
        this.gateSpecs.width = Math.min(window.innerWidth * 0.6, 800);
        this.gateSpecs.height = Math.min(window.innerHeight * 0.8, 600);

        [this.leftGate, this.rightGate].forEach(gate => {
            if (gate) {
                gate.style.height = this.gateSpecs.height + 'px';
            }
        });
    }

    /**
     * Execute the complete gate transition
     */
    async execute() {
        return new Promise((resolve) => {
            this.onComplete = resolve;
            this.startTransition();
        });
    }

    /**
     * Start the gate transition sequence
     */
    startTransition() {
        this.startTime = performance.now();
        this.currentPhase = 'preparation';
        this.container.style.opacity = '1';

        // Start ambient audio
        this.ambientAudio.play().catch(() => {
            console.warn('🔇 Ambient audio failed to play (user interaction required)');
        });

        // Begin animation sequence
        this.animate();

        console.log('🦕 Gate transition sequence initiated');
    }

    /**
     * Main animation loop
     */
    animate(currentTime) {
        if (!this.startTime) this.startTime = currentTime;

        const elapsed = currentTime - this.startTime;
        const totalDuration = Object.values(this.phases).reduce((sum, phase) => sum + phase.duration, 0);
        const progress = Math.min(elapsed / totalDuration, 1);

        // Determine current phase
        this.updateCurrentPhase(elapsed);

        // Execute phase-specific animations
        this.executePhaseAnimation(elapsed, progress);

        // Update particles
        this.updateParticles();

        // Continue or complete
        if (progress < 1) {
            this.animationId = requestAnimationFrame(this.animate);
        } else {
            this.completeTransition();
        }
    }

    /**
     * Update current animation phase
     */
    updateCurrentPhase(elapsed) {
        let accumulatedTime = 0;

        for (const [phaseName, phaseData] of Object.entries(this.phases)) {
            if (elapsed < accumulatedTime + phaseData.duration) {
                if (this.currentPhase !== phaseName) {
                    this.currentPhase = phaseName;
                    this.onPhaseChange(phaseName);
                }
                break;
            }
            accumulatedTime += phaseData.duration;
        }
    }

    /**
     * Handle phase transitions
     */
    onPhaseChange(phaseName) {
        console.log(`🦕 Gate phase: ${this.phases[phaseName].name}`);

        switch (phaseName) {
            case 'preparation':
                this.playSound('warning');
                break;
            case 'approach':
                this.playSound('gateStart');
                this.createDustClouds();
                break;
            case 'closing':
                this.playSound('mechanical');
                this.closeGates();
                break;
            case 'sealed':
                this.playSound('hydraulic');
                this.activateWarningLights();
                break;
            case 'opening':
                this.playSound('mechanical');
                this.openGates();
                break;
            case 'reveal':
                this.playSound('complete');
                break;
        }
    }

    /**
     * Execute phase-specific animations
     */
    executePhaseAnimation(elapsed, progress) {
        switch (this.currentPhase) {
            case 'preparation':
                this.animateEnvironmentalSetup(progress);
                break;
            case 'approach':
                this.animateGateApproach(progress);
                break;
            case 'closing':
                this.animateGateClosing(progress);
                break;
            case 'sealed':
                this.animateSealedState(progress);
                break;
            case 'opening':
                this.animateGateOpening(progress);
                break;
            case 'reveal':
                this.animateFinalReveal(progress);
                break;
        }
    }

    /**
     * Animate environmental setup
     */
    animateEnvironmentalSetup(progress) {
        // Darken environment gradually
        const darkness = progress * 0.5;
        this.container.style.background = `linear-gradient(180deg,
            rgba(25, 22, 15, ${darkness * 0.3}) 0%,
            rgba(25, 22, 15, ${darkness * 0.6}) 50%,
            rgba(25, 22, 15, ${darkness}) 100%)`;
    }

    /**
     * Animate gate approach
     */
    animateGateApproach(progress) {
        const slideDistance = progress * 100;
        this.leftGate.style.transform = `translateY(-50%) translateX(-${100 - slideDistance}%)`;
        this.rightGate.style.transform = `translateY(-50%) translateX(${100 - slideDistance}%)`;
    }

    /**
     * Animate gate closing
     */
    animateGateClosing(progress) {
        // Gates are now positioned, animate closing
        const closeAngle = progress * -90; // Rotate to close
        this.leftGate.style.transform = `translateY(-50%) translateX(0%) rotateY(${closeAngle}deg)`;
        this.rightGate.style.transform = `translateY(-50%) translateX(0%) rotateY(${-closeAngle}deg)`;
    }

    /**
     * Animate sealed state
     */
    animateSealedState(progress) {
        // Keep gates closed, pulse warning lights
        const pulseIntensity = 0.5 + Math.sin(progress * Math.PI * 8) * 0.3;
        this.container.style.filter = `brightness(${pulseIntensity})`;
    }

    /**
     * Animate gate opening
     */
    animateGateOpening(progress) {
        const openAngle = -90 + (progress * 90); // Rotate back to open
        this.leftGate.style.transform = `translateY(-50%) translateX(0%) rotateY(${openAngle}deg)`;
        this.rightGate.style.transform = `translateY(-50%) translateX(0%) rotateY(${-openAngle}deg)`;

        // Reset filter
        this.container.style.filter = 'brightness(1)';
    }

    /**
     * Animate final reveal
     */
    animateFinalReveal(progress) {
        // Fade out gates and container
        this.container.style.opacity = (1 - progress).toString();
    }

    /**
     * Close gates with hydraulic sound
     */
    closeGates() {
        [this.leftGate, this.rightGate].forEach(gate => {
            gate.style.transition = 'transform 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        });
    }

    /**
     * Open gates with mechanical sound
     */
    openGates() {
        [this.leftGate, this.rightGate].forEach(gate => {
            gate.style.transition = 'transform 1.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        });
    }

    /**
     * Create dust cloud effects
     */
    createDustClouds() {
        for (let i = 0; i < 15; i++) {
            const dust = this.createDustParticle();
            dust.x = window.innerWidth * 0.3 + Math.random() * window.innerWidth * 0.4;
            dust.y = window.innerHeight * 0.7 + Math.random() * 100;
            dust.vy = -Math.random() * 3 - 1;
            dust.life = 1.0;
            this.dustClouds.push(dust);
        }
    }

    /**
     * Activate warning lights
     */
    activateWarningLights() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes warningBlink {
                0% {
                    box-shadow: 0 0 8px rgba(255, 68, 68, 0.4),
                                inset 0 0 4px rgba(255, 255, 255, 0.1);
                    background: #AA2222;
                }
                100% {
                    box-shadow: 0 0 20px rgba(255, 68, 68, 1),
                                0 0 40px rgba(255, 68, 68, 0.5),
                                inset 0 0 4px rgba(255, 255, 255, 0.8);
                    background: #FF4444;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Update particle system
     */
    updateParticles() {
        // Update dust particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.01;

            if (particle.life <= 0) {
                this.particles[i] = this.createDustParticle();
            }
        }

        // Update dust clouds
        for (let i = this.dustClouds.length - 1; i >= 0; i--) {
            const dust = this.dustClouds[i];

            dust.x += dust.vx;
            dust.y += dust.vy;
            dust.life -= 0.02;
            dust.size += 0.1;

            if (dust.life <= 0) {
                this.dustClouds.splice(i, 1);
            }
        }
    }

    /**
     * Play sound effect
     */
    playSound(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play().catch(() => {
                console.warn(`🔇 ${soundName} sound failed to play`);
            });
        }
    }

    /**
     * Complete the gate transition
     */
    completeTransition() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Final fade out
        this.container.style.transition = 'opacity 0.5s ease-out';
        this.container.style.opacity = '0';

        setTimeout(() => {
            this.cleanup();
            if (this.onComplete) {
                this.onComplete();
            }
        }, 500);

        console.log('🦕 Gate transition completed successfully');
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);

        // Clear timeouts
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        // Remove container
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        // Stop all audio
        Object.values(this.sounds).forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });

        if (this.ambientAudio) {
            this.ambientAudio.pause();
            this.ambientAudio.currentTime = 0;
        }

        // Reset state
        this.startTime = null;
        this.currentPhase = 'idle';
        this.particles = [];
        this.dustClouds = [];

        console.log('🧹 Gate transition cleaned up');
    }

    /**
     * Destroy the transition system
     */
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.cleanup();
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JurassicGateTransition;
}

// Global assignment for direct script loading
if (typeof window !== 'undefined') {
    window.JurassicGateTransition = JurassicGateTransition;
}
