/**
 * Parkland AI - Opus Magnum Edition
 * Main Application Controller (App.js)
 *
 * Orchestrates all core components, manages UI interactions,
 * and handles the main application lifecycle.
 */

/* global MarkdownProcessor, ClaudeAPIService, ChatMessages, ChatHistory, VoiceRecognition, VoiceSynthesis, TypingIndicatorManager, ChatSearchManager, ThemePersistence, ThemeTransition, CharacterManager, ThemeManager, StateManager, logger */

class App {
    constructor() {
        // This initial check for core globals should pass now.
        if (typeof console !== 'undefined') {
            logger.app('App Constructor: Checking global singletons/classes...');
            logger.app('typeof window.UtilsInstance:', typeof window.UtilsInstance, '; Value:', window.UtilsInstance);
            logger.app('typeof window.StateManager (Class):', typeof window.StateManager, '; Value:', window.StateManager);
            logger.app('typeof window.AppEvents:', typeof window.AppEvents, '; Value:', window.AppEvents);
        }

        if (!window.UtilsInstance || !window.StateManager || !window.AppEvents) {
            const criticalErrorMsg = "Critical Error: Core utility scripts (Utils, StateManager, AppEvents) not found. App cannot initialize.";
            logger.error(criticalErrorMsg); 
            document.body.innerHTML = `<div style="color: red; font-family: sans-serif; padding: 20px;">${criticalErrorMsg} Please check console and script loading order in index.html.</div>`;
            throw new Error(criticalErrorMsg); 
        }

        this.utils = window.UtilsInstance;
        this.stateManager = window.StateManager.getInstance();
        this.eventEmitter = window.AppEvents;

        // Initialize properties for modules that will be instantiated in init()
        this.themePersistence = null;
        this.themeTransition = null;
        this.characterManager = null;
        this.themeManager = null;
        this.apiService = null;
        this.voiceRecognition = null;
        this.voiceSynthesis = null;
        this.chatHistory = null;
        this.chatMessages = null;
        this.markdownProcessor = null;
        this.soundEffects = null;
        this.audioWorker = null;
        this.typingIndicator = null;
        this.searchManager = null;

        this.ui = {}; // To store DOM element references
        this.isInitialized = false;
        this.chatViewShownBefore = false; // Flag for initial chat view presentation

        this._handleVisibilityChange = this._handleVisibilityChange.bind(this); // Bind context for event listener

        if (this.stateManager && this.stateManager.get('debugMode')) {
            logger.app('App constructor: Debug mode is ON.');
        }
    }

    /**
     * Initializes the application.
     * Sets up UI elements, initializes modules, registers event listeners.
     */
    async init() {
        if (this.isInitialized) {
            logger.warn('App already initialized.');
            return;
        }

        logger.app('🚀 Parkland AI - Opus Magnum Edition: Initializing App...');
        document.body.classList.add('app-loading');
        const loadingOverlayDirect = document.getElementById('loadingOverlay');
        if(loadingOverlayDirect && this.utils) { // Ensure utils is available
             this.utils.removeClass(loadingOverlayDirect, 'hidden'); // Should be visible by default from CSS
        }


        this._selectUIElements(); // Populate this.ui

        // Initialize Feature Modules in correct order
        if (typeof MarkdownProcessor === 'undefined') { 
            const msg = "MarkdownProcessor class is undefined! Ensure markdown.js is loaded before app.js.";
            logger.error(msg); return Promise.reject(new Error(msg)); 
        }
        this.markdownProcessor = new MarkdownProcessor(this.utils); 
        await this.markdownProcessor.init(); 

        if (typeof ClaudeAPIService === 'undefined') { 
            const msg = "ClaudeAPIService class is undefined! Ensure claude.js is loaded.";
            logger.error(msg); return Promise.reject(new Error(msg)); 
        }
        this.apiService = new ClaudeAPIService(this.stateManager, this.utils);

        if (typeof ChatMessages === 'undefined') { 
            const msg = "ChatMessages class is undefined! Ensure messages.js is loaded.";
            logger.error(msg); return Promise.reject(new Error(msg)); 
        }
        this.chatMessages = new ChatMessages(this.ui.chatMessagesContainer, this.utils, this.markdownProcessor, this.stateManager);

        if (typeof ChatHistory === 'undefined') { 
            const msg = "ChatHistory class is undefined! Ensure history.js is loaded.";
            logger.error(msg); return Promise.reject(new Error(msg)); 
        }
        this.chatHistory = new ChatHistory(this.ui.chatHistoryContainer, this.utils, this.eventEmitter, this.stateManager);

        if (typeof VoiceRecognition === 'undefined') { 
            const msg = "VoiceRecognition class is undefined! Ensure recognition.js is loaded.";
            logger.error(msg); return Promise.reject(new Error(msg)); 
        }
        this.voiceRecognition = new VoiceRecognition(this.stateManager, this.eventEmitter, this.utils, this.ui.micBtn);
        if (this.ui.micBtn && !this.voiceRecognition.isSupported()) {
            this.ui.micBtn.disabled = true;
            this.ui.micBtn.title = "Voice recognition not supported by your browser.";
            this.utils.addClass(this.ui.micBtn, 'btn-disabled');
        }


        if (typeof VoiceSynthesis === 'undefined') { 
            const msg = "VoiceSynthesis class is undefined! Ensure synthesis.js is loaded.";
            logger.error(msg); return Promise.reject(new Error(msg)); 
        }
        this.voiceSynthesis = new VoiceSynthesis(this.stateManager, this.eventEmitter, this.utils);
        this.voiceSynthesis.init(); 

        if (typeof TypingIndicatorManager === 'undefined') { 
            const msg = "TypingIndicatorManager class is undefined! Ensure typing-indicator.js is loaded.";
            logger.error(msg); return Promise.reject(new Error(msg)); 
        }
        this.typingIndicator = new TypingIndicatorManager(this.utils, this.stateManager, this.eventEmitter);

        if (typeof ChatSearchManager === 'undefined') { 
            const msg = "ChatSearchManager class is undefined! Ensure search-manager.js is loaded.";
            logger.error(msg); return Promise.reject(new Error(msg)); 
        }
        this.searchManager = new ChatSearchManager(this.utils, this.stateManager, this.eventEmitter);

        if (typeof ThemePersistence === 'undefined') { 
            const msg = "ThemePersistence class is undefined! Ensure persistence.js is loaded.";
            logger.error(msg); return Promise.reject(new Error(msg)); 
        }
        this.themePersistence = new ThemePersistence(this.stateManager);

        if (typeof ThemeTransition === 'undefined') { 
            const msg = "ThemeTransition class is undefined! Ensure themes/transitions.js is loaded.";
            logger.error(msg); return Promise.reject(new Error(msg)); 
        }
        this.themeTransition = new ThemeTransition(this.utils, this.stateManager);

        if (typeof CharacterManager === 'undefined') { 
            const msg = "CharacterManager class is undefined! Ensure voice/characters.js is loaded.";
            logger.error(msg); return Promise.reject(new Error(msg)); 
        }
        this.characterManager = new CharacterManager(this.stateManager, this.eventEmitter, this.utils, null);

        if (typeof ThemeManager === 'undefined') { 
            const msg = "ThemeManager class is undefined! Ensure themes/manager.js is loaded.";
            logger.error(msg); return Promise.reject(new Error(msg)); 
        }
        this.themeManager = new ThemeManager(
            this.stateManager, this.utils, this.eventEmitter,
            this.themePersistence, this.themeTransition, this.characterManager
        );
        this.characterManager.themeManager = this.themeManager;

        if (window.Worker) {
            try {
                this.audioWorker = new Worker('workers/audio-processor.js');
                this.soundEffects = {
                    playSoundEffect: (effectName, volume = 1.0, loop = false, soundId = null) => {
                        if (this.stateManager.get('userPreferences.soundEffectsEnabled') || String(effectName).includes('force')) {
                            this.audioWorker.postMessage({ type: 'PLAY_SOUND', payload: { effectName, volume, loop, soundId } });
                        }
                    },
                    stopSoundEffect: (soundId) => {
                         this.audioWorker.postMessage({ type: 'STOP_SOUND', payload: { soundId } });
                    },
                    preload: (effectNames) => {
                        this.audioWorker.postMessage({ type: 'PRELOAD_SOUNDS', payload: { effectNames } });
                    }
                };
                this.audioWorker.onmessage = (event) => {
                    if (this.stateManager.get('debugMode')) logger.app('Msg from AudioWorker:', event.data);
                    if (event.data.type === 'SOUND_ERROR') logger.error('AudioWorker Sound Error:', event.data.payload);
                    else if (event.data.type === 'WORKER_READY' && this.soundEffects) {
                        this.soundEffects.preload(['uiClick', 'messageSent', 'messageReceived', 'error', 'appReady']);
                    }
                };
                this.audioWorker.onerror = (error) => {
                    logger.error("Error initializing AudioWorker:", error.message ? `${error.message} (at ${error.filename}:${error.lineno})` : error);
                    this.soundEffects = null;
                };
                window.soundEffects = this.soundEffects;
            } catch (error) {
                console.error("Failed to create AudioProcessor worker:", error);
                this.soundEffects = null;
            }
        } else {
            console.warn("Web Workers not supported. Sound effects will be limited or disabled.");
            this.soundEffects = null;
        }

        await this.themeManager.init();
        this.characterManager.initCharacters();

        this._registerEventListeners();
        this._setupStateSubscriptions();
        this._updateUIBasedOnState();

        if (this.stateManager.get('apiKey')) {
            this._showChatView();
        } else {
            this._showLoginView();
        }
        
        this.isInitialized = true;
        console.log('✅ App initialized successfully.');

        console.log('DEBUG App.init: Scheduling isLoading=false timeout.');
        setTimeout(() => {
            console.log('DEBUG App.init: setTimeout callback fired. Setting isLoading to false.');
            this.stateManager.set('isLoading', false);
        }, 500); // Short delay to allow everything to settle before hiding loader
    }

    _selectUIElements() {
        this.ui.loadingOverlay = this.utils.$('#loadingOverlay');
        this.ui.appContainer = this.utils.$('#appContainer');
        this.ui.loginContainer = this.utils.$('#loginContainer');
        this.ui.chatContainer = this.utils.$('#chatContainer');
        this.ui.loginForm = this.utils.$('#loginForm');
        this.ui.apiKeyInput = this.utils.$('#apiKeyInput');
        this.ui.loginButton = this.utils.$('#loginButton');
        this.ui.loginErrorMessage = this.utils.$('#loginErrorMessage');
        this.ui.sidebar = this.utils.$('#appSidebar'); 
        this.ui.chatHeader = this.utils.$('.chat-header', this.ui.chatContainer); 
        this.ui.chatInputForm = this.utils.$('#chatInputForm');
        this.ui.chatInput = this.utils.$('#chatInput');
        this.ui.sendBtn = this.utils.$('#sendBtn');
        this.ui.micBtn = this.utils.$('#micBtn');
        this.ui.searchBtn = this.utils.$('#searchBtn');
        this.ui.chatMessagesContainer = this.utils.$('.messages-container .messages-inner', this.ui.chatContainer);
        this.ui.chatHistoryContainer = this.utils.$('.sidebar-content .chat-history-list', this.ui.sidebar);
        
        const sidebarHeader = this.utils.$('.sidebar-header', this.ui.sidebar);
        if(sidebarHeader) {
            this.ui.newChatBtn = this.utils.$('#newChatBtn', sidebarHeader);
            this.ui.sidebarToggleBtn = this.utils.$('#sidebarToggle', sidebarHeader);
        } else {
            // Fallback if sidebar structure is flatter, though IDs should be unique
            this.ui.newChatBtn = this.utils.$('#newChatBtn');
            this.ui.sidebarToggleBtn = this.utils.$('#sidebarToggle');
        }

        const sidebarFooter = this.utils.$('.sidebar-footer', this.ui.sidebar);
        if(sidebarFooter) {
            this.ui.settingsBtn = this.utils.$('#settingsBtn', sidebarFooter);
        } else {
            this.ui.settingsBtn = this.utils.$('#settingsBtn');
        }

        this.ui.settingsModal = this.utils.$('#appSettingsModal');
        if(this.ui.settingsModal){
            this.ui.settingsForm = this.utils.$('#settingsForm', this.ui.settingsModal); 
            this.ui.closeSettingsModalBtn = this.utils.$('.modal-close', this.ui.settingsModal); // More specific selector
        }
        if(this.ui.chatContainer) { // Ensure chatContainer is found before querying within it
            this.ui.emptyStateContainer = this.utils.$('.empty-state-container', this.ui.chatContainer);
        }
    }

    _registerEventListeners() {
        if (this.ui.loginForm) {
            this.ui.loginForm.addEventListener('submit', this._handleLoginSubmit.bind(this));
        } else if (this.ui.loginButton) { // Fallback if only button exists (e.g. if form tag was missed)
            this.ui.loginButton.addEventListener('click', (e) => {
                 e.preventDefault(); // Prevent default if it's a button that might be in a form
                 this._handleLoginSubmit(e);
            });
        }

        if(this.ui.chatInputForm) this.ui.chatInputForm.addEventListener('submit', this._handleSendMessage.bind(this));
        if(this.ui.chatInput) this.ui.chatInput.addEventListener('keydown', this._handleInputKeyDown.bind(this));
        if(this.ui.sendBtn) this.ui.sendBtn.addEventListener('click', this._handleSendMessage.bind(this));
        
        if(this.ui.micBtn && this.voiceRecognition && this.voiceRecognition.isSupported()) {
            this.ui.micBtn.addEventListener('click', () => this.voiceRecognition.toggleListening());
        } else if (this.ui.micBtn) { // Disable if not supported
            this.utils.addClass(this.ui.micBtn, 'btn-disabled'); // Use a class for styling disabled state
            this.ui.micBtn.disabled = true;
        }

        if(this.ui.newChatBtn) this.ui.newChatBtn.addEventListener('click', this._handleNewChat.bind(this));

        if(this.ui.searchBtn) this.ui.searchBtn.addEventListener('click', () => {
            if (this.searchManager) {
                this.searchManager.toggleSearch();
            }
        });

        if (this.ui.settingsBtn) {
            this.ui.settingsBtn.addEventListener('click', () => this.stateManager.setModalOpen('isSettingsModalOpen', true));
        }
        if (this.ui.closeSettingsModalBtn) {
            this.ui.closeSettingsModalBtn.addEventListener('click', () => this.stateManager.setModalOpen('isSettingsModalOpen', false));
        }
        
        // Handle modal overlay click to close settings modal
        const settingsModalOverlay = this.utils.$('#appSettingsModal'); // This is the overlay itself
        if (settingsModalOverlay) {
            settingsModalOverlay.addEventListener('click', (event) => {
                if (event.target === settingsModalOverlay) { // Clicked on overlay itself, not modal content
                    this.stateManager.setModalOpen('isSettingsModalOpen', false);
                }
            });
        }
        // Also add cancel button functionality for settings modal
        const settingsCancelBtn = this.utils.$('.modal-cancel-btn', this.ui.settingsModal);
        if(settingsCancelBtn) {
            settingsCancelBtn.addEventListener('click', () => this.stateManager.setModalOpen('isSettingsModalOpen', false));
        }


        if (this.ui.settingsForm) {
            this.ui.settingsForm.addEventListener('submit', this._handleSettingsSave.bind(this));
            this.utils.$$('input, select', this.ui.settingsForm).forEach(input => {
                input.addEventListener('change', this._handlePreferenceChange.bind(this));
            });
        }

        if (this.ui.sidebarToggleBtn) {
            this.ui.sidebarToggleBtn.addEventListener('click', () => this.stateManager.toggleSidebar());
        }

        window.addEventListener('keydown', this._handleGlobalKeyDown.bind(this));
        // Store debounced handler to be able to remove it later if app is destroyed
        this._debouncedResizeHandler = this.utils.debounce(this._handleResize.bind(this), 200);
        window.addEventListener('resize', this._debouncedResizeHandler);
        document.addEventListener('visibilitychange', this._handleVisibilityChange);

        // Custom App Event Listeners
        this.eventEmitter.on('errorDisplay', this._displayError.bind(this));
        this.eventEmitter.on('notificationDisplay', this._displayNotification.bind(this));
        this.eventEmitter.on('playSound', (payload) => { 
            if (this.soundEffects) { // Check if soundEffects (and thus audioWorker) initialized
                this.soundEffects.playSoundEffect(payload.soundName, payload.volume, payload.loop, payload.soundId);
            }
        });
        this.eventEmitter.on('stopSound', (payload) => {
            if (this.soundEffects) {
                this.soundEffects.stopSoundEffect(payload.soundId);
            }
        });
         this.eventEmitter.on('character:speakRequested', ({ characterKey, text, options }) => {
            if (this.voiceSynthesis) {
                this.voiceSynthesis.speak(text, characterKey, options);
            }
        });
        // Listener for when chat history loads a session, to update main chat title
        this.eventEmitter.on('chatSessionLoaded', ({ sessionId }) => {
            const sessions = this.chatHistory ? this.chatHistory._getStoredSessions() : []; // Access internal method carefully or add public getter
            const loadedSession = sessions.find(s => s.id === sessionId);
            if(this.ui.chatHeader) {
                const chatTitleEl = this.utils.$('.chat-title', this.ui.chatHeader);
                if(chatTitleEl) chatTitleEl.textContent = loadedSession ? (this.utils.truncate(loadedSession.title, 30) || 'Chat') : 'Chat';
            }
        });
        this.eventEmitter.on('newChatStarted', () => {
            if(this.ui.chatHeader) {
                 const chatTitleEl = this.utils.$('.chat-title', this.ui.chatHeader);
                 if(chatTitleEl) chatTitleEl.textContent = 'New Chat'; // Set title for new chat
            }
        });
    }

    _setupStateSubscriptions() {
        this.stateManager.subscribe('change:isLoading', ({ newValue }) => {
            console.log(`DEBUG App: 'change:isLoading' event received by App. New value: ${newValue}`);
            newValue ? this._showLoadingScreen() : this._hideLoadingScreen();
        });
        this.stateManager.subscribe('change:currentTheme', ({ newValue }) => {
            if (this.themeManager) this.themeManager.applyThemeToBody(newValue);
            // Update theme selector in settings modal if it's open
            const themeSelectSetting = this.utils.$('#themeSelectorSetting', this.ui.settingsForm);
            if (themeSelectSetting && this.stateManager.get('isSettingsModalOpen')) {
                themeSelectSetting.value = newValue;
            }
        });
        this.stateManager.subscribe('change:chatHistory', ({ newValue, oldValue }) => {
            if(this.chatMessages) this.chatMessages.renderHistory(newValue); 
            this._toggleEmptyState(newValue.length === 0);
            // Update session in history list on new messages or clear
            if ( (newValue.length > (oldValue ? oldValue.length : 0)) || // Message added
                 (newValue.length > 0 && (!oldValue || oldValue.length === 0)) || // History populated from empty
                 (newValue.length === 0 && oldValue && oldValue.length > 0) ) { // History cleared
                if(this.chatHistory) this.chatHistory.addOrUpdateCurrentSession(); 
            }
        });
        this.stateManager.subscribe('change:isSidebarOpen', ({ newValue }) => {
            if(this.ui.sidebar) {
                this.ui.sidebar.classList.toggle('open', newValue);
                this.ui.sidebar.classList.toggle('collapsed', !newValue);
            }
            if(this.ui.appContainer) this.ui.appContainer.classList.toggle('sidebar-collapsed', !newValue);
        });
        this.stateManager.subscribe('change:isLoginModalOpen', ({ newValue }) => {
            // This state now more accurately reflects if the login *view* should be shown
            if (newValue) this._showLoginView(); else this._showChatView();
        });
        this.stateManager.subscribe('change:isSettingsModalOpen', ({ newValue }) => {
            this._toggleModal(this.ui.settingsModal, newValue);
             if (newValue && this.ui.settingsForm) this._populateSettingsForm();
        });
        this.stateManager.subscribe('change:isMicListening', ({newValue}) => {
            if(this.ui.micBtn) {
                this.ui.micBtn.classList.toggle('active', newValue); 
                this.ui.micBtn.classList.toggle('listening', newValue); // More specific class for styling
                this.ui.micBtn.setAttribute('aria-pressed', newValue.toString());
                // Change icon based on state (example)
                const iconContainer = this.utils.$('.icon', this.ui.micBtn); // Assuming icon is wrapped
                if (iconContainer) {
                    if (newValue) { // Listening
                        //stop icon: <path d="M12 15c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path>
                        iconContainer.innerHTML = this.utils.getIconSVG('stopMic') || '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 15c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path></svg>';
                    } else { // Not listening
                        // mic icon: <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"></path>
                        iconContainer.innerHTML = this.utils.getIconSVG('mic') || '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"></path></svg>';
                    }
                }
            }
        });
        this.stateManager.subscribe('change:userInput', ({newValue}) => {
            if(this.ui.chatInput && this.ui.chatInput.value !== newValue) { // Avoid feedback loop if programmatically set
                this.ui.chatInput.value = newValue;
                // Auto-resize textarea (also handled in keydown, but good for programmatic changes)
                this.ui.chatInput.style.height = 'auto';
                this.ui.chatInput.style.height = (this.ui.chatInput.scrollHeight) + 'px';
            }
        });
         this.stateManager.subscribe('change:activeSessionId', ({ newValue }) => {
            if (this.chatHistory) this.chatHistory.renderHistoryList(); // Re-render to update active state styling
            const sessions = this.chatHistory ? this.chatHistory._getStoredSessions() : [];
            const loadedSession = sessions.find(s => s.id === newValue);
            if(this.ui.chatHeader) {
                const chatTitleEl = this.utils.$('.chat-title', this.ui.chatHeader);
                if(chatTitleEl) chatTitleEl.textContent = loadedSession ? (this.utils.truncate(loadedSession.title, 30) || 'Chat') : 'New Chat';
            }
        });
    }

    _updateUIBasedOnState() {
        if (this.themeManager) this.themeManager.applyThemeToBody(this.stateManager.get('currentTheme'));
        const isSidebarOpen = this.stateManager.get('isSidebarOpen');
        if(this.ui.sidebar) {
            this.ui.sidebar.classList.toggle('open', isSidebarOpen);
            this.ui.sidebar.classList.toggle('collapsed', !isSidebarOpen);
        }
        if(this.ui.appContainer) this.ui.appContainer.classList.toggle('sidebar-collapsed', !isSidebarOpen);

        if(this.chatHistory) this.chatHistory.renderHistoryList();
        if(this.chatMessages) this.chatMessages.renderHistory(this.stateManager.get('chatHistory'));
        this._toggleEmptyState(this.stateManager.get('chatHistory').length === 0);

        const apiKey = this.stateManager.get('apiKey');
        if (apiKey) {
            this._showChatView();
        } else {
            this._showLoginView();
        }
    }

    _handleLoginSubmit(event) {
        if(event) event.preventDefault();
        if(!this.ui.apiKeyInput) { console.error("API Key input not found"); return; }
        const apiKey = this.ui.apiKeyInput.value.trim();

        if (this.apiService && this.apiService.validateApiKey(apiKey)) {
            this.stateManager.setApiKey(apiKey); // This will trigger view change via state subscription
            if(this.ui.loginErrorMessage) this.ui.loginErrorMessage.textContent = '';
            if (this.soundEffects) this.soundEffects.playSoundEffect('loginSuccess');
        } else {
            if(this.ui.loginErrorMessage) this.ui.loginErrorMessage.textContent = 'Invalid API Key format or value.';
            if (this.soundEffects) this.soundEffects.playSoundEffect('error');
            if(this.ui.loginForm && this.utils && typeof this.utils.shake === 'function') this.utils.shake(this.ui.loginForm);
        }
    }

    _showLoginView() {
        if(this.ui.chatContainer) this.utils.addClass(this.ui.chatContainer, 'hidden');
        if(this.ui.loginContainer) this.utils.removeClass(this.ui.loginContainer, 'hidden');
        this.stateManager.set('currentView', 'login', true); // Silent update for internal view tracking
        if(this.ui.apiKeyInput) this.ui.apiKeyInput.focus();
    }

    _showChatView() {
        if(this.ui.loginContainer) this.utils.addClass(this.ui.loginContainer, 'hidden');
        if(this.ui.chatContainer) this.utils.removeClass(this.ui.chatContainer, 'hidden');
        this.stateManager.set('currentView', 'chat', true); // Silent update
        if(this.chatMessages) this.chatMessages.scrollToBottom(true); // Force scroll when view becomes active
        if(this.ui.chatInput) this.ui.chatInput.focus();

        if(!this.chatViewShownBefore) {
            this.eventEmitter.emit('chatViewReady'); // For character intros, etc.
            this.chatViewShownBefore = true;
        }
    }

    _handleSendMessage(event) {
        if (event) event.preventDefault();
        const messageText = this.stateManager.get('userInput').trim();
        if (!messageText) return;

        if (this.soundEffects) this.soundEffects.playSoundEffect('messageSent');

        const userMessage = {
            id: `msg-user-${this.utils.generateId('')}`, 
            role: 'user',
            content: messageText,
            timestamp: Date.now()
        };
        
        // Emit message sending event for typing indicator
        this.eventEmitter.emit('message:sending', { messageId: userMessage.id, content: messageText });
        
        this.stateManager.addMessageToHistory(userMessage); // This triggers chatHistory save and UI update

        this.stateManager.set('userInput', ''); // Clear state
        if(this.ui.chatInput) {
            this.ui.chatInput.value = ''; // Clear UI
            this.ui.chatInput.style.height = 'auto'; // Reset height
            this.ui.chatInput.focus(); // Keep focus on input
        }

        // Emit message sent event for typing indicator
        this.eventEmitter.emit('message:sent', { messageId: userMessage.id });
        
        // Start API request with typing indicator
        this.eventEmitter.emit('api:requestStart', { 
            messageId: userMessage.id,
            estimatedDuration: 5000 
        });

        if (!this.apiService) {
            this._handleApiError({message: "API Service not available.", messageId: userMessage.id});
            return;
        }
        
        const historyForApi = this.utils.deepClone(this.stateManager.get('chatHistory'));

        this.apiService.sendMessage(messageText, historyForApi)
            .then(response => this._processAssistantResponse(response, userMessage.id))
            .catch(error => this._handleApiError(error, userMessage.id));
    }
    
    _processAssistantResponse(apiResponse, requestMessageId) {
        let content = '';
        let character = this.stateManager.get('activeCharacter');

        if (typeof apiResponse === 'string') content = apiResponse;
        else if (apiResponse && typeof apiResponse.content === 'string') {
            content = apiResponse.content;
            if (apiResponse.character) character = apiResponse.character; // API might suggest a character override
        } else {
            content = "Sorry, I received an unexpected response from the AI.";
             console.warn("Unexpected API response format in _processAssistantResponse:", apiResponse);
        }

        const assistantMessage = {
            id: `msg-assistant-${this.utils.generateId('')}`,
            role: 'assistant',
            content: content,
            timestamp: Date.now(),
            character: character
        };
        
        // Emit API completion event
        this.eventEmitter.emit('api:requestComplete', { 
            messageId: assistantMessage.id,
            requestMessageId: requestMessageId,
            response: apiResponse 
        });
        
        // Emit message received event
        this.eventEmitter.emit('message:received', { 
            messageId: assistantMessage.id,
            content: content,
            usage: apiResponse?.usage 
        });
        
        this.stateManager.addMessageToHistory(assistantMessage); // Triggers UI update via subscription

        if (this.stateManager.get('userPreferences.voiceOutputEnabled') && this.voiceSynthesis) {
            this.voiceSynthesis.speak(assistantMessage.content, assistantMessage.character);
        }
        if (this.soundEffects) this.soundEffects.playSoundEffect('messageReceived');
    }

    _handleApiError(error, messageId = null) {
        console.error("API Error in App:", error);
        const errorMessage = (error && error.message) ? error.message : "An unknown API error occurred.";
        
        // Emit API error event for typing indicator
        this.eventEmitter.emit('api:requestError', { 
            error: errorMessage,
            messageId: messageId,
            retryable: error?.retryable || false
        });
        
        // Emit message error event
        if (messageId) {
            this.eventEmitter.emit('message:error', { 
                messageId: messageId,
                error: errorMessage 
            });
        }
        
        const errorResponseMessage = {
            id: `msg-error-${this.utils.generateId('')}`,
            role: 'assistant', // Display as an assistant message for errors
            content: `⚠️ ${errorMessage}`,
            timestamp: Date.now(),
            isError: true
        };
        this.stateManager.addMessageToHistory(errorResponseMessage); // Triggers UI update
        this.eventEmitter.emit('errorDisplay', { message: errorMessage, type: 'api' }); // For global display
    }


    _handleInputKeyDown(event) {
        if(!event || !event.target) return;
        this.stateManager.set('userInput', event.target.value, true); // Update state silently

        const sendOnEnter = this.stateManager.get('userPreferences.sendOnEnter');
        if (event.key === 'Enter' && sendOnEnter && !event.shiftKey) {
            event.preventDefault();
            this._handleSendMessage();
        }
        
        // Auto-resize textarea
        event.target.style.height = 'auto';
        const maxHeightStyle = this.utils.getStyle(event.target, 'max-height');
        const maxHeight = maxHeightStyle && maxHeightStyle !== 'none' ? parseInt(maxHeightStyle, 10) : Infinity;
        event.target.style.height = Math.min(event.target.scrollHeight, maxHeight) + 'px';
    }

    _handleNewChat() {
        this.stateManager.clearChatHistory(); 
        this.stateManager.setActiveSessionId(null); 
        if(this.chatHistory) this.chatHistory.renderHistoryList(); 
        if(this.ui.chatInput) {
            this.ui.chatInput.value = ""; 
            this.ui.chatInput.style.height = 'auto'; 
            this.ui.chatInput.focus();
        }
        this._toggleEmptyState(true); // Show empty state
        if (this.soundEffects) this.soundEffects.playSoundEffect('newChat');
        this.eventEmitter.emit('newChatStarted'); // Other modules can listen
         // Potentially reset/update current chat title in header
        if(this.ui.chatHeader) {
            const chatTitleEl = this.utils.$('.chat-title', this.ui.chatHeader);
            if(chatTitleEl) chatTitleEl.textContent = 'New Chat';
        }
    }
    
    _populateSettingsForm() {
        if (!this.ui.settingsForm) return;
        const prefs = this.stateManager.get('userPreferences');
        const apiKey = this.stateManager.get('apiKey');
        const currentProvider = this.stateManager.get('currentApiProvider');
        const currentApiModel = this.stateManager.get(`modelPreferences.${currentProvider}.model`);

        const apiKeySettingEl = this.utils.$('#apiKeySetting', this.ui.settingsForm);
        if(apiKeySettingEl) apiKeySettingEl.value = apiKey || '';
        
        const modelSelectEl = this.utils.$('#modelSelection', this.ui.settingsForm);
        if(modelSelectEl) modelSelectEl.value = currentApiModel || 'claude-3-haiku-20240307'; // Default fallback

        // Helper to set checkbox state
        const setCheckbox = (id, value) => {
            const el = this.utils.$(`#${id}`, this.ui.settingsForm);
            if(el) el.checked = !!value; // Ensure boolean
        };

        setCheckbox('autoScroll', prefs.autoScroll);
        setCheckbox('sendOnEnter', prefs.sendOnEnter);
        setCheckbox('markdownRendering', prefs.markdownRendering);
        setCheckbox('voiceInputEnabled', prefs.voiceInputEnabled);
        setCheckbox('voiceOutputEnabled', prefs.voiceOutputEnabled);
        setCheckbox('soundEffectsEnabled', prefs.soundEffectsEnabled);
        setCheckbox('reduceMotion', prefs.reduceMotion);


        const themeSelect = this.utils.$('#themeSelectorSetting', this.ui.settingsForm);
        if (themeSelect && this.themeManager) {
            themeSelect.innerHTML = ''; // Clear old options
            this.themeManager.getAvailableThemes().forEach(theme => {
                const option = this.utils.createElement('option', { value: theme.key }, theme.name);
                themeSelect.appendChild(option);
            });
            themeSelect.value = this.stateManager.get('currentTheme');
        }
        const characterVoiceSelect = this.utils.$('#characterVoiceSelector', this.ui.settingsForm);
        if (characterVoiceSelect && this.characterManager) {
            characterVoiceSelect.innerHTML = '';
            const defaultOpt = this.utils.createElement('option', { value: 'default'}, 'Default Voice');
            characterVoiceSelect.appendChild(defaultOpt);
            const characters = this.characterManager.getAvailableCharacters(); // Expects { key: {name, theme} }
            for (const key in characters) {
                const option = this.utils.createElement('option', { value: key }, characters[key].name);
                characterVoiceSelect.appendChild(option);
            }
            characterVoiceSelect.value = prefs.voiceCharacter || 'default';
        }
    }

    _handleSettingsSave(event) {
        event.preventDefault();
        if(!this.ui.settingsForm) return;
        const formData = new FormData(this.ui.settingsForm);
        
        const newApiKey = formData.get('apiKeySetting')?.trim() || null;
        if (newApiKey !== this.stateManager.get('apiKey')) {
            if (newApiKey === null || (this.apiService && this.apiService.validateApiKey(newApiKey))) {
                this.stateManager.setApiKey(newApiKey);
            } else {
                const apiKeySettingEl = this.utils.$('#apiKeySetting', this.ui.settingsForm);
                if(apiKeySettingEl && this.utils && typeof this.utils.shake === 'function') this.utils.shake(apiKeySettingEl);
                this.eventEmitter.emit('notificationDisplay', {message: 'Invalid API key format.', type: 'error'});
                return;
            }
        }

        const newTheme = formData.get('themeSelectorSetting');
        if (newTheme && newTheme !== this.stateManager.get('currentTheme') && this.themeManager) {
            this.themeManager.setCurrentTheme(newTheme);
        }

        ['autoScroll', 'sendOnEnter', 'markdownRendering', 'voiceInputEnabled', 'voiceOutputEnabled', 'soundEffectsEnabled', 'reduceMotion'].forEach(key => {
             const el = this.utils.$(`#${key}`, this.ui.settingsForm); // Check element exists
             this.stateManager.setUserPreference(key, el ? el.checked : formData.has(key)); // Use el.checked if it's a checkbox
        });
        this.stateManager.setUserPreference('voiceCharacter', formData.get('characterVoiceSelector') || 'default');

        const newModel = formData.get('modelSelection');
        if (newModel) {
            const currentProvider = this.stateManager.get('currentApiProvider');
            this.stateManager.set(`modelPreferences.${currentProvider}.model`, newModel);
            // Optionally save modelPreferences if they should persist
            // this.stateManager.saveState([`modelPreferences.${currentProvider}.model`]); // More granular save
        }

        if (this.soundEffects) this.soundEffects.playSoundEffect('settingsSaved');
        this.stateManager.setModalOpen('isSettingsModalOpen', false);
        this.eventEmitter.emit('notificationDisplay', {message: 'Settings saved!', type: 'success'});
    }

    _handlePreferenceChange(event) {
        if(!event || !event.target) return;
        const target = event.target;
        const prefKey = target.name || target.id; // Prefer name, fallback to id
        const value = target.type === 'checkbox' ? target.checked : target.value;

        // "Instant apply" preferences
        if (['reduceMotion', 'soundEffectsEnabled'].includes(prefKey)) { 
            this.stateManager.setUserPreference(prefKey, value);
        } else if (prefKey === 'voiceInputEnabled' && this.voiceRecognition) {
            this.stateManager.setUserPreference(prefKey, value);
            if (!value && this.voiceRecognition.isListening()) this.voiceRecognition.stopListening();
        } else if (prefKey === 'voiceOutputEnabled' && this.voiceSynthesis) {
            this.stateManager.setUserPreference(prefKey, value);
            if (!value && this.voiceSynthesis.isSpeaking()) this.voiceSynthesis.cancel();
        } else if (['autoScroll', 'sendOnEnter', 'markdownRendering'].includes(prefKey)) {
             // These are typically applied on next action, but can be set in state immediately
             this.stateManager.setUserPreference(prefKey, value);
        } else if (prefKey === 'characterVoiceSelector') {
            this.stateManager.setUserPreference('voiceCharacter', value);
        }
        // Theme and API key changes are handled on "Save"
    }

    _handleGlobalKeyDown(event) {
        // Emit global keydown event for other managers to handle
        this.eventEmitter.emit('keydown:global', event);
        
        if (event.key === 'Escape') {
            if (this.stateManager.get('isSettingsModalOpen')) {
                this.stateManager.setModalOpen('isSettingsModalOpen', false);
            }
            // Add other global escape handlers here if needed (e.g., close sidebar if in mobile overlay mode)
        }
    }

    _handleResize() {
        this.eventEmitter.emit('appResized', { width: window.innerWidth, height: window.innerHeight });
        // Add any specific resize logic here if needed, e.g., for sidebar breakpoin
    }

    _handleVisibilityChange() {
        if (document.hidden) {
            this.eventEmitter.emit('appHidden');
            if(this.voiceRecognition && this.voiceRecognition.isListening()) this.voiceRecognition.stopListening();
            if(this.voiceSynthesis && this.voiceSynthesis.isSpeaking()) this.voiceSynthesis.cancel();
        } else {
            this.eventEmitter.emit('appVisible');
        }
    }

    _showLoadingScreen() {
        console.log("DEBUG App: _showLoadingScreen called.");
        if (this.ui.loadingOverlay) {
            this.utils.removeClass(this.ui.loadingOverlay, 'hidden');
            this.utils.fadeIn(this.ui.loadingOverlay, 100); // Use a short duration
        }
        document.body.classList.add('app-loading');
    }

    _hideLoadingScreen() {
        console.log("DEBUG App: _hideLoadingScreen called.");
        if (this.ui.loadingOverlay) {
            console.log("DEBUG App: Fading out loadingOverlay.");
            this.utils.fadeOut(this.ui.loadingOverlay, 500)
                .then(() => {
                    console.log("DEBUG App: loadingOverlay fadeOut completed.");
                })
                .catch(err => {
                     console.error("DEBUG App: Error during loadingOverlay fadeOut:", err);
                });
        } else {
            console.warn("DEBUG App: loadingOverlay UI element not found in _hideLoadingScreen.");
        }
        document.body.classList.remove('app-loading');
        console.log("DEBUG App: Removed 'app-loading' from body.");
    }

    _toggleModal(modalElement, show) {
        const overlay = modalElement && modalElement.classList.contains('modal-overlay') ? modalElement : (modalElement ? modalElement.closest('.modal-overlay') : null);
        if (!overlay) {
            console.warn("Modal overlay not found for element:", modalElement);
            return;
        }
        
        const transitionDurationStyle = this.utils.getStyle(overlay, 'transition-duration');
        // Ensure transitionDuration is a number, fallback if style is not found or invalid
        let transitionDuration = 300; // Default duration
        if (transitionDurationStyle) {
            try {
                transitionDuration = parseFloat(transitionDurationStyle.replace('s','')) * 1000;
                if (isNaN(transitionDuration)) transitionDuration = 300;
            } catch (e) {
                console.warn("Could not parse transition-duration for modal, using default.", e);
                transitionDuration = 300;
            }
        }


        if (show) {
            this.utils.removeClass(overlay, 'hidden');
            this.utils.requestFrame(() => { // Ensure display:block is applied before adding .active for transition
                this.utils.addClass(overlay, 'active');
                // Focus first focusable element in modal (accessibility)
                const firstFocusable = this.utils.$$('button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])', modalElement || overlay)
                                           .find(el => !el.disabled && el.offsetWidth > 0 && el.offsetHeight > 0 && window.getComputedStyle(el).visibility !== 'hidden');
                if (firstFocusable) {
                    try { firstFocusable.focus(); } catch (e) { console.warn("Error focusing modal element:", e); }
                }
            });
        } else {
            this.utils.removeClass(overlay, 'active');
            // Listen for transition end to add 'hidden' for accessibility
            // Or use a timeout as a fallback.
            setTimeout(() => {
                 if (!this.utils.hasClass(overlay, 'active')) { // Double check it wasn't re-opened
                    this.utils.addClass(overlay, 'hidden');
                 }
            }, transitionDuration + 50); // Add a small buffer
        }
    }
    
    _toggleEmptyState(show) {
        if (!this.ui.emptyStateContainer) return;
        if (show) {
            this.utils.removeClass(this.ui.emptyStateContainer, 'hidden');
            this.utils.addClass(this.ui.emptyStateContainer, 'animate-in'); // CSS should handle this animation
        } else {
            this.utils.addClass(this.ui.emptyStateContainer, 'hidden');
            this.utils.removeClass(this.ui.emptyStateContainer, 'animate-in');
        }
    }

    _displayError({ message, type = 'general' }) {
        console.error(`App Error (${type}):`, message);
        this.stateManager.set('lastError', { message, type, timestamp: Date.now() });
        // TODO: Replace with a proper UI notification system (toast, inline error message)
        if(typeof alert === 'function') alert(`Error: ${message}`); 
    }

    _displayNotification({ message, type = 'info' }) {
        console.log(`Notification (${type}): ${message}`);
        // TODO: Replace with a proper UI notification system
        if(type !== 'error' && typeof alert === 'function') alert(`Info: ${message}`);
    }

    destroy() {
        console.log('🛑 Destroying App...');
        if(this._debouncedResizeHandler) window.removeEventListener('resize', this._debouncedResizeHandler);
        document.removeEventListener('visibilitychange', this._handleVisibilityChange);

        if(this.voiceRecognition) this.voiceRecognition.destroy();
        if(this.voiceSynthesis) this.voiceSynthesis.destroy();
        if(this.typingIndicator) this.typingIndicator.destroy();
        if(this.searchManager) this.searchManager.destroy();
        if(this.themeManager) this.themeManager.destroy();
        if(this.audioWorker) this.audioWorker.terminate();
        // TODO: Destroy other managers and remove event listeners from eventEmitter as needed

        this.stateManager.enableDebugging(false);
        this.isInitialized = false;
    }
}

// Global error handling & App instantiation
window.addEventListener('error', (event) => {
    const errorMsg = event.error ? (event.error.message || String(event.error)) : event.message;
    const stack = event.error ? event.error.stack : null;
    console.error('Unhandled global error:', errorMsg, stack, event);
    if (window.StateManager && typeof StateManager.getInstance === 'function' && StateManager.getInstance()) {
        StateManager.getInstance().set('lastError', {
            message: 'Unhandled global error: ' + errorMsg,
            stack: stack,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            timestamp: new Date().toISOString()
        });
    }
});
window.addEventListener('unhandledrejection', (event) => {
    const reasonMsg = event.reason && event.reason.message ? event.reason.message : String(event.reason);
    const stack = event.reason ? event.reason.stack : null;
    console.error('Unhandled promise rejection:', reasonMsg, stack, event);
     if (window.StateManager && typeof StateManager.getInstance === 'function' && StateManager.getInstance()) {
        StateManager.getInstance().set('lastError', {
            message: 'Unhandled promise rejection: ' + reasonMsg,
            stack: stack,
            timestamp: new Date().toISOString()
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (!window.UtilsInstance || !window.StateManager || !window.AppEvents) {
        const criticalErrorMsg = "FATAL: Core Singleton JS files (Utils, StateManager, AppEvents) failed to load or initialize their globals correctly. App cannot start.";
        console.error(criticalErrorMsg);
        document.body.innerHTML = `<div style="font-family:sans-serif;color:red;padding:20px;">${criticalErrorMsg} Check script order and definitions in index.html.</div>`;
        return;
    }
    const parklandApp = new App();
    window.parklandApp = parklandApp; // Make app instance globally available for debugging or specific integrations
    parklandApp.init().catch(err => {
        console.error("Fatal error during app initialization sequence:", err.message, err.stack);
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.innerHTML = `<div class="loading-text" style="color:red; font-size:16px; padding:20px; text-align:left; white-space:pre-wrap;">Critical Error Initializing Application. Details in console. <br/>Error: ${err.message || String(err)} <br/>Please refresh.</div>`;
            // Ensure loading overlay is visible if an error occurs during init
            if(loadingOverlay.classList.contains('hidden')) loadingOverlay.classList.remove('hidden');
            loadingOverlay.style.opacity = '1'; loadingOverlay.style.visibility = 'visible';
        }
    });
});
