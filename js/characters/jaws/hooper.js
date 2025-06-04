/**
 * Parkland AI - Opus Magnum Edition
 * HooperCharacter Class (Jaws Theme)
 *
 * Represents Matt Hooper, the oceanographer from the Jaws theme.
 * Extends BaseCharacter to provide Hooper-specific behaviors, animations, and voice.
 */

class HooperCharacter extends BaseCharacter {
    /**
     * @param {StateManager} stateManager
     * @param {EventEmitter} eventEmitter
     * @param {ParklandUtils} utils
     */
    constructor(stateManager, eventEmitter, utils) {
        const hooperConfig = {
            name: 'Matt Hooper',
            theme: 'jaws',
            uiElementSelector: '#hooperCharacterUI', // Assumed ID for Hooper's specific UI container
            systemPrompt: "You are Matt Hooper, a brilliant and enthusiastic young oceanographer from the Woods Hole Oceanographic Institution. You are deeply knowledgeable about sharks and marine biology, often excited by new discoveries, even in dangerous situations. Speak with clarity, intelligence, and a touch of academic flair, but also with an adventurous spirit. You might use technical terms but should be able to explain them. You respect the power of nature but are driven by scientific curiosity.",
            voiceConfig: {
                // Hints for VoiceSynthesis
                voiceNameKeywords: ['male', 'american english', 'energetic', 'matthew'], // Standard, clear, somewhat youthful male voice
                lang: 'en-US',
                pitch: 1.05, // Slightly higher, reflecting enthusiasm (Range: 0.0 to 2.0)
                rate: 1.1,   // Slightly faster, keen speech (Range: 0.1 to 10.0)
                volume: 0.9
            },
            // spriteConfig: { // Example if Hooper had specific sprite animations
            //     url: 'path/to/hooper_spritesheet.png',
            //     frameCount: 9,
            //     frameWidth: 130,
            //     frameHeight: 190,
            //     speed: 160,
            //     animations: {
            //         idle: { frames: [0, 1], loop: true },
            //         explaining: { frames: [2, 3, 4], loop: true },
            //         excited: { frames: [5, 6], loop: false },
            //         inCage: { frames: [7, 8], loop: false }
            //     }
            // }
        };

        super('hooper', hooperConfig, stateManager, eventEmitter, utils);

        if (this.stateManager.get('debugMode')) {
            console.log(`HooperCharacter instantiated with config:`, hooperConfig);
        }
    }

    /**
     * Hooper-specific initialization.
     */
    init() {
        super.init();
        if (this.uiElement) {
            this.utils.addClass(this.uiElement, 'character-hooper');
        }
    }

    /**
     * Activates Hooper.
     */
    activate() {
        super.activate();
        this.eventEmitter.emit('playSound', { soundName: 'hooper_excited_hmm', character: this.key });
        this.startIdleAnimation();
    }

    /**
     * Deactivates Hooper.
     */
    deactivate() {
        super.deactivate();
    }

    /**
     * Hooper's specific idle animation.
     */
    startIdleAnimation() {
        // super.startIdleAnimation();
        if (this.uiElement) {
            this.utils.addClass(this.uiElement, 'hooper-idle-observing'); // CSS class for subtle animation
            // Example: If using sprite sheet for idle
            // if (this.spriteConfig && this.spriteConfig.animations && this.spriteConfig.animations.idle) {
            //     const idleAnim = this.spriteConfig.animations.idle;
            //     this._animateSprite(idleAnim.frames[0], idleAnim.frames[idleAnim.frames.length -1], idleAnim.loop);
            // }
        }
    }

    stopIdleAnimation() {
        // super.stopIdleAnimation();
        if (this.uiElement) {
            this.utils.removeClass(this.uiElement, 'hooper-idle-observing');
        }
    }

    /**
     * Hooper shows or discusses the shark cage.
     */
    showSharkCage() {
        if (!this.isVisible || !this.isActive) return;

        if (this.stateManager.get('debugMode')) {
            console.log(`${this.name} is discussing/showing the anti-shark cage.`);
        }
        this.updateStatus('action-cage'); // e.g., .hooper-status-action-cage

        // Trigger animation related to the cage (e.g., pointing, or an overlay of a cage diagram)
        if (this.uiElement) {
            this.utils.addClass(this.uiElement, 'hooper-cage-animation');
            // Remove class after animation duration (e.g., 3s)
            setTimeout(() => {
                if (this.uiElement) this.utils.removeClass(this.uiElement, 'hooper-cage-animation');
                this.updateStatus('idle');
            }, 3000);
        }

        this.speak("This anti-shark cage is self-propelled. With a little luck, I'll get him with this hypo-lance. Once the pyloric sphincter relaxes, the poison will shoot directly into the shark's bloodstream.", { interrupt: true });
        this.eventEmitter.emit('playSound', { soundName: 'metal_clank_subtle', character: this.key });
    }

    /**
     * Hooper explains a scientific concept.
     * @param {string} [concept="the shark's predatory behavior"] - The concept to explain.
     */
    explainScientificConcept(concept = "the shark's predatory behavior") {
        if (!this.isVisible || !this.isActive) return;

        if (this.stateManager.get('debugMode')) {
            console.log(`${this.name} is explaining: ${concept}`);
        }
        this.updateStatus('action-explaining');

        // Trigger "explaining" or "gesturing" animation
        if (this.uiElement) {
            this.utils.addClass(this.uiElement, 'hooper-explaining-animation');
        }

        // The actual explanation text would ideally come from an AI response
        // triggered by a user query. This method would be called after getting that text.
        // For a canned explanation:
        this.speak(`Fascinating! Now, regarding ${concept}, what we're observing here is a classic example of... well, let me break it down. The patterns suggest a territorial animal, but its feeding habits are atypical...`, { interrupt: true });

        // Clear animation after a delay
        setTimeout(() => {
            if (this.uiElement) this.utils.removeClass(this.uiElement, 'hooper-explaining-animation');
            this.updateStatus('idle');
        }, 5000); // Duration of explanation animation
    }

    /**
     * Hooper shows excitement about a finding.
     */
    showExcitement(finding = "a significant discovery") {
        if (!this.isVisible || !this.isActive) return;
        this.updateStatus('action-excited');
        if (this.uiElement) {
            this.utils.addClass(this.uiElement, 'hooper-excited-animation');
            setTimeout(() => {
                if (this.uiElement) this.utils.removeClass(this.uiElement, 'hooper-excited-animation');
                this.updateStatus('idle');
            }, 2000);
        }
        this.speak(`This is incredible! This changes everything! We've made ${finding}!`, { interrupt: true });
        this.eventEmitter.emit('playSound', { soundName: 'hooper_discovery_chime', character: this.key });
    }


    /**
     * Custom speak method for Hooper.
     */
    speak(text, options = {}) {
        if (!this.isActive && !options.forceSpeakIfNotActive) return;
        // Hooper's voice config is already applied by VoiceSynthesis via characterKey
        super.speak(text, options);
    }

    /**
     * Updates Hooper's visual status.
     * @param {string} status - The new status (e.g., 'idle', 'talking', 'action-explaining').
     */
    updateStatus(status) {
        super.updateStatus(status);
        // Hooper-specific status UI updates
        // const glassesElement = this.utils.$('.hooper-glasses', this.uiElement);
        // if(glassesElement) {
        //    glassesElement.classList.toggle('reflecting', status === 'action-explaining');
        // }
    }
}

// If not using ES modules:
// window.HooperCharacter = HooperCharacter;
