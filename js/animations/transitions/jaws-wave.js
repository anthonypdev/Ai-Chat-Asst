/**
 * Jaws Wave Transition Animation
 * AAA-Quality ocean wave effect for theme transitions
 * Features: Multi-layer waves, realistic physics, particle system, refraction
 */

class JawsWaveTransition {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.startTime = null;
        this.duration = 2800; // Total transition duration

        // Wave physics parameters
        this.waves = [
            {
                amplitude: 120,
                frequency: 0.008,
                speed: 0.003,
                offset: 0,
                color: 'rgba(0, 64, 102, 0.9)' // Deep water
            },
            {
                amplitude: 80,
                frequency: 0.012,
                speed: 0.004,
                offset: Math.PI / 3,
                color: 'rgba(0, 112, 163, 0.8)' // Mid water
            },
            {
                amplitude: 40,
                frequency: 0.018,
                speed: 0.006,
                offset: Math.PI / 2,
                color: 'rgba(0, 153, 221, 0.7)' // Surface water
            }
        ];

        // Particle system for foam and spray
        this.particles = [];
        this.maxParticles = 150;

        // Shark fin parameters
        this.sharkFin = {
            x: -100,
            y: 0,
            visible: false,
            speed: 4.5
        };

        // Performance monitoring
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.currentFPS = 60;

        // Bind methods
        this.animate = this.animate.bind(this);
        this.handleResize = this.handleResize.bind(this);
    }

    /**
     * Initialize the wave transition system
     */
    async init() {
        try {
            this.createCanvas();
            this.setupEventListeners();
            this.preloadAssets();

            // Initialize particle system
            this.initParticles();

            console.log('🌊 Jaws Wave Transition initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Jaws Wave Transition:', error);
            return false;
        }
    }

    /**
     * Create and configure the canvas element
     */
    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'jaws-wave-canvas';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 999999;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease-out;
        `;

        this.ctx = this.canvas.getContext('2d', {
            alpha: true,
            desynchronized: true,
            willReadFrequently: false
        });

        // Enable hardware acceleration hints
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        this.resizeCanvas();
        document.body.appendChild(this.canvas);
    }

    /**
     * Resize canvas to match viewport
     */
    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
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
            this.resizeCanvas();
        }, 100);
    }

    /**
     * Preload audio and visual assets
     */
    async preloadAssets() {
        // Preload wave sounds
        this.sounds = {
            waveStart: new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBjiS2OzNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBjiS2OzNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBjiS2OzNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBjiS2OzNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBjiS2OzNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBjiS2OzNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBjiS2OzNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBjiS2OzNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBjiS2OzNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBjiS2OzNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBjiS2OzNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBjiS2OzNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBjiS2OzNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBjiS2OzNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBjiS2OzNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBjiS2OzNeSs="),
            sharkApproach: new Audio("data:audio/wav;base64,UklGRkQBAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YSABAADk5eXl5ubm5+fn6Ojo6enp6urq6+vr7Ozs7e3t7u7u7+/v8PDw8fHx8vLy8/Pz9PT09fX19vb29/f3+Pj4+fn5+vr6+/v7/Pz8/f39/v7+////"),
            waveRecede: new Audio("data:audio/wav;base64,UklGRkQBAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YSABAADn5+fm5ubm5eXl5OTk4+Pj4uLi4eHh4ODg39/f3t7e3d3d3Nzc29vb2tra2dnZ2NjY19fX1tbW1dXV1NTU09PT0tLS0dHR0NDQz8/PzsrOzs7Ozc3NzMzMy8vLysrKycnJyMjIx8fHxsbGxcXFxMTEw8PDwsLCwcHBwMDAv7+/vr6+vb29vLy8u7u7urq6ubm5uLi4t7e3tra2tbW1tLS0s7OzsrKysbGxsLCwr6+vrq6ura2trKysq6urqqqqp6enrq6upKSkp6emoqKin5+fnZ2dnJycm5ubmpqamZmZmJiYl5eXlpaWlZWVlJSUk5OTkpKSkZGRkJCQj4+Pjo6OjY2NjIyMi4uLioqKiYmJiIiIh4eHhoaGhYWFhISEg4ODgoKCgYGBgIB/gH+Af39/fn5+fX19fHx8e3t7enp6eXl5eHh4d3d3dnZ2dXV1dHR0c3Nzcn19fHx8e3t7enp6eXl5eHh4d3d3dnZ2dXV1dHR0c3Nz")}
        };

        // Set low volume for ambient effects
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.3;
            sound.preload = 'auto';
        });
    }

    /**
     * Initialize particle system
     */
    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push(this.createParticle());
        }
    }

    /**
     * Create a single particle
     */
    createParticle() {
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight + window.innerHeight,
            vx: (Math.random() - 0.5) * 4,
            vy: -Math.random() * 8 - 2,
            size: Math.random() * 6 + 2,
            life: 1.0,
            decay: Math.random() * 0.02 + 0.01,
            type: Math.random() > 0.7 ? 'foam' : 'spray'
        };
    }

    /**
     * Execute the complete wave transition
     */
    async execute() {
        return new Promise((resolve) => {
            this.onComplete = resolve;
            this.startTransition();
        });
    }

    /**
     * Start the wave transition
     */
    startTransition() {
        this.startTime = performance.now();
        this.canvas.style.opacity = '1';

        // Play wave sound
        this.sounds.waveStart.currentTime = 0;
        this.sounds.waveStart.play().catch(() => {
            console.warn('🔇 Wave sound failed to play (user interaction required)');
        });

        // Start main animation loop
        this.animate();

        // Schedule shark fin appearance
        setTimeout(() => {
            this.sharkFin.visible = true;
            this.sounds.sharkApproach.play().catch(() => {});
        }, 800);

        // Schedule wave recede
        setTimeout(() => {
            this.sounds.waveRecede.play().catch(() => {});
        }, this.duration - 600);
    }

    /**
     * Main animation loop
     */
    animate(currentTime) {
        if (!this.startTime) this.startTime = currentTime;

        const elapsed = currentTime - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1);

        // Calculate FPS
        this.updateFPS(currentTime);

        // Clear canvas
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        // Draw wave phases based on progress
        if (progress < 0.7) {
            this.drawWaves(elapsed, progress);
            this.updateParticles(elapsed);
            this.drawParticles();

            if (this.sharkFin.visible) {
                this.drawSharkFin(elapsed);
            }
        } else {
            this.drawRecedingWave(progress);
        }

        // Continue animation or complete
        if (progress < 1) {
            this.animationId = requestAnimationFrame(this.animate);
        } else {
            this.completeTransition();
        }
    }

    /**
     * Draw multi-layered ocean waves
     */
    drawWaves(elapsed, progress) {
        const centerY = window.innerHeight * 0.6;
        const waveHeight = window.innerHeight * 1.2;

        // Draw waves from back to front (depth sorting)
        for (let i = this.waves.length - 1; i >= 0; i--) {
            const wave = this.waves[i];

            this.ctx.fillStyle = wave.color;
            this.ctx.beginPath();
            this.ctx.moveTo(0, window.innerHeight);

            // Calculate wave curve
            for (let x = 0; x <= window.innerWidth; x += 4) {
                const y = centerY +
                    Math.sin(x * wave.frequency + elapsed * wave.speed + wave.offset) *
                    wave.amplitude * (1 + progress * 0.5);

                this.ctx.lineTo(x, y);
            }

            this.ctx.lineTo(window.innerWidth, window.innerHeight);
            this.ctx.closePath();
            this.ctx.fill();

            // Add wave highlights
            if (i === 0) {
                this.drawWaveHighlights(elapsed, centerY);
            }
        }
    }

    /**
     * Draw wave surface highlights and foam
     */
    drawWaveHighlights(elapsed, centerY) {
        const gradient = this.ctx.createLinearGradient(0, centerY - 50, 0, centerY + 50);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.moveTo(0, centerY);

        for (let x = 0; x <= window.innerWidth; x += 8) {
            const y = centerY + Math.sin(x * 0.02 + elapsed * 0.008) * 20;
            this.ctx.lineTo(x, y);
        }

        this.ctx.lineTo(window.innerWidth, centerY + 100);
        this.ctx.lineTo(0, centerY + 100);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Update particle system
     */
    updateParticles(elapsed) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Apply gravity
            particle.vy += 0.3;

            // Update life
            particle.life -= particle.decay;

            // Remove dead particles
            if (particle.life <= 0 || particle.y > window.innerHeight + 100) {
                this.particles[i] = this.createParticle();
            }
        }
    }

    /**
     * Draw particle effects
     */
    drawParticles() {
        for (const particle of this.particles) {
            if (particle.life <= 0) continue;

            const alpha = particle.life;
            this.ctx.globalAlpha = alpha;

            if (particle.type === 'foam') {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.strokeStyle = `rgba(200, 235, 255, ${alpha * 0.6})`;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(particle.x, particle.y);
                this.ctx.lineTo(particle.x + particle.vx * 3, particle.y + particle.vy * 3);
                this.ctx.stroke();
            }
        }

        this.ctx.globalAlpha = 1;
    }

    /**
     * Draw shark fin in the wave
     */
    drawSharkFin(elapsed) {
        this.sharkFin.x += this.sharkFin.speed;

        if (this.sharkFin.x < window.innerWidth + 100) {
            const finY = window.innerHeight * 0.6 + Math.sin(elapsed * 0.01) * 10;

            // Draw fin shadow underwater
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(this.sharkFin.x + 5, finY + 15, 25, 8, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw fin
            this.ctx.fillStyle = '#003366';
            this.ctx.beginPath();
            this.ctx.moveTo(this.sharkFin.x, finY);
            this.ctx.lineTo(this.sharkFin.x - 20, finY + 30);
            this.ctx.lineTo(this.sharkFin.x + 20, finY + 30);
            this.ctx.closePath();
            this.ctx.fill();

            // Draw fin highlight
            this.ctx.fillStyle = 'rgba(0, 153, 221, 0.6)';
            this.ctx.beginPath();
            this.ctx.moveTo(this.sharkFin.x - 2, finY + 2);
            this.ctx.lineTo(this.sharkFin.x - 8, finY + 12);
            this.ctx.lineTo(this.sharkFin.x + 8, finY + 12);
            this.ctx.closePath();
            this.ctx.fill();

            // Create wake effect
            this.createWakeParticles(this.sharkFin.x - 30, finY + 20);
        }
    }

    /**
     * Create wake particles behind shark fin
     */
    createWakeParticles(x, y) {
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: x + Math.random() * 40 - 20,
                y: y + Math.random() * 20 - 10,
                vx: -Math.random() * 2 - 1,
                vy: Math.random() * 4 - 2,
                size: Math.random() * 4 + 2,
                life: 1.0,
                decay: 0.03,
                type: 'foam'
            });
        }
    }

    /**
     * Draw receding wave effect
     */
    drawRecedingWave(progress) {
        const recede = (progress - 0.7) / 0.3; // 0 to 1 for recede phase
        const waveBottom = window.innerHeight * (1 - recede);

        // Create receding gradient
        const gradient = this.ctx.createLinearGradient(0, waveBottom - 100, 0, window.innerHeight);
        gradient.addColorStop(0, `rgba(0, 153, 221, ${1 - recede * 0.5})`);
        gradient.addColorStop(0.3, `rgba(0, 112, 163, ${1 - recede * 0.7})`);
        gradient.addColorStop(1, `rgba(0, 64, 102, ${1 - recede})`);

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, waveBottom, window.innerWidth, window.innerHeight - waveBottom);

        // Fade out canvas
        this.canvas.style.opacity = (1 - recede).toString();
    }

    /**
     * Update FPS counter
     */
    updateFPS(currentTime) {
        this.frameCount++;

        if (currentTime - this.lastFPSUpdate >= 1000) {
            this.currentFPS = this.frameCount;
            this.frameCount = 0;
            this.lastFPSUpdate = currentTime;

            // Adjust quality based on performance
            if (this.currentFPS < 30) {
                this.reduceQuality();
            }
        }
    }

    /**
     * Reduce quality for better performance
     */
    reduceQuality() {
        this.maxParticles = Math.max(50, this.maxParticles * 0.8);
        this.particles = this.particles.slice(0, this.maxParticles);
        console.warn('🐌 Reducing wave quality for better performance');
    }

    /**
     * Complete the wave transition
     */
    completeTransition() {
        // Cancel animation frame
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Fade out and cleanup
        this.canvas.style.transition = 'opacity 0.5s ease-out';
        this.canvas.style.opacity = '0';

        setTimeout(() => {
            this.cleanup();
            if (this.onComplete) {
                this.onComplete();
            }
        }, 500);

        console.log('🌊 Wave transition completed successfully');
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

        // Remove canvas
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }

        // Stop all sounds
        Object.values(this.sounds).forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });

        // Reset state
        this.startTime = null;
        this.particles = [];
        this.sharkFin = { x: -100, y: 0, visible: false, speed: 4.5 };

        console.log('🧹 Wave transition cleaned up');
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
    module.exports = JawsWaveTransition;
}

// Global assignment for direct script loading
if (typeof window !== 'undefined') {
    window.JawsWaveTransition = JawsWaveTransition;
}
