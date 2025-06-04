/**
 * Parkland AI - Opus Magnum Edition
 * MuldoonCharacter Class (Jurassic Park Theme)
 *
 * Represents Robert Muldoon, the game warden from the Jurassic Park theme.
 * Extends BaseCharacter to provide Muldoon-specific behaviors, primarily interacting
 * with his walkie-talkie UI.
 */

class MuldoonCharacter extends BaseCharacter {
    /**
     * @param {StateManager} stateManager
     * @param {EventEmitter} eventEmitter
     * @param {ParklandUtils} utils
     */
    constructor(stateManager, eventEmitter, utils) {
        const muldoonConfig = {
            name: 'Robert Muldoon',
            theme: 'jurassic',
            uiElementSelector: '.muldoon-walkie-container', // Selector for the walkie-talkie UI
            systemPrompt: "You are Robert Muldoon, the game warden of Jurassic Park. You are experienced, pragmatic, and have a deep understanding of animal behavior, especially predators. You are cautious and speak with a measured, authoritative tone, often with a British or South African inflection. You respect the dinosaurs but are acutely aware of their danger. Your priority is safety and containment. 'Shoot her! Shoooooot heeeer!'",
            voiceConfig: {
                voiceNameKeywords: ['male', 'english', 'daniel', 'oliver'], // Hints for a British/Commonwealth accent
                lang: 'en-GB', // Preferred language for accent
                pitch: 0.9,  // Slightly lower, authoritative
                rate: 0.9,   // Calm, measured pace
                volume: 0.95
            },
            // No spriteConfig typically for Muldoon if his UI is just the walkie-talkie
        };

        super('muldoon', muldoonConfig, stateManager, eventEmitter, utils);

        // References to walkie-talkie specific parts if needed for direct manipulation
        this.walkieLedElement = null;
        this.staticBarsContainer = null; // Container for .static-bar elements

        if (this.stateManager.get('debugMode')) {
            console.log(`MuldoonCharacter instantiated with config:`, muldoonConfig);
        }
    }

    /**
     * Muldoon-specific initialization.
     */
    init() {
        super.init(); // Calls BaseCharacter's init (finds this.uiElement)
        if (this.uiElement) {
            this.utils.addClass(this.uiElement, 'character-muldoon');
            // Find specific parts of the walkie-talkie if this class manipulates them directly
            // These selectors are based on the structure in jurassic/characters.css
            this.walkieLedElement = this.utils.$('.walkie-led', this.uiElement.parentElement); // Assuming .walkie-body is sibling or parent
            this.staticBarsContainer = this.utils.$('.static-bars', this.uiElement.parentElement);

             if (!this.walkieLedElement) console.warn("MuldoonCharacter: Walkie LED element not found.");
             if (!this.staticBarsContainer) console.warn("MuldoonCharacter: Static bars container not found.");
        }
    }

    /**
     * Activates Muldoon. Makes his walkie-talkie UI appear.
     */
    activate() {
        super.activate(); // BaseCharacter show() handles visibility of this.uiElement
        this.eventEmitter.emit('playSound', { soundName: 'walkie_crackle_on', character: this.key });
        this._updateWalkieLed('idle'); // Set LED to idle/standby
        this.startIdleAnimation();
    }

    /**
     * Deactivates Muldoon. Hides walkie-talkie UI.
     */
    deactivate() {
        super.deactivate();
        this._updateWalkieLed('off');
        this._showStaticVisualization(false);
    }

    /**
     * Muldoon's specific idle animation (e.g., subtle sway of antenna if not CSS).
     */
    startIdleAnimation() {
        // The antenna sway is CSS-driven by default via .walkie-antenna in jurassic/characters.css
        // If more complex JS-driven idle is needed, implement here.
        // For now, relying on CSS for the walkie-talkie's idle appearance.
        if (this.uiElement) {
            // BaseCharacter might add a generic class, or we can add a Muldoon-specific one
            // this.utils.addClass(this.uiElement, 'muldoon-idle');
        }
    }

    stopIdleAnimation() {
        // if (this.uiElement) {
        //     this.utils.removeClass(this.uiElement, 'muldoon-idle');
        // }
    }

    /**
     * Muldoon reports status over the radio.
     * @param {string} statusMessage - The message to report.
     */
    reportStatus(statusMessage = "Sector clear... for now.") {
        if (!this.isVisible || !this.isActive) return;

        if (this.stateManager.get('debugMode')) {
            console.log(`${this.name} reporting status: ${statusMessage}`);
        }
        this.updateStatus('transmitting'); // Updates LED and static viz via CSS potentially

        this.eventEmitter.emit('playSound', { soundName: 'walkie_static_short_start', character: this.key });
        this.speak(statusMessage, { interrupt: true });

        // Simulate end of transmission after speech
        // The 'speech:end' event from VoiceSynthesis can be used for this.
        const onSpeechEnd = () => {
            this.updateStatus('idle');
            this.eventEmitter.emit('playSound', { soundName: 'walkie_static_short_end', character: this.key });
            this.eventEmitter.off(`speech:end`, onSpeechEndCallback); // Unsubscribe
        };
        const onSpeechEndCallback = ({ characterKey }) => { // Ensure it's for this character
            if (characterKey === this.key) {
                onSpeechEnd();
            }
        };
        this.eventEmitter.on(`speech:end`, onSpeechEndCallback);
    }

    /**
     * Muldoon issues a warning about raptors.
     * @param {string} [warningDetails="They're testing the fences... systematically."] - Specific details of the warning.
     */
    warnAboutRaptors(warningDetails = "They remember.") {
        if (!this.isVisible || !this.isActive) return;

        if (this.stateManager.get('debugMode')) {
            console.log(`${this.name} warning about raptors: ${warningDetails}`);
        }
        this.updateStatus('transmitting-urgent'); // Potentially a different LED color or pulse

        const fullWarning = `This is Muldoon. We have a situation with the velociraptors. ${warningDetails} Exercise extreme caution. I repeat, extreme caution.`;
        this.eventEmitter.emit('playSound', { soundName: 'walkie_alert_start', character: this.key });
        this.speak(fullWarning, { interrupt: true });

        // Emit a game-wide event that raptors are a threat
        this.eventEmitter.emit('jurassic:raptorAlert', { level: 'high', details: warningDetails });

        const onSpeechEnd = () => {
            this.updateStatus('idle');
            this.eventEmitter.emit('playSound', { soundName: 'walkie_static_short_end', character: this.key });
            this.eventEmitter.off(`speech:end`, onSpeechEndCallback);
        };
        const onSpeechEndCallback = ({ characterKey }) => {
            if (characterKey === this.key) {
                onSpeechEnd();
            }
        };
        this.eventEmitter.on(`speech:end`, onSpeechEndCallback);
    }

    /**
     * Updates Muldoon's (walkie-talkie) visual status.
     * @param {string} status - 'idle', 'receiving', 'transmitting', 'transmitting-urgent', 'off'.
     */
    updateStatus(status) {
        // Don't call super.updateStatus() if it adds classes to this.uiElement (walkie-container)
        // that are not intended for the walkie-talkie itself.
        // Instead, manage walkie-talkie specific UI parts here.

        if (this.walkieLedElement) {
            this.utils.removeClass(this.walkieLedElement, 'idle receiving transmitting transmitting-urgent off'); // Clear previous
            switch (status) {
                case 'idle':
                case 'receiving': // Often same visual for idle/receiving LED, actual audio makes difference
                    this.utils.addClass(this.walkieLedElement, 'idle'); // Or 'receiving' if distinct LED style
                    this._showStaticVisualization(status === 'receiving');
                    break;
                case 'transmitting':
                case 'transmitting-urgent': // Could have a faster pulse or different color for urgent
                    this.utils.addClass(this.walkieLedElement, status.includes('urgent') ? 'transmitting-urgent' : 'transmitting');
                    this._showStaticVisualization(true); // Show static when transmitting
                    break;
                case 'off':
                    this.utils.addClass(this.walkieLedElement, 'off');
                    this._showStaticVisualization(false);
                    break;
            }
        }
        if (this.stateManager.get('debugMode')) {
            console.log(`Muldoon walkie status: ${status}`);
        }
    }

    /**
     * Controls the static visualization bars on the walkie-talkie.
     * @param {boolean} show - True to show, false to hide.
     * @private
     */
    _showStaticVisualization(show) {
        if (this.staticBarsContainer) {
            // The CSS for .static-bars in jurassic/characters.css uses
            // .walkie-led.receiving ~ .walkie-speaker .static-bars (and .transmitting)
            // to control opacity. So direct manipulation might not be needed if LED state is set.
            // However, this provides an explicit control if required.
             this.staticBarsContainer.style.opacity = show ? '1' : '0';
        }
    }

    /**
     * Override speak to potentially add radio click sound effects.
     */
    speak(text, options = {}) {
        if (!this.isActive && !options.forceSpeakIfNotActive) return;

        // Ensure status is transmitting before speaking
        const previousStatus = this.walkieLedElement ? Array.from(this.walkieLedElement.classList).find(c => c !== 'walkie-led') : 'idle';
        this.updateStatus(options.isUrgent ? 'transmitting-urgent' : 'transmitting');
        this.eventEmitter.emit('playSound', {soundName: 'walkie_talk_press', character: this.key});


        // Custom logic to handle speech end and revert status
        const originalOnEnd = options.onEnd;
        options.onEnd = () => {
            this.eventEmitter.emit('playSound', {soundName: 'walkie_talk_release', character: this.key});
            // Revert to idle or previous status if not 'off'
            if (previousStatus !== 'off') {
                 this.updateStatus('idle'); // Or previousStatus if that's more appropriate
            }
            if (typeof originalOnEnd === 'function') {
                originalOnEnd();
            }
        };
        
        super.speak(text, options); // Calls BaseCharacter's speak
    }
}

// If not using ES modules:
// window.MuldoonCharacter = MuldoonCharacter;
