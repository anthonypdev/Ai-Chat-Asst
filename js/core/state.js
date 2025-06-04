/**
 * Parkland AI - Opus Magnum Edition
 * Core State Manager
 *
 * Manages global application state with an event-driven approach.
 * Ensures data consistency and provides a centralized way to access and modify state.
 */

class StateManager {
    constructor() {
        if (StateManager.instance) {
            return StateManager.instance;
        }

        this._state = {
            currentTheme: 'default', // 'default', 'jaws', 'jurassic'
            activeCharacter: null, // Could be 'quint', 'brody', 'hooper', 'muldoon', 'mr-dna', or null
            chatHistory: [], // Array of message objects
            userInput: '',
            isLoading: true, // Application starts in a loading state
            isSidebarOpen: true,
            isSettingsModalOpen: false,
            isLoginModalOpen: true, // Assume login is shown first
            isMicListening: false,
            isSpeaking: false,
            currentApiProvider: 'claude', // 'claude', 'openai', etc.
            apiKey: null, // Store API key securely if possible, or manage through a backend
            modelPreferences: {
                claude: { model: 'claude-3-opus-20240229' },
                // openai: { model: 'gpt-4-turbo' }
            },
            userPreferences: {
                autoScroll: true,
                sendOnEnter: true,
                markdownRendering: true,
                voiceInputEnabled: true,
                voiceOutputEnabled: true,
                voiceCharacter: 'default', // or specific character key
                soundEffectsEnabled: true,
                reduceMotion: false, // Auto-detected or user-set
            },
            lastError: null,
            currentView: 'login', // 'login', 'chat'
            debugMode: false,
            // Add other state properties as needed
        };

        this._events = {}; // Event listeners
        StateManager.instance = this;

        this.loadInitialState(); // Load from persistent storage
        console.log('👑 StateManager initialized and initial state loaded.');
    }

    static getInstance() {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager();
        }
        return StateManager.instance;
    }

    /**
     * Get a state value. Supports dot notation for nested properties.
     * @param {string} key - The key of the state property.
     * @returns {*} The value of the state property, or undefined if not found.
     */
    get(key) {
        if (typeof key !== 'string') {
            console.error('StateManager.get: Key must be a string.');
            return undefined;
        }
        if (!key.includes('.')) {
            return this._state[key];
        }

        // Handle dot notation for nested properties
        return key.split('.').reduce((obj, part) => {
            return obj && obj[part] !== undefined ? obj[part] : undefined;
        }, this._state);
    }

    /**
     * Set a state value. Supports dot notation for nested properties.
     * @param {string} key - The key of the state property.
     * @param {*} value - The new value for the state property.
     * @param {boolean} [silent=false] - If true, do not emit a state change event.
     */
    set(key, value, silent = false) {
        if (typeof key !== 'string') {
            console.error('StateManager.set: Key must be a string.');
            return;
        }

        let changed = false;
        let oldValue;

        if (!key.includes('.')) {
            oldValue = this._state[key];
            if (this._state[key] !== value) {
                this._state[key] = value;
                changed = true;
            }
        } else {
            // Handle dot notation for nested properties
            const keys = key.split('.');
            let current = this._state;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
                    current[keys[i]] = {}; // Create nested objects if they don't exist
                }
                current = current[keys[i]];
            }
            oldValue = current[keys[keys.length - 1]];
            if (current[keys[keys.length - 1]] !== value) {
                current[keys[keys.length - 1]] = value;
                changed = true;
            }
        }

        if (changed && !silent) {
            this.emit(`change:${key}`, { key, newValue: value, oldValue });
            this.emit('change', { key, newValue: value, oldValue }); // General change event
            if (this.get('debugMode')) {
                console.log(`%cSTATE CHANGE: ${key}`, 'color: #4CAF50; font-weight: bold;', { newValue: value, oldValue });
            }
        }
    }

    /**
     * Subscribe to a state change event.
     * @param {string} event - The event name (e.g., 'change:currentTheme' or 'change' for all).
     * @param {Function} callback - The function to call when the event is emitted.
     */
    subscribe(event, callback) {
        if (typeof callback !== 'function') {
            console.error('StateManager.subscribe: Callback must be a function.');
            return;
        }
        if (!this._events[event]) {
            this._events[event] = [];
        }
        if (!this._events[event].includes(callback)) {
            this._events[event].push(callback);
        }
    }

    /**
     * Unsubscribe from a state change event.
     * @param {string} event - The event name.
     * @param {Function} callback - The callback function to remove.
     */
    unsubscribe(event, callback) {
        if (!this._events[event]) return;
        this._events[event] = this._events[event].filter(cb => cb !== callback);
    }

    /**
     * Emit an event.
     * @param {string} event - The event name.
     * @param {*} data - Data to pass to the callback functions.
     */
    emit(event, data) {
        if (this._events[event]) {
            this._events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in StateManager event listener for "${event}":`, error);
                    this.set('lastError', {
                        message: `Event listener error for ${event}: ${error.message}`,
                        stack: error.stack,
                        timestamp: new Date().toISOString()
                    });
                }
            });
        }
    }

    /**
     * Loads the initial state from persistent storage (e.g., localStorage).
     */
    loadInitialState() {
        try {
            const storedTheme = localStorage.getItem('parklandAI_theme');
            if (storedTheme) {
                this.set('currentTheme', storedTheme, true); // Silent as it's initial load
            }

            const storedPreferences = localStorage.getItem('parklandAI_userPreferences');
            if (storedPreferences) {
                const parsedPrefs = JSON.parse(storedPreferences);
                // Merge carefully to avoid overwriting defaults with missing keys
                const currentPrefs = this.get('userPreferences');
                this.set('userPreferences', { ...currentPrefs, ...parsedPrefs }, true);
            }

            const storedApiKey = localStorage.getItem('parklandAI_apiKey');
            if (storedApiKey) {
                this.set('apiKey', storedApiKey, true);
            }
            
            const storedActiveChar = localStorage.getItem('parklandAI_activeCharacter');
             if (storedActiveChar) {
                this.set('activeCharacter', storedActiveChar, true);
            }


            // Detect reduced motion preference
            const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.set('userPreferences.reduceMotion', reduceMotionQuery.matches, true);
            reduceMotionQuery.addEventListener('change', (e) => {
                this.set('userPreferences.reduceMotion', e.matches);
            });


            // Initial view based on API key presence
            if (this.get('apiKey')) {
                this.set('currentView', 'chat', true);
                this.set('isLoginModalOpen', false, true);
            } else {
                this.set('currentView', 'login', true);
                this.set('isLoginModalOpen', true, true);
            }


        } catch (error) {
            console.error('Error loading initial state:', error);
            // Fallback to default state already set in constructor
        }
        this.set('isLoading', false); // Loading complete after initial state setup
    }

    /**
     * Saves relevant parts of the current state to persistent storage.
     * Specific methods should call this rather than calling it on every `set`.
     */
    saveState(keysToSave = ['currentTheme', 'userPreferences', 'apiKey', 'activeCharacter']) {
        if (typeof localStorage === 'undefined') {
            console.warn('LocalStorage is not available. State will not be persisted.');
            return;
        }
        try {
            if (keysToSave.includes('currentTheme')) {
                localStorage.setItem('parklandAI_theme', this.get('currentTheme'));
            }
            if (keysToSave.includes('userPreferences')) {
                localStorage.setItem('parklandAI_userPreferences', JSON.stringify(this.get('userPreferences')));
            }
            if (keysToSave.includes('apiKey')) {
                const apiKey = this.get('apiKey');
                if (apiKey) {
                    localStorage.setItem('parklandAI_apiKey', apiKey);
                } else {
                    localStorage.removeItem('parklandAI_apiKey');
                }
            }
            if (keysToSave.includes('activeCharacter')) {
                 const activeChar = this.get('activeCharacter');
                if (activeChar) {
                    localStorage.setItem('parklandAI_activeCharacter', activeChar);
                } else {
                    localStorage.removeItem('parklandAI_activeCharacter');
                }
            }
            if (this.get('debugMode')) {
                console.log('%cSAVED STATE for keys:', 'color: #FF9800;', keysToSave);
            }
        } catch (error) {
            console.error('Error saving state:', error);
        }
    }

    // --- Specific State Management Methods ---

    setTheme(themeName) {
        this.set('currentTheme', themeName);
        this.saveState(['currentTheme']);
    }

    setActiveCharacter(characterKey) {
        this.set('activeCharacter', characterKey);
        this.saveState(['activeCharacter']);
    }

    addMessageToHistory(message) { // message: { role: 'user'|'assistant', content: string, timestamp: number, character?: string }
        const currentHistory = this.get('chatHistory') || [];
        // Create a new array to ensure change detection for subscribers expecting a new reference
        const newHistory = [...currentHistory, message];
        this.set('chatHistory', newHistory);
        // Note: Chat history might become large, consider if it should be saved to localStorage or a different strategy.
        // For now, not saving full chat history to localStorage by default to avoid storage limits.
    }

    clearChatHistory() {
        this.set('chatHistory', []);
    }

    updateUserInput(input) {
        this.set('userInput', input);
    }

    setLoading(isLoading) {
        this.set('isLoading', isLoading);
    }

    toggleSidebar(isOpen = null) {
        const current = this.get('isSidebarOpen');
        this.set('isSidebarOpen', isOpen === null ? !current : isOpen);
        // Consider saving sidebar state if it's a user preference
        // this.saveState(['isSidebarOpen']); // If it should persist
    }

    setModalOpen(modalName, isOpen) { // e.g., modalName = 'isSettingsModalOpen'
        if (this._state.hasOwnProperty(modalName)) {
            this.set(modalName, isOpen);
        } else {
            console.warn(`Modal state key "${modalName}" not found.`);
        }
    }
    
    setApiKey(key) {
        this.set('apiKey', key);
        this.saveState(['apiKey']);
        if (key) {
            this.set('currentView', 'chat');
            this.set('isLoginModalOpen', false);
        } else {
            this.set('currentView', 'login');
            this.set('isLoginModalOpen', true);
        }
    }

    setUserPreference(key, value) { // Key can be dot-notated e.g., 'voiceOutputEnabled'
        const fullKey = `userPreferences.${key}`;
        this.set(fullKey, value);
        this.saveState(['userPreferences']);
    }


    // --- Debugging ---
    logState() {
        console.log('%cCURRENT STATE:', 'color: #2196F3; font-weight: bold;', JSON.parse(JSON.stringify(this._state)));
    }

    enableDebugging(enable = true) {
        this.set('debugMode', enable, true); // Silent update to debugMode itself
        if (enable) {
            console.log('%cStateManager Debug Mode Enabled', 'color: orange; font-weight: bold;');
            this.logState();
        }
    }
}

// Initialize and export a singleton instance
const stateManagerInstance = new StateManager();
// window.stateManager = stateManagerInstance; // Optionally attach to window for easy debugging

// export default stateManagerInstance; // If using ES modules in the broader project context
