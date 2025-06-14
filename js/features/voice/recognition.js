/**
 * Parkland AI - Opus Magnum Edition
 * VoiceRecognition Module
 *
 * Handles speech-to-text functionality using the browser's Web Speech API.
 * Manages microphone input, processes speech results, and emits events.
 */

class VoiceRecognition {
    /**
     * @param {StateManager} stateManager
     * @param {EventEmitter} eventEmitter
     * @param {ParklandUtils} utils
     * @param {HTMLElement} [micButtonElement] - Optional microphone button element for direct manipulation.
     */
    constructor(stateManager, eventEmitter, utils, micButtonElement = null) {
        if (!stateManager || !eventEmitter || !utils) {
            throw new Error("VoiceRecognition requires StateManager, EventEmitter, and Utils instances.");
        }
        this.stateManager = stateManager;
        this.eventEmitter = eventEmitter;
        this.utils = utils;
        this.micButtonElement = micButtonElement;

        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            console.warn('VoiceRecognition: Web Speech API (SpeechRecognition) not supported by this browser.');
            this.recognition = null;
            this._isSupported = false;
            return;
        }
        this._isSupported = true;

        this.recognition = new SpeechRecognitionAPI();
        this._isListening = false;
        this._finalTranscript = '';
        this._interimTranscript = '';
        this._language = this.stateManager.get('userPreferences.recognitionLanguage') || 'en-US'; // Default language

        this._configureRecognition();
        this._bindRecognitionEvents();

        // Listen for preference changes
        this.stateManager.subscribe('change:userPreferences.voiceInputEnabled', ({ newValue }) => {
            if (!newValue && this._isListening) {
                this.stopListening();
            }
        });
        
        this.stateManager.subscribe('change:userPreferences.recognitionLanguage', ({newValue}) => {
            if(newValue && this.recognition) {
                this.setLanguage(newValue);
            }
        });

        console.log('🎤 VoiceRecognition initialized.');
    }

    _configureRecognition() {
        if (!this.recognition) return;
        this.recognition.continuous = true;      // Keep listening even after a pause in speech
        this.recognition.interimResults = true;  // Get results while the user is still speaking
        this.recognition.lang = this._language;
        // this.recognition.maxAlternatives = 1; // Default is 1
    }

    _bindRecognitionEvents() {
        if (!this.recognition) return;

        this.recognition.onstart = () => this._onRecognitionStart();
        this.recognition.onresult = (event) => this._onRecognitionResult(event);
        this.recognition.onerror = (event) => this._onRecognitionError(event);
        this.recognition.onend = () => this._onRecognitionEnd();

        // Additional potentially useful events (less common for basic use)
        // this.recognition.onaudiostart = () => console.log('Audio capture started.');
        // this.recognition.onaudioend = () => console.log('Audio capture ended.');
        // this.recognition.onsoundstart = () => console.log('Sound detected.');
        // this.recognition.onsoundend = () => console.log('Sound stopped being detected.');
        // this.recognition.onspeechstart = () => console.log('Speech detected.');
        // this.recognition.onspeechend = () => console.log('Speech stopped being detected.');
    }

    _onRecognitionStart() {
        this._isListening = true;
        this._finalTranscript = ''; // Reset transcript for new session if not continuous in true sense
        this.stateManager.set('isMicListening', true);
        this.eventEmitter.emit('recognition:start');
        if (this.micButtonElement) {
            this.utils.addClass(this.micButtonElement, 'listening');
            this.micButtonElement.setAttribute('aria-label', 'Stop listening');
            this.micButtonElement.title = 'Stop listening';
        }
        if (this.stateManager.get('debugMode')) console.log('Voice recognition started.');
    }

    _onRecognitionResult(event) {
        this._interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                this._finalTranscript += event.results[i][0].transcript;
            } else {
                this._interimTranscript += event.results[i][0].transcript;
            }
        }

        if (this._interimTranscript) {
            this.eventEmitter.emit('recognition:interimResult', this._interimTranscript);
             if (this.stateManager.get('debugMode')) console.log('Interim transcript:', this._interimTranscript);
        }

        if (event.results[event.results.length - 1].isFinal) {
            const finalSegment = event.results[event.results.length - 1][0].transcript.trim();
            if (finalSegment) { // Only emit if there's actual final content
                this.eventEmitter.emit('recognition:finalResult', this._finalTranscript.trim());
                 if (this.stateManager.get('debugMode')) console.log('Final transcript:', this._finalTranscript.trim());
                // Reset final transcript after processing to avoid appending in continuous mode indefinitely
                // if recognition.continuous actually means it keeps adding.
                // The current pattern of += _finalTranscript implies we might want to reset it here
                // if each 'finalResult' event should be self-contained for that utterance.
                // Let's assume _finalTranscript should accumulate for a session until stopListening is called.
                // If user wants to clear and start a new "sentence", they can toggle listening.
            }
        }
    }

    _onRecognitionError(event) {
        this._isListening = false; // Typically stops on error
        this.stateManager.set('isMicListening', false);
        let errorMessage = `Speech recognition error: ${event.error}`;
        let errorType = event.error;

        switch (event.error) {
            case 'no-speech':
                errorMessage = 'No speech was detected. Please try again.';
                break;
            case 'audio-capture':
                errorMessage = 'Audio capture failed. Ensure your microphone is working.';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone access denied. Please allow microphone permission in your browser settings.';
                // Future attempts to start will likely fail until permission is granted.
                // Consider permanently disabling voice input if this error persists.
                this.stateManager.setUserPreference('voiceInputEnabled', false);
                break;
            case 'network':
                errorMessage = 'Network error during speech recognition. Please check your connection.';
                break;
            case 'aborted':
                errorMessage = 'Speech recognition aborted.'; // Often due to stopListening() call
                break;
            case 'language-not-supported':
                errorMessage = `The selected language (${this.recognition.lang}) is not supported.`;
                break;
            case 'service-not-allowed':
                errorMessage = 'Speech recognition service is not allowed. This may be due to browser/OS settings or enterprise policies.';
                break;
            default:
                errorMessage = `An unknown speech recognition error occurred: ${event.error}.`;
        }

        console.error('Voice recognition error:', event.error, event.message || '');
        this.eventEmitter.emit('recognition:error', { error: errorType, message: errorMessage });
        this.stateManager.set('lastError', { message: errorMessage, type: 'recognition' });
        
        if (this.micButtonElement) {
            this.utils.removeClass(this.micButtonElement, 'listening');
            this.utils.addClass(this.micButtonElement, 'error'); // Add error class for styling
            this.micButtonElement.setAttribute('aria-label', 'Start listening');
            this.micButtonElement.title = 'Start listening (Error occurred)';
            setTimeout(() => { // Remove error state after a bit
                if (this.micButtonElement) this.utils.removeClass(this.micButtonElement, 'error');
            }, 3000);
        }
    }

    _onRecognitionEnd() {
        // This event fires when recognition stops, either manually or automatically (e.g., no speech).
        const wasListening = this._isListening; // Check if it was stopped intentionally or due to error/auto-end
        this._isListening = false;
        this.stateManager.set('isMicListening', false);
        this.eventEmitter.emit('recognition:end');

        if (this.micButtonElement) {
            this.utils.removeClass(this.micButtonElement, 'listening');
            this.micButtonElement.setAttribute('aria-label', 'Start listening');
            this.micButtonElement.title = 'Start listening';
        }

        if (this.stateManager.get('debugMode')) console.log('Voice recognition ended.');

        // Handle auto-restart if continuous mode was interrupted not by user/fatal error
        // The 'continuous' property itself handles restarting after pauses in speech.
        // This 'onend' might be for when the entire session ends.
        // If an error like 'not-allowed' occurred, we shouldn't try to restart.
        // For now, startListening() is user-initiated via toggleListening().
    }

    /**
     * Toggles the listening state of voice recognition.
     */
    toggleListening() {
        if (!this._isSupported || !this.stateManager.get('userPreferences.voiceInputEnabled')) {
             const message = !this._isSupported ? 'Voice recognition is not supported by your browser.' : 'Voice input is disabled in settings.';
             this.eventEmitter.emit('recognition:error', { error: 'not-available', message });
             this.stateManager.set('lastError', { message, type: 'recognition' });
             console.warn(message);
            return;
        }

        if (this._isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    /**
     * Starts voice recognition.
     */
    startListening() {
        if (!this.recognition || this._isListening || !this.stateManager.get('userPreferences.voiceInputEnabled')) {
            return;
        }
        try {
            this._finalTranscript = ''; // Reset for a new listening "session"
            this._interimTranscript = '';
            this.recognition.lang = this._language; // Ensure latest language is set
            this.recognition.start();
        } catch (error) {
            // This can happen if start() is called too soon after a stop(), or if already started.
            console.error('Error starting voice recognition:', error);
            this._isListening = false; // Ensure state is correct
            this.stateManager.set('isMicListening', false);
            if (this.micButtonElement) this.utils.removeClass(this.micButtonElement, 'listening');
            this.eventEmitter.emit('recognition:error', { error: 'start_failed', message: 'Could not start voice recognition.' });
        }
    }

    /**
     * Stops voice recognition.
     */
    stopListening() {
        if (!this.recognition || !this._isListening) {
            return;
        }
        try {
            this.recognition.stop(); // This will trigger onend event
        } catch (error) {
            // This can happen if already stopped.
            console.warn('Error stopping voice recognition (might be already stopped):', error);
            // Manually trigger cleanup if synth.stop() fails but we know we were listening
             if (this._isListening) { // Check if we thought we were listening
                this._isListening = false;
                this.stateManager.set('isMicListening', false);
                this.eventEmitter.emit('recognition:end');
                if (this.micButtonElement) this.utils.removeClass(this.micButtonElement, 'listening');
            }
        }
    }

    /**
     * Sets the language for speech recognition.
     * @param {string} lang - The BCP 47 language tag (e.g., 'en-US', 'es-ES').
     */
    setLanguage(lang) {
        if (typeof lang === 'string' && this.recognition) {
            this._language = lang;
            this.recognition.lang = lang; // Set for current/next session
            if (this.stateManager.get('debugMode')) console.log(`Recognition language set to: ${lang}`);
            // Note: Changing language while recognition is active might require stopping and restarting.
            // For simplicity, this change will apply to the next recognition session.
        }
    }

    /**
     * Checks if voice recognition is currently active.
     * @returns {boolean} True if listening, false otherwise.
     */
    isListening() {
        return this._isListening;
    }

    /**
     * Checks if the Web Speech API (SpeechRecognition) is supported by the browser.
     * @returns {boolean} True if supported, false otherwise.
     */
    isSupported() {
        return this._isSupported;
    }

    destroy() {
        if (this.recognition) {
            this.recognition.abort(); // Abort any ongoing recognition
            this.recognition.onstart = null;
            this.recognition.onresult = null;
            this.recognition.onerror = null;
            this.recognition.onend = null;
            // Remove other specific event listeners if added
        }
        this._isListening = false;
        this.stateManager.set('isMicListening', false); // Ensure state is updated
        console.log('🎤 VoiceRecognition destroyed.');
    }
}

// If not using ES modules:
// window.VoiceRecognition = VoiceRecognition;

window.VoiceRecognition = VoiceRecognition;
