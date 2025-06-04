/**
 * Parkland AI - Opus Magnum Edition
 * BrodyCharacter Class (Jaws Theme)
 *
 * Represents Police Chief Martin Brody from the Jaws theme.
 * Extends BaseCharacter to provide Brody-specific behaviors, animations, and voice.
 */

class BrodyCharacter extends BaseCharacter {
    /**
     * @param {StateManager} stateManager
     * @param {EventEmitter} eventEmitter
     * @param {ParklandUtils} utils
     */
    constructor(stateManager, eventEmitter, utils) {
        const brodyConfig = {
            name: 'Chief Brody',
            theme: 'jaws',
            uiElementSelector: '#brodyCharacterUI', // Assumed ID for Brody's specific UI container
            systemPrompt: "You are Police Chief Martin Brody of Amity Island. You are a dedicated public servant, though somewhat out of your depth with the current shark crisis. You are pragmatic, concerned for public safety, and a family man. You often express worry or a dry, stressed sense of humor. You are responsible and trying your best to handle an overwhelming situation. You're not a fan of the water. Keep responses clear, concerned, and grounded.",
            voiceConfig: {
                // VoiceSynthesis will try to find a suitable voice.
                // These are hints.
                voiceNameKeywords: ['male', 'american english', 'david', 'mark'], // Standard male American voice
                lang: 'en-US',
                pitch: 1.0,  // Standard pitch
                rate: 0.95, // Slightly cautious/deliberate speech
                volume: 0.9
            },
            // spriteConfig: { // Example if Brody had specific sprite animations
            //     url: 'path/to/brody_spritesheet.png',
            //     frameCount: 8,
            //     frameWidth: 120,
            //     frameHeight: 180,
            //     speed: 180,
            //     animations: {
            //         idle: { frames: [0, 1], loop: true },
            //         worried: { frames: [2, 3], loop: false },
            //         onRadio: { frames: [4, 5], loop: true }
            //     }
            // }
        };

        super('brody', brodyConfig, stateManager, eventEmitter, utils);

        if (this.stateManager.get('debugMode')) {
            console.log(`BrodyCharacter instantiated with config:`, brodyConfig);
        }
    }

    /**
     * Brody-specific initialization.
     */
    init() {
        super.init();
        if (this.uiElement) {
            this.utils.addClass(this.uiElement, 'character-brody');
        }
    }

    /**
     * Activates Brody.
     */
    activate() {
        super.activate();
        this.eventEmitter.emit('playSound', { soundName: 'brody_sigh', character: this.key }); // Example entrance sound
        this.startIdleAnimation();
    }

    /**
     * Deactivates Brody.
     */
    deactivate() {
        super.deactivate();
    }

    /**
     * Brody's specific idle animation.
     */
    startIdleAnimation() {
        // super.startIdleAnimation(); // If BaseCharacter has a generic idle class to add
        if (this.uiElement) {
            this.utils.addClass(this.uiElement, 'brody-idle-lookout'); // CSS class for subtle animation
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
            this.utils.removeClass(this.uiElement, 'brody-idle-lookout');
        }
    }

    /**
     * Brody reacts to a shark sighting.
     * This could involve an animation, a specific line of dialogue, or emitting an event.
     */
    reactToSharkSighting(details = "It's a big one!") {
        if (!this.isVisible || !this.isActive) return;

        if (this.stateManager.get('debugMode')) {
            console.log(`${this.name} reacting to shark sighting: ${details}`);
        }
        this.updateStatus('action-sighting'); // e.g., .brody-status-action-sighting

        // Trigger a specific "worried" or "alert" animation
        if (this.uiElement) {
            this.utils.addClass(this.uiElement, 'brody-worried-animation');
            setTimeout(() => {
                if (this.uiElement) this.utils.removeClass(this.uiElement, 'brody-worried-animation');
                this.updateStatus('idle'); // Revert status after a bit
            }, 2500); // Duration of the worried animation
        }

        // Speak a characteristic line
        const lines = [
            "You're gonna need a bigger boat.",
            "That's a twenty footer... Twenty-five. Three tons of him.",
            "Is it true that most people get attacked by sharks in three feet of water?",
            "I can do anything; I'm the Chief of Police.",
            `Shark Sighting! ${details}`
        ];
        const lineToSpeak = lines[Math.floor(Math.random() * lines.length)];
        this.speak(lineToSpeak, { interrupt: true }); // Interrupt current speech if any

        // Emit an event for other systems (e.g., theme effects)
        this.eventEmitter.emit('jaws:sharkSighting', { character: this.key, details: details });
        this.eventEmitter.emit('playSound', { soundName: 'alarm_urgent', character: this.key });
    }

    /**
     * Brody calls for backup on the radio.
     */
    callForBackup(reason = "We've got a shark here, a big one!") {
        if (!this.isVisible || !this.isActive) return;

        if (this.stateManager.get('debugMode')) {
            console.log(`${this.name} calling for backup: ${reason}`);
        }
        this.updateStatus('action-radio');

        // Trigger radio animation
        if (this.uiElement) {
            this.utils.addClass(this.uiElement, 'brody-radio-animation');
        }

        this.speak(`Amity Point L.S. to dispatch, come in dispatch. We have a shark problem. ${reason}. Need backup immediately! Over.`, { interrupt: true });
        this.eventEmitter.emit('playSound', { soundName: 'radio_static_start', character: this.key });

        // Simulate radio call duration
        setTimeout(() => {
            if (this.uiElement) this.utils.removeClass(this.uiElement, 'brody-radio-animation');
            this.updateStatus('idle');
            this.eventEmitter.emit('playSound', { soundName: 'radio_static_end', character: this.key });
        }, 4000); // Duration of the radio call simulation
    }

    /**
     * Custom speak method for Brody, perhaps with a slight nervous stammer effect.
     */
    speak(text, options = {}) {
        if (!this.isActive && !options.forceSpeakIfNotActive) return;

        // Maybe a slightly more hesitant rate or subtle pitch variation if desired via options
        // For now, just using the voiceConfig set for Brody.
        super.speak(text, options);
    }

    /**
     * Updates Brody's visual status.
     * @param {string} status - The new status (e.g., 'idle', 'talking', 'action-sighting', 'action-radio').
     */
    updateStatus(status) {
        super.updateStatus(status); // Calls BaseCharacter's status update

        // Brody-specific status UI updates, if any beyond CSS classes
        // For example, if Brody had a specific facial expression element to change:
        // const faceElement = this.utils.$('.brody-face', this.uiElement);
        // if (faceElement) {
        //   faceElement.setAttribute('data-expression', status);
        // }
    }
}

// If not using ES modules:
// window.BrodyCharacter = BrodyCharacter;
