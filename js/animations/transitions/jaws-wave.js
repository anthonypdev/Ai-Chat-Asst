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
        // Assuming StateManager is available globally via window.StateManager.getInstance() if needed for debug logs
        // For this class, direct state access might not be strictly necessary, but logging can use it.
        this.stateManager = (typeof StateManager !== 'undefined' && StateManager.getInstance) ? StateManager.getInstance() : { get: () => false };


        // Select UI elements for the animation within the container
        this.ui = {
            oceanDepth: this.utils.$('.wave-ocean-depth', this.containerElement),
            waveLayers: this.utils.$$('.wave-layer', this.containerElement),
            sharkFin: this.utils.$('.shark-fin', this.containerElement),
            waterParticlesContainer: this.utils.$('.water-particles', this.containerElement),
            foamSprays: this.utils.$$('.foam-spray', this.containerElement),
            underwaterDistortion: this.utils.$('.underwater-distortion', this.containerElement)
        };

        this._isActive = false;

        if (this.stateManager.get('debugMode')) {
            console.log('🌊 JawsWaveAnimation initialized.');
            if (!this.ui.oceanDepth) console.warn("JawsWave: oceanDepth element not found in container:", containerElement);
            if (this.ui.waveLayers.length === 0) console.warn("JawsWave: waveLayer elements not found in container:", containerElement);
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

        this._resetElements();

        const timings = {
            oceanDepthDelay: 0,
            waveLayerBaseDelay: 200,
            waveLayerStagger: 300,
            waveLayerDuration: 4000, // Corresponds to CSS animation
            sharkFinDelay: 1500,
            particlesDelay: 1800,
            foamDelay: 2000,
            distortionDelay: 500,
        };

        // Screen is considered "covered" when the main wave layers (especially the later ones) are at their peak.
        // waveLayerFoam (wave-layer-5) animation is 4s, starts at 1.2s (base) + 4*0.3s (stagger) = 2.4s total delay
        // Peak might be around 2.4s + (4s * 0.6) = 2.4s + 2.4s = 4.8s from start of this function.
        // Let's simplify and use a value that ensures all covering elements are active.
        const screenCoveredTime = timings.waveLayerBaseDelay + ( (this.ui.waveLayers.length || 5) * timings.waveLayerStagger) + (timings.waveLayerDuration * 0.5);


        return new Promise(resolve => {
            if (this.ui.oceanDepth) {
                setTimeout(() => this.utils.addClass(this.ui.oceanDepth, 'active'), timings.oceanDepthDelay);
            }

            this.ui.waveLayers.forEach((layer, index) => {
                setTimeout(() => {
                    this.utils.addClass(layer, 'active');
                }, timings.waveLayerBaseDelay + (index * timings.waveLayerStagger));
            });

            if (this.ui.sharkFin) {
                setTimeout(() => {
                    this.utils.addClass(this.ui.sharkFin, 'active');
                }, timings.sharkFinDelay);
            }

            if (this.ui.waterParticlesContainer) {
                setTimeout(() => {
                    this.utils.addClass(this.ui.waterParticlesContainer, 'active');
                }, timings.particlesDelay);
            }

            this.ui.foamSprays.forEach((foam, index) => {
                setTimeout(() => {
                    this.utils.addClass(foam, 'active');
                }, timings.foamDelay + (index * 300)); // Stagger foam sprays
            });

            if (this.ui.underwaterDistortion) {
                setTimeout(() => {
                    this.utils.addClass(this.ui.underwaterDistortion, 'active');
                }, timings.distortionDelay);
            }
            
            setTimeout(() => {
                if (this.stateManager.get('debugMode')) {
                    console.log('JawsWaveAnimation: Screen covered.');
                }
                resolve({ covered: true, duration: screenCoveredTime });
            }, screenCoveredTime); // This timeout duration is critical for ThemeManager
        });
    }

    /**
     * Plays the "reveal screen" part of the wave animation.
     * @returns {Promise<{revealed: boolean, duration: number}>} Resolves when the screen is clear.
     */
    hideWaveAnimation() {
        if (!this._isActive) {
            // It might be called to ensure cleanup even if not fully active
            // console.warn("JawsWaveAnimation: hideWaveAnimation called but not active.");
            // return Promise.resolve({ revealed: false, duration: 0 });
        }
        this.utils.removeClass(this.containerElement, 'animation-phase-cover');
        this.utils.addClass(this.containerElement, 'animation-phase-reveal');

        // Durations for revealing (can be same as cover or different)
        // CSS transitions on class removal should handle the timing.
        // This duration is for the promise to resolve.
        const revealDuration = 1500; // Should match the longest "fade-out" or reverse animation

        // Remove 'active' classes. CSS transitions should handle fade-out.
        if (this.ui.oceanDepth) this.utils.removeClass(this.ui.oceanDepth, 'active');
        this.ui.waveLayers.forEach(layer => this.utils.removeClass(layer, 'active'));
        if (this.ui.sharkFin) this.utils.removeClass(this.ui.sharkFin, 'active');
        if (this.ui.waterParticlesContainer) this.utils.removeClass(this.ui.waterParticlesContainer, 'active');
        this.ui.foamSprays.forEach(foam => this.utils.removeClass(foam, 'active'));
        if (this.ui.underwaterDistortion) this.utils.removeClass(this.ui.underwaterDistortion, 'active');

        return new Promise(resolve => {
            setTimeout(() => {
                this._isActive = false;
                this.utils.removeClass(this.containerElement, 'animation-phase-reveal');
                // Also call _resetElements to ensure all styles are fully cleared if CSS doesn't handle it fully on class removal
                this._resetElements();
                if (this.stateManager.get('debugMode')) {
                    console.log('JawsWaveAnimation: Screen revealed.');
                }
                resolve({ revealed: true, duration: revealDuration });
            }, revealDuration);
        });
    }

    /**
     * Resets all animated elements to their initial (pre-animation) state.
     * This primarily involves removing 'active' classes.
     * @private
     */
    _resetElements() {
        if (this.ui.oceanDepth) this.utils.removeClass(this.ui.oceanDepth, 'active');
        this.ui.waveLayers.forEach(layer => {
            this.utils.removeClass(layer, 'active');
        });
        if (this.ui.sharkFin) this.utils.removeClass(this.ui.sharkFin, 'active');
        if (this.ui.waterParticlesContainer) this.utils.removeClass(this.ui.waterParticlesContainer, 'active');
        this.ui.foamSprays.forEach(foam => this.utils.removeClass(foam, 'active'));
        if (this.ui.underwaterDistortion) this.utils.removeClass(this.ui.underwaterDistortion, 'active');

        // Also remove overall phase classes if any persist
        this.utils.removeClass(this.containerElement, 'animation-phase-cover');
        this.utils.removeClass(this.containerElement, 'animation-phase-reveal');
    }

    /**
     * Call this method if the animation needs to be abruptly stopped and cleaned up.
     */
    destroy() {
        this._resetElements();
        this._isActive = false;
        if (this.stateManager.get('debugMode')) {
            console.log('🌊 JawsWaveAnimation destroyed and elements reset.');
        }
    }
}

// If not using ES modules:
// window.JawsWaveAnimation = JawsWaveAnimation;
