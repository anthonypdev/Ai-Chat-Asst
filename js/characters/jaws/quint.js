/**
 * Parkland AI - Opus Magnum Edition
 * QuintCharacter Class (Jaws Theme)
 *
 * Represents Quint, the shark hunter from the Jaws theme.
 * Extends BaseCharacter to provide Quint-specific behaviors, animations, and voice.
 */

class QuintCharacter extends BaseCharacter {
    /**
     * @param {StateManager} stateManager
     * @param {EventEmitter} eventEmitter
     * @param {ParklandUtils} utils
     */
    constructor(stateManager, eventEmitter, utils) {
        const quintConfig = {
            name: 'Quint',
            theme: 'jaws',
            uiElementSelector: '#quintCharacterUI', // Assumed ID for Quint's specific UI container
            systemPrompt: "You are Quint, a grizzled and fearless shark hunter from the movie Jaws. You speak with a gruff, weathered voice, often using nautical terms and sharing grim tales of the sea. You're pragmatic, superstitious, and have a dark sense of humor. Keep your responses direct, somewhat short, and infused with your unique personality. Don't shy away from a bit of fatalism or a boast about your shark-hunting prowess.",
            voiceConfig: {
                // Hints for VoiceSynthesis to find a suitable voice.
                // Actual voice selection depends on available system voices.
                voiceNameKeywords: ['male', 'english', 'david', 'george', 'daniel'], // Keywords to help find a gruff male voice
                lang: 'en-US', // Or en-GB, en-IE for a more specific accent if voices are available
                pitch: 0.7,  // Lower, gruff pitch (Range: 0.0 to 2.0)
                rate: 0.85,  // Slightly slower, deliberate speech (Range: 0.1 to 10.0)
                volume: 0.95 // Strong volume (Range: 0.0 to 1.0)
            },
            // Example spriteConfig if Quint had specific sprite animations
            // spriteConfig: {
            //     url: 'path/to/quint_spritesheet.png',
            //     frameCount: 10,
            //     frameWidth: 150,
            //     frameHeight: 200,
            //     speed: 150, // ms per frame
            //     animations: {
            //         idle: { frames: [0, 1, 2, 1], loop: true },
            //         harpoon: { frames: [3, 4, 5, 6], loop: false },
            //         singing: { frames: [7, 8, 9], loop: true }
            //     }
            // }
        };

        super('quint', quintConfig, stateManager, eventEmitter, utils);

        if (this.stateManager.get('debugMode')) {
            console.log(`QuintCharacter instantiated with config:`, quintConfig);
        }
    }

    /**
     * Quint-specific initialization.
     * Called after BaseCharacter's init.
     */
    init() {
        super.init(); // Call BaseCharacter's init
        if (this.uiElement) {
            // Add Quint-specific classes or setup if needed
            this.utils.addClass(this.uiElement, 'character-quint');
        }
        // Example: Preload Quint-specific assets if any (e.g., audio for shanty)
        // this.preloadShantyAudio();
    }

    /**
     * Activates Quint. Overrides BaseCharacter.activate for specific behaviors.
     */
    activate() {
        super.activate(); // Calls BaseCharacter's activate (shows UI, starts base idle)
        // Quint-specific activation logic, e.g., play an entrance sound or specific idle animation.
        this.eventEmitter.emit('playSound', { soundName: 'quint_entrance', character: this.key });
        this.startIdleAnimation(); // Ensure Quint's specific idle animation starts
    }

    /**
     * Deactivates Quint.
     */
    deactivate() {
        super.deactivate();
        // Quint-specific deactivation logic
    }

    /**
     * Quint's specific idle animation.
     * Overrides or extends BaseCharacter.startIdleAnimation.
     */
    startIdleAnimation() {
        // If using CSS animations, BaseCharacter's class adding might be enough.
        // super.startIdleAnimation();

        if (this.uiElement) {
             // Example: Add a class for a CSS-driven idle animation specific to Quint
            this.utils.addClass(this.uiElement, 'quint-idle-breathing'); // CSS class for subtle animation
            
            // If using sprite sheets and defined in spriteConfig:
            // if (this.spriteConfig && this.spriteConfig.animations && this.spriteConfig.animations.idle) {
            //     const idleAnim = this.spriteConfig.animations.idle;
            //     this._animateSprite(idleAnim.frames[0], idleAnim.frames[idleAnim.frames.length -1], idleAnim.loop);
            // }
        }
    }

    stopIdleAnimation() {
        // super.stopIdleAnimation();
        if (this.uiElement) {
            this.utils.removeClass(this.uiElement, 'quint-idle-breathing');
        }
    }

    /**
     * Triggers Quint's harpoon throw animation/action.
     */
    animateHarpoonThrow() {
        if (!this.isVisible || !this.isActive) return;

        if (this.stateManager.get('debugMode')) {
            console.log(`${this.name} is throwing a harpoon (simulated).`);
        }
        this.updateStatus('action-harpoon'); // Update visual status

        // Option 1: CSS Animation Trigger
        if (this.uiElement) {
            this.utils.addClass(this.uiElement, 'quint-harpoon-throw-animation'); // CSS handles this
            // Remove class after animation duration
            // Assuming animation duration is, e.g., 1.5s
            setTimeout(() => {
                if (this.uiElement) this.utils.removeClass(this.uiElement, 'quint-harpoon-throw-animation');
                this.updateStatus('idle'); // Revert status
            }, 1500);
        }

        // Option 2: Sprite Sheet Animation (if configured)
        // if (this.spriteConfig && this.spriteConfig.animations && this.spriteConfig.animations.harpoon) {
        //     const harpoonAnim = this.spriteConfig.animations.harpoon;
        //     this._animateSprite(harpoonAnim.frames[0], harpoonAnim.frames[harpoonAnim.frames.length - 1], harpoonAnim.loop, () => {
        //         this.updateStatus('idle'); // Revert status after animation
        //     });
        // }

        // Emit sound effect event
        this.eventEmitter.emit('playSound', { soundName: 'harpoon_throw', character: this.key });
    }

    /**
     * Triggers Quint to "sing" a shanty.
     * This might involve playing an audio clip and a visual animation.
     */
    singShanty() {
        if (!this.isVisible || !this.isActive) return;

        if (this.stateManager.get('debugMode')) {
            console.log(`${this.name} is singing a shanty (simulated).`);
        }
        this.updateStatus('action-singing');

        // Option 1: CSS Animation for singing
        if (this.uiElement) {
            this.utils.addClass(this.uiElement, 'quint-singing-animation');
        }

        // Play shanty audio clip
        this.eventEmitter.emit('playSound', {
            soundName: 'quint_shanty', // This sound needs to be defined in audio-processor.js
            character: this.key,
            loop: false, // Or true if it's a long background shanty
            onEndCallback: () => { // Callback when sound finishes
                if (this.uiElement) this.utils.removeClass(this.uiElement, 'quint-singing-animation');
                this.updateStatus('idle'); // Revert status
            }
        });

        // If no onEndCallback for sound, use a timeout based on shanty duration
        // setTimeout(() => {
        //     if (this.uiElement) this.utils.removeClass(this.uiElement, 'quint-singing-animation');
        //     this.updateStatus('idle');
        // }, 10000); // Example: 10 second shanty
    }

    /**
     * Custom speak method for Quint, perhaps to add a "Hmmph" or gruff sound before speaking.
     */
    speak(text, options = {}) {
        if (!this.isActive && !options.forceSpeakIfNotActive) {
            console.warn(`Quint is not active, cannot speak unless forced.`);
            return;
        }
        // Optional: Play a short "grunt" or "clearing throat" sound effect before speaking
        // this.eventEmitter.emit('playSound', { soundName: 'quint_grunt', character: this.key });

        // Add a slight delay if the sound effect plays
        // await this.utils.wait(300);

        super.speak(text, options); // Call BaseCharacter's speak method
    }

    /**
     * Updates Quint's visual status.
     * @param {string} status - The new status (e.g., 'idle', 'talking', 'listening', 'action-harpoon', 'action-singing').
     */
    updateStatus(status) {
        super.updateStatus(status); // Calls BaseCharacter's status update for general classes

        // Quint-specific status UI updates, if any beyond CSS classes
        if (this.uiElement) {
            // Example: if Quint has a pipe that glows when talking
            // const pipeElement = this.utils.$('.quint-pipe', this.uiElement);
            // if (pipeElement) {
            //     pipeElement.classList.toggle('glowing', status === 'talking' || status === 'action-singing');
            // }
        }
    }
}

// If not using ES modules:
// window.QuintCharacter = QuintCharacter;
