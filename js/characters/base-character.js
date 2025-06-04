/**
 * Parkland AI - Opus Magnum Edition
 * BaseCharacter Class
 *
 * Provides a foundational class for all interactive characters in the application.
 * Handles common functionalities like activation, deactivation, basic UI interaction,
 * and serves as a blueprint for specific character implementations.
 */

class BaseCharacter {
    /**
     * @param {string} key - Unique identifier for the character (e.g., 'quint', 'mr-dna').
     * @param {Object} config - Character-specific configuration.
     * Expected properties: name, theme, systemPrompt, voiceConfig, uiElementSelector (CSS selector for the main UI).
     * @param {StateManager} stateManager - Instance of StateManager.
     * @param {EventEmitter} eventEmitter - Instance of EventEmitter.
     * @param {ParklandUtils} utils - Instance of ParklandUtils.
     */
    constructor(key, config = {}, stateManager, eventEmitter, utils) {
        if (!key || typeof key !== 'string') {
            throw new Error("BaseCharacter: 'key' is required and must be a string.");
        }
        if (!config || typeof config !== 'object') {
            throw new Error("BaseCharacter: 'config' object is required.");
        }
        if (!stateManager || !eventEmitter || !utils) {
            throw new Error("BaseCharacter: StateManager, EventEmitter, and Utils instances are required.");
        }

        this.key = key;
        this.name = config.name || key.charAt(0).toUpperCase() + key.slice(1);
        this.theme = config.theme || null; // Theme this character primarily belongs to
        this.systemPrompt = config.systemPrompt || `You are ${this.name}.`;
        this.voiceConfig = config.voiceConfig || {}; // For pitch, rate, volume, voiceName hints
        this.uiElementSelector = config.uiElementSelector || null; // CSS selector for the character's main UI container
        this.uiElement = null; // Will be populated in init()

        this.stateManager = stateManager;
        this.eventEmitter = eventEmitter;
        this.utils = utils;

        this.isActive = false; // Is this character currently the primary interactive one?
        this.isVisible = false; // Is the character's UI currently visible?

        // For sprite sheet animations if used by subclasses
        this.spriteSheet = null; // URL to sprite sheet
        this.frameCount = 1;   // Total frames in the sprite sheet
        this.frameWidth = 0;   // Width of a single frame
        this.frameHeight = 0;  // Height of a single frame
        this.currentFrame = 0;
        this.animationInterval = null;
        this.animationSpeed = 100; // Milliseconds per frame

        if (config.spriteConfig) {
            this.spriteSheet = config.spriteConfig.url;
            this.frameCount = config.spriteConfig.frameCount || 1;
            this.frameWidth = config.spriteConfig.frameWidth || 0;
            this.frameHeight = config.spriteConfig.frameHeight || 0;
            this.animationSpeed = config.spriteConfig.speed || 100;
        }

        // Initial setup
        this.init();
    }

    /**
     * Initializes the character. Selects UI element.
     * Called by the constructor. Subclasses can extend this.
     */
    init() {
        if (this.uiElementSelector) {
            this.uiElement = this.utils.$(this.uiElementSelector);
            if (!this.uiElement) {
                console.warn(`BaseCharacter '${this.key}': UI element with selector "${this.uiElementSelector}" not found.`);
            } else {
                // Ensure base styling for visibility control
                this.utils.addClass(this.uiElement, 'character-base-ui');
                this.utils.addClass(this.uiElement, 'hidden'); // Start hidden
            }
        }
        if (this.stateManager.get('debugMode')) {
            console.log(`Character "${this.name}" (key: ${this.key}) initialized.`);
        }
    }

    /**
     * Activates the character.
     * This typically means making it the primary interacting character,
     * showing its UI, and starting idle animations.
     */
    activate() {
        this.isActive = true;
        this.show();
        this.startIdleAnimation();
        this.eventEmitter.emit('character:activated', { characterKey: this.key, character: this });
        if (this.stateManager.get('debugMode')) {
            console.log(`Character "${this.name}" activated.`);
        }
    }

    /**
     * Deactivates the character.
     * Hides UI, stops animations.
     */
    deactivate() {
        this.isActive = false;
        this.hide();
        this.stopIdleAnimation();
        this.eventEmitter.emit('character:deactivated', { characterKey: this.key, character: this });
        if (this.stateManager.get('debugMode')) {
            console.log(`Character "${this.name}" deactivated.`);
        }
    }

    /**
     * Makes the character's UI visible.
     */
    show() {
        if (this.uiElement) {
            this.utils.removeClass(this.uiElement, 'hidden');
            // Could add an 'entering' class for animation
            this.utils.addClass(this.uiElement, 'character-visible');
            this.isVisible = true;
        }
    }

    /**
     * Hides the character's UI.
     */
    hide() {
        if (this.uiElement) {
            this.utils.removeClass(this.uiElement, 'character-visible');
            // Could add an 'exiting' class for animation
            this.utils.addClass(this.uiElement, 'hidden');
            this.isVisible = false;
        }
    }

    /**
     * Makes the character speak the given text.
     * This base implementation emits an event for VoiceSynthesis module to handle.
     * Subclasses might override this for more direct control or pre/post speech actions.
     * @param {string} text - The text for the character to speak.
     * @param {Object} [options={}] - Optional parameters for speech synthesis.
     */
    speak(text, options = {}) {
        if (!text || typeof text !== 'string') {
            console.warn(`Character "${this.name}": No text provided to speak.`);
            return;
        }
        this.eventEmitter.emit('character:speakRequested', {
            characterKey: this.key,
            text: text,
            voiceConfig: this.voiceConfig, // Pass character's preferred voice config
            options: options // Pass through any additional TTS options
        });

        // Update UI to show speaking state (subclass might do more specific animation)
        this.updateStatus('speaking');
        // VoiceSynthesis module will emit speech:end, which can be used to revert status
    }

    /**
     * Starts the character's idle animation.
     * Base implementation might add a CSS class. Subclasses can override for specific animations.
     */
    startIdleAnimation() {
        if (this.uiElement) {
            this.utils.addClass(this.uiElement, `${this.key}-idle-animation`); // e.g., quint-idle-animation
            // If using sprite sheet for idle:
            if (this.spriteSheet && this.frameCount > 1 && this.uiElement && this.frameWidth > 0) {
                // Assuming the idle animation is the first row of the sprite sheet or specific frames.
                // This needs a more defined spriteConfig (e.g., idle: { frames: [0,1,2], loop: true })
                // For now, a simple continuous loop if frameCount > 1
                // this._animateSpriteLoop(0, this.frameCount -1); // Example: loop all frames
            }
        }
    }

    /**
     * Stops the character's idle animation.
     */
    stopIdleAnimation() {
        if (this.uiElement) {
            this.utils.removeClass(this.uiElement, `${this.key}-idle-animation`);
            if (this.animationInterval) {
                clearInterval(this.animationInterval);
                this.animationInterval = null;
            }
        }
    }

    /**
     * Updates the character's visual status (e.g., 'listening', 'speaking', 'error').
     * Base implementation might add/remove CSS classes.
     * @param {string} status - The new status.
     */
    updateStatus(status) {
        if (this.uiElement) {
            // Remove previous status classes
            ['listening', 'speaking', 'thinking', 'error'].forEach(s => {
                this.utils.removeClass(this.uiElement, `${this.key}-status-${s}`);
            });
            // Add new status class
            if (status) {
                this.utils.addClass(this.uiElement, `${this.key}-status-${status}`);
            }
        }
        if (this.stateManager.get('debugMode')) {
            console.log(`Character "${this.name}" status updated to: ${status}`);
        }
    }


    /**
     * Basic sprite sheet animation method.
     * Assumes this.uiElement has its background-image set to this.spriteSheet.
     * And this.frameWidth, this.frameHeight are set.
     * This is a simple example and might need refinement based on specific needs.
     * @param {number} startFrame - The starting frame index.
     * @param {number} endFrame - The ending frame index.
     * @param {boolean} loop - Whether the animation should loop.
     * @param {Function} [onComplete] - Callback when animation (if not looping) completes.
     * @protected
     */
    _animateSprite(startFrame, endFrame, loop = false, onComplete = null) {
        if (!this.uiElement || !this.spriteSheet || this.frameWidth === 0 || this.frameHeight === 0) return;
        if (this.animationInterval) clearInterval(this.animationInterval);

        this.currentFrame = startFrame;
        this.uiElement.style.backgroundPosition = `-${this.currentFrame * this.frameWidth}px 0px`; // Assuming horizontal sprite sheet

        this.animationInterval = setInterval(() => {
            this.currentFrame++;
            if (this.currentFrame > endFrame) {
                if (loop) {
                    this.currentFrame = startFrame;
                } else {
                    clearInterval(this.animationInterval);
                    this.animationInterval = null;
                    if (typeof onComplete === 'function') {
                        onComplete();
                    }
                    return;
                }
            }
            // Update backgroundPosition to show the current frame
            // This assumes a horizontal sprite sheet. Adjust if vertical or grid.
            // Example: if sprite sheet is arranged in columns, you'd also adjust backgroundPosition Y.
            const xOffset = (this.currentFrame % (this.spriteSheetWidth / this.frameWidth)) * this.frameWidth;
            const yOffset = Math.floor(this.currentFrame / (this.spriteSheetWidth / this.frameWidth)) * this.frameHeight;

            // This needs `this.spriteSheetWidth` to be defined or calculated.
            // For simple horizontal strip:
            this.uiElement.style.backgroundPosition = `-${this.currentFrame * this.frameWidth}px 0px`;

        }, this.animationSpeed);
    }

    /**
     * Placeholder for interaction, e.g., when character is clicked.
     */
    interact() {
        if (this.stateManager.get('debugMode')) {
            console.log(`Character "${this.name}" interacted with.`);
        }
        this.eventEmitter.emit('character:interacted', { characterKey: this.key, character: this });
        // Could trigger a specific animation or sound effect
    }

    /**
     * Cleans up resources if the character is being removed.
     */
    destroy() {
        this.stopIdleAnimation();
        if (this.uiElement && this.uiElement.parentNode) {
            // this.uiElement.parentNode.removeChild(this.uiElement); // Let ThemeManager/DOM manager handle removal
        }
        if (this.stateManager.get('debugMode')) {
            console.log(`Character "${this.name}" destroyed.`);
        }
    }
}

// If not using ES modules:
// window.BaseCharacter = BaseCharacter;
