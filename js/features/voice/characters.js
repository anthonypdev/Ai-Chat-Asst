/**
 * Character Voice Profiles - Manages character-specific voice settings
 * Handles character selection and voice personality mapping
 */

import { EventBus } from '../../core/events.js';
import { AppState } from '../../core/state.js';

export class CharacterVoiceManager {
    constructor() {
        this.characters = new Map();
        this.activeCharacter = null;
        this.characterRotation = {
            jaws: ['quint', 'brody', 'hooper'],
            jurassic: ['muldoon', 'mr-dna']
        };

        this.characterStates = {
            jaws: {
                quint: { status: 'alive', lastSeen: null },
                brody: { status: 'active', lastSeen: null },
                hooper: { status: 'active', lastSeen: null }
            },
            jurassic: {
                muldoon: { status: 'hunting', alertLevel: 0, lastTransmission: null },
                'mr-dna': { status: 'active', currentTopic: null }
            }
        };

        this.conversationContext = {
            theme: null,
            messageCount: 0,
            lastCharacter: null,
            contextualTriggers: []
        };

        this.initializeCharacters();
        this.setupEventListeners();
    }

    initializeCharacters() {
        // JAWS Characters
        this.addCharacter('quint', {
            name: 'Quint',
            theme: 'jaws',
            voiceSettings: {
                pitch: 0.7,
                rate: 0.85,
                volume: 1.0,
                preferredLanguage: 'en-US'
            },
            personality: {
                gruff: true,
                experienced: true,
                storyteller: true,
                dramatic: true
            },
            catchphrases: [
                "We're gonna need a bigger boat",
                "Farewell and adieu to you fair Spanish ladies",
                "Here's to swimmin' with bow-legged women"
            ],
            responsePatterns: {
                technical: "Listen here, kid. Back in my day, we fixed problems with grit and a good sharp knife.",
                greeting: "Ahoy there, landlubber! What brings ye to these troubled waters?",
                error: "That there's a real monster of a problem. But don't you worry - old Quint's seen worse."
            }
        });

        this.addCharacter('brody', {
            name: 'Chief Brody',
            theme: 'jaws',
            voiceSettings: {
                pitch: 0.9,
                rate: 0.95,
                volume: 0.9,
                preferredLanguage: 'en-US'
            },
            personality: {
                cautious: true,
                methodical: true,
                protective: true,
                landlubber: true
            },
            catchphrases: [
                "You're gonna need a bigger boat",
                "I hate the water",
                "Smile, you son of a..."
            ],
            responsePatterns: {
                technical: "Okay, let's take this step by step. I may not know much about computers, but I know how to solve problems methodically.",
                greeting: "Chief Brody here. What seems to be the trouble?",
                error: "Alright, we've got a situation here. Stay calm, and let's work through this together."
            }
        });

        this.addCharacter('hooper', {
            name: 'Matt Hooper',
            theme: 'jaws',
            voiceSettings: {
                pitch: 1.1,
                rate: 1.1,
                volume: 0.85,
                preferredLanguage: 'en-US'
            },
            personality: {
                scientific: true,
                enthusiastic: true,
                analytical: true,
                tech_savvy: true
            },
            catchphrases: [
                "This is a perfect example of...",
                "Fascinating behavioral pattern",
                "The data suggests..."
            ],
            responsePatterns: {
                technical: "Fascinating! This technical anomaly exhibits classic symptoms of... well, let me analyze the data patterns here.",
                greeting: "Dr. Hooper here! I'm excited to dive into whatever technical challenge you've got.",
                error: "Interesting! This error pattern shows some remarkable characteristics. Let's examine the underlying systems."
            }
        });

        // JURASSIC Characters
        this.addCharacter('muldoon', {
            name: 'Robert Muldoon',
            theme: 'jurassic',
            voiceSettings: {
                pitch: 0.8,
                rate: 0.8,
                volume: 1.0,
                preferredLanguage: 'en-GB'
            },
            personality: {
                tactical: true,
                experienced: true,
                cautious: true,
                authoritative: true
            },
            catchphrases: [
                "Clever girl...",
                "They're learning...",
                "Shoot her! SHOOT HER!"
            ],
            responsePatterns: {
                technical: "*Static* Ranger, we've got a code red situation in the system mainframe. Proceeding with tactical diagnostics. *Static*",
                greeting: "*Radio crackles* Muldoon here. What's your situation, Ranger? Over.",
                error: "*Static* We've got a breach in sector 7. The raptors... they've found a way in. Implementing containment protocols."
            },
            radioEffect: true
        });

        this.addCharacter('mr-dna', {
            name: 'Mr. DNA',
            theme: 'jurassic',
            voiceSettings: {
                pitch: 1.3,
                rate: 1.2,
                volume: 0.9,
                preferredLanguage: 'en-US'
            },
            personality: {
                educational: true,
                cheerful: true,
                scientific: true,
                animated: true
            },
            catchphrases: [
                "Hi kids! I'm Mr. DNA!",
                "Let me tell you about...",
                "It's elementary, my dear Watson!"
            ],
            responsePatterns: {
                technical: "Well hello there! Mr. DNA here, and boy oh boy, do we have an exciting technical puzzle to solve together!",
                greeting: "Hi there, future scientist! I'm Mr. DNA, and I'm here to help you understand how everything works!",
                error: "Oops! Looks like we've got a little genetic anomaly in the system! Don't worry, we can fix this together!"
            },
            animations: true
        });
    }

    setupEventListeners() {
        EventBus.on('theme:changed', this.onThemeChanged.bind(this));
        EventBus.on('character:select', this.selectCharacter.bind(this));
        EventBus.on('character:rotate', this.rotateCharacter.bind(this));
        EventBus.on('message:sending', this.onMessageSending.bind(this));
        EventBus.on('message:received', this.onMessageReceived.bind(this));
        EventBus.on('character:trigger-special-event', this.handleSpecialEvent.bind(this));
    }

    addCharacter(id, config) {
        this.characters.set(id, {
            id,
            ...config,
            isActive: false,
            messageCount: 0,
            lastUsed: null
        });
    }

    selectCharacter(data) {
        const { characterId, theme } = data;
        const character = this.characters.get(characterId);

        if (!character || character.theme !== theme) {
            console.warn(`Character ${characterId} not found or not compatible with theme ${theme}`);
            return null;
        }

        // Deactivate current character
        if (this.activeCharacter) {
            this.activeCharacter.isActive = false;
        }

        // Activate new character
        character.isActive = true;
        character.lastUsed = new Date().toISOString();
        this.activeCharacter = character;

        EventBus.emit('character:activated', { character: character.id, theme });
        return character;
    }

    getCharacterForResponse(theme, context = {}) {
        if (!theme || theme === 'default') {
            return null;
        }

        const availableCharacters = this.characterRotation[theme];
        if (!availableCharacters || availableCharacters.length === 0) {
            return null;
        }

        // Handle special cases
        if (theme === 'jaws') {
            return this.selectJawsCharacter(context);
        } else if (theme === 'jurassic') {
            return this.selectJurassicCharacter(context);
        }

        return null;
    }

    selectJawsCharacter(context) {
        const state = this.characterStates.jaws;
        const { messageContent = '', isErrorResponse = false } = context;

        // Check if Quint should be "eaten" (one-time event)
        if (state.quint.status === 'alive' && this.shouldQuintMeetFate(context)) {
            return this.handleQuintDemise();
        }

        // If Quint is gone, alternate between Brody and Hooper
        if (state.quint.status === 'eaten') {
            return this.selectBrodyOrHooper(context);
        }

        // Before Quint's fate, use him for dramatic/story responses
        if (isErrorResponse || messageContent.includes('problem') || messageContent.includes('help')) {
            state.quint.lastSeen = new Date().toISOString();
            return this.characters.get('quint');
        }

        // Default to Quint for initial responses
        return this.characters.get('quint');
    }

    selectJurassicCharacter(context) {
        const state = this.characterStates.jurassic;
        const { messageContent = '', isUserMessage = false } = context;

        // Check for raptor-related content (triggers Muldoon alert)
        if (this.containsRaptorTriggers(messageContent)) {
            state.muldoon.alertLevel = Math.min(state.muldoon.alertLevel + 1, 3);
            state.muldoon.lastTransmission = new Date().toISOString();

            // High alert - Muldoon goes quiet, Mr. DNA takes over
            if (state.muldoon.alertLevel >= 2) {
                state.muldoon.status = 'hunting';
                state['mr-dna'].currentTopic = 'distraction';
                return this.characters.get('mr-dna');
            }

            return this.characters.get('muldoon');
        }

        // Normal rotation between Muldoon and Mr. DNA
        if (this.conversationContext.lastCharacter === 'muldoon') {
            // Switch to Mr. DNA for educational/cheerful responses
            return this.characters.get('mr-dna');
        } else {
            // Default to Muldoon for technical/serious responses
            return this.characters.get('muldoon');
        }
    }

    shouldQuintMeetFate(context) {
        // Quint meets his fate after several responses, triggered by specific content
        const quintUsageCount = this.characters.get('quint')?.messageCount || 0;
        const triggerPhrases = ['boat', 'bigger', 'problem', 'serious', 'help', 'emergency'];

        return quintUsageCount >= 3 &&
               triggerPhrases.some(phrase =>
                   (context.messageContent || '').toLowerCase().includes(phrase));
    }

    handleQuintDemise() {
        const state = this.characterStates.jaws;
        state.quint.status = 'eaten';

        // Dramatic transition message
        const demiseMessage = "We're gonna need a bigger boa— *VIOLENT SPLASH* *RADIO STATIC*";

        EventBus.emit('character:special-event', {
            type: 'character-lost',
            character: 'quint',
            message: demiseMessage,
            nextCharacter: 'brody'
        });

        // Return Brody to handle the aftermath
        return this.characters.get('brody');
    }

    selectBrodyOrHooper(context) {
        const { messageContent = '', isErrorResponse = false } = context;

        // Brody for serious/protective responses
        if (isErrorResponse ||
            messageContent.includes('problem') ||
            messageContent.includes('error') ||
            messageContent.includes('help')) {
            return this.characters.get('brody');
        }

        // Hooper for technical/analytical responses
        if (messageContent.includes('how') ||
            messageContent.includes('why') ||
            messageContent.includes('technical') ||
            messageContent.includes('analyze')) {
            return this.characters.get('hooper');
        }

        // Alternate based on last character used
        return this.conversationContext.lastCharacter === 'brody' ?
               this.characters.get('hooper') :
               this.characters.get('brody');
    }

    containsRaptorTriggers(content) {
        const raptorTriggers = [
            'raptor', 'clever girl', 'learning', 'hunting', 'pack',
            'security', 'breach', 'fence', 'perimeter', 'containment'
        ];

        const lowerContent = content.toLowerCase();
        return raptorTriggers.some(trigger => lowerContent.includes(trigger));
    }

    formatCharacterResponse(character, baseResponse, context = {}) {
        if (!character) return baseResponse;

        const { personality, responsePatterns } = character;

        // Add character-specific prefixes/suffixes
        let formattedResponse = baseResponse;

        if (character.id === 'muldoon' && character.radioEffect) {
            formattedResponse = this.addRadioEffect(formattedResponse);
        }

        if (character.id === 'mr-dna' && Math.random() < 0.3) {
            formattedResponse = this.addDNAEducationalNote(formattedResponse);
        }

        // Add character flavor based on personality
        if (personality.gruff && Math.random() < 0.4) {
            formattedResponse = this.addGruffFlavor(formattedResponse);
        }

        if (personality.scientific && Math.random() < 0.5) {
            formattedResponse = this.addScientificFlavor(formattedResponse);
        }

        return formattedResponse;
    }

    addRadioEffect(response) {
        const radioIntros = [
            "*Radio crackles*",
            "*Static*",
            "*Transmission begins*"
        ];

        const radioOutros = [
            "*Static*",
            "Over.",
            "*Radio cuts out*"
        ];

        const intro = radioIntros[Math.floor(Math.random() * radioIntros.length)];
        const outro = radioOutros[Math.floor(Math.random() * radioOutros.length)];

        return `${intro} ${response} ${outro}`;
    }

    addDNAEducationalNote(response) {
        const educationalNotes = [
            "\n\n🧬 **Fun DNA Fact**: Just like genetic code, computer code is made up of simple building blocks that create complex behaviors!",
            "\n\n🔬 **Science Tip**: Remember, evolution teaches us that adaptation is key - just like debugging, we learn from each iteration!",
            "\n\n⚗️ **Lab Note**: In genetics, we call unexpected changes 'mutations' - in computing, we call them 'bugs'! Both can be fascinating to study!"
        ];

        const note = educationalNotes[Math.floor(Math.random() * educationalNotes.length)];
        return response + note;
    }

    addGruffFlavor(response) {
        const gruffIntros = [
            "Listen here, ",
            "Now see here, ",
            "Look, kid, "
        ];

        if (Math.random() < 0.6) {
            const intro = gruffIntros[Math.floor(Math.random() * gruffIntros.length)];
            return intro.toLowerCase() + response;
        }

        return response;
    }

    addScientificFlavor(response) {
        const scientificPhrases = [
            "Based on my analysis, ",
            "The data indicates that ",
            "Fascinating! ",
            "According to my observations, "
        ];

        if (Math.random() < 0.4) {
            const phrase = scientificPhrases[Math.floor(Math.random() * scientificPhrases.length)];
            return phrase + response.toLowerCase();
        }

        return response;
    }

    onThemeChanged(data) {
        const { theme } = data;
        this.conversationContext.theme = theme;
        this.conversationContext.messageCount = 0;
        this.conversationContext.lastCharacter = null;

        // Reset character states for new theme
        if (theme === 'jaws') {
            this.characterStates.jaws.quint.status = 'alive';
        } else if (theme === 'jurassic') {
            this.characterStates.jurassic.muldoon.alertLevel = 0;
            this.characterStates.jurassic.muldoon.status = 'active';
        }
    }

    onMessageSending(data) {
        this.conversationContext.messageCount++;
    }

    onMessageReceived(data) {
        const { character, theme } = data;

        if (character) {
            this.conversationContext.lastCharacter = character.id;
            character.messageCount++;

            // Update character states
            this.updateCharacterState(character, data);
        }
    }

    updateCharacterState(character, context) {
        const { theme, messageContent } = context;

        if (theme === 'jurassic' && character.id === 'muldoon') {
            // Decrease alert level over time if no raptor triggers
            if (!this.containsRaptorTriggers(messageContent)) {
                const state = this.characterStates.jurassic.muldoon;
                state.alertLevel = Math.max(0, state.alertLevel - 0.5);

                if (state.alertLevel === 0) {
                    state.status = 'active';
                }
            }
        }
    }

    handleSpecialEvent(data) {
        const { type, character, context } = data;

        switch (type) {
            case 'quint-demise':
                this.handleQuintDemise();
                break;
            case 'raptor-sighting':
                this.handleRaptorSighting(context);
                break;
            case 'system-alert':
                this.handleSystemAlert(context);
                break;
        }
    }

    handleRaptorSighting(context) {
        const state = this.characterStates.jurassic.muldoon;
        state.alertLevel = 3;
        state.status = 'hunting';

        EventBus.emit('character:emergency-response', {
            character: 'muldoon',
            message: "*URGENT TRANSMISSION* Raptor movement detected in sector 7. Going dark. Mr. DNA, you're up! *Static*"
        });
    }

    // Public API methods
    getActiveCharacter() {
        return this.activeCharacter;
    }

    getCharacter(id) {
        return this.characters.get(id);
    }

    getCharactersForTheme(theme) {
        return Array.from(this.characters.values()).filter(char => char.theme === theme);
    }

    getCharacterVoiceSettings(characterId) {
        const character = this.characters.get(characterId);
        return character ? character.voiceSettings : null;
    }

    getCharacterState(theme, characterId) {
        return this.characterStates[theme]?.[characterId] || null;
    }

    resetCharacterStates(theme) {
        if (theme && this.characterStates[theme]) {
            // Reset to initial state
            if (theme === 'jaws') {
                this.characterStates.jaws.quint.status = 'alive';
                this.characterStates.jaws.brody.lastSeen = null;
                this.characterStates.jaws.hooper.lastSeen = null;
            } else if (theme === 'jurassic') {
                this.characterStates.jurassic.muldoon.alertLevel = 0;
                this.characterStates.jurassic.muldoon.status = 'active';
                this.characterStates.jurassic['mr-dna'].currentTopic = null;
            }
        }
    }
}
