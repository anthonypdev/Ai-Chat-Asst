/**
 * Parkland AI - Opus Magnum Edition
 * MrDnaCharacter Class (Jurassic Park Theme)
 *
 * Represents the Mr. DNA animated character from Jurassic Park.
 * Extends BaseCharacter and integrates with MrDnaSpriteAnimator for visuals.
 */

class MrDnaCharacter extends BaseCharacter { // Correct class definition
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
                voiceNameKeywords: ['male', 'american english', 'friendly', 'cartoon', 'daniel'], // Hints
                lang: 'en-US',
                pitch: 1.25, // Higher, friendly, slightly cartoonish
                rate: 1.15,  // Upbeat and quick
                volume: 0.9
            },
            // spriteConfig is handled by instantiating MrDnaSpriteAnimator below
        };

        super('mr-dna', mrDnaConfig, stateManager, eventEmitter, utils); // Correct key 'mr-dna'

        this.spriteAnimator = null;
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
            this.utils.addClass(this.uiElement, 'character-mr-dna');
            try {
                if (typeof MrDnaSpriteAnimator === 'function') {
                    const spriteCanvasElement = this.utils.$('.mr-dna-canvas', this.uiElement);
                    if (spriteCanvasElement) {
                        // Configuration for MrDnaSpriteAnimator can be defined here or passed from a central config
                        const animatorConfig = {
                            spriteSheetUrl: 'img/characters/jurassic/mr_dna_sprite_sheet.png', // Ensure this path is correct
                            frameWidth: 100,  // Example, adjust to actual sprite dimensions
                            frameHeight: 150, // Example, adjust
                            framesPerRow: 5,  // Example
                            defaultSpeed: 120, // ms per frame
                            animations: {
                                'idle': { frames: [0, 1, 2, 3, 2, 1], speed: 200, loop: true },
                                'talking': { frames: [4, 5, 6, 7, 6, 5], speed: 150, loop: true },
                                'explaining': { frames: [8, 9, 10, 11, 10, 9], speed: 180, loop: true },
                                'wave': { frames: [12, 13, 14, 13, 12], speed: 160, loop: false, next: 'idle' }, // Example 'next'
                                'doubleHelixReveal': { frames: [15, 16, 17, 18, 19], speed: 120, loop: false, next: 'idle' }
                            }
                        };
                        this.spriteAnimator = new MrDnaSpriteAnimator(spriteCanvasElement, this.utils, animatorConfig);
                        this.spriteAnimator.init()
                            .then(() => {
                                if (this.stateManager.get('debugMode')) {
                                    console.log("Mr. DNA Sprite Animator initialized and sprite loaded.");
                                }
                                if (this.isActive && this.isVisible) { // If activated before sprite loaded
                                    this.startIdleAnimation();
                                }
                            })
                            .catch(error => {
                                console.error("MrDnaCharacter: Error initializing MrDnaSpriteAnimator's sprite sheet:", error);
                            });
                    } else {
                        console.warn("MrDnaCharacter: Canvas element '.mr-dna-canvas' for sprite animator not found within", this.uiElementSelector);
                    }
                } else {
                    console.warn("MrDnaCharacter: MrDnaSpriteAnimator class not found. Ensure 'mr-dna-sprite.js' is loaded before this character.");
                }
            } catch (error) {
                console.error("MrDnaCharacter: Error during sprite animator setup:", error);
            }
        }
    }

    activate() {
        super.activate();
        if (this.spriteAnimator && this.spriteAnimator._isLoaded) {
            this.spriteAnimator.playAnimation('idle');
        } else if (this.spriteAnimator && !this.spriteAnimator._isLoaded) {
            // If sprite isn't loaded yet, init() will call playAnimation('idle') once loaded if character is active.
            console.warn("MrDnaCharacter: activate called but sprite not yet loaded. Idle will start on load.");
        }
        this.eventEmitter.emit('playSound', { soundName: 'mr_dna_hello', character: this.key });
    }

    deactivate() {
        super.deactivate();
        if (this.spriteAnimator) {
            this.spriteAnimator.stopAnimation();
        }
    }

    startIdleAnimation() {
        if (this.spriteAnimator && this.isVisible && this.spriteAnimator._isLoaded) {
            this.spriteAnimator.playAnimation('idle');
        }
    }

    stopIdleAnimation() {
        if (this.spriteAnimator) {
            // Only stop if current animation is idle, or let playAnimation handle switching
            if (this.spriteAnimator.getCurrentAnimationName() === 'idle') {
                 //this.spriteAnimator.stopAnimation(); // Or let it be overridden by next animation
            }
        }
    }

    speak(text, options = {}) {
        if (!this.isActive && !options.forceSpeakIfNotActive) {
            // console.warn("Mr. DNA is not active, cannot speak unless forced.");
            return;
        }

        if (this.spriteAnimator && this.spriteAnimator._isLoaded) {
            this.spriteAnimator.playAnimation('talking');
        }
        this.updateStatus('talking');

        if (this.speechEndListener) {
            this.eventEmitter.off('speech:end', this.speechEndListener);
        }
        this.speechEndListener = ({ characterKey }) => {
            if (characterKey === this.key) {
                if (this.spriteAnimator && this.isActive && this.spriteAnimator._isLoaded) {
                    // Only revert to idle if the current animation is still 'talking'
                    // Avoids interrupting a different, deliberately played animation.
                    if (this.spriteAnimator.getCurrentAnimationName() === 'talking') {
                        this.spriteAnimator.playAnimation('idle');
                    }
                }
                this.updateStatus('idle'); // Base status update
                this.eventEmitter.off('speech:end', this.speechEndListener);
                this.speechEndListener = null;
            }
        };
        this.eventEmitter.on('speech:end', this.speechEndListener);

        super.speak(text, options);
    }

    explainDnaConcept(explanationText) {
        if (!this.isVisible || !this.isActive) return;
        if (this.stateManager.get('debugMode')) console.log(`${this.name} explaining DNA concept.`);
        
        if (this.spriteAnimator && this.spriteAnimator._isLoaded) {
            this.spriteAnimator.playAnimation('explaining');
        }
        this.updateStatus('explaining');
        this.speak(explanationText, { interrupt: true });
        // Speech end listener in speak() will revert to idle animation and status.
    }

    showDoubleHelix() {
        if (!this.isVisible || !this.isActive) return;
        if (this.stateManager.get('debugMode')) console.log(`${this.name} showing double helix animation.`);
        
        if (this.spriteAnimator && this.spriteAnimator._isLoaded && this.config.animations.doubleHelixReveal) {
            this.spriteAnimator.playAnimation('doubleHelixReveal');
            this.updateStatus('action-helix'); // A custom status for this action
        } else if (this.uiElement) { // Fallback CSS animation
            this.utils.addClass(this.uiElement, 'mr-dna-helix-css-animation'); // Define this class in CSS
            this.updateStatus('action-helix');
            setTimeout(() => {
                if (this.uiElement) this.utils.removeClass(this.uiElement, 'mr-dna-helix-css-animation');
                if(this.isActive) this.updateStatus('idle');
            }, 3000);
        }
        this.eventEmitter.emit('playSound', { soundName: 'dna_reveal_sparkle', character: this.key });
    }

    updateStatus(status) {
        super.updateStatus(status);
        // No further Mr. DNA specific UI updates here if sprite handles all visual states.
        // If sprite animator doesn't loop 'talking' or 'explaining' and needs to revert to 'idle':
        // This is now handled by the speech:end listener in the speak() method for 'talking',
        // and could be added similarly for 'explaining' if it's tied to speech length.
    }

    destroy() {
        if (this.speechEndListener) {
            this.eventEmitter.off('speech:end', this.speechEndListener);
        }
        if (this.spriteAnimator && typeof this.spriteAnimator.destroy === 'function') {
            this.spriteAnimator.destroy();
        }
        super.destroy();
    }
}

// If not using ES modules:
// window.MrDnaCharacter = MrDnaCharacter;
