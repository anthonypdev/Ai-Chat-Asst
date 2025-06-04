/**
 * Parkland AI - Opus Magnum Edition
 * ThemePersistence Module
 *
 * Handles saving and loading the selected theme preference to/from localStorage.
 * This class is used by ThemeManager to interact with persistent theme storage.
 * Note: StateManager also has logic to persist the 'currentTheme' state key.
 * Ensure coordination if both are active on the same localStorage item.
 * For this implementation, ThemePersistence acts as a direct localStorage wrapper.
 */

class ThemePersistence {
    /**
     * @param {StateManager} stateManager - Instance of StateManager (may not be strictly needed if this class only talks to localStorage).
     */
    constructor(stateManager) {
        // stateManager might be used for logging or future integration, but primary ops are localStorage.
        this.stateManager = stateManager;
        this.STORAGE_KEY = 'parklandAI_theme'; // Consistent with StateManager's key for theme
        console.log('🎨 ThemePersistence initialized.');
    }

    /**
     * Saves the selected theme name to localStorage.
     * @param {string} themeName - The name of the theme to save (e.g., 'default', 'jaws', 'jurassic').
     */
    saveTheme(themeName) {
        if (typeof themeName !== 'string') {
            console.error('ThemePersistence.saveTheme: themeName must be a string.');
            return false;
        }
        try {
            localStorage.setItem(this.STORAGE_KEY, themeName);
            if (this.stateManager && this.stateManager.get('debugMode')) {
                console.log(`ThemePersistence: Saved theme "${themeName}" to localStorage.`);
            }
            return true;
        } catch (error) {
            console.error('Error saving theme to localStorage:', error);
            if (this.stateManager) {
                this.stateManager.set('lastError', {
                    message: 'Failed to save theme preference.',
                    type: 'storage',
                    originalError: error
                });
            }
            return false;
        }
    }

    /**
     * Loads the saved theme name from localStorage.
     * @returns {string|null} The saved theme name, or null if not found or an error occurs.
     */
    loadTheme() {
        try {
            const savedTheme = localStorage.getItem(this.STORAGE_KEY);
            if (savedTheme && typeof savedTheme === 'string') {
                if (this.stateManager && this.stateManager.get('debugMode')) {
                    console.log(`ThemePersistence: Loaded theme "${savedTheme}" from localStorage.`);
                }
                return savedTheme;
            }
            return null; // No theme saved or invalid format
        } catch (error) {
            console.error('Error loading theme from localStorage:', error);
            if (this.stateManager) {
                this.stateManager.set('lastError', {
                    message: 'Failed to load theme preference.',
                    type: 'storage',
                    originalError: error
                });
            }
            return null;
        }
    }

    /**
     * Clears the saved theme from localStorage.
     */
    clearSavedTheme() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            if (this.stateManager && this.stateManager.get('debugMode')) {
                console.log('ThemePersistence: Cleared saved theme from localStorage.');
            }
        } catch (error) {
            console.error('Error clearing saved theme from localStorage:', error);
             if (this.stateManager) {
                this.stateManager.set('lastError', {
                    message: 'Failed to clear theme preference.',
                    type: 'storage',
                    originalError: error
                });
            }
        }
    }
}

// If not using ES modules and ThemeManager expects a global instance,
// this would typically be instantiated by App.js and passed to ThemeManager.
// For now, this file just defines the class.
// e.g., in App.js:
// this.themePersistence = new ThemePersistence(this.stateManager);
// this.themeManager = new ThemeManager(this.stateManager, this.utils, this.eventEmitter, this.themePersistence, ...);
