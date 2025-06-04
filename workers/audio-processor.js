/**
 * Audio Processor Worker - Real-time audio effects for Parkland AI Opus Magnum
 * Handles character voice processing, environmental audio, and theme-specific effects
 */

class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.activeEffects = new Map();
        this.characterProfiles = new Map();
        this.environmentalSources = new Map();
        this.masterGain = null;
        this.compressor = null;
        this.isInitialized = false;

        this.effectChains = {
            radio: null,
            underwater: null,
            ambient: null
        };
    }

    async init() {
        try {
            this.audioContext = new AudioContext();
            this.setupMasterChain();
            this.createEffectChains();
            this.setupCharacterProfiles();
            this.isInitialized = true;

            postMessage({
                type: 'audio_initialized',
                sampleRate: this.audioContext.sampleRate
            });
        } catch (error) {
            postMessage({
                type: 'audio_error',
                error: error.message
            });
        }
    }

    setupMasterChain() {
        // Master output chain
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.setValueAtTime(0.8, this.audioContext.currentTime);

        // Master compressor for consistent levels
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
        this.compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
        this.compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
        this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.audioContext.destination);
    }

    createEffectChains() {
        // ========================================
        // RADIO EFFECT CHAIN (Muldoon)
        // ========================================
        this.effectChains.radio = this.createRadioEffect();

        // ========================================
        // UNDERWATER EFFECT CHAIN (Jaws theme)
        // ========================================
        this.effectChains.underwater = this.createUnderwaterEffect();

        // ========================================
        // AMBIENT EFFECT CHAIN (Environment)
        // ========================================
        this.effectChains.ambient = this.createAmbientEffect();
    }

    createRadioEffect() {
        const input = this.audioContext.createGain();
        const output = this.audioContext.createGain();

        // High-pass filter to remove low frequencies
        const highpass = this.audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.setValueAtTime(300, this.audioContext.currentTime);
        highpass.Q.setValueAtTime(0.7, this.audioContext.currentTime);

        // Low-pass filter to remove high frequencies
        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(3000, this.audioContext.currentTime);
        lowpass.Q.setValueAtTime(0.7, this.audioContext.currentTime);

        // Bit crusher effect for digital distortion
        const waveshaper = this.audioContext.createWaveShaper();
        waveshaper.curve = this.createRadioDistortionCurve();
        waveshaper.oversample = '2x';

        // Compressor for radio-style dynamics
        const radioCompressor = this.audioContext.createDynamicsCompressor();
        radioCompressor.threshold.setValueAtTime(-20, this.audioContext.currentTime);
        radioCompressor.knee.setValueAtTime(15, this.audioContext.currentTime);
        radioCompressor.ratio.setValueAtTime(8, this.audioContext.currentTime);
        radioCompressor.attack.setValueAtTime(0.001, this.audioContext.currentTime);
        radioCompressor.release.setValueAtTime(0.1, this.audioContext.currentTime);

        // Static noise generator
        const staticGain = this.audioContext.createGain();
        staticGain.gain.setValueAtTime(0.05, this.audioContext.currentTime);

        // Chain effects
        input.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(waveshaper);
        waveshaper.connect(radioCompressor);
        radioCompressor.connect(output);

        // Add static noise
        this.createStaticNoise().connect(staticGain);
        staticGain.connect(output);

        return { input, output, controls: { highpass, lowpass, staticGain } };
    }

    createUnderwaterEffect() {
        const input = this.audioContext.createGain();
        const output = this.audioContext.createGain();

        // Low-pass filter for muffled underwater sound
        const underwaterFilter = this.audioContext.createBiquadFilter();
        underwaterFilter.type = 'lowpass';
        underwaterFilter.frequency.setValueAtTime(800, this.audioContext.currentTime);
        underwaterFilter.Q.setValueAtTime(2.0, this.audioContext.currentTime);

        // Reverb for underwater acoustics
        const convolver = this.audioContext.createConvolver();
        convolver.buffer = this.createUnderwaterImpulseResponse();

        // Chorus effect for water movement
        const chorus = this.createChorusEffect();

        // Low-frequency oscillation for water pressure
        const lfo = this.audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.3, this.audioContext.currentTime);

        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.setValueAtTime(50, this.audioContext.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(underwaterFilter.frequency);
        lfo.start();

        // Chain effects
        input.connect(underwaterFilter);
        underwaterFilter.connect(chorus.input);
        chorus.output.connect(convolver);
        convolver.connect(output);

        return { input, output, controls: { underwaterFilter, convolver, lfo } };
    }

    createAmbientEffect() {
        const input = this.audioContext.createGain();
        const output = this.audioContext.createGain();

        // Spatial reverb
        const reverb = this.audioContext.createConvolver();
        reverb.buffer = this.createAmbientImpulseResponse();

        // EQ for environmental shaping
        const eq = this.create3BandEQ();

        // Dynamic range expander for natural ambience
        const expander = this.createExpander();

        // Chain effects
        input.connect(eq.input);
        eq.output.connect(expander.input);
        expander.output.connect(reverb);
        reverb.connect(output);

        return { input, output, controls: { eq, expander } };
    }

    // ========================================
    // CHARACTER VOICE PROFILES
    // ========================================

    setupCharacterProfiles() {
        // Quint - Gruff sea captain
        this.characterProfiles.set('quint', {
            pitch: 0.85,
            rate: 0.9,
            voice: 'male-gruff',
            effects: ['slight_reverb', 'vocal_distortion'],
            personality: {
                pauses: 'dramatic',
                emphasis: 'strong',
                breathing: 'heavy'
            }
        });

        // Brody - Nervous chief of police
        this.characterProfiles.set('brody', {
            pitch: 1.0,
            rate: 1.1,
            voice: 'male-nervous',
            effects: ['slight_compression'],
            personality: {
                pauses: 'hesitant',
                emphasis: 'cautious',
                breathing: 'quick'
            }
        });

        // Hooper - Enthusiastic marine biologist
        this.characterProfiles.set('hooper', {
            pitch: 1.15,
            rate: 1.2,
            voice: 'male-enthusiastic',
            effects: ['bright_eq'],
            personality: {
                pauses: 'minimal',
                emphasis: 'excited',
                breathing: 'normal'
            }
        });

        // Muldoon - Military precision through radio
        this.characterProfiles.set('muldoon', {
            pitch: 0.9,
            rate: 0.95,
            voice: 'male-military',
            effects: ['radio', 'static_background'],
            personality: {
                pauses: 'tactical',
                emphasis: 'controlled',
                breathing: 'controlled'
            }
        });

        // Mr. DNA - Cheerful cartoon character
        this.characterProfiles.set('mr_dna', {
            pitch: 1.3,
            rate: 1.15,
            voice: 'cartoon-cheerful',
            effects: ['bright_eq', 'slight_chorus'],
            personality: {
                pauses: 'bouncy',
                emphasis: 'educational',
                breathing: 'artificial'
            }
        });
    }

    // ========================================
    // AUDIO PROCESSING FUNCTIONS
    // ========================================

    processCharacterSpeech(audioBuffer, characterId, options = {}) {
        const profile = this.characterProfiles.get(characterId);
        if (!profile) return audioBuffer;

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;

        let currentNode = source;

        // Apply character-specific effects
        profile.effects.forEach(effectName => {
            const effect = this.getEffect(effectName);
            if (effect) {
                currentNode.connect(effect.input);
                currentNode = effect.output;
            }
        });

        // Apply radio effect for Muldoon
        if (characterId === 'muldoon') {
            currentNode.connect(this.effectChains.radio.input);
            currentNode = this.effectChains.radio.output;
        }

        // Apply underwater effect for Jaws characters when appropriate
        if (['quint', 'brody', 'hooper'].includes(characterId) && options.underwater) {
            currentNode.connect(this.effectChains.underwater.input);
            currentNode = this.effectChains.underwater.output;
        }

        currentNode.connect(this.masterGain);
        return source;
    }

    createStaticNoise() {
        const bufferSize = this.audioContext.sampleRate * 2; // 2 seconds
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        // Generate pink noise for radio static
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;

            output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;

        return source;
    }

    createRadioDistortionCurve() {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + 20) * x * 20 * deg) / (Math.PI + 20 * Math.abs(x));
        }

        return curve;
    }

    createUnderwaterImpulseResponse() {
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * 3; // 3 seconds
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);

            for (let i = 0; i < length; i++) {
                const decay = Math.pow(1 - i / length, 3);
                const delay = Math.floor(Math.random() * 1000);

                if (i > delay) {
                    channelData[i] = (Math.random() * 2 - 1) * decay * 0.3;
                } else {
                    channelData[i] = 0;
                }
            }
        }

        return impulse;
    }

    createChorusEffect() {
        const input = this.audioContext.createGain();
        const output = this.audioContext.createGain();
        const delay = this.audioContext.createDelay(0.02);
        const feedback = this.audioContext.createGain();
        const mix = this.audioContext.createGain();

        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();

        // Configure LFO
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.5, this.audioContext.currentTime);
        lfoGain.gain.setValueAtTime(0.005, this.audioContext.currentTime);

        // Configure feedback
        feedback.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        mix.gain.setValueAtTime(0.5, this.audioContext.currentTime);

        // Connect LFO to delay time
        lfo.connect(lfoGain);
        lfoGain.connect(delay.delayTime);
        lfo.start();

        // Connect effect chain
        input.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(mix);
        mix.connect(output);

        // Dry signal
        input.connect(output);

        return { input, output };
    }

    // ========================================
    // ENVIRONMENTAL AUDIO SYSTEMS
    // ========================================

    startEnvironmentalAudio(theme) {
        this.stopAllEnvironmentalAudio();

        switch (theme) {
            case 'jaws':
                this.startOceanAmbience();
                break;
            case 'jurassic':
                this.startJungleAmbience();
                break;
        }
    }

    startOceanAmbience() {
        const oceanLayers = {
            waves: this.createOceanWaves(),
            wind: this.createOceanWind(),
            seagulls: this.createSeagulls(),
            boat: this.createBoatSounds()
        };

        Object.entries(oceanLayers).forEach(([name, source]) => {
            this.environmentalSources.set(`ocean_${name}`, source);
            source.connect(this.effectChains.ambient.input);
            source.start();
        });
    }

    startJungleAmbience() {
        const jungleLayers = {
            insects: this.createInsectSounds(),
            birds: this.createBirdSounds(),
            wind: this.createJungleWind(),
            rain: this.createRainSounds()
        };

        Object.entries(jungleLayers).forEach(([name, source]) => {
            this.environmentalSources.set(`jungle_${name}`, source);
            source.connect(this.effectChains.ambient.input);
            source.start();
        });
    }

    createOceanWaves() {
        // Procedural ocean wave generation
        const bufferSize = this.audioContext.sampleRate * 10;
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const channelData = buffer.getChannelData(channel);

            for (let i = 0; i < bufferSize; i++) {
                const time = i / this.audioContext.sampleRate;
                let sample = 0;

                // Layer multiple wave frequencies
                sample += Math.sin(2 * Math.PI * 0.1 * time) * 0.3;
                sample += Math.sin(2 * Math.PI * 0.05 * time) * 0.2;
                sample += Math.sin(2 * Math.PI * 0.03 * time) * 0.1;

                // Add noise for foam
                sample += (Math.random() * 2 - 1) * 0.05;

                channelData[i] = sample * 0.3;
            }
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        return source;
    }

    // ========================================
    // MESSAGE HANDLING
    // ========================================

    handleMessage(event) {
        const { type, data, id } = event.data;

        switch (type) {
            case 'init':
                this.init();
                break;

            case 'process_character_speech':
                const processedAudio = this.processCharacterSpeech(
                    data.audioBuffer,
                    data.characterId,
                    data.options
                );
                postMessage({
                    type: 'processed_speech',
                    data: processedAudio,
                    id
                });
                break;

            case 'start_environmental_audio':
                this.startEnvironmentalAudio(data.theme);
                break;

            case 'stop_environmental_audio':
                this.stopAllEnvironmentalAudio();
                break;

            case 'adjust_master_volume':
                if (this.masterGain) {
                    this.masterGain.gain.linearRampToValueAtTime(
                        data.volume,
                        this.audioContext.currentTime + 0.1
                    );
                }
                break;

            case 'trigger_sound_effect':
                this.playSoundEffect(data.effect, data.options);
                break;
        }
    }

    stopAllEnvironmentalAudio() {
        this.environmentalSources.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Source may already be stopped
            }
        });
        this.environmentalSources.clear();
    }

    playSoundEffect(effectName, options = {}) {
        // Implementation for one-off sound effects
        // Shark approach, electric fence, raptor calls, etc.
    }
}

// Initialize audio processor
const audioProcessor = new AudioProcessor();
self.addEventListener('message', (event) => audioProcessor.handleMessage(event));

// Initialize on first message
postMessage({ type: 'audio_worker_ready' });
