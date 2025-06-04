/**
 * Parkland AI - Opus Magnum Edition
 * MrDnaCharacter Class (Jurassic Park Theme)
 *
 * Represents the Mr. DNA animated character from Jurassic Park.
 * Extends BaseCharacter and integrates with MrDnaSpriteAnimator for visuals.
 */

class MrDnaCharacter extends BaseCharacter {
    /**
     * @param {StateManager} stateManager
     * @param {EventEmitter} eventEmitter
     * @param {ParklandUtils} utils
     */
    constructor(stateManager, eventEmitter, utils) {
        const mrDnaConfig = {
            name: 'Mr. DNA',
            theme: 'jurassic',
            uiElementSelector: '.mr-dna-container', // Main container for Mr. DNA visuals
            systemPrompt: "Howdy! I'm Mr. DNA! Your guide to the wonders of genetic science at Jurassic Park! I make complex topics like DNA, cloning, and dinosaur creation super easy and fun to understand. Bingo! Dino DNA! Always be cheerful, use simple analogies, and keep it snappy and informative!",
            voiceConfig: {
                voiceNameKeywords: ['male', 'american english', 'friendly', 'cartoon'], // Hints
                lang: 'en-US',
                pitch: 1.25, // Higher, friendly, slightly cartoonish
                rate: 1.15,  // Upbeat and quick
                volume: 0.9
            },
            // spriteConfig is not directly used by BaseCharacter if we manage sprite via MrDnaSpriteAnimator
        };

        super('mr-dna', mrDnaConfig, stateManager, eventEmitter, utils);

        this.spriteAnimator = null; // Will be instance of MrDnaSpriteAnimator
        this.speechEndListener = null; // To store bound listener for removal

        if (this.stateManager.get('debugMode')) {
            console.log(`MrDnaCharacter instantiated with config:`, mrDnaConfig);
        }
    }

    /**
     * Mr. DNA-specific initialization.
     * Instantiates and initializes the sprite animator.
     */
    init() {
        super.init(); // Finds this.uiElement
        if (this.uiElement) {
            this.utils.addClass(this.uiElement, 'character-mr-dna'); // For specific CSS targeting
            try {
                // Assuming MrDnaSpriteAnimator is globally available or loaded
                if (typeof MrDnaSpriteAnimator === 'function') {
                    // The MrDnaSpriteAnimator might need a specific canvas or div inside this.uiElement
                    const spriteCanvas = this.utils.$('.mr-dna-canvas', this.uiElement); // Assuming a canvas child
                    if (spriteCanvas) {
                        this.spriteAnimator = new MrDnaSpriteAnimator(spriteCanvas, this.utils);
                        this.spriteAnimator.init(); // Load sprite sheet, etc.
                        if (this.stateManager.get('debugMode')) {
                            console.log("Mr. DNA Sprite Animator initialized.");
                        }
                    } else {
                        console.warn("MrDnaCharacter: Canvas element for sprite animator not found within", this.uiElementSelector);
                    }
                } else {
                    console.warn("MrDnaCharacter: MrDnaSpriteAnimator class not found.");
                }
            } catch (error) {
                console.error("MrDnaCharacter: Error initializing sprite animator:", error);
            }
        }
    }

    /**
     * Activates Mr. DNA. Shows UI and starts idle animation.
     */
    activate() {
        super.activate(); // BaseCharacter show()
        if (this.spriteAnimator) {
            this.spriteAnimator.playAnimation('idle');
        }
        this.eventEmitter.emit('playSound', { soundName: 'mr_dna_hello', character: this.key });
    }

    /**
     * Deactivates Mr. DNA. Hides UI and stops animation.
     */
    deactivate() {
        super.deactivate(); // BaseCharacter hide()
        if (this.spriteAnimator) {
            this.spriteAnimator.stopAnimation();
        }
    }

    /**
     * Mr. DNA's idle animation.
     * This is controlled by the sprite animator.
     */
    startIdleAnimation() {
        // super.startIdleAnimation(); // Base class might add a generic CSS class
        if (this.spriteAnimator && this.isVisible) { // Only play if visible
            this.spriteAnimator.playAnimation('idle');
        }
    }

    stopIdleAnimation() {
        // super.stopIdleAnimation();
        if (this.spriteAnimator) {
            // Sprite animator might stop automatically when a different animation is played,
            // or have its own logic for returning to idle.
            // If explicit stop is needed for idle, call it.
            // For now, assume playing another animation (like 'talking') overrides 'idle'.
        }
    }

    /**
     * Makes Mr. DNA speak and triggers talking animation.
     * @param {string} text - The text for Mr. DNA to speak.
     * @param {Object} [options={}] - Optional parameters for speech synthesis.
     */
    speak(text, options = {}) {
        if (!this.isActive && !options.forceSpeakIfNotActive) {
            console.warn("Mr. DNA is not active, cannot speak unless forced.");
            return;
        }

        if (this.spriteAnimator) {
            this.spriteAnimator.playAnimation('talking');
        }
        this.updateStatus('talking');

        // Handle reverting to idle animation after speech ends
        // Remove previous listener if any to avoid multiple bindings
        if (this.speechEndListener) {
            this.eventEmitter.off('speech:end', this.speechEndListener);
        }
        this.speechEndListener = ({ characterKey }) => {
            if (characterKey === this.key) { // Ensure it's this character's speech that ended
                if (this.spriteAnimator && this.isActive) { // Check if still active
                    this.spriteAnimator.playAnimation('idle');
                }
                this.updateStatus('idle');
                this.eventEmitter.off('speech:end', this.speechEndListener); // Clean up
                this.speechEndListener = null;
            }
        };
        this.eventEmitter.on('speech:end', this.speechEndListener);


        super.speak(text, options); // Call BaseCharacter's speak method
    }

    /**
     * Mr. DNA explains a DNA concept with a specific animation.
     * @param {string} explanationText - The text of the explanation.
     */
    explainDnaConcept(explanationText) {
        if (!this.isVisible || !this.isActive) return;

        if (this.stateManager.get('debugMode')) {
            console.log(`${this.name} explaining DNA concept.`);
        }
        
        if (this.spriteAnimator) {
            this.spriteAnimator.playAnimation('explaining'); // Or a more specific animation
        }
        this.updateStatus('explaining');

        this.speak(explanationText, { interrupt: true });

        // Revert to idle after speech (already handled by the speak method's onend listener)
    }

    /**
     * Mr. DNA shows a double helix (triggers an animation).
     */
    showDoubleHelix() {
        if (!this.isVisible || !this.isActive) return;

        if (this.stateManager.get('debugMode')) {
            console.log(`${this.name} showing double helix animation.`);
        }
        this.updateStatus('action-helix');

        if (this.spriteAnimator && typeof this.spriteAnimator.playAnimation === 'function') {
            // Assuming 'doubleHelixReveal' is a defined animation key in MrDnaSpriteAnimator
            this.spriteAnimator.playAnimation('doubleHelixReveal');
        } else if (this.uiElement) {
            // Fallback to CSS class if sprite animator or specific animation is not available
            this.utils.addClass(this.uiElement, 'mr-dna-helix-animation');
            setTimeout(() => {
                if (this.uiElement) this.utils.removeClass(this.uiElement, 'mr-dna-helix-animation');
                if(this.isActive) this.updateStatus('idle'); // Revert if still active
            }, 3000); // Duration of CSS animation
        }
        this.eventEmitter.emit('playSound', { soundName: 'dna_reveal_sparkle', character: this.key });
    }


    /**
     * Updates Mr. DNA's visual status.
     * @param {string} status - 'idle', 'talking', 'explaining', 'action-helix'.
     */
    updateStatus(status) {
        super.updateStatus(status); // Adds generic class like .mr-dna-status-talking

        // Mr. DNA might not need further specific UI updates here if sprite animator handles states.
        // If sprite animator needs explicit state set:
        // if (this.spriteAnimator && typeof this.spriteAnimator.setState === 'function') {
        //    this.spriteAnimator.setState(status);
        // }
    }

    destroy() {
        if (this.speechEndListener) {
            this.eventEmitter.off('speech:end', this.speechEndListener);
            this.speechEndListener = null;
        }
        if (this.spriteAnimator && typeof this.spriteAnimator.destroy === 'function') {
            this.spriteAnimator.destroy();
        }
        super.destroy();
    }
}

// If not using ES modules:
// window.MrDnaCharacter = MrDnaCharacter;
