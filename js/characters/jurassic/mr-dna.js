/**
 * Parkland AI - Opus Magnum Edition
 * JawsWaveAnimation Module
 *
 * Manages the Jaws-themed wave transition effect.
 * This class is responsible for orchestrating the CSS animations defined
 * in css/themes/jaws/transitions.css by adding/removing classes.
 */

class JawsWaveAnimation {
    /**
     * @param {HTMLElement} containerElement - The main container for the Jaws wave effect (e.g., #jawsWaveTransitionContainer).
     * @param {ParklandUtils} utils - Instance of ParklandUtils.
     */
    constructor(containerElement, utils) {
        if (!containerElement || !utils) {
            throw new Error("JawsWaveAnimation requires a containerElement and Utils instance.");
        }
        this.containerElement = containerElement;
        this.utils = utils;
        this.stateManager = window.StateManager.getInstance(); // Get global instance

        // Select UI elements for the animation within the container
        this.ui = {
            oceanDepth: this.utils.$('.wave-ocean-depth', this.containerElement),
            waveLayers: this.utils.$$('.wave-layer', this.containerElement), // Gets all elements with class 'wave-layer'
            sharkFin: this.utils.$('.shark-fin', this.containerElement),
            waterParticlesContainer: this.utils.$('.water-particles', this.containerElement),
            foamSprays: this.utils.$$('.foam-spray', this.containerElement),
            underwaterDistortion: this.utils.$('.underwater-distortion', this.containerElement)
            // Note: Individual water droplets are often dynamically created or are many static elements
            // styled by nth-child. If they need JS interaction, they'd be selected here.
        };

        this._isActive = false;

        if (this.stateManager.get('debugMode')) {
            console.log('🌊 JawsWaveAnimation initialized.');
            if (!this.ui.oceanDepth) console.warn("JawsWave: oceanDepth element not found.");
            if (this.ui.waveLayers.length === 0) console.warn("JawsWave: waveLayer elements not found.");
            // Add similar checks for other critical elements if necessary
        }
    }

    /**
     * Plays the "cover screen" part of the wave animation.
     * @returns {Promise<{covered: boolean, duration: number}>} Resolves when the screen is considered covered.
     */
    playWaveAnimation() {
        if (this._isActive) {
            console.warn("JawsWaveAnimation: playWaveAnimation called while already active.");
            return Promise.resolve({ covered: false, duration: 0 });
        }
        this._isActive = true;
        this.utils.addClass(this.containerElement, 'animation-phase-cover');
        this.utils.removeClass(this.containerElement, 'animation-phase-reveal');


        // Reset elements to initial state (remove active classes that might persist)
        this._resetElements();

        // Durations are based on the CSS animations in jaws/transitions.css
        const timings = {
            oceanDepthDelay: 0,
            oceanDepthDuration: 4000, // Matches its animation: oceanDepthPulse 8s (half for cover) or main wave build
            waveLayerBaseDelay: 200,
            waveLayerStagger: 300, // Delay between each wave layer appearing
            waveLayerDuration: 4000, // Longest wave layer animation for cover
            sharkFinDelay: 1500,     // Shark appears mid-wave
            sharkFinDuration: 4000,  // Duration of its swim pass during cover
            particlesDelay: 1800,
            particlesDuration: 2000,
            foamDelay: 2000,
            foamDuration: 1800,
            distortionDelay: 500,
            distortionDuration: 4000,
            contentRefractionDelay: 0 // Starts with transition overlay
        };

        // Screen is considered "covered" when the main wave layers are at their peak.
        // This is roughly waveLayerBaseDelay + (numLayers * stagger) + waveLayerDuration / 2 (peak)
        // Or more simply, when the last foam/crest layer (wave-layer-5) is fully active and covering.
        // The waveLayerFoam animation is 4s, starts at 1.2s after the first wave.
        // Total time for all wave layers to be active: timings.waveLayerBaseDelay + (4 * timings.waveLayerStagger) + timings.waveLayerDuration
        // For simplicity, let's say screen is covered around when foam is peaking.
        const screenCoveredTime = timings.waveLayerBaseDelay + (4 * timings.waveLayerStagger) + (timings.waveLayerDuration * 0.6); // Approx 3000-3500ms

        return new Promise(resolve => {
            // Activate ocean depth
            if (this.ui.oceanDepth) this.utils.addClass(this.ui.oceanDepth, 'active');

            // Activate wave layers sequentially
            this.ui.waveLayers.forEach((layer, index) => {
                setTimeout(() => {
                    this.utils.addClass(layer, 'active');
                }, timings.waveLayerBaseDelay + (index * timings.waveLayerStagger));
            });

            // Activate shark fin
            if (this.ui.sharkFin) {
                setTimeout(() => {
                    this.utils.addClass(this.ui.sharkFin, 'active');
                }, timings.sharkFinDelay);
            }

            // Activate particles
            if (this.ui.waterParticlesContainer) {
                setTimeout(() => {
                    this.utils.addClass(this.ui.waterParticlesContainer, 'active');
                }, timings.particlesDelay);
            }

            // Activate foam sprays
            this.ui.foamSprays.forEach((foam, index) => {
                setTimeout(() => {
                    this.utils.addClass(foam, 'active');
                }, timings.foamDelay + (index * 300)); // Stagger foam sprays
            });

            // Activate distortion
            if (this.ui.underwaterDistortion) {
                setTimeout(() => {
                    this.utils.addClass(this.ui.underwaterDistortion, 'active');
                }, timings.distortionDelay);
            }
            
            // Content Refraction is handled by CSS on .chat-container when overlay is active
            // No direct JS needed here for its start if CSS is set up for it.

            // Resolve promise when screen is considered covered
            setTimeout(() => {
                if (this.stateManager.get('debugMode')) {
                    console.log('JawsWaveAnimation: Screen covered.');
                }
                resolve({ covered: true, duration: screenCoveredTime });
            }, screenCoveredTime);
        });
    }

    /**
     * Plays the "reveal screen" part of the wave animation.
     * @returns {Promise<{revealed: boolean, duration: number}>} Resolves when the screen is clear.
     */
    hideWaveAnimation() {
        if (!this._isActive) {
            console.warn("JawsWaveAnimation: hideWaveAnimation called but not active.");
            return Promise.resolve({ revealed: false, duration: 0 });
        }
        this.utils.removeClass(this.containerElement, 'animation-phase-cover');
        this.utils.addClass(this.containerElement, 'animation-phase-reveal');

        // Durations for revealing (can be same as cover or different)
        const revealDuration = 1500; // Total time for all elements to clear

        // Logic to reverse or hide elements.
        // This usually involves removing 'active' classes, and CSS handles the transition out.
        // The key is the timing.

        if (this.ui.oceanDepth) this.utils.removeClass(this.ui.oceanDepth, 'active');
        this.ui.waveLayers.forEach(layer => this.utils.removeClass(layer, 'active'));
        if (this.ui.sharkFin) this.utils.removeClass(this.ui.sharkFin, 'active');
        if (this.ui.waterParticlesContainer) this.utils.removeClass(this.ui.waterParticlesContainer, 'active');
        this.ui.foamSprays.forEach(foam => this.utils.removeClass(foam, 'active'));
        if (this.ui.underwaterDistortion) this.utils.removeClass(this.ui.underwaterDistortion, 'active');

        // Content Refraction is handled by CSS when overlay is no longer active.

        return new Promise(resolve => {
            setTimeout(() => {
                this._isActive = false; // Mark as no longer active
                // Final cleanup of classes if needed after animations finish
                this.utils.removeClass(this.containerElement, 'animation-phase-reveal');
                if (this.stateManager.get('debugMode')) {
                    console.log('JawsWaveAnimation: Screen revealed.');
                }
                resolve({ revealed: true, duration: revealDuration });
            }, revealDuration);
        });
    }

    /**
     * Resets all animated elements to their initial (pre-animation) state.
     * @private
     */
    _resetElements() {
        if (this.ui.oceanDepth) this.utils.removeClass(this.ui.oceanDepth, 'active');
        this.ui.waveLayers.forEach(layer => {
            this.utils.removeClass(layer, 'active');
            // Reset inline styles if JS was directly manipulating them,
            // but class-based approach should handle this via CSS.
        });
        if (this.ui.sharkFin) this.utils.removeClass(this.ui.sharkFin, 'active');
        if (this.ui.waterParticlesContainer) this.utils.removeClass(this.ui.waterParticlesContainer, 'active');
        this.ui.foamSprays.forEach(foam => this.utils.removeClass(foam, 'active'));
        if (this.ui.underwaterDistortion) this.utils.removeClass(this.ui.underwaterDistortion, 'active');
    }

    /**
     * Call this method if the animation needs to be abruptly stopped and cleaned up.
     */
    destroy() {
        this._resetElements();
        this.utils.removeClass(this.containerElement, 'animation-phase-cover');
        this.utils.removeClass(this.containerElement, 'animation-phase-reveal');
        this._isActive = false;
        if (this.stateManager.get('debugMode')) {
            console.log('🌊 JawsWaveAnimation destroyed and elements reset.');
        }
    }
}

// If not using ES modules:
// window.JawsWaveAnimation = JawsWaveAnimation;
