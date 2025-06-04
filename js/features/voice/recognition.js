/**
 * Speech Recognition - Handles voice input with enhanced accuracy
 * Includes noise reduction and command recognition
 */

import { EventBus } from '../../core/events.js';
import { AppState } from '../../core/state.js';

export class SpeechRecognitionManager {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        this.isSupported = false;
        this.currentLanguage = 'en-US';
        this.confidence = 0;
        this.finalTranscript = '';
        this.interimTranscript = '';

        this.config = {
            continuous: false,
            interimResults: true,
            maxAlternatives: 3,
            grammars: null
        };

        this.noiseFilter = {
            minConfidence: 0.6,
            maxSilenceTime: 3000, // 3 seconds
            minSpeechTime: 500    // 0.5 seconds
        };

        this.commands = {
            'clear chat': () => EventBus.emit('chat:clear-messages'),
            'new chat': () => EventBus.emit('chat:create-new'),
            'switch theme': () => this.handleThemeSwitch(),
            'send message': () => this.handleSendMessage(),
            'stop recording': () => this.stopRecording()
        };

        this.silenceTimer = null;
        this.speechStartTime = null;
        this.lastSpeechTime = null;

        this.init();
    }

    init() {
        this.setupSpeechRecognition();
        this.setupEventListeners();
        this.updateLanguageSettings();
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech recognition not supported in this browser');
            this.isSupported = false;
            this.hideVoiceButton();
            return;
        }

        this.isSupported = true;
        this.recognition = new SpeechRecognition();

        // Configure recognition
        Object.assign(this.recognition, this.config);
        this.recognition.lang = this.currentLanguage;

        this.setupRecognitionEvents();
        console.log('Speech recognition initialized successfully');
    }

    setupRecognitionEvents() {
        if (!this.recognition) return;

        this.recognition.onstart = () => {
            console.log('Speech recognition started');
            this.isRecording = true;
            this.speechStartTime = Date.now();
            this.resetTranscripts();
            this.startSilenceDetection();
            EventBus.emit('voice:recognition-started');
        };

        this.recognition.onresult = (event) => {
            this.processRecognitionResults(event);
        };

        this.recognition.onerror = (event) => {
            this.handleRecognitionError(event);
        };

        this.recognition.onend = () => {
            this.handleRecognitionEnd();
        };

        this.recognition.onspeechstart = () => {
            console.log('Speech detected');
            this.lastSpeechTime = Date.now();
            this.clearSilenceTimer();
        };

        this.recognition.onspeechend = () => {
            console.log('Speech ended');
            this.startSilenceDetection();
        };

        this.recognition.onnomatch = () => {
            console.log('No speech match found');
        };
    }

    setupEventListeners() {
        EventBus.on('voice:start-recording', this.startRecording.bind(this));
        EventBus.on('voice:stop-recording', this.stopRecording.bind(this));
        EventBus.on('voice:toggle', this.toggleRecording.bind(this));
        EventBus.on('theme:changed', this.updateLanguageSettings.bind(this));

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRecording) {
                this.stopRecording(false); // Don't send message on page hide
            }
        });
    }

    startRecording() {
        if (!this.isSupported || this.isRecording) {
            return false;
        }

        if (!this.recognition) {
            console.error('Speech recognition not initialized');
            return false;
        }

        try {
            this.resetTranscripts();
            this.recognition.start();
            this.updateUI(true);
            EventBus.emit('audio:play-ui-sound', { sound: 'start' });
            return true;
        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            this.handleRecognitionError({ error: 'audio-capture' });
            return false;
        }
    }

    stopRecording(sendMessage = false) {
        if (!this.isRecording) return false;

        this.clearSilenceTimer();

        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.warn('Error stopping recognition:', error);
            }
        }

        this.isRecording = false;
        this.updateUI(false);

        if (!sendMessage) {
            EventBus.emit('audio:play-ui-sound', { sound: 'stop' });
        }

        // Process final result if we have good speech
        if (sendMessage && this.shouldSendFinalResult()) {
            this.sendFinalTranscript();
        }

        EventBus.emit('voice:recognition-stopped', {
            transcript: this.finalTranscript,
            sendMessage
        });

        return true;
    }

    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording(false);
        } else {
            this.startRecording();
        }
    }

    processRecognitionResults(event) {
        let interimTranscript = '';
        let finalTranscript = '';
        let maxConfidence = 0;

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            const confidence = result[0].confidence || 0;

            maxConfidence = Math.max(maxConfidence, confidence);

            if (result.isFinal) {
                if (confidence >= this.noiseFilter.minConfidence) {
                    finalTranscript += transcript;
                    this.finalTranscript = finalTranscript;
                    this.handleFinalResult(finalTranscript, confidence);
                }
            } else {
                interimTranscript += transcript;
                this.interimTranscript = interimTranscript;
            }
        }

        this.confidence = maxConfidence;
        this.updateInputDisplay(finalTranscript || interimTranscript);

        // Check for voice commands
        if (finalTranscript) {
            this.checkForCommands(finalTranscript);
        }

        EventBus.emit('voice:transcript-updated', {
            final: finalTranscript,
            interim: interimTranscript,
            confidence: maxConfidence
        });
    }

    handleFinalResult(transcript, confidence) {
        console.log(`Final result: "${transcript}" (confidence: ${confidence})`);

        if (this.meetsQualityThreshold(transcript, confidence)) {
            // Auto-stop and send for high-quality results
            if (!this.recognition.calledStopFromFinal) {
                this.recognition.calledStopFromFinal = true;
                this.stopRecording(true);
            }
        }
    }

    handleRecognitionError(event) {
        console.error('Speech recognition error:', event.error, event.message);

        let userMessage = "Speech recognition encountered an issue. Please try again.";

        switch (event.error) {
            case 'no-speech':
                userMessage = "No speech detected. Make sure your microphone is active and try speaking clearly.";
                break;
            case 'audio-capture':
                userMessage = "Microphone error. Please check if it's connected and enabled.";
                break;
            case 'not-allowed':
                userMessage = "Microphone access denied. Please enable microphone permissions for this site.";
                break;
            case 'network':
                userMessage = "Network error during speech recognition. Please check your connection.";
                break;
            case 'service-not-allowed':
                userMessage = "Speech recognition service not allowed. Please check your browser settings.";
                break;
        }

        EventBus.emit('voice:recognition-error', {
            error: event.error,
            message: userMessage
        });

        if (this.isRecording) {
            this.stopRecording(false);
        }

        // Show user-friendly error
        this.showErrorMessage(userMessage);
    }

    handleRecognitionEnd() {
        console.log('Speech recognition ended');

        if (this.recognition && !this.recognition.calledStopFromFinal) {
            this.isRecording = false;
            this.updateUI(false);

            // Don't send message if recognition ended prematurely
            EventBus.emit('voice:recognition-stopped', {
                transcript: this.finalTranscript,
                sendMessage: false
            });
        }

        // Reset flags
        if (this.recognition) {
            this.recognition.calledStopFromFinal = false;
        }

        this.clearSilenceTimer();
    }

    startSilenceDetection() {
        this.clearSilenceTimer();

        this.silenceTimer = setTimeout(() => {
            if (this.isRecording) {
                console.log('Stopping due to silence timeout');
                this.stopRecording(this.shouldSendFinalResult());
            }
        }, this.noiseFilter.maxSilenceTime);
    }

    clearSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }

    shouldSendFinalResult() {
        const hasGoodTranscript = this.finalTranscript.trim().length > 0;
        const hasGoodConfidence = this.confidence >= this.noiseFilter.minConfidence;
        const hasSufficientSpeechTime = this.speechStartTime &&
            (Date.now() - this.speechStartTime) >= this.noiseFilter.minSpeechTime;

        return hasGoodTranscript && hasGoodConfidence && hasSufficientSpeechTime;
    }

    meetsQualityThreshold(transcript, confidence) {
        return transcript.trim().length >= 3 &&
               confidence >= this.noiseFilter.minConfidence;
    }

    sendFinalTranscript() {
        if (this.finalTranscript.trim()) {
            EventBus.emit('chat:voice-input', {
                text: this.finalTranscript.trim(),
                confidence: this.confidence
            });

            // Clear input display
            this.updateInputDisplay('');
        }
    }

    checkForCommands(transcript) {
        const lowerTranscript = transcript.toLowerCase().trim();

        for (const [command, action] of Object.entries(this.commands)) {
            if (lowerTranscript.includes(command)) {
                console.log(`Voice command detected: ${command}`);
                action();
                return true;
            }
        }

        return false;
    }

    updateInputDisplay(text) {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.value = text;
            chatInput.placeholder = this.isRecording ? "Listening..." : "Send a message to Parkland AI...";
        }

        // Update send button state
        EventBus.emit('ui:update-send-button');
    }

    updateUI(isRecording) {
        const voiceBtn = document.getElementById('voiceBtn');
        const voiceIndicator = document.getElementById('voiceIndicator');

        if (voiceBtn) {
            voiceBtn.classList.toggle('recording', isRecording);
            voiceBtn.setAttribute('aria-label', isRecording ? 'Stop Voice Input' : 'Start Voice Input');
            voiceBtn.setAttribute('aria-pressed', String(isRecording));
        }

        if (voiceIndicator) {
            voiceIndicator.classList.toggle('active', isRecording);
        }
    }

    updateLanguageSettings() {
        const theme = AppState.currentTheme;

        // Adjust language settings based on theme
        switch (theme) {
            case 'jaws':
                // Could use Australian English if available
                this.currentLanguage = 'en-AU';
                break;
            case 'jurassic':
                // Could use British English if available
                this.currentLanguage = 'en-GB';
                break;
            default:
                this.currentLanguage = 'en-US';
        }

        if (this.recognition) {
            this.recognition.lang = this.currentLanguage;
        }
    }

    hideVoiceButton() {
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.style.display = 'none';
        }
    }

    showErrorMessage(message) {
        // Could integrate with notification system
        console.warn('Voice recognition error:', message);

        // For now, just emit an event
        EventBus.emit('ui:show-notification', {
            type: 'error',
            message: message,
            duration: 5000
        });
    }

    resetTranscripts() {
        this.finalTranscript = '';
        this.interimTranscript = '';
        this.confidence = 0;
    }

    handleThemeSwitch() {
        // Cycle through themes
        const themes = ['default', 'jaws', 'jurassic'];
        const currentIndex = themes.indexOf(AppState.currentTheme || 'default');
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];

        EventBus.emit('theme:switch', { theme: nextTheme });
    }

    handleSendMessage() {
        if (this.finalTranscript.trim()) {
            this.sendFinalTranscript();
            this.stopRecording(false);
        }
    }

    // Public API methods
    isRecognitionSupported() {
        return this.isSupported;
    }

    isCurrentlyRecording() {
        return this.isRecording;
    }

    getCurrentTranscript() {
        return {
            final: this.finalTranscript,
            interim: this.interimTranscript,
            confidence: this.confidence
        };
    }

    getRecognitionConfig() {
        return {
            language: this.currentLanguage,
            continuous: this.config.continuous,
            interimResults: this.config.interimResults,
            supported: this.isSupported
        };
    }

    setLanguage(language) {
        this.currentLanguage = language;
        if (this.recognition) {
            this.recognition.lang = language;
        }
    }

    addVoiceCommand(command, callback) {
        this.commands[command.toLowerCase()] = callback;
    }

    removeVoiceCommand(command) {
        delete this.commands[command.toLowerCase()];
    }

    getAvailableCommands() {
        return Object.keys(this.commands);
    }
}
