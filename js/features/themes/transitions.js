/**
 * Parkland AI - Opus Magnum Edition
 * ThemeTransition Module
 *
 * Manages and orchestrates visual transitions between themes.
 * Works in conjunction with ThemeManager and theme-specific animation modules.
 */

class ThemeTransition {
    /**
     * @param {ParklandUtils} utils - Instance of ParklandUtils.
     * @param {StateManager} stateManager - Instance of StateManager.
     */
    constructor(utils, stateManager) {
        if (!utils || !stateManager) {
            throw new Error("ThemeTransition requires Utils and StateManager instances.");
        }
        this.utils = utils;
        this.stateManager = stateManager;

        this.ui = {
            // The main overlay container that is always present but hidden
            baseTransitionOverlay: this.utils.$('#themeTransitionOverlay'),
            // Specific transition effect containers (should be children of baseTransitionOverlay)
            jawsWaveContainer: this.utils.$('#jawsWaveTransitionContainer'), // Assumed ID from HTML structure
            jurassicGateContainer: this.utils.$('#jurassicGateTransitionContainer'), // Assumed ID
            // Add other theme transition containers here if needed
        };

        if (!this.ui.baseTransitionOverlay) {
            console.error("ThemeTransition: Base transition overlay element (#themeTransitionOverlay) not found in DOM.");
        }
        if (!this.ui.jawsWaveContainer) {
            console.warn("ThemeTransition: Jaws wave container element (#jawsWaveTransitionContainer) not found.");
        }
        if (!this.ui.jurassicGateContainer) {
            console.warn("ThemeTransition: Jurassic gate container element (#jurassicGateTransitionContainer) not found.");
        }

        this._currentTransition = null; // Tracks the active transition type (e.g., 'jaws', 'jurassic')
        this._isTransitioning = false;

        // Instantiate or get references to theme-specific animation controllers
        // These would come from files like 'js/animations/transitions/jaws-wave.js'
        // For now, creating placeholder objects if actual classes aren't loaded yet.
        this.jawsWaveAnimator = typeof JawsWaveAnimation !== 'undefined' ? new JawsWaveAnimation(this.ui.jawsWaveContainer, this.utils) : {
            playWaveAnimation: () => { console.warn("JawsWaveAnimation not fully loaded, using placeholder."); return Promise.resolve({ covered: true, duration: 1500 }); }, // Simulates covering screen
            hideWaveAnimation: () => { console.warn("JawsWaveAnimation not fully loaded, using placeholder."); return Promise.resolve({ revealed: true, duration: 1000 }); }  // Simulates revealing screen
        };
        this.jurassicGateAnimator = typeof JurassicGateAnimation !== 'undefined' ? new JurassicGateAnimation(this.ui.jurassicGateContainer, this.utils) : {
            closeGates: () => { console.warn("JurassicGateAnimation not fully loaded, using placeholder."); return Promise.resolve({ covered: true, duration: 2000 }); },
            openGates: () => { console.warn("JurassicGateAnimation not fully loaded, using placeholder."); return Promise.resolve({ revealed: true, duration: 1500 }); }
        };
        // Add other animators similarly

        console.log('🎬 ThemeTransition initialized.');
    }

    /**
     * Sets up and starts the "cover screen" phase of a theme transition.
     * @param {string} newThemeName - The name of the theme being transitioned TO.
     * @param {string} [previousThemeName] - The name of the theme being transitioned FROM.
     * @returns {Promise<{coveredTime: number}>} Promise resolving with estimated time for screen to be covered.
     */
    async setActiveTransition(newThemeName, previousThemeName = null) {
        if (this._isTransitioning) {
            console.warn("ThemeTransition: Another transition is already in progress.");
            return Promise.reject("Transition already in progress.");
        }
        this._isTransitioning = true;
        this._currentTransition = newThemeName;
        this.stateManager.set('isThemeTransitioning', true);
        document.body.classList.add('theme-transitioning');

        if (!this.ui.baseTransitionOverlay) {
            console.error("Base transition overlay not found, cannot start transition.");
            this._isTransitioning = false;
            this.stateManager.set('isThemeTransitioning', false);
            document.body.classList.remove('theme-transitioning');
            return Promise.reject("Missing base overlay.");
        }
        
        this.utils.addClass(this.ui.baseTransitionOverlay, 'active');
        let coverPromise;
        let estimatedCoverTime = 1000; // Default cover time

        // Hide all specific transition containers first
        if(this.ui.jawsWaveContainer) this.utils.addClass(this.ui.jawsWaveContainer, 'hidden');
        if(this.ui.jurassicGateContainer) this.utils.addClass(this.ui.jurassicGateContainer, 'hidden');

        switch (newThemeName) {
            case 'jaws':
                if (this.ui.jawsWaveContainer && this.jawsWaveAnimator) {
                    this.utils.removeClass(this.ui.jawsWaveContainer, 'hidden');
                    this.utils.addClass(this.ui.jawsWaveContainer, 'active');
                    coverPromise = this.jawsWaveAnimator.playWaveAnimation();
                    estimatedCoverTime = (await coverPromise).duration || 1500;
                } else {
                    console.warn("Jaws transition elements/animator not available.");
                    coverPromise = Promise.resolve();
                }
                break;
            case 'jurassic':
                if (this.ui.jurassicGateContainer && this.jurassicGateAnimator) {
                    this.utils.removeClass(this.ui.jurassicGateContainer, 'hidden');
                    this.utils.addClass(this.ui.jurassicGateContainer, 'active');
                    coverPromise = this.jurassicGateAnimator.closeGates(); // Closing gates covers the screen
                    estimatedCoverTime = (await coverPromise).duration || 2000;
                } else {
                    console.warn("Jurassic transition elements/animator not available.");
                    coverPromise = Promise.resolve();
                }
                break;
            default:
                // Default transition: simple fade or use a generic overlay animation
                console.log(`No specific transition for theme "${newThemeName}". Using default fade (via CSS).`);
                // CSS on .theme-transition-overlay.active should handle a default fade
                coverPromise = this.utils.wait(500); // Estimate for a CSS fade
                estimatedCoverTime = 500;
                break;
        }

        try {
            await coverPromise;
            if (this.stateManager.get('debugMode')) {
                console.log(`ThemeTransition: Screen covered for ${newThemeName} transition.`);
            }
            return { coveredTime: estimatedCoverTime };
        } catch (error) {
            console.error(`Error during setActiveTransition for ${newThemeName}:`, error);
            this._resetTransitionState(); // Clean up on error
            return Promise.reject(error);
        }
    }

    /**
     * Completes the "reveal screen" phase of the current theme transition.
     * @param {string} [newThemeName] - The name of the theme that was transitioned TO (can use this._currentTransition).
     * @param {string} [previousThemeName] - The name of the theme that was transitioned FROM.
     * @returns {Promise<{revealedTime: number}>} Promise resolving with estimated time for screen to be revealed.
     */
    async completeTransition(newThemeName = this._currentTransition, previousThemeName = null) {
        if (!this._isTransitioning || !this._currentTransition) {
            console.warn("ThemeTransition: No active transition to complete.");
            this._resetTransitionState(); // Ensure consistent state
            return Promise.resolve({ revealedTime: 0 });
        }
        if (newThemeName !== this._currentTransition) {
            console.warn(`ThemeTransition: Completing transition for ${this._currentTransition}, but received ${newThemeName}.`);
        }

        let revealPromise;
        let estimatedRevealTime = 1000; // Default reveal time

        switch (this._currentTransition) {
            case 'jaws':
                if (this.ui.jawsWaveContainer && this.jawsWaveAnimator) {
                    revealPromise = this.jawsWaveAnimator.hideWaveAnimation();
                    estimatedRevealTime = (await revealPromise).duration || 1000;
                } else {
                    revealPromise = Promise.resolve();
                }
                break;
            case 'jurassic':
                if (this.ui.jurassicGateContainer && this.jurassicGateAnimator) {
                    revealPromise = this.jurassicGateAnimator.openGates(); // Opening gates reveals the screen
                    estimatedRevealTime = (await revealPromise).duration || 1500;
                } else {
                    revealPromise = Promise.resolve();
                }
                break;
            default:
                // Default: CSS on .theme-transition-overlay should handle fade out when .active is removed later
                revealPromise = this.utils.wait(500);
                estimatedRevealTime = 500;
                break;
        }

        try {
            await revealPromise;
            if (this.stateManager.get('debugMode')) {
                console.log(`ThemeTransition: Screen revealed for ${this._currentTransition} transition.`);
            }
            this._resetTransitionState(this._currentTransition); // Pass current transition to reset
            return { revealedTime: estimatedRevealTime };
        } catch (error) {
            console.error(`Error during completeTransition for ${this._currentTransition}:`, error);
            this._resetTransitionState(this._currentTransition); // Clean up on error
            return Promise.reject(error);
        }
    }

    /**
     * Resets the transition state and hides overlays.
     * @param {string} completedThemeTransition - The theme whose transition elements should be hidden.
     * @private
     */
    _resetTransitionState(completedThemeTransition = null) {
        if(this.ui.baseTransitionOverlay) this.utils.removeClass(this.ui.baseTransitionOverlay, 'active');

        // Hide specific theme containers
        if (completedThemeTransition === 'jaws' && this.ui.jawsWaveContainer) {
            this.utils.removeClass(this.ui.jawsWaveContainer, 'active');
            this.utils.addClass(this.ui.jawsWaveContainer, 'hidden'); // Ensure it's hidden for next time
        }
        if (completedThemeTransition === 'jurassic' && this.ui.jurassicGateContainer) {
            this.utils.removeClass(this.ui.jurassicGateContainer, 'active');
            this.utils.addClass(this.ui.jurassicGateContainer, 'hidden');
        }
        // Add for other themes if they have specific containers

        this._isTransitioning = false;
        this._currentTransition = null;
        this.stateManager.set('isThemeTransitioning', false);
        document.body.classList.remove('theme-transitioning');
    }

    /**
     * Checks if a theme transition is currently active.
     * @returns {boolean} True if a transition is in progress.
     */
    isTransitioning() {
        return this._isTransitioning;
    }
}

// If not using ES modules:
// window.ThemeTransition = ThemeTransition;

window.ThemeTransition = ThemeTransition;
