/**
 * Parkland AI - Opus Magnum Edition
 * CharacterManager Module
 *
 * Manages character definitions, active character state, and provides
 * character-specific configurations (e.g., voice, system prompts).
 */

class CharacterManager {
    /**
     * @param {StateManager} stateManager
     * @param {EventEmitter} eventEmitter
     * @param {ParklandUtils} utils
     * @param {ThemeManager} themeManager - Optional, if character switching is tied to themes.
     */
    constructor(stateManager, eventEmitter, utils, themeManager = null) {
        if (!stateManager || !eventEmitter || !utils) {
            throw new Error("CharacterManager requires StateManager, EventEmitter, and Utils instances.");
        }
        this.stateManager = stateManager;
        this.eventEmitter = eventEmitter;
        this.utils = utils;
        this.themeManager = themeManager; // Can be used to get default character for a theme

        this._characterConfig = this._defineCharacterConfigurations();
        this._activeCharacterUI = null; // Reference to the currently displayed character UI element

        // Listen for theme changes to potentially switch to a theme's default character
        if (this.themeManager) {
            this.eventEmitter.on('themeChanged', ({ themeName }) => {
                const themeConfig = this.themeManager.getThemeConfig(themeName);
                if (themeConfig && themeConfig.characterKey) {
                    // Only switch if the new theme's default character is different
                    // from the current explicitly selected character by user preference.
                    // Or, always switch to theme's default if no specific user preference is set.
                    const userPreferredCharacter = this.stateManager.get('userPreferences.voiceCharacter');
                    const currentActiveCharacter = this.stateManager.get('activeCharacter');

                    if (!userPreferredCharacter || userPreferredCharacter === 'default' || currentActiveCharacter !== userPreferredCharacter) {
                         // If user preference is default, or if current character isn't what user picked, switch to theme's default.
                        if(this.stateManager.get('activeCharacter') !== themeConfig.characterKey) {
                           this.switchCharacter(themeConfig.characterKey);
                        }
                    }
                } else if (!themeConfig || !themeConfig.characterKey) {
                    // If new theme has no default character, switch to null/generic
                    if(this.stateManager.get('activeCharacter') !== null) {
                        this.switchCharacter(null);
                    }
                }
            });
        }
        
        // Listen for user preference changes for character voice
        this.stateManager.subscribe('change:userPreferences.voiceCharacter', ({ newValue }) => {
            if (newValue && newValue !== 'default' && this._characterConfig[newValue]) {
                this.switchCharacter(newValue);
            } else if (newValue === 'default') {
                // Revert to theme's default character or null if no theme default
                const currentTheme = this.stateManager.get('currentTheme');
                const themeConfig = this.themeManager ? this.themeManager.getThemeConfig(currentTheme) : null;
                this.switchCharacter(themeConfig?.characterKey || null);
            }
        });


        console.log('👤 CharacterManager initialized.');
    }

    /**
     * Defines the configurations for all available characters.
     * @returns {Object} Character configuration object.
     * @private
     */
    _defineCharacterConfigurations() {
        return {
            // Jaws Characters
            quint: {
                key: 'quint',
                name: 'Quint',
                theme: 'jaws',
                avatarSelector: '.character-avatar.quint', // CSS selector for UI
                uiElementSelector: '#quintCharacterUI', // Example main UI element
                systemPrompt: "You are Quint, a grizzled and experienced shark hunter from the movie Jaws. Speak with a gruff, old-salt-of-the-sea demeanor. You're tough, pragmatic, and have a dark sense of humor. You're here to offer advice, tell tales of the sea, and maybe sing a shanty or two, but always with an undercurrent of the dangers lurking in the deep. Keep your responses somewhat concise and to the point, like a man of action.",
                voiceConfig: {
                    // voiceName: "microsoft david desktop", // Example specific name to search for
                    lang: 'en-US', // Preferred language
                    gender: 'male', // Heuristic for voice search
                    pitch: 0.8,  // Lower pitch
                    rate: 0.9,   // Slightly slower
                    volume: 0.95
                }
            },
            brody: {
                key: 'brody',
                name: 'Chief Brody',
                theme: 'jaws',
                avatarSelector: '.character-avatar.brody',
                uiElementSelector: '#brodyCharacterUI',
                systemPrompt: "You are Police Chief Martin Brody from Amity Island. You are a responsible, somewhat anxious, and down-to-earth family man dealing with an extraordinary crisis. You're not a natural seafarer but you rise to the occasion. Speak with a sense of duty and concern, occasionally showing your dry wit or exasperation. You're trying to keep things rational and safe.",
                voiceConfig: {
                    lang: 'en-US',
                    gender: 'male',
                    pitch: 1.0,
                    rate: 1.0,
                    volume: 0.9
                }
            },
            hooper: {
                key: 'hooper',
                name: 'Matt Hooper',
                theme: 'jaws',
                avatarSelector: '.character-avatar.hooper',
                uiElementSelector: '#hooperCharacterUI',
                systemPrompt: "You are Matt Hooper, a young, enthusiastic, and knowledgeable oceanographer from the Woods Hole Oceanographic Institution, here to study the shark problem. You are scientific, a bit academic, but also adventurous and occasionally cocky. Explain things clearly, use some technical terms where appropriate, and convey your fascination with marine life, even the dangerous ones.",
                voiceConfig: {
                    lang: 'en-US',
                    gender: 'male',
                    pitch: 1.1, // Slightly higher, more energetic
                    rate: 1.05,
                    volume: 0.9
                }
            },
            // Jurassic Park Characters
            muldoon: {
                key: 'muldoon',
                name: 'Robert Muldoon',
                theme: 'jurassic',
                avatarSelector: '.character-avatar.muldoon', // CSS selector for UI in jurassic/characters.css
                uiElementSelector: '.muldoon-walkie-container', // Main UI element for Muldoon
                systemPrompt: "You are Robert Muldoon, the game warden of Jurassic Park. You are a skilled hunter, pragmatic, and deeply respectful of the dinosaurs, especially the velociraptors, though you understand their danger. Speak with a calm, authoritative, slightly gruff tone, often with a British or South African inflection. You value caution and preparation. 'Clever girl...'",
                voiceConfig: {
                    // voiceName: "daniel", // Example voice name preference (e.g., for UK English)
                    lang: 'en-GB',
                    gender: 'male',
                    pitch: 0.9,  // Slightly lower, authoritative
                    rate: 0.95,
                    volume: 1.0
                }
            },
            'mr-dna': { // Key uses hyphen as in original CSS/JS for Mr. DNA
                key: 'mr-dna',
                name: 'Mr. DNA',
                theme: 'jurassic',
                avatarSelector: '.character-avatar.mr-dna',
                uiElementSelector: '.mr-dna-container', // Main UI element for Mr. DNA
                systemPrompt: "Hello there! I'm Mr. DNA! Your friendly, animated guide to the wonders of genetic engineering and Jurassic Park. I explain complex scientific concepts in a simple, upbeat, and accessible way. Bingo! Dino DNA! I'm always cheerful and informative. Use short, enthusiastic sentences!",
                voiceConfig: {
                    lang: 'en-US',
                    pitch: 1.3,  // Higher, cartoonish
                    rate: 1.2,   // Faster, energetic
                    volume: 0.9
                }
            },
            // Add more characters here
        };
    }

    /**
     * Initializes characters, potentially showing the default for the current theme.
     * Called by App.js after ThemeManager has initialized the theme.
     */
    initCharacters() {
        const currentTheme = this.stateManager.get('currentTheme');
        const themeConfig = this.themeManager ? this.themeManager.getThemeConfig(currentTheme) : null;
        let characterToActivate = null;

        const userPreferredChar = this.stateManager.get('userPreferences.voiceCharacter');
        if (userPreferredChar && userPreferredChar !== 'default' && this._characterConfig[userPreferredChar]) {
            characterToActivate = userPreferredChar;
        } else if (themeConfig && themeConfig.characterKey && this._characterConfig[themeConfig.characterKey]) {
            characterToActivate = themeConfig.characterKey;
        }
        
        if(characterToActivate) {
            this.switchCharacter(characterToActivate);
        } else {
            this.switchCharacter(null); // No character or default
        }
        if (this.stateManager.get('debugMode')) {
            console.log('CharacterManager: Initial character set based on theme/preference.', characterToActivate);
        }
    }


    /**
     * Switches the active character.
     * @param {string|null} characterKey - The key of the character to activate, or null for no character.
     */
    switchCharacter(characterKey) {
        if (!this._characterConfig[characterKey] && characterKey !== null) {
            console.warn(`CharacterManager: Character "${characterKey}" not found. Staying with current or no character.`);
            return;
        }

        const oldCharacterKey = this.stateManager.get('activeCharacter');
        if (oldCharacterKey === characterKey) {
             // No change needed, but ensure UI is consistent
            this._updateCharacterUI(characterKey);
            return;
        }

        // Hide old character UI if any
        if (oldCharacterKey) {
            this._updateCharacterUI(oldCharacterKey, false);
        }

        this.stateManager.set('activeCharacter', characterKey);

        // Show new character UI
        this._updateCharacterUI(characterKey, true);


        const characterData = this.getCharacterData(characterKey);
        this.eventEmitter.emit('character:changed', {
            characterKey: characterKey,
            characterData: characterData
        });

        if (this.stateManager.get('debugMode')) {
            console.log(`Character switched to: ${characterKey || 'None'}`);
        }
    }
    
    /**
     * Updates the visibility of character-specific UI elements.
     * @param {string|null} characterKey - The character key.
     * @param {boolean} show - True to show, false to hide.
     * @private
     */
    _updateCharacterUI(characterKey, show = true) {
        // First, hide all character UIs to ensure only one is active
        Object.values(this._characterConfig).forEach(config => {
            if (config.uiElementSelector) {
                const el = this.utils.$(config.uiElementSelector);
                if (el) this.utils.addClass(el, 'hidden'); // Assuming 'hidden' class hides it
            }
        });
        
        // Then show the target character's UI if 'show' is true
        if (characterKey && show) {
            const characterData = this.getCharacterData(characterKey);
            if (characterData && characterData.uiElementSelector) {
                const targetElement = this.utils.$(characterData.uiElementSelector);
                if (targetElement) {
                    this.utils.removeClass(targetElement, 'hidden');
                    // Could trigger an entrance animation here if desired
                    // targetElement.classList.add('character-enter-active');
                } else {
                    console.warn(`UI element for character "${characterKey}" with selector "${characterData.uiElementSelector}" not found.`);
                }
            }
        }
    }


    /**
     * Retrieves the configuration data for a specific character.
     * @param {string} characterKey - The key of the character.
     * @returns {Object|null} The character's configuration data or null if not found.
     */
    getCharacterData(characterKey) {
        return this._characterConfig[characterKey] || null;
    }

    /**
     * Retrieves the system prompt for the currently active character.
     * @returns {string|null} The system prompt string or null.
     */
    getCurrentCharacterPrompt() {
        const activeCharacterKey = this.stateManager.get('activeCharacter');
        const characterData = this.getCharacterData(activeCharacterKey);
        return characterData ? characterData.systemPrompt : null;
    }

    /**
     * Retrieves the voice configuration for the currently active character.
     * @returns {Object|null} The voice configuration object or null.
     */
    getCurrentCharacterVoiceConfig() {
        const activeCharacterKey = this.stateManager.get('activeCharacter');
        const characterData = this.getCharacterData(activeCharacterKey);
        return characterData ? characterData.voiceConfig : null;
    }

    /**
     * Gets a list of available characters suitable for UI display.
     * @returns {Object} An object where keys are character keys and values are { name, theme }.
     */
    getAvailableCharacters() {
        const available = {};
        for (const key in this._characterConfig) {
            available[key] = {
                name: this._characterConfig[key].name,
                theme: this._characterConfig[key].theme
            };
        }
        return available;
    }
}

// If not using ES modules:
// window.CharacterManager = CharacterManager;
