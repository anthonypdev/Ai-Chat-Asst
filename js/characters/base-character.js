/**
 * Parkland AI Opus Magnum - Base Character Class
 * Foundation for all character implementations with AAA-quality features
 */

class BaseCharacter {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.theme = config.theme;
        this.personality = config.personality || {};
        this.voiceProfile = config.voiceProfile || {};
        this.visualConfig = config.visualConfig || {};

        // Character state
        this.state = {
            active: false,
            speaking: false,
            visible: true,
            mood: 'neutral',
            lastSpoke: null,
            interactionCount: 0
        };

        // Audio system
        this.audioContext = null;
        this.audioNodes = {};
        this.voiceQueue = [];
        this.currentUtterance = null;

        // Visual elements
        this.elements = {
            container: null,
            avatar: null,
            indicator: null,
            subtitles: null
        };

        // Event handlers
        this.handlers = new Map();

        // Performance optimization
        this.animationFrameId = null;
        this.updateThrottle = 16; // ~60fps
        this.lastUpdate = 0;

        this.initialize();
    }

    /**
     * Initialize character systems
     */
    async initialize() {
        try {
            await this.initializeAudio();
            this.createVisualElements();
            this.setupEventListeners();
            this.loadCharacterData();

            console.log(`[${this.name}] Character initialized successfully`);
        } catch (error) {
            console.error(`[${this.name}] Initialization failed:`, error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Initialize Web Audio API for character-specific audio processing
     */
    async initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create audio processing nodes
            this.audioNodes = {
                input: this.audioContext.createGain(),
                compressor: this.audioContext.createDynamicsCompressor(),
                filter: this.audioContext.createBiquadFilter(),
                distortion: this.audioContext.createWaveShaper(),
                convolver: this.audioContext.createConvolver(),
                analyser: this.audioContext.createAnalyser(),
                output: this.audioContext.createGain()
            };

            // Configure default audio chain
            this.setupAudioChain();

            // Load character-specific impulse responses
            if (this.voiceProfile.impulseResponse) {
                await this.loadImpulseResponse(this.voiceProfile.impulseResponse);
            }

        } catch (error) {
            console.warn(`[${this.name}] Audio initialization failed, falling back to basic audio:`, error);
            this.audioContext = null;
        }
    }

    /**
     * Setup audio processing chain
     */
    setupAudioChain() {
        const { input, compressor, filter, distortion, convolver, analyser, output } = this.audioNodes;

        // Configure compressor for voice
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;

        // Configure filter based on character
        filter.type = 'bandpass';
        filter.frequency.value = this.voiceProfile.filterFrequency || 2000;
        filter.Q.value = this.voiceProfile.filterQ || 1;

        // Setup distortion if needed
        if (this.voiceProfile.distortion) {
            distortion.curve = this.makeDistortionCurve(this.voiceProfile.distortion);
        }

        // Connect nodes
        input.connect(compressor);
        compressor.connect(filter);

        if (this.voiceProfile.distortion) {
            filter.connect(distortion);
            distortion.connect(convolver);
        } else {
            filter.connect(convolver);
        }

        convolver.connect(analyser);
        analyser.connect(output);
        output.connect(this.audioContext.destination);

        // Configure analyser for visualizations
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
    }

    /**
     * Create distortion curve for audio processing
     */
    makeDistortionCurve(amount = 50) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }

        return curve;
    }

    /**
     * Load impulse response for convolution reverb
     */
    async loadImpulseResponse(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioNodes.convolver.buffer = audioBuffer;
        } catch (error) {
            console.warn(`[${this.name}] Failed to load impulse response:`, error);
        }
    }

    /**
     * Create visual elements for character
     */
    createVisualElements() {
        // Main container
        this.elements.container = document.createElement('div');
        this.elements.container.className = `character-container character-${this.id}`;
        this.elements.container.setAttribute('role', 'complementary');
        this.elements.container.setAttribute('aria-label', `${this.name} character interface`);

        // Apply visual configuration
        Object.assign(this.elements.container.style, {
            position: 'fixed',
            ...this.visualConfig.position,
            zIndex: 'var(--z-tooltip)',
            transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            opacity: '0',
            transform: 'scale(0.8) translateY(20px)'
        });

        // Create character-specific elements
        this.createCharacterVisuals();

        // Add to DOM
        document.body.appendChild(this.elements.container);
    }

    /**
     * Override in child classes to create specific visual elements
     */
    createCharacterVisuals() {
        // Default avatar
        this.elements.avatar = document.createElement('div');
        this.elements.avatar.className = 'character-avatar';
        this.elements.container.appendChild(this.elements.avatar);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Voice synthesis events
        if (window.speechSynthesis) {
            this.handlers.set('voicestart', this.handleVoiceStart.bind(this));
            this.handlers.set('voiceend', this.handleVoiceEnd.bind(this));
            this.handlers.set('voiceerror', this.handleVoiceError.bind(this));
        }

        // Visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.state.speaking) {
                this.pauseSpeaking();
            }
        });

        // Audio context state
        if (this.audioContext) {
            this.audioContext.addEventListener('statechange', () => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            });
        }
    }

    /**
     * Load character-specific data
     */
    async loadCharacterData() {
        try {
            // Load any character-specific assets
            if (this.visualConfig.sprites) {
                await this.loadSprites(this.visualConfig.sprites);
            }

            // Load voice samples if needed
            if (this.voiceProfile.samples) {
                await this.loadVoiceSamples(this.voiceProfile.samples);
            }

        } catch (error) {
            console.warn(`[${this.name}] Failed to load character data:`, error);
        }
    }

    /**
     * Activate character
     */
    async activate() {
        if (this.state.active) return;

        console.log(`[${this.name}] Activating character`);

        this.state.active = true;
        this.show();

        // Resume audio context if needed
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        // Trigger activation animation
        this.playActivationAnimation();

        // Emit activation event
        this.emit('activated', { character: this });
    }

    /**
     * Deactivate character
     */
    deactivate() {
        if (!this.state.active) return;

        console.log(`[${this.name}] Deactivating character`);

        this.state.active = false;
        this.stopSpeaking();
        this.hide();

        // Emit deactivation event
        this.emit('deactivated', { character: this });
    }

    /**
     * Show character with animation
     */
    show() {
        if (!this.elements.container) return;

        this.state.visible = true;

        requestAnimationFrame(() => {
            this.elements.container.style.opacity = '1';
            this.elements.container.style.transform = 'scale(1) translateY(0)';
        });
    }

    /**
     * Hide character with animation
     */
    hide() {
        if (!this.elements.container) return;

        this.state.visible = false;

        this.elements.container.style.opacity = '0';
        this.elements.container.style.transform = 'scale(0.8) translateY(20px)';
    }

    /**
     * Speak text with character voice
     */
    async speak(text, options = {}) {
        if (!text || !this.state.active) return;

        // Add to queue if already speaking
        if (this.state.speaking) {
            this.voiceQueue.push({ text, options });
            return;
        }

        this.state.speaking = true;
        this.state.lastSpoke = Date.now();

        try {
            // Process text for character personality
            const processedText = this.processTextForPersonality(text);

            // Create utterance
            const utterance = new SpeechSynthesisUtterance(processedText);

            // Apply voice profile
            this.applyVoiceProfile(utterance);

            // Setup event handlers
            utterance.onstart = () => this.handleVoiceStart();
            utterance.onend = () => this.handleVoiceEnd();
            utterance.onerror = (event) => this.handleVoiceError(event);

            // Apply audio effects if available
            if (this.audioContext && options.effects !== false) {
                await this.applyAudioEffects(utterance);
            }

            // Store current utterance
            this.currentUtterance = utterance;

            // Speak
            window.speechSynthesis.speak(utterance);

            // Show subtitles if enabled
            if (options.subtitles !== false) {
                this.showSubtitles(processedText);
            }

            // Trigger speaking animation
            this.startSpeakingAnimation();

        } catch (error) {
            console.error(`[${this.name}] Speech failed:`, error);
            this.state.speaking = false;
            this.processNextInQueue();
        }
    }

    /**
     * Process text based on character personality
     */
    processTextForPersonality(text) {
        let processed = text;

        // Apply personality modifications
        if (this.personality.prefix) {
            processed = this.personality.prefix + ' ' + processed;
        }

        if (this.personality.suffix) {
            processed = processed + ' ' + this.personality.suffix;
        }

        // Apply character-specific text transformations
        if (this.personality.textTransform) {
            processed = this.personality.textTransform(processed);
        }

        return processed;
    }

    /**
     * Apply voice profile to utterance
     */
    applyVoiceProfile(utterance) {
        // Select appropriate voice
        if (this.voiceProfile.voiceURI) {
            const voices = window.speechSynthesis.getVoices();
            const voice = voices.find(v => v.voiceURI === this.voiceProfile.voiceURI);
            if (voice) utterance.voice = voice;
        }

        // Apply voice parameters
        utterance.rate = this.voiceProfile.rate || 1.0;
        utterance.pitch = this.voiceProfile.pitch || 1.0;
        utterance.volume = this.voiceProfile.volume || 1.0;

        // Apply mood modifications
        if (this.state.mood !== 'neutral') {
            this.applyMoodToVoice(utterance);
        }
    }

    /**
     * Apply mood-based voice modifications
     */
    applyMoodToVoice(utterance) {
        const moodModifiers = {
            excited: { rate: 1.2, pitch: 1.1, volume: 1.0 },
            calm: { rate: 0.9, pitch: 0.95, volume: 0.9 },
            urgent: { rate: 1.3, pitch: 1.05, volume: 1.0 },
            whisper: { rate: 0.8, pitch: 0.8, volume: 0.3 },
            angry: { rate: 1.1, pitch: 0.9, volume: 1.0 }
        };

        const modifier = moodModifiers[this.state.mood];
        if (modifier) {
            utterance.rate *= modifier.rate;
            utterance.pitch *= modifier.pitch;
            utterance.volume *= modifier.volume;
        }
    }

    /**
     * Apply audio effects to speech
     */
    async applyAudioEffects(utterance) {
        // This would require more complex audio routing
        // For now, we'll use CSS filters and visual effects
        if (this.voiceProfile.cssAudioClass) {
            document.documentElement.classList.add(this.voiceProfile.cssAudioClass);
        }
    }

    /**
     * Stop speaking
     */
    stopSpeaking() {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        this.state.speaking = false;
        this.currentUtterance = null;
        this.voiceQueue = [];

        this.stopSpeakingAnimation();
        this.hideSubtitles();
    }

    /**
     * Pause speaking
     */
    pauseSpeaking() {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            this.pauseSpeakingAnimation();
        }
    }

    /**
     * Resume speaking
     */
    resumeSpeaking() {
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            this.resumeSpeakingAnimation();
        }
    }

    /**
     * Handle voice start event
     */
    handleVoiceStart() {
        console.log(`[${this.name}] Started speaking`);
        this.emit('speakingStarted', { character: this });
    }

    /**
     * Handle voice end event
     */
    handleVoiceEnd() {
        console.log(`[${this.name}] Finished speaking`);
        this.state.speaking = false;
        this.stopSpeakingAnimation();
        this.hideSubtitles();

        this.emit('speakingEnded', { character: this });

        // Process next in queue
        this.processNextInQueue();
    }

    /**
     * Handle voice error event
     */
    handleVoiceError(event) {
        console.error(`[${this.name}] Voice error:`, event);
        this.state.speaking = false;
        this.stopSpeakingAnimation();
        this.hideSubtitles();

        this.emit('speakingError', { character: this, error: event });

        // Process next in queue
        this.processNextInQueue();
    }

    /**
     * Process next item in voice queue
     */
    processNextInQueue() {
        if (this.voiceQueue.length > 0) {
            const { text, options } = this.voiceQueue.shift();
            setTimeout(() => this.speak(text, options), 300);
        }
    }

    /**
     * Show subtitles
     */
    showSubtitles(text) {
        if (!this.elements.subtitles) {
            this.elements.subtitles = document.createElement('div');
            this.elements.subtitles.className = 'character-subtitles';
            this.elements.subtitles.setAttribute('role', 'status');
            this.elements.subtitles.setAttribute('aria-live', 'polite');
            document.body.appendChild(this.elements.subtitles);
        }

        this.elements.subtitles.textContent = text;
        this.elements.subtitles.classList.add('visible');
    }

    /**
     * Hide subtitles
     */
    hideSubtitles() {
        if (this.elements.subtitles) {
            this.elements.subtitles.classList.remove('visible');
        }
    }

    /**
     * Start speaking animation
     */
    startSpeakingAnimation() {
        if (this.elements.indicator) {
            this.elements.indicator.classList.add('speaking');
        }

        // Start animation loop
        this.animateSpeaking();
    }

    /**
     * Stop speaking animation
     */
    stopSpeakingAnimation() {
        if (this.elements.indicator) {
            this.elements.indicator.classList.remove('speaking');
        }

        // Cancel animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Pause speaking animation
     */
    pauseSpeakingAnimation() {
        if (this.elements.indicator) {
            this.elements.indicator.classList.add('paused');
        }
    }

    /**
     * Resume speaking animation
     */
    resumeSpeakingAnimation() {
        if (this.elements.indicator) {
            this.elements.indicator.classList.remove('paused');
        }
    }

    /**
     * Animate speaking (override in child classes)
     */
    animateSpeaking() {
        const animate = (timestamp) => {
            if (!this.state.speaking) return;

            // Throttle updates
            if (timestamp - this.lastUpdate < this.updateThrottle) {
                this.animationFrameId = requestAnimationFrame(animate);
                return;
            }

            this.lastUpdate = timestamp;

            // Get audio data if available
            if (this.audioContext && this.audioNodes.analyser) {
                const dataArray = new Uint8Array(this.audioNodes.analyser.frequencyBinCount);
                this.audioNodes.analyser.getByteFrequencyData(dataArray);

                // Update visuals based on audio
                this.updateVisualsFromAudio(dataArray);
            }

            // Continue animation
            this.animationFrameId = requestAnimationFrame(animate);
        };

        this.animationFrameId = requestAnimationFrame(animate);
    }

    /**
     * Update visuals based on audio data
     */
    updateVisualsFromAudio(audioData) {
        // Override in child classes for specific visualizations
    }

    /**
     * Play activation animation
     */
    playActivationAnimation() {
        // Override in child classes
    }

    /**
     * Set character mood
     */
    setMood(mood) {
        const validMoods = ['neutral', 'excited', 'calm', 'urgent', 'whisper', 'angry'];

        if (validMoods.includes(mood)) {
            this.state.mood = mood;
            this.updateMoodVisuals();
            this.emit('moodChanged', { character: this, mood });
        }
    }

    /**
     * Update visuals based on mood
     */
    updateMoodVisuals() {
        if (this.elements.container) {
            this.elements.container.setAttribute('data-mood', this.state.mood);
        }
    }

    /**
     * Get character response based on input
     */
    async getResponse(input, context = {}) {
        // Base implementation - override in child classes
        return {
            text: `${this.name} acknowledges: "${input}"`,
            mood: 'neutral',
            action: null
        };
    }

    /**
     * Handle character interactions
     */
    async interact(action, data = {}) {
        console.log(`[${this.name}] Interaction:`, action, data);

        switch (action) {
            case 'greet':
                await this.speak(this.personality.greetings?.[0] || `Hello, I'm ${this.name}`);
                break;

            case 'farewell':
                await this.speak(this.personality.farewells?.[0] || 'Goodbye!');
                break;

            default:
                // Handle custom interactions in child classes
                this.handleCustomInteraction(action, data);
        }

        this.state.interactionCount++;
    }

    /**
     * Handle custom interactions (override in child classes)
     */
    handleCustomInteraction(action, data) {
        console.log(`[${this.name}] Unhandled interaction:`, action);
    }

    /**
     * Load sprite assets
     */
    async loadSprites(spriteConfig) {
        // Implementation for sprite loading
    }

    /**
     * Load voice samples
     */
    async loadVoiceSamples(sampleConfig) {
        // Implementation for voice sample loading
    }

    /**
     * Event emitter functionality
     */
    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event).add(handler);
    }

    off(event, handler) {
        if (this.handlers.has(event)) {
            this.handlers.get(event).delete(handler);
        }
    }

    emit(event, data) {
        if (this.handlers.has(event)) {
            this.handlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`[${this.name}] Event handler error:`, error);
                }
            });
        }
    }

    /**
     * Handle initialization errors
     */
    handleInitializationError(error) {
        console.error(`[${this.name}] Critical initialization error:`, error);

        // Create fallback visual indicator
        if (!this.elements.container) {
            this.elements.container = document.createElement('div');
            this.elements.container.className = 'character-error';
            this.elements.container.textContent = `${this.name} unavailable`;
            document.body.appendChild(this.elements.container);
        }
    }

    /**
     * Cleanup and destroy character
     */
    destroy() {
        console.log(`[${this.name}] Destroying character`);

        // Stop all activities
        this.stopSpeaking();
        this.deactivate();

        // Clean up audio
        if (this.audioContext) {
            this.audioContext.close();
        }

        // Remove visual elements
        Object.values(this.elements).forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });

        // Clear references
        this.handlers.clear();
        this.voiceQueue = [];
        this.currentUtterance = null;

        // Emit destruction event
        this.emit('destroyed', { character: this });
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseCharacter;
}
