/**
 * Speech Synthesis - Text-to-speech with character voices
 * Handles voice selection and themed audio effects
 */

import { EventBus } from '../../core/events.js';
import { AppState } from '../../core/state.js';

export class SpeechSynthesisManager {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.voices = [];
        this.currentVoice = null;
        this.isSupported = !!this.synthesis;
        this.isSpeaking = false;
        this.queue = [];
        this.isProcessingQueue = false;

        this.voicePreferences = {
            default: { gender: 'female', lang: 'en-US', names: ['zira', 'samantha', 'ava', 'google'] },
            jaws: { gender: 'male', lang: 'en-AU', names: ['russell', 'lee', 'australian'] },
            jurassic: { gender: 'male', lang: 'en-GB', names: ['daniel', 'david', 'british'] }
        };

        this.characterVoices = {
            quint: { pitch: 0.7, rate: 0.85, volume: 1.0 },
            brody: { pitch: 0.9, rate: 0.95, volume: 0.9 },
            hooper: { pitch: 1.1, rate: 1.1, volume: 0.85 },
            muldoon: { pitch: 0.8, rate: 0.8, volume: 1.0 },
            'mr-dna': { pitch: 1.3, rate: 1.2, volume: 0.9 }
        };

        this.audioEffects = {
            radio: {
                filterNode: null,
                gainNode: null,
                audioContext: null
            },
            ambient: {
                sounds: new Map(),
                currentTheme: null
            }
        };

        this.init();
    }

    init() {
        if (!this.isSupported) {
            console.warn('Speech synthesis not supported');
            return;
        }

        this.loadVoices();
        this.setupEventListeners();
        this.initializeAudioContext();

        // Listen for voices loaded event
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    setupEventListeners() {
        EventBus.on('voice:speak', this.speak.bind(this));
        EventBus.on('voice:speak-as-character', this.speakAsCharacter.bind(this));
        EventBus.on('voice:stop', this.stopSpeaking.bind(this));
        EventBus.on('voice:pause', this.pauseSpeaking.bind(this));
        EventBus.on('voice:resume', this.resumeSpeaking.bind(this));
        EventBus.on('theme:changed', this.onThemeChanged.bind(this));
        EventBus.on('settings:auto-speak-changed', this.onAutoSpeakChanged.bind(this));
    }

    loadVoices() {
        try {
            this.voices = this.synthesis.getVoices();

            if (this.voices.length === 0) {
                // Retry after a short delay for browsers that load voices asynchronously
                setTimeout(() => this.loadVoices(), 500);
                return;
            }

            this.selectOptimalVoice();
            console.log(`Loaded ${this.voices.length} voices, selected: ${this.currentVoice ? this.currentVoice.name : 'none'}`);

        } catch (error) {
            console.error('Error loading voices:', error);
        }
    }

    selectOptimalVoice() {
        const theme = AppState.currentTheme || 'default';
        const preferences = this.voicePreferences[theme] || this.voicePreferences.default;

        let selectedVoice = null;

        // Try to find voice by name keywords
        for (const nameKeyword of preferences.names) {
            selectedVoice = this.voices.find(voice =>
                voice.name.toLowerCase().includes(nameKeyword) &&
                voice.lang.startsWith(preferences.lang.substring(0, 2))
            );
            if (selectedVoice) break;
        }

        // Fallback to language and gender
        if (!selectedVoice) {
            selectedVoice = this.voices.find(voice =>
                voice.lang.startsWith(preferences.lang) &&
                (voice.gender === preferences.gender ||
                 voice.name.toLowerCase().includes(preferences.gender))
            );
        }

        // Fallback to language only
        if (!selectedVoice) {
            selectedVoice = this.voices.find(voice =>
                voice.lang.startsWith(preferences.lang.substring(0, 2))
            );
        }

        // Final fallback to default voice
        if (!selectedVoice) {
            selectedVoice = this.voices.find(voice => voice.default) || this.voices[0];
        }

        this.currentVoice = selectedVoice;

        if (selectedVoice) {
            console.log(`Selected voice for ${theme} theme:`, {
                name: selectedVoice.name,
                lang: selectedVoice.lang,
                gender: selectedVoice.gender || 'unknown'
            });
        }
    }

    async speak(data) {
        const { text, character, options = {} } = data;

        if (!AppState.autoSpeak || !this.isSupported || !text) {
            return false;
        }

        const processedText = this.preprocessText(text);
        if (!processedText.trim()) return false;

        const utterance = this.createUtterance(processedText, character, options);

        return new Promise((resolve) => {
            utterance.onend = () => resolve(true);
            utterance.onerror = () => resolve(false);

            this.addToQueue(utterance);
        });
    }

    async speakAsCharacter(data) {
        const { text, character, theme } = data;
        const characterConfig = this.characterVoices[character];

        if (!characterConfig) {
            // Fallback to regular speech
            return this.speak({ text, options: { theme } });
        }

        const options = {
            ...characterConfig,
            character,
            theme,
            applyEffects: true
        };

        return this.speak({ text, character, options });
    }

    createUtterance(text, character, options) {
        const utterance = new SpeechSynthesisUtterance(text);

        // Set voice
        if (this.currentVoice) {
            utterance.voice = this.currentVoice;
        }

        // Apply character-specific settings
        if (character && this.characterVoices[character]) {
            const charConfig = this.characterVoices[character];
            utterance.pitch = charConfig.pitch;
            utterance.rate = charConfig.rate;
            utterance.volume = charConfig.volume;
        } else {
            // Apply theme-specific defaults
            const theme = options.theme || AppState.currentTheme || 'default';
            this.applyThemeSettings(utterance, theme);
        }

        // Override with custom options
        if (options.pitch !== undefined) utterance.pitch = options.pitch;
        if (options.rate !== undefined) utterance.rate = options.rate;
        if (options.volume !== undefined) utterance.volume = options.volume;

        // Set up event handlers
        this.setupUtteranceEvents(utterance, character, options);

        return utterance;
    }

    applyThemeSettings(utterance, theme) {
        switch (theme) {
            case 'jaws':
                utterance.pitch = 0.7;
                utterance.rate = 0.88;
                utterance.volume = 1.0;
                break;
            case 'jurassic':
                utterance.pitch = 0.85;
                utterance.rate = 0.8;
                utterance.volume = 1.0;
                break;
            default:
                utterance.pitch = 1.05;
                utterance.rate = 1.0;
                utterance.volume = 1.0;
        }
    }

    setupUtteranceEvents(utterance, character, options) {
        utterance.onstart = () => {
            this.isSpeaking = true;

            // Apply audio effects if needed
            if (options.applyEffects) {
                this.applyAudioEffects(character, options.theme);
            }

            EventBus.emit('voice:speech-started', {
                character,
                text: utterance.text.substring(0, 50) + '...'
            });

            console.log(`Speech started: ${character || 'default'} - "${utterance.text.substring(0, 50)}..."`);
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            this.removeAudioEffects();

            EventBus.emit('voice:speech-ended', { character });
            console.log('Speech ended');

            // Process next item in queue
            this.processQueue();
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            this.isSpeaking = false;
            this.removeAudioEffects();

            this.handleSpeechError(event.error, utterance);

            // Continue with queue even after error
            this.processQueue();
        };

        utterance.onpause = () => {
            EventBus.emit('voice:speech-paused');
        };

        utterance.onresume = () => {
            EventBus.emit('voice:speech-resumed');
        };
    }

    preprocessText(text) {
        if (typeof text !== 'string') return '';

        // Remove markdown formatting for cleaner speech
        let processed = text
            .replace(/\*\*(.*?)\*\*/g, '$1.') // Bold to emphasis
            .replace(/\*(.*?)\*/g, '$1.') // Italic to emphasis
            .replace(/`([^`]+)`/g, '$1') // Remove code formatting
            .replace(/```[\s\S]*?```/g, '[code block]') // Replace code blocks
            .replace(/<br\s*\/?>/gi, '\n') // BR tags to newlines
            .replace(/<\/?[^>]+(>|$)/g, '') // Strip HTML tags
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links to text only
            .replace(/\n{2,}/g, '. ') // Multiple newlines to periods
            .replace(/\n/g, '. ') // Single newlines to periods
            .replace(/\.{2,}/g, '.') // Multiple periods to single
            .trim();

        // Add pauses for better speech rhythm
        processed = processed
            .replace(/([.!?])\s+/g, '$1 ... ') // Add pauses after sentences
            .replace(/:\s*/g, ': ... ') // Add pauses after colons
            .replace(/;\s*/g, '; ... '); // Add pauses after semicolons

        return processed;
    }

    addToQueue(utterance) {
        this.queue.push(utterance);

        if (!this.isProcessingQueue) {
            this.processQueue();
        }
    }

    processQueue() {
        if (this.queue.length === 0 || this.isSpeaking) {
            this.isProcessingQueue = false;
            return;
        }

        this.isProcessingQueue = true;
        const utterance = this.queue.shift();

        try {
            this.synthesis.speak(utterance);
        } catch (error) {
            console.error('Error speaking utterance:', error);
            this.isSpeaking = false;
            // Continue with next item
            setTimeout(() => this.processQueue(), 100);
        }
    }

    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
        }

        this.queue = [];
        this.isSpeaking = false;
        this.isProcessingQueue = false;
        this.removeAudioEffects();

        EventBus.emit('voice:speech-stopped');
    }

    pauseSpeaking() {
        if (this.synthesis && this.isSpeaking) {
            this.synthesis.pause();
        }
    }

    resumeSpeaking() {
        if (this.synthesis && this.synthesis.paused) {
            this.synthesis.resume();
        }
    }

    initializeAudioContext() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioEffects.radio.audioContext = new AudioContext();
            }
        } catch (error) {
            console.warn('Could not initialize audio context for effects:', error);
        }
    }

    applyAudioEffects(character, theme) {
        if (!this.audioEffects.radio.audioContext) return;

        try {
            const context = this.audioEffects.radio.audioContext;

            // Create audio processing chain for radio effect (Muldoon)
            if (character === 'muldoon') {
                // Create nodes for radio effect
                const gainNode = context.createGain();
                const filterNode = context.createBiquadFilter();

                // Configure filter for radio effect
                filterNode.type = 'bandpass';
                filterNode.frequency.value = 1000; // Center frequency
                filterNode.Q.value = 5; // Narrow band

                // Reduce gain for radio effect
                gainNode.gain.value = 0.7;

                // Store references
                this.audioEffects.radio.gainNode = gainNode;
                this.audioEffects.radio.filterNode = filterNode;

                // Note: Actual connection to speech synthesis audio stream
                // would require more complex audio routing that's not easily
                // achievable with the current Web Speech API
            }
        } catch (error) {
            console.warn('Could not apply audio effects:', error);
        }
    }

    removeAudioEffects() {
        if (this.audioEffects.radio.gainNode) {
            this.audioEffects.radio.gainNode.disconnect();
            this.audioEffects.radio.gainNode = null;
        }

        if (this.audioEffects.radio.filterNode) {
            this.audioEffects.radio.filterNode.disconnect();
            this.audioEffects.radio.filterNode = null;
        }
    }

    handleSpeechError(error, utterance) {
        let userMessage = "Speech synthesis encountered an error.";

        switch (error) {
            case 'not-allowed':
                userMessage = "Audio playback was blocked. Please interact with the page or check browser sound permissions.";
                break;
            case 'voice-unavailable':
                userMessage = "Selected voice is unavailable. Trying alternative voice.";
                this.selectFallbackVoice();
                break;
            case 'synthesis-failed':
                userMessage = "Speech synthesis failed. Retrying...";
                // Retry once
                setTimeout(() => {
                    try {
                        this.synthesis.speak(utterance);
                    } catch (retryError) {
                        console.error('Retry failed:', retryError);
                    }
                }, 500);
                break;
            case 'audio-busy':
                userMessage = "Audio system is busy. Retrying...";
                setTimeout(() => this.processQueue(), 1000);
                break;
        }

        console.warn('Speech error:', userMessage);
        EventBus.emit('voice:synthesis-error', { error, message: userMessage });
    }

    selectFallbackVoice() {
        if (this.voices.length === 0) return;

        // Try to find any English voice as fallback
        const fallbackVoice = this.voices.find(voice =>
            voice.lang.startsWith('en') && voice !== this.currentVoice
        ) || this.voices[0];

        if (fallbackVoice) {
            console.log('Switching to fallback voice:', fallbackVoice.name);
            this.currentVoice = fallbackVoice;
        }
    }

    onThemeChanged(data) {
        // Reload optimal voice for new theme
        this.selectOptimalVoice();

        // Update any playing audio effects
        if (this.isSpeaking) {
            this.applyAudioEffects(null, data.theme);
        }
    }

    onAutoSpeakChanged(data) {
        if (!data.enabled) {
            this.stopSpeaking();
        }
    }

    // Public API methods
    isSupported() {
        return this.isSupported;
    }

    isSpeakingNow() {
        return this.isSpeaking;
    }

    getAvailableVoices() {
        return this.voices.map(voice => ({
            name: voice.name,
            lang: voice.lang,
            gender: voice.gender || 'unknown',
            default: voice.default || false
        }));
    }

    getCurrentVoice() {
        return this.currentVoice ? {
            name: this.currentVoice.name,
            lang: this.currentVoice.lang,
            gender: this.currentVoice.gender || 'unknown'
        } : null;
    }

    setVoice(voiceName) {
        const voice = this.voices.find(v => v.name === voiceName);
        if (voice) {
            this.currentVoice = voice;
            return true;
        }
        return false;
    }

    getQueueLength() {
        return this.queue.length;
    }

    clearQueue() {
        this.queue = [];
    }

    testVoice(text = "Hello, this is a voice test.") {
        return this.speak({
            text,
            options: {
                pitch: 1.0,
                rate: 1.0,
                volume: 1.0
            }
        });
    }
}
