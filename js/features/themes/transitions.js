/**
 * Transition Controller - Handles cinematic theme transitions
 * Implements wave and gate transitions with realistic physics
 */

import { EventBus } from '../../core/events.js';

export class TransitionController {
    constructor() {
        this.activeTransition = null;
        this.transitionDuration = {
            'default-to-jaws': 2500,
            'default-to-jurassic': 3000,
            'jaws-to-default': 2000,
            'jaws-to-jurassic': 3500,
            'jurassic-to-default': 2200,
            'jurassic-to-jaws': 3200
        };
    }

    async execute(fromTheme, toTheme) {
        if (this.activeTransition) {
            await this.activeTransition;
        }

        const transitionKey = `${fromTheme}-to-${toTheme}`;
        const duration = this.transitionDuration[transitionKey] || 2500;

        this.activeTransition = this.performTransition(fromTheme, toTheme, duration);

        try {
            await this.activeTransition;
        } finally {
            this.activeTransition = null;
        }
    }

    async performTransition(fromTheme, toTheme, duration) {
        // Add transitioning state to body
        document.body.classList.add('theme-transitioning');

        // Create transition overlay
        const overlay = this.createTransitionOverlay();
        document.body.appendChild(overlay);

        try {
            // Execute theme-specific transition
            if (toTheme === 'jaws' || fromTheme === 'jaws') {
                await this.executeWaveTransition(fromTheme, toTheme, overlay);
            } else if (toTheme === 'jurassic' || fromTheme === 'jurassic') {
                await this.executeGateTransition(fromTheme, toTheme, overlay);
            } else {
                await this.executeDefaultTransition(fromTheme, toTheme, overlay);
            }

            EventBus.emit('theme:transition:complete', { from: fromTheme, to: toTheme });
        } finally {
            // Cleanup
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                document.body.classList.remove('theme-transitioning');
            }, 300);
        }
    }

    createTransitionOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'theme-transition-overlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 999999;
            pointer-events: none;
            overflow: hidden;
        `;
        return overlay;
    }

    async executeWaveTransition(fromTheme, toTheme, overlay) {
        // Create wave SVG
        const wave = this.createWaveSVG();
        overlay.appendChild(wave);

        // Play ocean sound effect
        EventBus.emit('audio:play-ui-sound', { sound: 'oceanWave' });

        // Phase 1: Wave rises from bottom
        await this.animateElement(wave, [
            { transform: 'translateY(100%)', opacity: 0 },
            { transform: 'translateY(0%)', opacity: 1 }
        ], 800);

        // Phase 2: Add shark fin silhouette
        const fin = this.createSharkFin();
        wave.appendChild(fin);

        await this.animateElement(fin, [
            { transform: 'translateX(-100px) scale(0)', opacity: 0 },
            { transform: 'translateX(200px) scale(1)', opacity: 1 },
            { transform: 'translateX(calc(100vw + 100px)) scale(0.8)', opacity: 0.7 }
        ], 1200);

        // Phase 3: Wave crests and breaks
        const foam = this.createWaveFoam();
        wave.appendChild(foam);

        await Promise.all([
            this.animateElement(wave.querySelector('.wave-body'), [
                { transform: 'scaleY(1)' },
                { transform: 'scaleY(1.3)' },
                { transform: 'scaleY(0.8)' }
            ], 600),
            this.animateElement(foam, [
                { opacity: 0, transform: 'scale(0)' },
                { opacity: 1, transform: 'scale(1.5)' },
                { opacity: 0.3, transform: 'scale(3)' }
            ], 600)
        ]);

        // Phase 4: Wave recedes
        await this.animateElement(wave, [
            { transform: 'translateY(0%)', opacity: 1 },
            { transform: 'translateY(100%)', opacity: 0 }
        ], 700);
    }

    createWaveSVG() {
        const waveContainer = document.createElement('div');
        waveContainer.className = 'wave-transition-container';
        waveContainer.style.cssText = `
            width: 100%;
            height: 100%;
            position: relative;
            background: linear-gradient(to bottom,
                rgba(0, 25, 50, 0.95) 0%,
                rgba(0, 60, 100, 0.98) 70%,
                rgba(0, 20, 40, 1) 100%);
        `;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 1200 800');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        svg.style.cssText = 'width: 100%; height: 100%; position: absolute; top: 0; left: 0;';

        // Create wave path with realistic curves
        const wavePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        wavePath.setAttribute('class', 'wave-body');
        wavePath.setAttribute('d', 'M0,400 Q300,350 600,400 T1200,400 L1200,800 L0,800 Z');
        wavePath.setAttribute('fill', 'url(#waveGradient)');

        // Create gradient definition
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.setAttribute('id', 'waveGradient');
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '0%');
        gradient.setAttribute('y2', '100%');

        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', 'rgba(255, 255, 255, 0.8)');

        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '30%');
        stop2.setAttribute('stop-color', 'rgba(0, 153, 221, 0.9)');

        const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop3.setAttribute('offset', '100%');
        stop3.setAttribute('stop-color', 'rgba(0, 70, 163, 1)');

        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        gradient.appendChild(stop3);
        defs.appendChild(gradient);

        svg.appendChild(defs);
        svg.appendChild(wavePath);
        waveContainer.appendChild(svg);

        return waveContainer;
    }

    createSharkFin() {
        const fin = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        fin.setAttribute('class', 'shark-fin');

        const finPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        finPath.setAttribute('d', 'M0,0 L30,-60 L60,0 L45,5 L15,5 Z');
        finPath.setAttribute('fill', '#002233');
        finPath.setAttribute('filter', 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))');

        fin.appendChild(finPath);
        return fin;
    }

    createWaveFoam() {
        const foam = document.createElement('div');
        foam.className = 'wave-foam';
        foam.style.cssText = `
            position: absolute;
            top: 40%;
            left: 0;
            width: 100%;
            height: 20%;
            background: radial-gradient(ellipse at center,
                rgba(255, 255, 255, 0.8) 0%,
                rgba(255, 255, 255, 0.4) 40%,
                transparent 70%);
            filter: blur(2px);
        `;
        return foam;
    }

    async executeGateTransition(fromTheme, toTheme, overlay) {
        // Create Jurassic Park gates
        const gatesContainer = this.createJurassicGates();
        overlay.appendChild(gatesContainer);

        // Play ambient jungle sounds
        EventBus.emit('audio:play-ui-sound', { sound: 'jurassicAmbient' });

        // Phase 1: Environmental preparation
        document.body.style.filter = 'brightness(0.7) sepia(0.3)';
        await this.delay(300);

        // Phase 2: Gates slide in
        const leftGate = gatesContainer.querySelector('.gate-left');
        const rightGate = gatesContainer.querySelector('.gate-right');

        await Promise.all([
            this.animateElement(leftGate, [
                { transform: 'translateX(-100%)', opacity: 0 },
                { transform: 'translateX(0%)', opacity: 1 }
            ], 1000),
            this.animateElement(rightGate, [
                { transform: 'translateX(100%)', opacity: 0 },
                { transform: 'translateX(0%)', opacity: 1 }
            ], 1000)
        ]);

        // Phase 3: Gates close with mechanical sound
        EventBus.emit('audio:play-ui-sound', { sound: 'metalClang' });

        await Promise.all([
            this.animateElement(leftGate, [
                { transform: 'translateX(0%) rotateY(0deg)' },
                { transform: 'translateX(25%) rotateY(-15deg)' }
            ], 800),
            this.animateElement(rightGate, [
                { transform: 'translateX(0%) rotateY(0deg)' },
                { transform: 'translateX(-25%) rotateY(15deg)' }
            ], 800)
        ]);

        // Phase 4: Behind-gates transformation (screen flickers)
        for (let i = 0; i < 3; i++) {
            document.body.style.filter = 'brightness(1.5) contrast(1.3)';
            await this.delay(100);
            document.body.style.filter = 'brightness(0.7) sepia(0.3)';
            await this.delay(150);
        }

        // Phase 5: Gates open majestically
        EventBus.emit('audio:play-ui-sound', { sound: 'gateOpen' });

        await Promise.all([
            this.animateElement(leftGate, [
                { transform: 'translateX(25%) rotateY(-15deg)' },
                { transform: 'translateX(-50%) rotateY(-45deg)', opacity: 1 },
                { transform: 'translateX(-100%) rotateY(-60deg)', opacity: 0 }
            ], 1200),
            this.animateElement(rightGate, [
                { transform: 'translateX(-25%) rotateY(15deg)' },
                { transform: 'translateX(50%) rotateY(45deg)', opacity: 1 },
                { transform: 'translateX(100%) rotateY(60deg)', opacity: 0 }
            ], 1200)
        ]);

        // Reset body filter
        document.body.style.filter = '';
    }

    createJurassicGates() {
        const container = document.createElement('div');
        container.className = 'jurassic-gates-container';
        container.style.cssText = `
            width: 100%;
            height: 100%;
            position: relative;
            perspective: 1000px;
            background: linear-gradient(to bottom,
                rgba(45, 35, 20, 0.9) 0%,
                rgba(25, 20, 12, 0.95) 100%);
        `;

        // Left gate
        const leftGate = this.createGate('left');
        // Right gate
        const rightGate = this.createGate('right');

        container.appendChild(leftGate);
        container.appendChild(rightGate);

        return container;
    }

    createGate(side) {
        const gate = document.createElement('div');
        gate.className = `gate-${side}`;
        gate.style.cssText = `
            position: absolute;
            top: 0;
            ${side}: 0;
            width: 50%;
            height: 100%;
            background: linear-gradient(45deg,
                #8B7355 0%,
                #A0916B 25%,
                #6B5A3D 50%,
                #8B7355 75%,
                #9C8B6F 100%);
            border: 8px solid #5D4E37;
            transform-origin: ${side === 'left' ? 'right' : 'left'} center;
            transform-style: preserve-3d;
        `;

        // Add Jurassic Park logo
        const logo = document.createElement('div');
        logo.className = 'gate-logo';
        logo.style.cssText = `
            position: absolute;
            top: 30%;
            left: 50%;
            transform: translateX(-50%);
            width: 200px;
            height: 200px;
            background: radial-gradient(circle,
                rgba(212, 172, 90, 0.9) 30%,
                rgba(138, 108, 47, 0.8) 60%,
                transparent 80%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Rye', serif;
            font-size: 24px;
            color: #2A251B;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            border: 4px solid #8A6C2F;
        `;
        logo.textContent = 'JURASSIC PARK';

        // Add warning lights
        for (let i = 0; i < 6; i++) {
            const light = document.createElement('div');
            light.className = 'warning-light';
            light.style.cssText = `
                position: absolute;
                width: 12px;
                height: 12px;
                background: #FF4444;
                border-radius: 50%;
                box-shadow: 0 0 10px #FF4444;
                top: ${20 + i * 12}%;
                ${side === 'left' ? 'right' : 'left'}: 20px;
                animation: warningBlink ${0.5 + i * 0.1}s infinite alternate;
            `;
            gate.appendChild(light);
        }

        gate.appendChild(logo);
        return gate;
    }

    async executeDefaultTransition(fromTheme, toTheme, overlay) {
        // Simple fade transition for default theme
        overlay.style.background = 'var(--bg-primary)';

        await this.animateElement(overlay, [
            { opacity: 0 },
            { opacity: 1 },
            { opacity: 0 }
        ], 1200);
    }

    // Utility methods
    animateElement(element, keyframes, duration) {
        return new Promise(resolve => {
            const animation = element.animate(keyframes, {
                duration,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'forwards'
            });
            animation.addEventListener('finish', resolve);
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
