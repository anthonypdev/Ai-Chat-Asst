/**
 * Theme Persistence - Handles saving and loading theme preferences
 * Manages local storage with validation and migration
 */

export class ThemePersistence {
    constructor() {
        this.storageKey = 'parkland_theme_opus_final_v3';
        this.preferencesKey = 'parkland_theme_preferences_v3';
        this.validThemes = ['default', 'jaws', 'jurassic'];

        this.defaultPreferences = {
            theme: 'default',
            autoSpeak: true,
            soundEnabled: true,
            reducedMotion: false,
            lastChanged: null,
            characterPreferences: {}
        };
    }

    setTheme(themeName) {
        if (!this.validThemes.includes(themeName)) {
            console.warn(`Invalid theme: ${themeName}`);
            return false;
        }

        try {
            localStorage.setItem(this.storageKey, themeName);

            // Update full preferences
            const preferences = this.getPreferences();
            preferences.theme = themeName;
            preferences.lastChanged = new Date().toISOString();
            this.setPreferences(preferences);

            return true;
        } catch (error) {
            console.error('Failed to save theme:', error);
            return false;
        }
    }

    getTheme() {
        try {
            const theme = localStorage.getItem(this.storageKey);
            if (theme && this.validThemes.includes(theme)) {
                return theme;
            }
        } catch (error) {
            console.error('Failed to load theme:', error);
        }
        return 'default';
    }

    setPreferences(preferences) {
        try {
            const validatedPrefs = this.validatePreferences(preferences);
            localStorage.setItem(this.preferencesKey, JSON.stringify(validatedPrefs));
            return true;
        } catch (error) {
            console.error('Failed to save preferences:', error);
            return false;
        }
    }

    getPreferences() {
        try {
            const stored = localStorage.getItem(this.preferencesKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                return this.validatePreferences(parsed);
            }
        } catch (error) {
            console.error('Failed to load preferences:', error);
        }
        return { ...this.defaultPreferences };
    }

    validatePreferences(preferences) {
        const validated = { ...this.defaultPreferences };

        if (preferences && typeof preferences === 'object') {
            // Validate theme
            if (this.validThemes.includes(preferences.theme)) {
                validated.theme = preferences.theme;
            }

            // Validate boolean preferences
            if (typeof preferences.autoSpeak === 'boolean') {
                validated.autoSpeak = preferences.autoSpeak;
            }

            if (typeof preferences.soundEnabled === 'boolean') {
                validated.soundEnabled = preferences.soundEnabled;
            }

            if (typeof preferences.reducedMotion === 'boolean') {
                validated.reducedMotion = preferences.reducedMotion;
            }

            // Validate timestamps
            if (preferences.lastChanged &&
                !isNaN(new Date(preferences.lastChanged).getTime())) {
                validated.lastChanged = preferences.lastChanged;
            }

            // Validate character preferences
            if (preferences.characterPreferences &&
                typeof preferences.characterPreferences === 'object') {
                validated.characterPreferences = this.validateCharacterPreferences(
                    preferences.characterPreferences
                );
            }
        }

        return validated;
    }

    validateCharacterPreferences(charPrefs) {
        const validated = {};
        const validCharacters = ['quint', 'brody', 'hooper', 'muldoon', 'mr-dna'];

        for (const [character, prefs] of Object.entries(charPrefs)) {
            if (validCharacters.includes(character) &&
                prefs && typeof prefs === 'object') {
                validated[character] = {
                    voice: typeof prefs.voice === 'string' ? prefs.voice : null,
                    volume: typeof prefs.volume === 'number' &&
                           prefs.volume >= 0 && prefs.volume <= 1 ?
                           prefs.volume : 1,
                    enabled: typeof prefs.enabled === 'boolean' ? prefs.enabled : true
                };
            }
        }

        return validated;
    }

    setCharacterPreference(character, preference, value) {
        const preferences = this.getPreferences();

        if (!preferences.characterPreferences[character]) {
            preferences.characterPreferences[character] = {};
        }

        preferences.characterPreferences[character][preference] = value;
        return this.setPreferences(preferences);
    }

    getCharacterPreference(character, preference, defaultValue = null) {
        const preferences = this.getPreferences();

        if (preferences.characterPreferences[character] &&
            preferences.characterPreferences[character][preference] !== undefined) {
            return preferences.characterPreferences[character][preference];
        }

        return defaultValue;
    }

    clearThemeData() {
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.preferencesKey);
            return true;
        } catch (error) {
            console.error('Failed to clear theme data:', error);
            return false;
        }
    }

    exportPreferences() {
        const preferences = this.getPreferences();
        return JSON.stringify(preferences, null, 2);
    }

    importPreferences(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            const validated = this.validatePreferences(imported);

            this.setPreferences(validated);
            this.setTheme(validated.theme);

            return { success: true, preferences: validated };
        } catch (error) {
            console.error('Failed to import preferences:', error);
            return { success: false, error: error.message };
        }
    }

    migrateFromOldVersions() {
        // Migrate from v1/v2 storage keys
        const oldKeys = [
            'parkland_theme_opus_final_v2',
            'parkland_auto_speak_opus_final_v2',
            'parkland_sounds_opus_final_v2'
        ];

        let migrated = false;
        const preferences = this.getPreferences();

        try {
            // Check for old theme
            const oldTheme = localStorage.getItem(oldKeys[0]);
            if (oldTheme && this.validThemes.includes(oldTheme)) {
                preferences.theme = oldTheme;
                migrated = true;
            }

            // Check for old auto speak setting
            const oldAutoSpeak = localStorage.getItem(oldKeys[1]);
            if (oldAutoSpeak !== null) {
                preferences.autoSpeak = oldAutoSpeak !== 'false';
                migrated = true;
            }

            // Check for old sound setting
            const oldSound = localStorage.getItem(oldKeys[2]);
            if (oldSound !== null) {
                preferences.soundEnabled = oldSound !== 'false';
                migrated = true;
            }

            if (migrated) {
                this.setPreferences(preferences);

                // Clean up old keys
                oldKeys.forEach(key => {
                    try {
                        localStorage.removeItem(key);
                    } catch (e) {
                        console.warn(`Failed to remove old key: ${key}`);
                    }
                });

                console.log('Theme preferences migrated successfully');
            }
        } catch (error) {
            console.error('Migration failed:', error);
        }

        return migrated;
    }

    getStorageUsage() {
        try {
            const theme = localStorage.getItem(this.storageKey);
            const preferences = localStorage.getItem(this.preferencesKey);

            return {
                theme: theme ? theme.length : 0,
                preferences: preferences ? preferences.length : 0,
                total: (theme?.length || 0) + (preferences?.length || 0)
            };
        } catch (error) {
            console.error('Failed to calculate storage usage:', error);
            return { theme: 0, preferences: 0, total: 0 };
        }
    }
}
