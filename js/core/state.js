/**
 * Parkland AI - Opus Magnum Edition
 * Core State Management System
 *
 * Centralized state management with persistence, validation, and reactive updates
 * Supports all themes, characters, and advanced features
 */

class AppState {
    constructor() {
        this.version = '2.0.0';
        this.storagePrefix = 'parkland_ai_opus_v2_';

        // Initialize state structure
        this.state = {
            // Application status
            app: {
                initialized: false,
                loading: false,
                currentView: 'login', // login, chat
                platform: 'unknown', // ios, android, desktop
                orientation: 'portrait',
                online: navigator.onLine
            },

            // Authentication & API
            auth: {
                isAuthenticated: false,
                apiKey: '',
                lastKeyValidation: null,
                quotaInfo: null
            },

            // Theme system
            theme: {
                current: 'default',
                transitioning: false,
                transitionType: null,
                previousTheme: null,
                preloadedThemes: new Set(['default'])
            },

            // Chat system
            chat: {
                currentChatId: null,
                chats: new Map(),
                messageHistory: [],
                isTyping: false,
                lastMessageTime: null,
                ticketCounter: 1001
            },

            // Voice & Audio
            voice: {
                recognition: {
                    supported: false,
                    active: false,
                    continuous: false,
                    language: 'en-US'
                },
                synthesis: {
                    enabled: true,
                    autoSpeak: true,
                    voices: [],
                    currentVoice: null,
                    rate: 1.0,
                    pitch: 1.0,
                    volume: 1.0
                },
                audio: {
                    soundEnabled: true,
                    ambientEnabled: true,
                    volume: 0.7,
                    currentTrack: null
                }
            },

            // Character system
            characters: {
                jaws: {
                    current: 'quint', // quint, brody, hooper
                    quint: {
                        active: true,
                        alive: true,
                        lastSeen: null
                    },
                    brody: {
                        active: false,
                        sharkSightings: 0,
                        lastSighting: null
                    },
                    hooper: {
                        active: false,
                        sharkSightings: 0,
                        lastSighting: null,
                        equipment: ['cage', 'camera', 'notes']
                    },
                    sharkThreatLevel: 0, // 0-10
                    lastSharkEncounter: null
                },
                jurassic: {
                    muldoon: {
                        active: true,
                        huntStatus: 'patrolling', // patrolling, suspicious, hiding, emergency
                        raptorAlerts: 0,
                        lastTransmission: null,
                        walkieTalkie: {
                            frequency: '145.230',
                            battery: 85,
                            signal: 'strong'
                        }
                    },
                    mrDna: {
                        active: true,
                        animation: 'idle', // idle, talking, transitioning, explaining
                        currentLesson: null,
                        interruptCount: 0,
                        position: { x: 20, y: 20 },
                        energy: 100
                    },
                    parkStatus: 'operational', // operational, systems_failure, containment_breach
                    securityLevel: 'green' // green, yellow, red
                }
            },

            // UI state
            ui: {
                sidebar: {
                    open: false,
                    width: 320
                },
                modals: {
                    active: null,
                    stack: []
                },
                settings: {
                    dropdown: false
                },
                notifications: [],
                focusedElement: null
            },

            // User preferences
            preferences: {
                animations: {
                    enabled: true,
                    reducedMotion: false,
                    transitionDuration: 'normal' // fast, normal, slow
                },
                accessibility: {
                    highContrast: false,
                    largeText: false,
                    announcements: true
                },
                developer: {
                    debugMode: false,
                    showPerformanceMetrics: false
                }
            },

            // Performance tracking
            performance: {
                lastFrameTime: 0,
                averageFPS: 60,
                memoryUsage: 0,
                networkLatency: 0
            }
        };

        // Event listeners for state changes
        this.listeners = new Map();
        this.eventQueue = [];
        this.processingEvents = false;

        // Initialize the state system
        this.initialize();
    }

    /**
     * Initialize state management system
     */
    initialize() {
        this.detectPlatform();
        this.loadPersistedState();
        this.setupEventListeners();
        this.validateState();

        console.log('🚀 AppState initialized', {
            version: this.version,
            platform: this.state.app.platform,
            theme: this.state.theme.current,
            authenticated: this.state.auth.isAuthenticated
        });
    }

    /**
     * Platform detection
     */
    detectPlatform() {
        const userAgent = navigator.userAgent.toLowerCase();

        if (/(iphone|ipad|ipod)/.test(userAgent) && !window.MSStream) {
            this.state.app.platform = 'ios';
        } else if (/android/.test(userAgent)) {
            this.state.app.platform = 'android';
        } else {
            this.state.app.platform = 'desktop';
        }

        // Detect orientation
        this.updateOrientation();
    }

    /**
     * Update device orientation
     */
    updateOrientation() {
        this.state.app.orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }

    /**
     * Load persisted state from localStorage
     */
    loadPersistedState() {
        try {
            // Load core preferences
            const apiKey = localStorage.getItem(`${this.storagePrefix}api_key`);
            if (apiKey) {
                this.state.auth.apiKey = apiKey;
                this.state.auth.isAuthenticated = true;
            }

            // Load theme
            const theme = localStorage.getItem(`${this.storagePrefix}theme`);
            if (theme && ['default', 'jaws', 'jurassic'].includes(theme)) {
                this.state.theme.current = theme;
            }

            // Load voice preferences
            const autoSpeak = localStorage.getItem(`${this.storagePrefix}auto_speak`);
            if (autoSpeak !== null) {
                this.state.voice.synthesis.autoSpeak = autoSpeak === 'true';
            }

            const soundEnabled = localStorage.getItem(`${this.storagePrefix}sound_enabled`);
            if (soundEnabled !== null) {
                this.state.voice.audio.soundEnabled = soundEnabled === 'true';
            }

            // Load chat data
            const chatsData = localStorage.getItem(`${this.storagePrefix}chats`);
            if (chatsData) {
                const parsedChats = JSON.parse(chatsData);
                this.state.chat.chats = new Map(Object.entries(parsedChats));
            }

            const currentChatId = localStorage.getItem(`${this.storagePrefix}current_chat`);
            if (currentChatId && this.state.chat.chats.has(currentChatId)) {
                this.state.chat.currentChatId = currentChatId;
            }

            // Load ticket counter
            const ticketCounter = localStorage.getItem(`${this.storagePrefix}ticket_counter`);
            if (ticketCounter) {
                this.state.chat.ticketCounter = parseInt(ticketCounter, 10);
            }

            // Load character states
            const jawsCharacters = localStorage.getItem(`${this.storagePrefix}jaws_characters`);
            if (jawsCharacters) {
                Object.assign(this.state.characters.jaws, JSON.parse(jawsCharacters));
            }

            const jurassicCharacters = localStorage.getItem(`${this.storagePrefix}jurassic_characters`);
            if (jurassicCharacters) {
                Object.assign(this.state.characters.jurassic, JSON.parse(jurassicCharacters));
            }

            // Load accessibility preferences
            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            this.state.preferences.animations.reducedMotion = reducedMotion;

            const highContrast = window.matchMedia('(prefers-contrast: high)').matches;
            this.state.preferences.accessibility.highContrast = highContrast;

        } catch (error) {
            console.warn('Error loading persisted state:', error);
            this.resetToDefaults();
        }
    }

    /**
     * Setup system event listeners
     */
    setupEventListeners() {
        // Online/offline detection
        window.addEventListener('online', () => {
            this.updateState('app.online', true);
        });

        window.addEventListener('offline', () => {
            this.updateState('app.online', false);
        });

        // Orientation change
        window.addEventListener('resize', () => {
            this.updateOrientation();
            this.notifyListeners('ui.viewport', {
                width: window.innerWidth,
                height: window.innerHeight,
                orientation: this.state.app.orientation
            });
        });

        // Visibility change for performance optimization
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseNonCriticalSystems();
            } else {
                this.resumeNonCriticalSystems();
            }
        });

        // Performance monitoring
        if ('performance' in window && 'memory' in performance) {
            setInterval(() => {
                this.updatePerformanceMetrics();
            }, 5000);
        }
    }

    /**
     * Validate state integrity
     */
    validateState() {
        // Ensure current chat exists
        if (this.state.chat.currentChatId && !this.state.chat.chats.has(this.state.chat.currentChatId)) {
            this.state.chat.currentChatId = null;
        }

        // Validate theme
        if (!['default', 'jaws', 'jurassic'].includes(this.state.theme.current)) {
            this.state.theme.current = 'default';
        }

        // Validate character states based on theme
        if (this.state.theme.current === 'jaws') {
            this.validateJawsCharacters();
        } else if (this.state.theme.current === 'jurassic') {
            this.validateJurassicCharacters();
        }

        this.state.app.initialized = true;
    }

    /**
     * Validate Jaws theme character states
     */
    validateJawsCharacters() {
        const jaws = this.state.characters.jaws;

        // If Quint is dead, ensure Brody and Hooper are active
        if (!jaws.quint.alive) {
            jaws.current = Math.random() > 0.5 ? 'brody' : 'hooper';
            jaws.brody.active = true;
            jaws.hooper.active = true;
        }

        // Validate shark threat level
        if (jaws.sharkThreatLevel < 0) jaws.sharkThreatLevel = 0;
        if (jaws.sharkThreatLevel > 10) jaws.sharkThreatLevel = 10;
    }

    /**
     * Validate Jurassic theme character states
     */
    validateJurassicCharacters() {
        const jurassic = this.state.characters.jurassic;

        // Validate hunt status
        const validStatuses = ['patrolling', 'suspicious', 'hiding', 'emergency'];
        if (!validStatuses.includes(jurassic.muldoon.huntStatus)) {
            jurassic.muldoon.huntStatus = 'patrolling';
        }

        // Validate park status
        const validParkStatuses = ['operational', 'systems_failure', 'containment_breach'];
        if (!validParkStatuses.includes(jurassic.parkStatus)) {
            jurassic.parkStatus = 'operational';
        }

        // Validate security level
        const validSecurityLevels = ['green', 'yellow', 'red'];
        if (!validSecurityLevels.includes(jurassic.securityLevel)) {
            jurassic.securityLevel = 'green';
        }
    }

    /**
     * Update state with validation and persistence
     */
    updateState(path, value, options = {}) {
        const { persist = true, notify = true, validate = true } = options;

        try {
            // Update nested state using dot notation
            this.setNestedValue(this.state, path, value);

            // Validate if requested
            if (validate) {
                this.validateStateChange(path, value);
            }

            // Persist critical state changes
            if (persist) {
                this.persistStateChange(path, value);
            }

            // Notify listeners
            if (notify) {
                this.notifyListeners(path, value);
            }

            // Queue events for batch processing
            this.queueEvent({
                type: 'state_change',
                path,
                value,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('State update failed:', { path, value, error });
            throw new Error(`Failed to update state at ${path}: ${error.message}`);
        }
    }

    /**
     * Get state value using dot notation
     */
    getState(path) {
        return this.getNestedValue(this.state, path);
    }

    /**
     * Set nested object value using dot notation
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!(key in current)) {
                current[key] = {};
            }
            return current[key];
        }, obj);

        target[lastKey] = value;
    }

    /**
     * Get nested object value using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Validate specific state changes
     */
    validateStateChange(path, value) {
        const validators = {
            'theme.current': (val) => ['default', 'jaws', 'jurassic'].includes(val),
            'voice.synthesis.rate': (val) => val >= 0.1 && val <= 10,
            'voice.synthesis.pitch': (val) => val >= 0 && val <= 2,
            'voice.synthesis.volume': (val) => val >= 0 && val <= 1,
            'characters.jaws.sharkThreatLevel': (val) => val >= 0 && val <= 10,
            'chat.ticketCounter': (val) => Number.isInteger(val) && val > 0
        };

        const validator = validators[path];
        if (validator && !validator(value)) {
            throw new Error(`Invalid value for ${path}: ${value}`);
        }
    }

    /**
     * Persist important state changes to localStorage
     */
    persistStateChange(path, value) {
        const persistMap = {
            'auth.apiKey': `${this.storagePrefix}api_key`,
            'theme.current': `${this.storagePrefix}theme`,
            'voice.synthesis.autoSpeak': `${this.storagePrefix}auto_speak`,
            'voice.audio.soundEnabled': `${this.storagePrefix}sound_enabled`,
            'chat.currentChatId': `${this.storagePrefix}current_chat`,
            'chat.ticketCounter': `${this.storagePrefix}ticket_counter`
        };

        const storageKey = persistMap[path];
        if (storageKey) {
            try {
                if (value === null || value === undefined) {
                    localStorage.removeItem(storageKey);
                } else {
                    localStorage.setItem(storageKey, String(value));
                }
            } catch (error) {
                console.warn('Failed to persist state:', { path, error });
            }
        }

        // Handle complex objects
        if (path === 'chat.chats') {
            this.persistChats();
        } else if (path.startsWith('characters.jaws')) {
            this.persistCharacterState('jaws');
        } else if (path.startsWith('characters.jurassic')) {
            this.persistCharacterState('jurassic');
        }
    }

    /**
     * Persist chat data
     */
    persistChats() {
        try {
            const chatsObject = Object.fromEntries(this.state.chat.chats);
            localStorage.setItem(`${this.storagePrefix}chats`, JSON.stringify(chatsObject));
        } catch (error) {
            console.warn('Failed to persist chats:', error);
        }
    }

    /**
     * Persist character state
     */
    persistCharacterState(theme) {
        try {
            const characters = this.state.characters[theme];
            localStorage.setItem(`${this.storagePrefix}${theme}_characters`, JSON.stringify(characters));
        } catch (error) {
            console.warn(`Failed to persist ${theme} characters:`, error);
        }
    }

    /**
     * Subscribe to state changes
     */
    subscribe(path, callback, options = {}) {
        const { immediate = false } = options;

        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Set());
        }

        this.listeners.get(path).add(callback);

        // Call immediately with current value if requested
        if (immediate) {
            const currentValue = this.getState(path);
            callback(currentValue, path);
        }

        // Return unsubscribe function
        return () => {
            const pathListeners = this.listeners.get(path);
            if (pathListeners) {
                pathListeners.delete(callback);
                if (pathListeners.size === 0) {
                    this.listeners.delete(path);
                }
            }
        };
    }

    /**
     * Notify listeners of state changes
     */
    notifyListeners(path, value) {
        // Notify exact path listeners
        const exactListeners = this.listeners.get(path);
        if (exactListeners) {
            exactListeners.forEach(callback => {
                try {
                    callback(value, path);
                } catch (error) {
                    console.error('Listener error:', { path, error });
                }
            });
        }

        // Notify wildcard listeners (e.g., 'characters.*')
        this.listeners.forEach((callbacks, listenerPath) => {
            if (listenerPath.includes('*')) {
                const pattern = listenerPath.replace('*', '.*');
                const regex = new RegExp(`^${pattern}$`);
                if (regex.test(path)) {
                    callbacks.forEach(callback => {
                        try {
                            callback(value, path);
                        } catch (error) {
                            console.error('Wildcard listener error:', { path, listenerPath, error });
                        }
                    });
                }
            }
        });
    }

    /**
     * Queue events for batch processing
     */
    queueEvent(event) {
        this.eventQueue.push(event);

        if (!this.processingEvents) {
            this.processEventQueue();
        }
    }

    /**
     * Process queued events
     */
    async processEventQueue() {
        this.processingEvents = true;

        while (this.eventQueue.length > 0) {
            const events = this.eventQueue.splice(0, 10); // Process in batches

            for (const event of events) {
                try {
                    await this.handleEvent(event);
                } catch (error) {
                    console.error('Event processing error:', { event, error });
                }
            }

            // Allow UI to update between batches
            await new Promise(resolve => setTimeout(resolve, 1));
        }

        this.processingEvents = false;
    }

    /**
     * Handle individual events
     */
    async handleEvent(event) {
        switch (event.type) {
            case 'state_change':
                // Additional processing for specific state changes
                if (event.path === 'theme.current') {
                    await this.handleThemeChange(event.value);
                }
                break;

            case 'character_action':
                await this.handleCharacterAction(event);
                break;

            case 'performance_warning':
                this.handlePerformanceWarning(event);
                break;
        }
    }

    /**
     * Handle theme changes
     */
    async handleThemeChange(newTheme) {
        // Update character states based on theme
        if (newTheme === 'jaws') {
            this.resetJawsCharacters();
        } else if (newTheme === 'jurassic') {
            this.resetJurassicCharacters();
        }

        // Preload theme assets
        this.preloadThemeAssets(newTheme);
    }

    /**
     * Reset Jaws character states
     */
    resetJawsCharacters() {
        this.updateState('characters.jaws', {
            current: 'quint',
            quint: { active: true, alive: true, lastSeen: null },
            brody: { active: false, sharkSightings: 0, lastSighting: null },
            hooper: { active: false, sharkSightings: 0, lastSighting: null, equipment: ['cage', 'camera', 'notes'] },
            sharkThreatLevel: 0,
            lastSharkEncounter: null
        }, { persist: true });
    }

    /**
     * Reset Jurassic character states
     */
    resetJurassicCharacters() {
        this.updateState('characters.jurassic', {
            muldoon: {
                active: true,
                huntStatus: 'patrolling',
                raptorAlerts: 0,
                lastTransmission: null,
                walkieTalkie: { frequency: '145.230', battery: 85, signal: 'strong' }
            },
            mrDna: {
                active: true,
                animation: 'idle',
                currentLesson: null,
                interruptCount: 0,
                position: { x: 20, y: 20 },
                energy: 100
            },
            parkStatus: 'operational',
            securityLevel: 'green'
        }, { persist: true });
    }

    /**
     * Preload theme assets
     */
    preloadThemeAssets(theme) {
        if (!this.state.theme.preloadedThemes.has(theme)) {
            // Add to preloaded set
            this.state.theme.preloadedThemes.add(theme);

            // Trigger asset preloading
            this.queueEvent({
                type: 'preload_assets',
                theme,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics() {
        if ('performance' in window && 'memory' in performance) {
            const memory = performance.memory;
            this.state.performance.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        }

        // Calculate FPS (simplified)
        const now = performance.now();
        if (this.state.performance.lastFrameTime > 0) {
            const deltaTime = now - this.state.performance.lastFrameTime;
            const fps = 1000 / deltaTime;
            this.state.performance.averageFPS = (this.state.performance.averageFPS * 0.9) + (fps * 0.1);
        }
        this.state.performance.lastFrameTime = now;

        // Emit performance warning if needed
        if (this.state.performance.averageFPS < 30 || this.state.performance.memoryUsage > 0.8) {
            this.queueEvent({
                type: 'performance_warning',
                fps: this.state.performance.averageFPS,
                memory: this.state.performance.memoryUsage,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Handle performance warnings
     */
    handlePerformanceWarning(event) {
        console.warn('Performance warning:', event);

        // Automatically reduce quality if needed
        if (event.fps < 20) {
            this.updateState('preferences.animations.enabled', false);
        }
    }

    /**
     * Pause non-critical systems when tab is hidden
     */
    pauseNonCriticalSystems() {
        this.updateState('app.paused', true);
        // Stop animations, reduce polling intervals, etc.
    }

    /**
     * Resume systems when tab becomes visible
     */
    resumeNonCriticalSystems() {
        this.updateState('app.paused', false);
        // Resume animations, restore polling intervals, etc.
    }

    /**
     * Reset state to defaults
     */
    resetToDefaults() {
        console.warn('Resetting state to defaults due to corruption');

        // Clear problematic localStorage
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.storagePrefix)) {
                localStorage.removeItem(key);
            }
        });

        // Reset to initial state
        this.initialize();
    }

    /**
     * Export current state for debugging
     */
    exportState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Get application status summary
     */
    getStatus() {
        return {
            version: this.version,
            initialized: this.state.app.initialized,
            authenticated: this.state.auth.isAuthenticated,
            theme: this.state.theme.current,
            platform: this.state.app.platform,
            performance: {
                fps: Math.round(this.state.performance.averageFPS),
                memory: Math.round(this.state.performance.memoryUsage * 100)
            },
            features: {
                voiceSupported: this.state.voice.recognition.supported,
                audioEnabled: this.state.voice.audio.soundEnabled,
                chatCount: this.state.chat.chats.size
            }
        };
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Clear all listeners
        this.listeners.clear();

        // Clear event queue
        this.eventQueue.length = 0;

        // Remove event listeners
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
        window.removeEventListener('resize', this.handleResize);

        console.log('AppState destroyed');
    }
}

// Export for global access
window.AppState = AppState;

// Create global instance
window.appState = new AppState();

console.log('🎯 State Management System loaded successfully');
