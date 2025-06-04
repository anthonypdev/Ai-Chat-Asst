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
            activeSessionId: null, // Added to track the current loaded/active chat session
            // Add other state properties as needed
        };

        this._events = {}; // Event listeners
        StateManager.instance = this;

        this.loadInitialState(); // Load from persistent storage
        // console.log('👑 StateManager initialized and initial state loaded.'); // Moved log to after loadInitialState potentially sets debugMode
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
        const keys = key.split('.');
        let current = this._state;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
                current[keys[i]] = {}; // Create nested objects if they don't exist
            }
            current = current[keys[i]];
        }

        oldValue = current[keys[keys.length - 1]];
        if (oldValue !== value) { // Simple strict equality check, consider deep equality for objects if needed
            current[keys[keys.length - 1]] = value;
            changed = true;
        }


        if (changed && !silent) {
            this.emit(`change:${key}`, { key, newValue: value, oldValue });
            this.emit('change', { key, newValue: value, oldValue }); // General change event
            if (this.get('debugMode')) {
                // For deep values, newValue and oldValue here might be the top-level object if not careful.
                // Logging the actual changed part is more complex for nested structures without specific old value retrieval.
                // The current oldValue is correct for the deepest key.
                console.log(`%cSTATE CHANGE: ${key}`, 'color: #4CAF50; font-weight: bold;', { newValue: value, oldValue: oldValue /* Corrected to log specific old value */});
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
                    }, true); // Silent update for lastError to prevent loops if error is in a 'change:lastError' listener
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
            if (storedTheme) this.set('currentTheme', storedTheme, true);

            const storedPreferences = localStorage.getItem('parklandAI_userPreferences');
            if (storedPreferences) {
                const parsedPrefs = JSON.parse(storedPreferences);
                const currentPrefs = this.get('userPreferences'); // Get current defaults
                // Merge carefully: only update keys present in parsedPrefs, keep defaults for others
                const mergedPrefs = { ...currentPrefs };
                for (const key in parsedPrefs) {
                    if (Object.prototype.hasOwnProperty.call(parsedPrefs, key) && Object.prototype.hasOwnProperty.call(mergedPrefs, key)) {
                        mergedPrefs[key] = parsedPrefs[key];
                    }
                }
                this.set('userPreferences', mergedPrefs, true);
            }

            const storedApiKey = localStorage.getItem('parklandAI_apiKey');
            if (storedApiKey) this.set('apiKey', storedApiKey, true);
            
            const storedActiveChar = localStorage.getItem('parklandAI_activeCharacter');
            if (storedActiveChar) this.set('activeCharacter', storedActiveChar, true);

            const storedActiveSessionId = localStorage.getItem('parklandAI_activeSessionId');
            if (storedActiveSessionId) this.set('activeSessionId', storedActiveSessionId, true);


            const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.set('userPreferences.reduceMotion', reduceMotionQuery.matches, true);
            reduceMotionQuery.addEventListener('change', (e) => {
                this.set('userPreferences.reduceMotion', e.matches); // This will trigger saveState if preference saving is tied to it
            });

            if (this.get('apiKey')) {
                this.set('currentView', 'chat', true);
                this.set('isLoginModalOpen', false, true);
            } else {
                this.set('currentView', 'login', true);
                this.set('isLoginModalOpen', true, true);
            }

        } catch (error) {
            console.error('Error loading initial state:', error);
        }
        this.set('isLoading', false, true); // Initial loading sequence done
        console.log('👑 StateManager initialized and initial state loaded. Debug mode:', this.get('debugMode'));
    }

    /**
     * Saves relevant parts of the current state to persistent storage.
     */
    saveState(keysToSave = ['currentTheme', 'userPreferences', 'apiKey', 'activeCharacter', 'activeSessionId']) {
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
                if (apiKey) localStorage.setItem('parklandAI_apiKey', apiKey);
                else localStorage.removeItem('parklandAI_apiKey');
            }
            if (keysToSave.includes('activeCharacter')) {
                 const activeChar = this.get('activeCharacter');
                if (activeChar) localStorage.setItem('parklandAI_activeCharacter', activeChar);
                else localStorage.removeItem('parklandAI_activeCharacter');
            }
            if (keysToSave.includes('activeSessionId')) {
                const activeSessionId = this.get('activeSessionId');
                if(activeSessionId) localStorage.setItem('parklandAI_activeSessionId', activeSessionId);
                else localStorage.removeItem('parklandAI_activeSessionId');
            }

            if (this.get('debugMode')) {
                console.log('%cSAVED STATE for keys:', 'color: #FF9800;', keysToSave);
            }
        } catch (error) {
            console.error('Error saving state:', error);
        }
    }

    setTheme(themeName) {
        this.set('currentTheme', themeName);
        this.saveState(['currentTheme']);
    }

    setActiveCharacter(characterKey) {
        this.set('activeCharacter', characterKey);
        this.saveState(['activeCharacter']);
    }

    addMessageToHistory(message) {
        const currentHistory = this.get('chatHistory') || [];
        const newHistory = [...currentHistory, message];
        this.set('chatHistory', newHistory);
        // Full chat history not saved to localStorage by default to prevent bloat
    }

    clearChatHistory() {
        this.set('chatHistory', []);
        // Potentially clear the active session ID or handle its persistence related to history clearing
        // this.set('activeSessionId', null);
        // this.saveState(['activeSessionId']);
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
        // Not saving sidebar state to localStorage by default
    }

    setModalOpen(modalName, isOpen) {
        if (Object.prototype.hasOwnProperty.call(this._state, modalName)) {
            this.set(modalName, isOpen);
        } else {
            console.warn(`Modal state key "${modalName}" not found.`);
        }
    }
    
    setApiKey(key) {
        const validatedKey = key ? key.trim() : null;
        this.set('apiKey', validatedKey);
        this.saveState(['apiKey']);
        if (validatedKey) {
            this.set('currentView', 'chat');
            this.set('isLoginModalOpen', false);
        } else {
            this.set('currentView', 'login');
            this.set('isLoginModalOpen', true);
        }
    }

    setUserPreference(key, value) {
        const fullKey = `userPreferences.${key}`;
        this.set(fullKey, value);
        this.saveState(['userPreferences']);
    }
    
    setActiveSessionId(sessionId) {
        this.set('activeSessionId', sessionId);
        this.saveState(['activeSessionId']);
    }

    logState() {
        console.log('%cCURRENT STATE:', 'color: #2196F3; font-weight: bold;', JSON.parse(JSON.stringify(this._state)));
    }

    enableDebugging(enable = true) {
        this.set('debugMode', enable, true);
        if (enable) {
            console.log('%cStateManager Debug Mode Enabled', 'color: orange; font-weight: bold;');
            this.logState();
        }
    }
}

// Expose the class for App.js to use with getInstance()
window.StateManager = StateManager;

// Auto-instantiate for easy access via window.stateManagerInstance if needed by other standalone scripts,
// but App.js should use StateManager.getInstance().
if (!window.stateManagerInstance) {
    window.stateManagerInstance = StateManager.getInstance(); // Ensures singleton is created and accessible
}
