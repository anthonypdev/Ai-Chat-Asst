/**
 * Parkland AI - Opus Magnum Edition
 * Core State Manager
 *
 * Manages global application state with an event-driven approach.
 * Ensures data consistency and provides a centralized way to access and modify state.
 */

/* global logger */

class StateManager {
    constructor() {
        if (StateManager.instance) {
            return StateManager.instance;
        }

        this._state = {
            currentTheme: 'default', 
            activeCharacter: null, 
            chatHistory: [], 
            userInput: '',
            isLoading: true, // Application starts in a loading state
            isSidebarOpen: true,
            isSettingsModalOpen: false,
            isLoginModalOpen: true, 
            isMicListening: false,
            isSpeaking: false,
            currentApiProvider: 'claude', 
            apiKey: null, 
            modelPreferences: {
                claude: { model: 'claude-3-opus-20240229' },
            },
            userPreferences: {
                autoScroll: true,
                sendOnEnter: true,
                markdownRendering: true,
                voiceInputEnabled: true,
                voiceOutputEnabled: true,
                voiceCharacter: 'default', 
                soundEffectsEnabled: true,
                reduceMotion: false, 
            },
            lastError: null,
            currentView: 'login', 
            debugMode: false,
            activeSessionId: null, 
        };

        this._events = {}; 
        StateManager.instance = this;

        this.loadInitialState(); 
        // Log moved to end of loadInitialState
    }

    static getInstance() {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager();
        }
        return StateManager.instance;
    }

    get(key) {
        if (typeof key !== 'string') {
            logger.error('StateManager.get: Key must be a string.');
            return undefined;
        }
        if (!key.includes('.')) {
            return this._state[key];
        }
        return key.split('.').reduce((obj, part) => {
            return obj && obj[part] !== undefined ? obj[part] : undefined;
        }, this._state);
    }

    set(key, value, silent = false) {
        if (typeof key !== 'string') {
            logger.error('StateManager.set: Key must be a string.');
            return;
        }

        if (key === 'isLoading' && typeof console !== 'undefined') {
            logger.state(`DEBUG StateManager.set: Attempting to set 'isLoading' to ${value}. Current value: ${this._state.isLoading}`);
        }

        let changed = false;
        const keys = key.split('.');
        let current = this._state;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
                current[keys[i]] = {}; 
            }
            current = current[keys[i]];
        }

        const oldValue = current[keys[keys.length - 1]];
        if (oldValue !== value) { 
            current[keys[keys.length - 1]] = value;
            changed = true;
        }

        if (changed && !silent) {
            if (key === 'isLoading' && typeof console !== 'undefined') {
                logger.state(`DEBUG StateManager.set: 'isLoading' changed. Emitting change:isLoading and change.`);
            }
            this.emit(`change:${key}`, { key, newValue: value, oldValue });
            this.emit('change', { key, newValue: value, oldValue }); 
            if (this.get('debugMode')) {
                logger.state(`%cSTATE CHANGE: ${key}`, 'color: #4CAF50; font-weight: bold;', { newValue: value, oldValue: oldValue });
            }
        } else if (!changed && key === 'isLoading' && typeof console !== 'undefined') {
            logger.state(`DEBUG StateManager.set: 'isLoading' value not changed. No event emitted.`);
        }
    }

    subscribe(event, callback) {
        if (typeof callback !== 'function') {
            logger.error('StateManager.subscribe: Callback must be a function.');
            return;
        }
        if (!this._events[event]) {
            this._events[event] = [];
        }
        if (!this._events[event].includes(callback)) {
            this._events[event].push(callback);
        }
    }

    unsubscribe(event, callback) {
        if (!this._events[event]) return;
        this._events[event] = this._events[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
        if (this._events[event]) {
            this._events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    logger.error(`Error in StateManager event listener for "${event}":`, error);
                    this.set('lastError', {
                        message: `Event listener error for ${event}: ${error.message}`,
                        stack: error.stack,
                        timestamp: new Date().toISOString()
                    }, true); 
                }
            });
        }
    }

    loadInitialState() {
        try {
            const storedTheme = localStorage.getItem('parklandAI_theme');
            if (storedTheme) this.set('currentTheme', storedTheme, true);

            const storedPreferences = localStorage.getItem('parklandAI_userPreferences');
            if (storedPreferences) {
                const parsedPrefs = JSON.parse(storedPreferences);
                const currentPrefs = this.get('userPreferences'); 
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
                this.set('userPreferences.reduceMotion', e.matches); 
            });

            if (this.get('apiKey')) {
                this.set('currentView', 'chat', true);
                this.set('isLoginModalOpen', false, true);
            } else {
                this.set('currentView', 'login', true);
                this.set('isLoginModalOpen', true, true);
            }

        } catch (error) {
            logger.error('Error loading initial state:', error);
        }
        logger.state('👑 StateManager initialized and initial state loaded. Debug mode:', this.get('debugMode'));
    }

    saveState(keysToSave = ['currentTheme', 'userPreferences', 'apiKey', 'activeCharacter', 'activeSessionId']) {
        if (typeof localStorage === 'undefined') {
            logger.warn('LocalStorage is not available. State will not be persisted.');
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
                logger.state('%cSAVED STATE for keys:', 'color: #FF9800;', keysToSave);
            }
        } catch (error) {
            logger.error('Error saving state:', error);
        }
    }

    setTheme(themeName) { this.set('currentTheme', themeName); this.saveState(['currentTheme']); }
    setActiveCharacter(characterKey) { this.set('activeCharacter', characterKey); this.saveState(['activeCharacter']); }
    addMessageToHistory(message) { const currentHistory = this.get('chatHistory') || []; const newHistory = [...currentHistory, message]; this.set('chatHistory', newHistory); }
    clearChatHistory() { this.set('chatHistory', []); this.set('activeSessionId', null); this.saveState(['activeSessionId']); } // Also clear active session
    updateUserInput(input) { this.set('userInput', input); }
    setLoading(isLoading) { this.set('isLoading', isLoading); } // This will now log internally too
    toggleSidebar(isOpen = null) { const current = this.get('isSidebarOpen'); this.set('isSidebarOpen', isOpen === null ? !current : isOpen); }
    setModalOpen(modalName, isOpen) { if (Object.prototype.hasOwnProperty.call(this._state, modalName)) { this.set(modalName, isOpen); } else { logger.warn(`Modal state key "${modalName}" not found.`); }}
    setApiKey(key) { const validatedKey = key ? key.trim() : null; this.set('apiKey', validatedKey); this.saveState(['apiKey']); if (validatedKey) { this.set('currentView', 'chat'); this.set('isLoginModalOpen', false); } else { this.set('currentView', 'login'); this.set('isLoginModalOpen', true); }}
    setUserPreference(key, value) { const fullKey = `userPreferences.${key}`; this.set(fullKey, value); this.saveState(['userPreferences']); }
    setActiveSessionId(sessionId) { this.set('activeSessionId', sessionId); this.saveState(['activeSessionId']);}
    logState() { logger.state('%cCURRENT STATE:', 'color: #2196F3; font-weight: bold;', JSON.parse(JSON.stringify(this._state))); }
    enableDebugging(enable = true) { this.set('debugMode', enable, true); if (enable) { logger.state('%cStateManager Debug Mode Enabled', 'color: orange; font-weight: bold;'); this.logState(); }}
}

window.StateManager = StateManager;
if (!window.stateManagerInstance) {
    window.stateManagerInstance = StateManager.getInstance(); 
}
