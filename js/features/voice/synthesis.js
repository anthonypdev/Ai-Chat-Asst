/**
 * Parkland AI - Opus Magnum Edition
 * VoiceSynthesis Module
 *
 * Handles text-to-speech (TTS) synthesis using the browser's Web Speech API.
 * Manages voice selection, speech queue, and applies character-specific voice effects.
 */

class VoiceSynthesis {
    /**
     * @param {StateManager} stateManager
     * @param {EventEmitter} eventEmitter
     * @param {ParklandUtils} utils
     */
    constructor(stateManager, eventEmitter, utils) {
        if (!stateManager || !eventEmitter || !utils) {
            throw new Error("VoiceSynthesis requires StateManager, EventEmitter, and Utils instances.");
        }
        this.stateManager = stateManager;
        this.eventEmitter = eventEmitter;
        this.utils = utils;

        this.synth = window.speechSynthesis;
        this._voices = [];
        this._currentUtterance = null;
        this._speechQueue = [];
        this._isSpeaking = false;
        this._isPaused = false;
        this._initialized = false;

        this._characterVoiceMap = {}; // To store preferred voice URIs for characters

        // Default voice parameters (can be overridden by character effects)
        this._defaultParams = {
            pitch: 1.0, // 0.0 to 2.0
            rate: 1.0,  // 0.1 to 10.0
            volume: 1.0 // 0.0 to 1.0
        };

        // Debounce populateVoiceList for safety, as 'voiceschanged' can fire multiple times
        this._debouncedPopulateVoiceList = this.utils.debounce(this._populateVoiceList.bind(this), 200);

        console.log('🗣️ VoiceSynthesis initialized.');
    }

    /**
     * Initializes the voice synthesis system.
     * Must be called, preferably after a user interaction on some browsers.
     */
    init() {
        if (this._initialized || !this.synth) {
            if (!this.synth) console.warn("VoiceSynthesis: Web Speech API not available.");
            return;
        }

        this._populateVoiceList();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = this._debouncedPopulateVoiceList;
        }

        this.stateManager.subscribe('change:userPreferences.voiceOutputEnabled', ({ newValue }) => {
            if (!newValue && this._isSpeaking) {
                this.cancel(); // Stop speaking if disabled
            }
        });
        
        this.stateManager.subscribe('change:userPreferences.voiceCharacter', ({ newValue }) => {
            // If a new preferred voice character is set, we might want to re-evaluate queued speech
            // or apply it to the next utterance. For now, it affects new `speak` calls.
            if (this.stateManager.get('debugMode')) {
                 console.log('VoiceSynthesis: Preferred character voice changed to', newValue);
            }
        });


        this._initialized = true;
        console.log('VoiceSynthesis system ready.');
    }

    /**
     * Populates the list of available system voices.
     * @private
     */
    _populateVoiceList() {
        if (!this.synth) return;
        try {
            this._voices = this.synth.getVoices();
            if (this._voices.length > 0) {
                if (this.stateManager.get('debugMode')) {
                    console.log('Available voices:', this._voices.map(v => ({ name: v.name, lang: v.lang, default: v.default })));
                }
                this.eventEmitter.emit('voices:loaded', this._voices);
                // Attempt to pre-map some known character voice preferences if not already set
                this._setDefaultCharacterVoicePreferences();
            } else {
                console.warn("VoiceSynthesis: No voices available from synth.getVoices(). Retrying might be needed on some browsers.");
            }
        } catch (error) {
            console.error("VoiceSynthesis: Error getting voices:", error);
        }
    }
    
    /**
     * Sets some default voice preferences for characters if specific voices are found.
     * This is a basic approach; a more robust system might involve user selection.
     * @private
     */
    _setDefaultCharacterVoicePreferences() {
        // Example: If a user previously selected a voice for "Mr. DNA" and it's stored, load it.
        // For now, just demonstrating a placeholder for potential pre-selection.
        // Actual character voice preferences are mostly handled by 'findVoiceForCharacter' at speak time.
        // This could be used to prime this._characterVoiceMap if we had stored URI preferences.
    }


    /**
     * Speaks the given text.
     * @param {string} text - The text to speak.
     * @param {string} [characterKey=null] - Optional character key to apply voice effects.
     * @param {Object} [options={}] - Optional SpeechSynthesisUtterance properties (pitch, rate, volume, voice).
     */
    speak(text, characterKey = null, options = {}) {
        if (!this.synth || !this._initialized) {
            console.warn('VoiceSynthesis not ready or not available.');
            return;
        }
        if (!this.stateManager.get('userPreferences.voiceOutputEnabled')) {
            if (this.stateManager.get('debugMode')) console.log('VoiceSynthesis: Output is disabled.');
            return;
        }
        if (typeof text !== 'string' || text.trim() === '') {
            console.warn('VoiceSynthesis: No text provided to speak.');
            return;
        }

        // If currently speaking, add to queue, unless it's an interruption/cancel scenario
        // For simplicity, new speak calls will cancel existing and queue the new one if busy.
        if (this._isSpeaking || this._speechQueue.length > 0) {
            if (options.interrupt !== false) { // Default to interrupt and queue
                this.cancel(true); // Cancel current but keep queue to add this new one
            }
        }


        const utterance = new SpeechSynthesisUtterance(text);

        // Apply base defaults
        utterance.pitch = options.pitch || this._defaultParams.pitch;
        utterance.rate = options.rate || this._defaultParams.rate;
        utterance.volume = options.volume || this._defaultParams.volume;

        // Attempt to find and set a specific voice
        const preferredVoiceURI = this._characterVoiceMap[characterKey || this.stateManager.get('userPreferences.voiceCharacter')] || options.voiceURI;
        let voiceToUse = null;

        if (preferredVoiceURI) {
            voiceToUse = this._voices.find(v => v.voiceURI === preferredVoiceURI);
        }
        if (!voiceToUse && characterKey) {
            voiceToUse = this._findVoiceForCharacter(characterKey);
        }
        if (!voiceToUse && options.voice && typeof options.voice === 'object') { // If a voice object is passed
             voiceToUse = options.voice;
        }
        if (!voiceToUse) { // Fallback to default or first available English voice
            voiceToUse = this._voices.find(v => v.default && v.lang.startsWith('en')) ||
                         this._voices.find(v => v.lang.startsWith('en')) ||
                         this._voices[0];
        }
        
        if (voiceToUse) {
            utterance.voice = voiceToUse;
            if (this.stateManager.get('debugMode')) console.log(`Using voice: ${voiceToUse.name} (${voiceToUse.lang}) for character: ${characterKey || 'default'}`);
        } else {
            if (this.stateManager.get('debugMode')) console.log('No specific voice found, using browser default.');
        }
        

        // Apply character-specific audio effects (pitch, rate, volume adjustments)
        this.applyAudioEffects(utterance, characterKey);


        utterance.onstart = () => {
            this._isSpeaking = true;
            this._isPaused = false;
            this._currentUtterance = utterance;
            this.eventEmitter.emit('speech:start', { text, characterKey });
            if (this.stateManager.get('debugMode')) console.log('Speech started.');
        };

        utterance.onend = () => {
            this._isSpeaking = false;
            this._isPaused = false;
            this._currentUtterance = null;
            this.eventEmitter.emit('speech:end', { text, characterKey });
            if (this.stateManager.get('debugMode')) console.log('Speech ended.');
            this._speechQueue.shift(); // Remove completed utterance
            this._processQueue();      // Process next in queue
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error, event);
            this._isSpeaking = false;
            this._isPaused = false;
            this._currentUtterance = null;
            this.eventEmitter.emit('speech:error', { text, characterKey, error: event.error });
            this.stateManager.set('lastError', {message: `Speech error: ${event.error}`, type: 'tts'});
            this._speechQueue.shift();
            this._processQueue();
        };

        utterance.onpause = () => {
            this._isPaused = true;
            this.eventEmitter.emit('speech:pause', { text, characterKey });
            if (this.stateManager.get('debugMode')) console.log('Speech paused.');
        };

        utterance.onresume = () => {
            this._isPaused = false;
            this.eventEmitter.emit('speech:resume', { text, characterKey });
            if (this.stateManager.get('debugMode')) console.log('Speech resumed.');
        };
        
        this._speechQueue.push(utterance);
        if (!this._isSpeaking) {
             this._processQueue();
        }
    }

    _processQueue() {
        if (this._speechQueue.length > 0 && !this._isSpeaking && this.synth) {
            const utteranceToSpeak = this._speechQueue[0];
            try {
                this.synth.speak(utteranceToSpeak);
            } catch (error) {
                console.error("Error calling synth.speak:", error);
                // Handle error, perhaps remove from queue and try next
                this._speechQueue.shift();
                this._processQueue();
            }
        }
    }
    
    /**
     * Finds a suitable voice based on character key or preferences.
     * @param {string} characterKey
     * @returns {SpeechSynthesisVoice|null}
     * @private
     */
    _findVoiceForCharacter(characterKey) {
        if (!this._voices || this._voices.length === 0) return null;

        const characterData = window.parklandApp && window.parklandApp.characterManager ?
                              window.parklandApp.characterManager.getCharacterData(characterKey) : null;

        let voiceCriteria = [];
        if (characterData && characterData.voiceConfig) {
            if (characterData.voiceConfig.voiceName) { // Prioritize specific voice name
                const foundByName = this._voices.find(v => v.name.toLowerCase().includes(characterData.voiceConfig.voiceName.toLowerCase()));
                if (foundByName) return foundByName;
            }
            if (characterData.voiceConfig.lang) {
                voiceCriteria.push(v => v.lang.toLowerCase().startsWith(characterData.voiceConfig.lang.toLowerCase()));
            }
            if (characterData.voiceConfig.gender) { // 'male', 'female' - no standard API way to get this directly
                // This is heuristic, voice names might indicate gender
                if(characterData.voiceConfig.gender === 'male') voiceCriteria.push(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('mark'));
                if(characterData.voiceConfig.gender === 'female') voiceCriteria.push(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('susan'));
            }
        } else {
            // Default heuristics for some known characters if no explicit config
            if (characterKey === 'mr-dna') voiceCriteria.push(v => v.name.toLowerCase().includes('daniel') || v.lang.startsWith('en-GB')); // Example
            if (characterKey === 'quint') voiceCriteria.push(v => v.name.toLowerCase().includes('male') && (v.lang.startsWith('en-US') || v.lang.startsWith('en-IE')));
        }

        // Try to find a voice matching all criteria
        if (voiceCriteria.length > 0) {
            const filteredVoices = this._voices.filter(v => voiceCriteria.every(crit => crit(v)));
            if (filteredVoices.length > 0) return filteredVoices.find(v => v.default) || filteredVoices[0];
        }
        
        // Fallback: User's preferred general voice character if set
        const preferredCharVoiceKey = this.stateManager.get('userPreferences.voiceCharacter');
        if(preferredCharVoiceKey && preferredCharVoiceKey !== 'default' && preferredCharVoiceKey !== characterKey) {
            const prefCharData = window.parklandApp && window.parklandApp.characterManager ?
                                  window.parklandApp.characterManager.getCharacterData(preferredCharVoiceKey) : null;
            if (prefCharData && prefCharData.voiceConfig && prefCharData.voiceConfig.voiceName) {
                const foundPref = this._voices.find(v => v.name.toLowerCase().includes(prefCharData.voiceConfig.voiceName.toLowerCase()));
                if(foundPref) return foundPref;
            }
        }

        return null; // No specific voice found
    }


    /**
     * Applies character-specific voice effects (pitch, rate, volume) to an utterance.
     * This method fulfills the placeholder requirement from the Transformation Report.
     * @param {SpeechSynthesisUtterance} utterance - The utterance to modify.
     * @param {string|null} characterKey - The key of the character speaking.
     */
    applyAudioEffects(utterance, characterKey) {
        if (!utterance) return;

        const basePitch = this._defaultParams.pitch;
        const baseRate = this._defaultParams.rate;
        const baseVolume = this._defaultParams.volume;
        
        // Reset to base defaults before applying character specifics
        utterance.pitch = basePitch;
        utterance.rate = baseRate;
        utterance.volume = baseVolume;

        const characterData = window.parklandApp && window.parklandApp.characterManager ?
                              window.parklandApp.characterManager.getCharacterData(characterKey) : null;

        if (characterData && characterData.voiceConfig) {
            utterance.pitch = characterData.voiceConfig.pitch !== undefined ? characterData.voiceConfig.pitch : basePitch;
            utterance.rate = characterData.voiceConfig.rate !== undefined ? characterData.voiceConfig.rate : baseRate;
            utterance.volume = characterData.voiceConfig.volume !== undefined ? characterData.voiceConfig.volume : baseVolume;
        } else {
            // Apply generic effects based on key if no specific config
            switch (characterKey) {
                case 'quint':
                    utterance.pitch = basePitch * 0.8;  // Lower pitch
                    utterance.rate = baseRate * 0.9;   // Slightly slower
                    utterance.volume = baseVolume * 0.95;
                    break;
                case 'mr-dna':
                    utterance.pitch = basePitch * 1.3;  // Higher pitch
                    utterance.rate = baseRate * 1.15;  // Slightly faster
                    break;
                case 'muldoon':
                    utterance.pitch = basePitch * 0.9;
                    utterance.rate = baseRate * 0.95;
                    utterance.volume = baseVolume * 1.0; // Slightly louder/gruff could be simulated with careful params
                    break;
                case 'brody':
                case 'hooper':
                    // Closer to default, maybe minor adjustments
                    utterance.pitch = basePitch * 1.0;
                    utterance.rate = baseRate * 1.0;
                    break;
                default:
                    // Use defaults or global user preferences for pitch/rate/volume if set
                    const userPrefs = this.stateManager.get('userPreferences');
                    if(userPrefs) {
                        // utterance.pitch = userPrefs.ttsPitch || basePitch; // If such settings exist
                        // utterance.rate = userPrefs.ttsRate || baseRate;
                        // utterance.volume = userPrefs.ttsVolume || baseVolume;
                    }
                    break;
            }
        }
        
        // Clamp values to valid ranges
        utterance.pitch = Math.max(0, Math.min(2, utterance.pitch));
        utterance.rate = Math.max(0.1, Math.min(10, utterance.rate));
        utterance.volume = Math.max(0, Math.min(1, utterance.volume));


        if (this.stateManager.get('debugMode')) {
            console.log(`Applied audio effects for ${characterKey || 'default'}:`,
                { pitch: utterance.pitch, rate: utterance.rate, volume: utterance.volume });
        }
        // No complex reverb/echo simulation as per TR focus on parameters.
        // If sound effects were to be added AFTER speech, it would be handled by
        // the 'speech:end' event listener elsewhere, potentially calling audioProcessor.playSoundEffect.
    }


    pause() {
        if (this.synth && this._isSpeaking && !this._isPaused) {
            try {
                this.synth.pause();
            } catch (error) {
                console.error("Error calling synth.pause():", error);
            }
        }
    }

    resume() {
        if (this.synth && this._isPaused) {
            try {
                this.synth.resume();
            } catch (error) {
                console.error("Error calling synth.resume():", error);
            }
        }
    }

    /**
     * Stops the current speech and clears the queue.
     * @param {boolean} keepQueue - If true, current speech is cancelled but queue is preserved.
     */
    cancel(keepQueue = false) {
        if (this.synth) {
            if (!keepQueue) {
                this._speechQueue = [];
            }
            try {
                if (this._isSpeaking || this._isPaused || this.synth.pending || this.synth.speaking) {
                    // synth.cancel() stops current and clears synth's internal queue.
                    // Our own queue needs to be managed based on 'keepQueue'.
                    this.synth.cancel();
                }
            } catch (error) {
                console.error("Error calling synth.cancel():", error);
            }
            // Reset internal state regardless of synth.cancel() success,
            // as it might have already stopped due to an error or natural end.
            this._isSpeaking = false;
            this._isPaused = false;
            this._currentUtterance = null;
            this.eventEmitter.emit('speech:cancel'); // Notify that speech was cancelled
            if (this.stateManager.get('debugMode')) console.log('Speech cancelled. Queue ' + (keepQueue ? 'preserved.' : 'cleared.'));
        }
    }

    getAvailableVoices(lang = null) {
        if (!this._voices || this._voices.length === 0) {
            // Attempt to populate if empty, might happen if accessed before voiceschanged
            this._populateVoiceList();
        }
        if (lang && typeof lang === 'string') {
            return this._voices.filter(voice => voice.lang.toLowerCase().startsWith(lang.toLowerCase()));
        }
        return [...this._voices]; // Return a copy
    }

    /**
     * Sets a preferred voice by its URI for a specific character or globally.
     * @param {string} voiceURI - The URI of the voice to set.
     * @param {string} [characterKey=null] - If provided, sets preference for this character. Otherwise, sets a general default.
     */
    setPreferredVoice(voiceURI, characterKey = null) {
        const voice = this._voices.find(v => v.voiceURI === voiceURI);
        if (voice) {
            if (characterKey) {
                this._characterVoiceMap[characterKey] = voiceURI;
                 if (this.stateManager.get('debugMode')) console.log(`Preferred voice for ${characterKey} set to: ${voice.name}`);
            } else {
                // This could update a global default preference in StateManager userPreferences
                this.stateManager.setUserPreference('ttsPreferredVoiceURI', voiceURI);
                 if (this.stateManager.get('debugMode')) console.log(`Global preferred voice set to: ${voice.name}`);
            }
        } else {
            console.warn(`VoiceSynthesis: Voice with URI "${voiceURI}" not found.`);
        }
    }

    // Getters for state
    isSpeaking() { return this._isSpeaking; }
    isPaused() { return this._isPaused; }

    destroy() {
        this.cancel(); // Stop any ongoing speech and clear queue
        if (this.synth && this.synth.onvoiceschanged) {
            this.synth.onvoiceschanged = null; // Remove listener
        }
        this._voices = [];
        this._speechQueue = [];
        this._initialized = false;
        console.log('🗣️ VoiceSynthesis destroyed.');
    }
}

// If not using ES modules:
// window.VoiceSynthesis = VoiceSynthesis;

window.VoiceSynthesis = VoiceSynthesis;
