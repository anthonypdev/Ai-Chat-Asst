/**
 * Animation Worker - Off-thread animation calculations for Parkland AI Opus Magnum
 * Handles complex physics, particle systems, and transition calculations
 */

class AnimationWorker {
    constructor() {
        this.activeAnimations = new Map();
        this.particleSystems = new Map();
        this.transitionQueue = [];
        this.frameRate = 60;
        this.frameTime = 1000 / this.frameRate;
        this.lastFrameTime = 0;
        this.isRunning = false;
        this.performanceMetrics = {
            frameCount: 0,
            averageFrameTime: 0,
            maxFrameTime: 0
        };
    }

    init() {
        this.isRunning = true;
        this.animationLoop();
    }

    animationLoop() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;

        if (deltaTime >= this.frameTime) {
            this.updateAnimations(deltaTime);
            this.updateParticles(deltaTime);
            this.processTransitions(deltaTime);
            this.updatePerformanceMetrics(deltaTime);
            this.lastFrameTime = currentTime;
        }

        requestAnimationFrame(() => this.animationLoop());
    }

    // ========================================
    // JAWS WAVE TRANSITION CALCULATIONS
    // ========================================

    calculateWaveTransition(config) {
        const {
            width,
            height,
            progress,
            waveSpeed = 2,
            amplitude = 0.3,
            frequency = 0.02,
            layers = 5
        } = config;

        const waveLayers = [];
        const time = progress * Math.PI * 2;

        for (let layer = 0; layer < layers; layer++) {
            const layerOffset = layer * 0.2;
            const layerAmplitude = amplitude * (1 - layer * 0.15);
            const points = [];

            // Generate wave points
            for (let x = 0; x <= width; x += 4) {
                const normalizedX = x / width;
                const waveY = Math.sin((normalizedX * Math.PI * 6) + (time * waveSpeed) + layerOffset) * layerAmplitude;
                const baseY = height * (0.3 + progress * 0.4);

                points.push({
                    x: x,
                    y: baseY + (waveY * height * 0.3)
                });
            }

            // Calculate wave physics
            const opacity = 0.9 - (layer * 0.15);
            const blur = layer * 2;
            const speed = waveSpeed + (layer * 0.5);

            waveLayers.push({
                points,
                opacity,
                blur,
                speed,
                layer,
                color: this.getWaveColor(layer)
            });
        }

        // Calculate particle effects
        const particles = this.calculateWaveParticles(progress, width, height);

        // Calculate shark fin position
        const sharkFin = this.calculateSharkFin(progress, width, height);

        return {
            waveLayers,
            particles,
            sharkFin,
            refraction: this.calculateRefraction(progress),
            timestamp: performance.now()
        };
    }

    calculateWaveParticles(progress, width, height) {
        const particleCount = Math.floor(200 * progress);
        const particles = [];

        for (let i = 0; i < particleCount; i++) {
            const x = Math.random() * width;
            const y = height * (0.2 + Math.random() * 0.6);
            const vx = (Math.random() - 0.5) * 4;
            const vy = (Math.random() - 0.5) * 2 - 2; // Upward bias
            const life = Math.random() * 1000 + 500;
            const size = Math.random() * 4 + 1;

            particles.push({ x, y, vx, vy, life, size, opacity: 1 });
        }

        return particles;
    }

    calculateSharkFin(progress, width, height) {
        if (progress < 0.3 || progress > 0.7) return null;

        const finProgress = (progress - 0.3) / 0.4;
        const x = width * 0.15 + (width * 0.7 * finProgress);
        const y = height * 0.4;
        const wake = this.generateWake(x, y, finProgress);

        return {
            x,
            y,
            rotation: Math.sin(finProgress * Math.PI * 4) * 5,
            scale: 0.8 + Math.sin(finProgress * Math.PI * 2) * 0.2,
            wake
        };
    }

    generateWake(x, y, progress) {
        const wakePoints = [];
        const wakeLength = 80;

        for (let i = 0; i < wakeLength; i++) {
            const offset = i * 2;
            const amplitude = (wakeLength - i) * 0.5;
            const wakeY = y + Math.sin(progress * Math.PI * 8 + i * 0.3) * amplitude;

            wakePoints.push({
                x: x - offset,
                y: wakeY,
                opacity: (wakeLength - i) / wakeLength * 0.6
            });
        }

        return wakePoints;
    }

    getWaveColor(layer) {
        const colors = [
            'rgba(0, 50, 80, 0.9)',    // Deep water
            'rgba(0, 70, 110, 0.8)',   // Mid water
            'rgba(0, 99, 153, 0.7)',   // Surface water
            'rgba(58, 197, 245, 0.6)', // Light water
            'rgba(255, 255, 255, 0.3)' // Foam
        ];
        return colors[layer] || colors[colors.length - 1];
    }

    // ========================================
    // JURASSIC GATE TRANSITION CALCULATIONS
    // ========================================

    calculateGateTransition(config) {
        const {
            width,
            height,
            progress,
            gatePhase, // 'closing', 'closed', 'opening'
            gateSpeed = 1.5
        } = config;

        const gateWidth = width * 0.6;
        const gateHeight = height * 0.8;
        const centerX = width / 2;
        const centerY = height / 2;

        let leftGateX, rightGateX;

        switch (gatePhase) {
            case 'closing':
                leftGateX = -gateWidth/2 + (progress * gateWidth/2);
                rightGateX = width + gateWidth/2 - (progress * gateWidth/2);
                break;
            case 'closed':
                leftGateX = 0;
                rightGateX = width;
                break;
            case 'opening':
                leftGateX = -(progress * gateWidth/2);
                rightGateX = width + (progress * gateWidth/2);
                break;
        }

        // Calculate gate structure layers
        const gates = this.generateGateStructure(
            leftGateX, rightGateX, centerY, gateWidth, gateHeight, progress
        );

        // Calculate environmental effects
        const dustParticles = this.calculateGateDust(gatePhase, progress, width, height);
        const lightRays = this.calculateGateLighting(gatePhase, progress, width, height);
        const mechanicalEffects = this.calculateGateMechanics(gatePhase, progress);

        return {
            gates,
            dustParticles,
            lightRays,
            mechanicalEffects,
            shakeIntensity: this.calculateGateShake(gatePhase, progress),
            timestamp: performance.now()
        };
    }

    generateGateStructure(leftX, rightX, centerY, gateWidth, gateHeight, progress) {
        const gateTop = centerY - gateHeight/2;
        const gateBottom = centerY + gateHeight/2;

        return {
            leftGate: {
                x: leftX,
                y: gateTop,
                width: gateWidth/2,
                height: gateHeight,
                layers: this.generateGateLayers('left', progress),
                logo: this.calculateGateLogo('left', leftX, centerY, progress)
            },
            rightGate: {
                x: rightX - gateWidth/2,
                y: gateTop,
                width: gateWidth/2,
                height: gateHeight,
                layers: this.generateGateLayers('right', progress),
                logo: this.calculateGateLogo('right', rightX, centerY, progress)
            }
        };
    }

    generateGateLayers(side, progress) {
        return {
            concrete: {
                texture: 'weathered-concrete',
                opacity: 1,
                shadowOffset: side === 'left' ? 15 : -15
            },
            metalFramework: {
                bars: this.generateMetalBars(side, progress),
                rivets: this.generateRivets(side),
                opacity: 0.9
            },
            electronics: {
                lights: this.generateGateLights(progress),
                wiring: this.generateWiring(side),
                warnings: this.generateWarningStripes()
            }
        };
    }

    generateMetalBars(side, progress) {
        const bars = [];
        const barCount = 8;

        for (let i = 0; i < barCount; i++) {
            bars.push({
                position: i / barCount,
                width: 6,
                height: 0.8,
                rust: Math.random() * 0.3,
                shine: 0.4 + Math.sin(progress * Math.PI * 2 + i) * 0.2
            });
        }

        return bars;
    }

    generateGateLights(progress) {
        const lights = [];
        const lightCount = 6;

        for (let i = 0; i < lightCount; i++) {
            const isActive = Math.random() > 0.3;
            const flicker = Math.sin(progress * 50 + i * 3) > 0.7;

            lights.push({
                position: { x: 0.1 + (i * 0.15), y: 0.1 },
                color: isActive ? '#FFAA00' : '#440000',
                intensity: isActive && !flicker ? 1 : 0.1,
                size: 8,
                glow: isActive ? 15 : 0
            });
        }

        return lights;
    }

    calculateGateDust(phase, progress, width, height) {
        if (phase !== 'closing' && phase !== 'opening') return [];

        const particles = [];
        const particleCount = Math.floor(150 * progress);

        for (let i = 0; i < particleCount; i++) {
            const x = width * 0.3 + Math.random() * width * 0.4;
            const y = height * 0.2 + Math.random() * height * 0.6;
            const vx = (Math.random() - 0.5) * 2;
            const vy = Math.random() * -1 - 0.5; // Upward movement
            const size = Math.random() * 3 + 1;
            const life = Math.random() * 2000 + 1000;
            const opacity = Math.random() * 0.6 + 0.2;

            particles.push({ x, y, vx, vy, size, life, opacity });
        }

        return particles;
    }

    calculateGateLighting(phase, progress, width, height) {
        if (phase !== 'opening') return [];

        const rays = [];
        const rayCount = 8;

        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 0.5 + Math.PI * 0.25;
            const intensity = 0.3 + Math.sin(progress * Math.PI + i) * 0.2;
            const length = height * 0.6 * progress;

            rays.push({
                startX: width / 2,
                startY: height / 2,
                angle,
                length,
                intensity,
                width: 20 + Math.sin(progress * Math.PI * 4 + i) * 5
            });
        }

        return rays;
    }

    // ========================================
    // MR. DNA SPRITE CALCULATIONS
    // ========================================

    calculateMrDNAAnimation(config) {
        const {
            animationType, // 'idle', 'talking', 'transition'
            progress,
            position,
            frameRate = 12
        } = config;

        const animations = {
            idle: this.calculateDNAIdle(progress, position),
            talking: this.calculateDNATalking(progress, position),
            transition: this.calculateDNATransition(progress, position)
        };

        const currentAnimation = animations[animationType] || animations.idle;

        // Add DNA helix particle effects
        const helixParticles = this.calculateDNAHelix(progress, position);

        return {
            sprite: currentAnimation,
            particles: helixParticles,
            position: this.calculateDNAPosition(position, progress),
            scale: 1 + Math.sin(progress * Math.PI * 4) * 0.1,
            timestamp: performance.now()
        };
    }

    calculateDNAIdle(progress, position) {
        const bobIntensity = 8;
        const bobSpeed = 2;
        const yOffset = Math.sin(progress * bobSpeed) * bobIntensity;

        return {
            frameIndex: Math.floor(progress * 8) % 8,
            transform: {
                translateY: yOffset,
                rotate: Math.sin(progress * 1.5) * 3,
                scale: 1 + Math.sin(progress * 3) * 0.05
            },
            effects: {
                glow: 0.3 + Math.sin(progress * 4) * 0.2,
                particle_emission: 0.1
            }
        };
    }

    calculateDNATalking(progress, position) {
        const gestureIntensity = 15;
        const mouthFlap = Math.sin(progress * 20) > 0 ? 1 : 0;

        return {
            frameIndex: mouthFlap ? 9 + (Math.floor(progress * 4) % 3) : 8,
            transform: {
                translateX: Math.sin(progress * 6) * gestureIntensity,
                translateY: Math.sin(progress * 4) * 5,
                rotate: Math.sin(progress * 8) * 8,
                scale: 1 + mouthFlap * 0.1
            },
            effects: {
                glow: 0.6 + mouthFlap * 0.3,
                particle_emission: 0.8 + mouthFlap * 0.2
            }
        };
    }

    calculateDNAHelix(progress, position) {
        const particles = [];
        const particleCount = 20;
        const helixRadius = 30;
        const helixHeight = 80;

        for (let i = 0; i < particleCount; i++) {
            const t = (i / particleCount) * Math.PI * 4 + progress * 2;
            const x = position.x + Math.cos(t) * helixRadius;
            const y = position.y + (i / particleCount) * helixHeight - helixHeight/2;
            const z = Math.sin(t) * helixRadius;

            // Create complementary strand
            const x2 = position.x + Math.cos(t + Math.PI) * helixRadius;
            const z2 = Math.sin(t + Math.PI) * helixRadius;

            particles.push(
                {
                    x, y, z,
                    color: '#00FF88',
                    size: 3,
                    opacity: 0.8,
                    type: 'nucleotide'
                },
                {
                    x: x2, y, z: z2,
                    color: '#FF4400',
                    size: 3,
                    opacity: 0.8,
                    type: 'nucleotide'
                }
            );

            // Add connecting bonds every 4th particle
            if (i % 4 === 0) {
                particles.push({
                    x1: x, y1: y, z1: z,
                    x2: x2, y2: y, z2: z2,
                    color: '#FFFF00',
                    width: 1,
                    opacity: 0.6,
                    type: 'bond'
                });
            }
        }

        return particles;
    }

    // ========================================
    // PARTICLE SYSTEM MANAGEMENT
    // ========================================

    updateParticles(deltaTime) {
        this.particleSystems.forEach((system, id) => {
            this.updateParticleSystem(system, deltaTime);

            // Remove expired systems
            if (system.particles.length === 0 && system.emissionRate === 0) {
                this.particleSystems.delete(id);
            }
        });
    }

    updateParticleSystem(system, deltaTime) {
        // Update existing particles
        system.particles = system.particles.filter(particle => {
            particle.life -= deltaTime;
            particle.x += particle.vx * deltaTime * 0.001;
            particle.y += particle.vy * deltaTime * 0.001;
            particle.opacity *= 0.999; // Gradual fade

            return particle.life > 0 && particle.opacity > 0.01;
        });

        // Emit new particles
        if (system.emissionRate > 0) {
            const particlesToEmit = Math.floor(system.emissionRate * deltaTime * 0.001);
            for (let i = 0; i < particlesToEmit; i++) {
                system.particles.push(system.emitter());
            }
        }
    }

    // ========================================
    // PERFORMANCE MONITORING
    // ========================================

    updatePerformanceMetrics(deltaTime) {
        this.performanceMetrics.frameCount++;
        this.performanceMetrics.averageFrameTime =
            (this.performanceMetrics.averageFrameTime + deltaTime) / 2;
        this.performanceMetrics.maxFrameTime =
            Math.max(this.performanceMetrics.maxFrameTime, deltaTime);

        // Send performance data every 60 frames
        if (this.performanceMetrics.frameCount % 60 === 0) {
            postMessage({
                type: 'performance_metrics',
                data: this.performanceMetrics
            });
        }
    }

    // ========================================
    // MESSAGE HANDLING
    // ========================================

    handleMessage(event) {
        const { type, data, id } = event.data;

        switch (type) {
            case 'wave_transition':
                const waveData = this.calculateWaveTransition(data);
                postMessage({ type: 'wave_data', data: waveData, id });
                break;

            case 'gate_transition':
                const gateData = this.calculateGateTransition(data);
                postMessage({ type: 'gate_data', data: gateData, id });
                break;

            case 'mr_dna_animation':
                const dnaData = this.calculateMrDNAAnimation(data);
                postMessage({ type: 'dna_animation_data', data: dnaData, id });
                break;

            case 'create_particle_system':
                this.particleSystems.set(data.id, {
                    particles: [],
                    emissionRate: data.emissionRate,
                    emitter: new Function('return ' + data.emitterFunction)()
                });
                break;

            case 'destroy_particle_system':
                this.particleSystems.delete(data.id);
                break;

            case 'start':
                this.init();
                break;

            case 'stop':
                this.isRunning = false;
                break;
        }
    }
}

// Initialize worker
const animationWorker = new AnimationWorker();
self.addEventListener('message', (event) => animationWorker.handleMessage(event));

// Auto-start
animationWorker.init();
