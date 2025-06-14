/**
 * Parkland AI - Opus Magnum Edition
 * ThemeManager Module
 *
 * Handles loading, applying, and persisting themes, including orchestrating
 * visual transitions between themes.
 */

class ThemeManager {
    /**
     * @param {StateManager} stateManager
     * @param {ParklandUtils} utils
     * @param {EventEmitter} eventEmitter
     * @param {ThemePersistence} themePersistence - Handles saving/loading theme name
     * @param {ThemeTransition} themeTransition - Handles visual transition effects
     * @param {CharacterManager} characterManager
     */
    constructor(stateManager, utils, eventEmitter, themePersistence, themeTransition, characterManager) {
        if (!stateManager || !utils || !eventEmitter || !themePersistence || !themeTransition || !characterManager) {
            throw new Error("ThemeManager requires StateManager, Utils, EventEmitter, ThemePersistence, ThemeTransition, and CharacterManager.");
        }
        this.stateManager = stateManager;
        this.utils = utils;
        this.eventEmitter = eventEmitter;
        this.persistence = themePersistence; // Instance of ThemePersistence
        this.transition = themeTransition;   // Instance of ThemeTransition
        this.characterManager = characterManager;

        this.THEME_STYLESHEET_ID_PREFIX = 'parkland-theme-style-';

        this._themeConfig = {
            default: {
                name: 'Default',
                cssFiles: [ // Order might matter: theme base, then animations
                    { id: 'default-main', path: 'css/themes/default/theme.css' },
                    { id: 'default-animations', path: 'css/themes/default/animations.css' }
                ],
                characterKey: null, // Or your default character if any
                soundPackKey: 'default'
            },
            jaws: {
                name: 'Jaws',
                cssFiles: [
                    { id: 'jaws-main', path: 'css/themes/jaws/theme.css' },
                    { id: 'jaws-animations', path: 'css/themes/jaws/animations.css' },
                    { id: 'jaws-characters', path: 'css/themes/jaws/characters.css' },
                    // transitions.css for Jaws is expected to be loaded if its overlay is shown
                    // If ThemeTransition.js manages its own DOM elements that are always present and styled by this:
                    { id: 'jaws-transitions', path: 'css/themes/jaws/transitions.css' }
                ],
                characterKey: 'quint', // Default character for Jaws theme
                soundPackKey: 'jaws'
            },
            jurassic: {
                name: 'Jurassic Park',
                cssFiles: [
                    { id: 'jurassic-main', path: 'css/themes/jurassic/theme.css' },
                    { id: 'jurassic-animations', path: 'css/themes/jurassic/animations.css' },
                    { id: 'jurassic-characters', path: 'css/themes/jurassic/characters.css' },
                    { id: 'jurassic-transitions', path: 'css/themes/jurassic/transitions.css' }
                ],
                characterKey: 'muldoon', // Default character for Jurassic theme
                soundPackKey: 'jurassic'
            }
        };
        this._currentThemeLoadedCSS = []; // To keep track of currently loaded theme CSS files (their IDs)
        console.log('🎨 ThemeManager initialized.');
    }

    /**
     * Initializes the theme system: loads saved theme or default, applies it.
     */
    async init() {
        const savedThemeName = this.persistence.loadTheme();
        let effectiveThemeName = 'default'; // Default theme

        if (savedThemeName && this._themeConfig[savedThemeName]) {
            effectiveThemeName = savedThemeName;
        } else if (savedThemeName) {
            console.warn(`Saved theme "${savedThemeName}" not found in config. Falling back to default.`);
        }
        
        this.stateManager.set('currentTheme', effectiveThemeName, true); // Silent update for initial load
        this.applyThemeToBody(effectiveThemeName);

        try {
            const themeConfig = this.getThemeConfig(effectiveThemeName);
            if (themeConfig) {
                await this._loadThemeCSS(themeConfig.cssFiles);
                this.characterManager.switchCharacter(themeConfig.characterKey); // Set initial character
                this.eventEmitter.emit('soundPackChange', themeConfig.soundPackKey);
            }
        } catch (error) {
            console.error(`Error loading initial theme CSS for "${effectiveThemeName}":`, error);
            // Potentially fall back to a very basic default if critical CSS fails
        }
        if (this.stateManager.get('debugMode')) {
            console.log(`Initial theme set to: ${effectiveThemeName}`);
        }
    }

    /**
     * Sets the current application theme.
     * @param {string} themeName - The name of the theme to apply.
     * @param {boolean} [forceReload=false] - If true, forces reload even if themeName is current.
     */
    async setCurrentTheme(themeName, forceReload = false) {
        if (!this._themeConfig[themeName]) {
            console.warn(`ThemeManager: Theme "${themeName}" not found in configuration.`);
            return;
        }
        const currentThemeName = this.stateManager.get('currentTheme');
        if (currentThemeName === themeName && !forceReload) {
            if (this.stateManager.get('debugMode')) {
                console.log(`ThemeManager: Theme "${themeName}" is already active.`);
            }
            return;
        }

        if (this.transition.isTransitioning()) {
            console.warn("ThemeManager: Theme change requested while a transition is already in progress.");
            return;
        }

        if (this.stateManager.get('debugMode')) {
            console.log(`ThemeManager: Changing theme from "${currentThemeName}" to "${themeName}"`);
        }
        
        this.eventEmitter.emit('themeChangeInitiated', { from: currentThemeName, to: themeName });

        try {
            // 1. Start the "cover screen" phase of the transition
            const { coveredTime } = await this.transition.setActiveTransition(themeName, currentThemeName);
            
            // 2. Screen is covered, now swap assets
            const oldThemeConfig = this.getThemeConfig(currentThemeName);
            const newThemeConfig = this.getThemeConfig(themeName);

            if (oldThemeConfig) {
                this._unloadThemeCSS(oldThemeConfig.cssFiles);
            }
            await this._loadThemeCSS(newThemeConfig.cssFiles);

            this.applyThemeToBody(themeName);
            this.stateManager.set('currentTheme', themeName); // Update state
            this.persistence.saveTheme(themeName); // Persist choice

            this.characterManager.switchCharacter(newThemeConfig.characterKey);
            this.eventEmitter.emit('soundPackChange', newThemeConfig.soundPackKey);
            this.eventEmitter.emit('themeChanged', { themeName });


            // Give a brief moment for CSS to apply if coveredTime is very short.
            // The promise from _loadThemeCSS should ensure CSS is loaded, but paints can take a moment.
            await this.utils.wait(Math.max(50, coveredTime / 4));


            // 3. Complete the "reveal screen" phase of the transition
            await this.transition.completeTransition(themeName, currentThemeName);

            if (this.stateManager.get('debugMode')) {
                console.log(`ThemeManager: Theme successfully changed to "${themeName}"`);
            }

        } catch (error) {
            console.error(`ThemeManager: Error during theme transition to "${themeName}":`, error);
            // Attempt to revert or reset to a stable state if possible
            this.applyThemeToBody(currentThemeName || 'default'); // Revert body attribute
            this.stateManager.set('lastError', {message: `Failed to switch theme to ${themeName}.`, type: 'theme', originalError: error});
            // Ensure transition state is reset even on error
            if (this.transition.isTransitioning()) {
                this.transition._resetTransitionState(); // Use internal reset if available or a public one
            }
        }
    }

    /**
     * Dynamically loads theme-specific CSS files.
     * Each CSS file object in the array should have an `id` and `path`.
     * @param {Array<Object>} cssFileObjects - Array of objects like { id: string, path: string }.
     * @returns {Promise<void>} Resolves when all stylesheets are loaded or errored.
     * @private
     */
    _loadThemeCSS(cssFileObjects) {
        if (!Array.isArray(cssFileObjects)) {
            return Promise.reject("cssFileObjects must be an array.");
        }
        const head = document.head;
        const loadPromises = [];
        this._currentThemeLoadedCSS = []; // Reset for the new theme

        cssFileObjects.forEach(fileObj => {
            if (this.utils.$(`#${this.THEME_STYLESHEET_ID_PREFIX + fileObj.id}`)) {
                if (this.stateManager.get('debugMode')) {
                    console.log(`ThemeManager: Stylesheet ${fileObj.id} already seems to be loaded. Skipping.`);
                }
                this._currentThemeLoadedCSS.push(this.THEME_STYLESHEET_ID_PREFIX + fileObj.id); // Assume it's correctly loaded
                return; // Skip if already exists (idempotency)
            }

            const link = this.utils.createElement('link', {
                id: this.THEME_STYLESHEET_ID_PREFIX + fileObj.id,
                rel: 'stylesheet',
                type: 'text/css',
                href: fileObj.path,
                media: 'screen' // Apply immediately
            });

            const promise = new Promise((resolve, reject) => {
                link.onload = () => {
                    if (this.stateManager.get('debugMode')) {
                        console.log(`ThemeManager: Loaded CSS "${fileObj.path}"`);
                    }
                    this._currentThemeLoadedCSS.push(link.id);
                    resolve();
                };
                link.onerror = (err) => {
                    console.error(`ThemeManager: Failed to load CSS "${fileObj.path}"`, err);
                    reject(new Error(`Failed to load stylesheet: ${fileObj.path}`));
                };
            });
            loadPromises.push(promise);
            head.appendChild(link);
        });
        return Promise.allSettled(loadPromises).then(results => {
            results.forEach(result => {
                if (result.status === 'rejected') console.error(result.reason);
            });
            // Even if some fail, we proceed. Critical CSS failure should be handled.
        });
    }

    /**
     * Dynamically unloads previously loaded theme-specific CSS files.
     * Uses the stored IDs in this._currentThemeLoadedCSS.
     * @private
     */
    _unloadThemeCSS() {
        this._currentThemeLoadedCSS.forEach(stylesheetId => {
            const linkElement = this.utils.$(`#${stylesheetId}`);
            if (linkElement) {
                linkElement.parentNode.removeChild(linkElement);
                if (this.stateManager.get('debugMode')) {
                    console.log(`ThemeManager: Unloaded CSS (id: "${stylesheetId}")`);
                }
            }
        });
        this._currentThemeLoadedCSS = []; // Clear the list
    }


    /**
     * Applies the theme name to the document body's data attribute.
     * @param {string} themeName - The name of the theme.
     */
    applyThemeToBody(themeName) {
        document.body.dataset.theme = themeName;
    }

    /**
     * Retrieves the configuration object for a specific theme.
     * @param {string} themeName - The name of the theme.
     * @returns {Object|null} The theme configuration object or null if not found.
     */
    getThemeConfig(themeName) {
        return this._themeConfig[themeName] || null;
    }

    /**
     * Gets a list of available theme names and their display names.
     * @returns {Array<Object>} Example: [{ key: 'default', name: 'Default Theme' }, ...]
     */
    getAvailableThemes() {
        return Object.keys(this._themeConfig).map(key => ({
            key: key,
            name: this._themeConfig[key].name
        }));
    }

    destroy() {
        // Clean up if necessary, e.g., remove dynamically added stylesheets if app is fully closing
        this._unloadThemeCSS();
        console.log('🎨 ThemeManager destroyed.');
    }
}

// If not using ES modules:
// window.ThemeManager = ThemeManager;

window.ThemeManager = ThemeManager;
