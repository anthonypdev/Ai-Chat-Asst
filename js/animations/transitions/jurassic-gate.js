/**
 * Parkland AI - Opus Magnum Edition
 * JurassicGateAnimation Module
 *
 * Manages the Jurassic Park themed gate opening/closing transition effect.
 * Orchestrates CSS animations defined in css/themes/jurassic/transitions.css.
 */

class JurassicGateAnimation {
    /**
     * @param {HTMLElement} containerElement - The main container for the Jurassic gate effect (e.g., #jurassicGateTransitionContainer).
     * @param {ParklandUtils} utils - Instance of ParklandUtils.
     */
    constructor(containerElement, utils) {
        if (!containerElement || !utils) {
            throw new Error("JurassicGateAnimation requires a containerElement and Utils instance.");
        }
        this.containerElement = containerElement;
        this.utils = utils;
        this.stateManager = window.StateManager.getInstance(); // Get global instance
        this.eventEmitter = window.appEvents; // Get global event emitter

        this.ui = {
            gateLeft: this.utils.$('.jurassic-gate.left', this.containerElement),
            gateRight: this.utils.$('.jurassic-gate.right', this.containerElement),
            gateLights: this.utils.$$('.warning-light', this.containerElement), // Multiple lights
            electricWarning: this.utils.$('.electric-warning', this.containerElement),
            spotlightContainer: this.utils.$('.spotlight-container', this.containerElement),
            fogLayer: this.utils.$('.fog-layer', this.containerElement),
            rainOverlay: this.utils.$('.rain-overlay', this.containerElement),
            dustContainer: this.utils.$('.jurassic-dust-container', this.containerElement)
        };

        this._isActive = false; // Tracks if the gate transition (either closing or opening) is active
        this._isClosed = false; // Tracks if gates are currently in the closed state

        if (this.stateManager.get('debugMode')) {
            console.log('🌲 JurassicGateAnimation initialized.');
            if (!this.ui.gateLeft || !this.ui.gateRight) console.warn("JurassicGate: Gate door elements not found.");
        }
    }

    /**
     * Plays the "cover screen" part of the transition (gates closing).
     * @returns {Promise<{covered: boolean, duration: number}>} Resolves when gates are closed.
     */
    closeGates() {
        if (this._isActive) {
            console.warn("JurassicGateAnimation: closeGates called while already active.");
            return Promise.resolve({ covered: false, duration: 0 });
        }
        this._isActive = true;
        this._isClosed = false; // Gates are starting to close
        this.utils.addClass(this.containerElement, 'animation-phase-cover');
        this.utils.removeClass(this.containerElement, 'animation-phase-reveal');

        // Reset initial states for elements that might have been 'open'
        this._resetElementsBeforeClose();

        const timings = {
            // Durations based on CSS animations in jurassic/transitions.css
            initialDelay: 100,          // Small delay before anything starts
            fogRollInStart: 300,
            fogRollInDuration: 2000,
            lightsOnDelay: 500,
            gateCloseStart: 800,
            gateCloseDuration: 2000,    // Main gate closing animation
            rumbleStart: 1000,
            rumbleDuration: 1500,       // Duration of the rumble effect itself
            dustStart: 1200,
            electricWarningStart: 1500,
        };

        // Screen is covered when gates are fully closed.
        const screenCoveredTime = timings.gateCloseStart + timings.gateCloseDuration;

        return new Promise(resolve => {
            this.eventEmitter.emit('playSound', { soundName: 'jurassic_ambience_start', loop: true });
            this.eventEmitter.emit('playSound', { soundName: 'gate_rumble_heavy', volume: 0.7 });


            // Fog rolls in
            setTimeout(() => {
                if (this.ui.fogLayer) this.utils.addClass(this.ui.fogLayer, 'active-closing');
            }, timings.fogRollInStart);

            // Warning lights start blinking
            setTimeout(() => {
                this.ui.gateLights.forEach(light => this.utils.addClass(light, 'blinking'));
            }, timings.lightsOnDelay);

            // Electric warning effect
            setTimeout(() => {
                if (this.ui.electricWarning) this.utils.addClass(this.ui.electricWarning, 'active');
            }, timings.electricWarningStart);

            // Start closing gates
            setTimeout(() => {
                if (this.ui.gateLeft) this.utils.addClass(this.ui.gateLeft, 'closing');
                if (this.ui.gateRight) this.utils.addClass(this.ui.gateRight, 'closing');
                this.eventEmitter.emit('playSound', { soundName: 'gate_creak_close', volume: 0.8 });
            }, timings.gateCloseStart);

            // Trigger body rumble class (CSS handles the animation)
            setTimeout(() => {
                document.body.classList.add('rumbling-gate'); // Class for CSS animation
            }, timings.rumbleStart);
            
            // Start dust particles
            setTimeout(() => {
                if (this.ui.dustContainer) this.utils.addClass(this.ui.dustContainer, 'active');
            }, timings.dustStart);


            // Resolve when gates are closed
            setTimeout(() => {
                this._isClosed = true; // Gates are now considered closed
                if (this.stateManager.get('debugMode')) {
                    console.log('JurassicGateAnimation: Gates closed, screen covered.');
                }
                resolve({ covered: true, duration: screenCoveredTime });
            }, screenCoveredTime);
        });
    }

    /**
     * Plays the "reveal screen" part of the transition (gates opening).
     * @returns {Promise<{revealed: boolean, duration: number}>} Resolves when gates are open.
     */
    openGates() {
        if (!this._isActive && !this._isClosed) { // Could be called if only closed
            console.warn("JurassicGateAnimation: openGates called but not in a clos(ed/ing) state.");
            // return Promise.resolve({ revealed: false, duration: 0 });
            // If called without closing first, it should probably still try to open from default.
            // For now, assume it's called after closeGates has completed.
        }
        if (!this._isClosed && this._isActive) { // still closing
            console.warn("JurassicGateAnimation: openGates called while gates are still closing.");
            return Promise.resolve({revealed: false, duration: 0 });
        }

        this._isActive = true; // Mark as active for the opening phase
        // _isClosed remains true until fully open
        this.utils.removeClass(this.containerElement, 'animation-phase-cover');
        this.utils.addClass(this.containerElement, 'animation-phase-reveal');


        const timings = {
            initialDelay: 200,
            spotlightOnDelay: 300,
            gateOpenStart: 500,
            gateOpenDuration: 2500,     // Main gate opening animation
            fogRecedeStart: 700,
            rumbleStopDelay: 1000,       // When to stop the rumble
            rainStartDelay: 1200,        // Rain starts as gates open
            dustClearDelay: 1500
        };
        const screenRevealedTime = timings.gateOpenStart + timings.gateOpenDuration;

        return new Promise(resolve => {
            this.eventEmitter.emit('playSound', { soundName: 'gate_creak_open', volume: 0.9 });

            // Spotlights on
            setTimeout(() => {
                if (this.ui.spotlightContainer) this.utils.addClass(this.ui.spotlightContainer, 'active');
            }, timings.spotlightOnDelay);
            
            // Rain starts
            setTimeout(() => {
                if (this.ui.rainOverlay) this.utils.addClass(this.ui.rainOverlay, 'active');
            }, timings.rainStartDelay);

            // Start opening gates
            setTimeout(() => {
                if (this.ui.gateLeft) {
                    this.utils.removeClass(this.ui.gateLeft, 'closing');
                    this.utils.addClass(this.ui.gateLeft, 'opening');
                }
                if (this.ui.gateRight) {
                    this.utils.removeClass(this.ui.gateRight, 'closing');
                    this.utils.addClass(this.ui.gateRight, 'opening');
                }
            }, timings.gateOpenStart);

            // Fog recedes
            setTimeout(() => {
                if (this.ui.fogLayer) this.utils.removeClass(this.ui.fogLayer, 'active-closing'); // Or add 'active-opening' if styled for it
            }, timings.fogRecedeStart);

            // Stop rumble
            setTimeout(() => {
                document.body.classList.remove('rumbling-gate');
            }, timings.rumbleStopDelay);
            
            // Clear dust
            setTimeout(() => {
                if (this.ui.dustContainer) this.utils.removeClass(this.ui.dustContainer, 'active');
            }, timings.dustClearDelay);

            // Turn off warning lights and electric warning as gates open
            this.ui.gateLights.forEach(light => this.utils.removeClass(light, 'blinking'));
            if (this.ui.electricWarning) this.utils.removeClass(this.ui.electricWarning, 'active');


            // Resolve when gates are open
            setTimeout(() => {
                this._isClosed = false; // Gates are now open
                this._isActive = false; // Transition sequence complete
                if (this.stateManager.get('debugMode')) {
                    console.log('JurassicGateAnimation: Gates open, screen revealed.');
                }
                this.eventEmitter.emit('playSound', { soundName: 'jurassic_ambience_stop' }); // Stop looping ambience
                // Reset element classes for next time
                this._resetElementsAfterOpen();
                resolve({ revealed: true, duration: screenRevealedTime });
            }, screenRevealedTime);
        });
    }

    /**
     * Resets elements to their initial state before a close animation.
     * @private
     */
    _resetElementsBeforeClose() {
        if (this.ui.gateLeft) {
            this.utils.removeClass(this.ui.gateLeft, 'opening closing');
            // Potentially reset transform to its "fully open" or "off-screen" state if not handled by CSS initial state
        }
        if (this.ui.gateRight) {
            this.utils.removeClass(this.ui.gateRight, 'opening closing');
        }
        if (this.ui.fogLayer) this.utils.removeClass(this.ui.fogLayer, 'active-closing');
        if (this.ui.spotlightContainer) this.utils.removeClass(this.ui.spotlightContainer, 'active');
        if (this.ui.rainOverlay) this.utils.removeClass(this.ui.rainOverlay, 'active');
        if (this.ui.dustContainer) this.utils.removeClass(this.ui.dustContainer, 'active');
        this.ui.gateLights.forEach(light => this.utils.removeClass(light, 'blinking'));
        if (this.ui.electricWarning) this.utils.removeClass(this.ui.electricWarning, 'active');
        document.body.classList.remove('rumbling-gate');
    }
    
    /**
     * Resets elements after an open animation to prepare for next transition.
     * @private
     */
    _resetElementsAfterOpen() {
        if (this.ui.gateLeft) this.utils.removeClass(this.ui.gateLeft, 'opening');
        if (this.ui.gateRight) this.utils.removeClass(this.ui.gateRight, 'opening');
        if (this.ui.spotlightContainer) this.utils.removeClass(this.ui.spotlightContainer, 'active');
        if (this.ui.rainOverlay) this.utils.removeClass(this.ui.rainOverlay, 'active');
        // Fog and dust are already handled by their 'active' class removal or specific animations ending.
        // Warning lights and electric warning should be off.
        this.utils.removeClass(this.containerElement, 'animation-phase-reveal');
    }


    /**
     * Call this method if the animation needs to be abruptly stopped and cleaned up.
     */
    destroy() {
        this._resetElementsBeforeClose(); // General reset
        this._resetElementsAfterOpen();   // Ensure all states are cleared
        this.utils.removeClass(this.containerElement, 'animation-phase-cover animation-phase-reveal');
        this._isActive = false;
        this._isClosed = false;
        if (this.stateManager.get('debugMode')) {
            console.log('🌲 JurassicGateAnimation destroyed and elements reset.');
        }
    }
}

// If not using ES modules:
// window.JurassicGateAnimation = JurassicGateAnimation;
