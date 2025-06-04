/**
 * Parkland AI - Opus Magnum Edition
 * Main Application Controller (App.js)
 *
 * Orchestrates all core components, manages UI interactions,
 * and handles the main application lifecycle.
 */

class App {
    constructor() {
        // Diagnostic logs PRECEDING the check
        if (typeof console !== 'undefined') {
            console.log('App Constructor: Checking global singletons/classes...');
            console.log('typeof window.UtilsInstance:', typeof window.UtilsInstance, '; Value:', window.UtilsInstance);
            console.log('typeof window.StateManager (Class):', typeof window.StateManager, '; Value:', window.StateManager);
            console.log('typeof window.AppEvents:', typeof window.AppEvents, '; Value:', window.AppEvents);
        }

        if (!window.UtilsInstance || !window.StateManager || !window.AppEvents) {
            const criticalErrorMsg = "Critical Error: Core utility scripts (Utils, StateManager, AppEvents) not found. App cannot initialize.";
            console.error(criticalErrorMsg); 
            document.body.innerHTML = `<div style="color: red; font-family: sans-serif; padding: 20px;">${criticalErrorMsg} Please check console and script loading order in index.html.</div>`;
            throw new Error(criticalErrorMsg); 
        }

        this.utils = window.UtilsInstance;
        this.stateManager = window.StateManager.getInstance();
        this.eventEmitter = window.AppEvents;

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

        this.ui = {};
        this.isInitialized = false;
        this.chatViewShownBefore = false;

        this._handleVisibilityChange = this._handleVisibilityChange.bind(this);

        if (this.stateManager && this.stateManager.get('debugMode')) {
            console.log('App constructor: Debug mode is ON.');
        }
    }

    async init() {
        if (this.isInitialized) {
            console.warn('App already initialized.');
            return;
        }

        console.log('🚀 Parkland AI - Opus Magnum Edition: Initializing App...');
        document.body.classList.add('app-loading');
        // Ensure loadingOverlay is selected before trying to use it.
        // _selectUIElements is called later, so for now, query directly or ensure it's available globally if used this early.
        const loadingOverlayDirect = document.getElementById('loadingOverlay');
        if(loadingOverlayDirect) this.utils.removeClass(loadingOverlayDirect, 'hidden');


        this._selectUIElements(); // Now ui elements are populated

        // Initialize Feature Modules in correct order
        // Adding checks for class definitions before instantiation
        if (typeof MarkdownProcessor === 'undefined') { console.error("MarkdownProcessor class is undefined! Ensure markdown.js is loaded."); return Promise.reject("MarkdownProcessor missing"); }
        this.markdownProcessor = new MarkdownProcessor();

        if (typeof ClaudeAPIService === 'undefined') { console.error("ClaudeAPIService class is undefined! Ensure claude.js is loaded."); return Promise.reject("ClaudeAPIService missing"); }
        this.apiService = new ClaudeAPIService(this.stateManager, this.utils);

        if (typeof ChatMessages === 'undefined') { console.error("ChatMessages class is undefined! Ensure messages.js is loaded."); return Promise.reject("ChatMessages missing"); }
        this.chatMessages = new ChatMessages(this.ui.chatMessagesContainer, this.utils, this.markdownProcessor, this.stateManager);

        if (typeof ChatHistory === 'undefined') { console.error("ChatHistory class is undefined! Ensure history.js is loaded."); return Promise.reject("ChatHistory missing"); }
        this.chatHistory = new ChatHistory(this.ui.chatHistoryContainer, this.utils, this.eventEmitter, this.stateManager);

        if (typeof VoiceRecognition === 'undefined') { console.error("VoiceRecognition class is undefined! Ensure recognition.js is loaded."); return Promise.reject("VoiceRecognition missing"); }
        this.voiceRecognition = new VoiceRecognition(this.stateManager, this.eventEmitter, this.utils, this.ui.micBtn);
        // VoiceRecognition constructor handles its setup. We check support before enabling UI.
        if (this.ui.micBtn && !this.voiceRecognition.isSupported()) {
            this.ui.micBtn.disabled = true;
            this.ui.micBtn.title = "Voice recognition not supported by your browser.";
            this.utils.addClass(this.ui.micBtn, 'btn-disabled');
        }


        if (typeof VoiceSynthesis === 'undefined') { console.error("VoiceSynthesis class is undefined! Ensure synthesis.js is loaded."); return Promise.reject("VoiceSynthesis missing"); }
        this.voiceSynthesis = new VoiceSynthesis(this.stateManager, this.eventEmitter, this.utils);
        this.voiceSynthesis.init(); // VoiceSynthesis has an init to populate voices

        if (typeof ThemePersistence === 'undefined') { console.error("ThemePersistence class is undefined! Ensure persistence.js is loaded."); return Promise.reject("ThemePersistence missing"); }
        this.themePersistence = new ThemePersistence(this.stateManager);

        if (typeof ThemeTransition === 'undefined') { console.error("ThemeTransition class is undefined! Ensure themes/transitions.js is loaded."); return Promise.reject("ThemeTransition missing"); }
        this.themeTransition = new ThemeTransition(this.utils, this.stateManager);

        if (typeof CharacterManager === 'undefined') { console.error("CharacterManager class is undefined! Ensure voice/characters.js is loaded."); return Promise.reject("CharacterManager missing"); }
        this.characterManager = new CharacterManager(this.stateManager, this.eventEmitter, this.utils, null);

        if (typeof ThemeManager === 'undefined') { console.error("ThemeManager class is undefined! Ensure themes/manager.js is loaded."); return Promise.reject("ThemeManager missing"); }
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
                    if (this.stateManager.get('debugMode')) console.log('Msg from AudioWorker:', event.data);
                    if (event.data.type === 'SOUND_ERROR') console.error('AudioWorker Sound Error:', event.data.payload);
                    else if (event.data.type === 'WORKER_READY' && this.soundEffects) {
                        this.soundEffects.preload(['uiClick', 'messageSent', 'messageReceived', 'error', 'appReady']);
                    }
                };
                this.audioWorker.onerror = (error) => {
                    console.error("Error initializing AudioWorker:", error.message ? `${error.message} (at ${error.filename}:${error.lineno})` : error);
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

        setTimeout(() => {
            this.stateManager.set('isLoading', false);
        }, 500);
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
        this.ui.chatMessagesContainer = this.utils.$('.messages-container .messages-inner', this.ui.chatContainer);
        this.ui.chatHistoryContainer = this.utils.$('.sidebar-content .chat-history-list', this.ui.sidebar);
        this.ui.newChatBtn = this.utils.$('#newChatBtn', this.ui.sidebarHeader); // Scope to sidebar header if possible
        this.ui.settingsBtn = this.utils.$('#settingsBtn', this.ui.sidebarFooter); // Scope to sidebar footer
        this.ui.sidebarToggleBtn = this.utils.$('#sidebarToggle', this.ui.sidebarHeader); // Scope to sidebar header
        this.ui.settingsModal = this.utils.$('#appSettingsModal');
        this.ui.settingsForm = this.utils.$('#settingsForm', this.ui.settingsModal); 
        this.ui.closeSettingsModalBtn = this.utils.$('.modal-close', this.ui.settingsModal); // More specific
        this.ui.emptyStateContainer = this.utils.$('.empty-state-container', this.ui.chatContainer);
    }

    _registerEventListeners() {
        if (this.ui.loginForm) {
            this.ui.loginForm.addEventListener('submit', this._handleLoginSubmit.bind(this));
        } else if (this.ui.loginButton) { // Fallback if only button exists
            this.ui.loginButton.addEventListener('click', (e) => {
                 e.preventDefault(); 
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

        if (this.ui.settingsBtn) {
            this.ui.settingsBtn.addEventListener('click', () => this.stateManager.setModalOpen('isSettingsModalOpen', true));
        }
        if (this.ui.closeSettingsModalBtn) {
            this.ui.closeSettingsModalBtn.addEventListener('click', () => this.stateManager.setModalOpen('isSettingsModalOpen', false));
        }
        
        const settingsModalOverlay = this.utils.$('#appSettingsModal');
        if (settingsModalOverlay) {
            settingsModalOverlay.addEventListener('click', (event) => {
                if (event.target === settingsModalOverlay) { 
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

        this.eventEmitter.on('errorDisplay', this._displayError.bind(this));
        this.eventEmitter.on('notificationDisplay', this._displayNotification.bind(this));
        this.eventEmitter.on('playSound', (payload) => { 
            if (this.soundEffects) {
                this.soundEffects.playSoundEffect(payload.soundName, payload.volume, payload.loop, payload.soundId);
            }
        });
        this.eventEmitter.on('stopSound', (payload) => {
            if (this.soundEffects) {
                this.soundEffects.stopSoundEffect(payload.soundId);
            }
        });
         this.eventEmitter.on('character:speakRequested', ({ characterKey, text, voiceConfig, options }) => {
            if (this.voiceSynthesis) {
                this.voiceSynthesis.speak(text, characterKey, options);
            }
        });
        // Listener for when chat history updates active session
        this.eventEmitter.on('chatSessionLoaded', ({ sessionId, messages }) => {
            // App.js can react if needed, e.g., update chat title
            const sessions = this.chatHistory._getStoredSessions(); // Access internal method carefully or add public getter
            const loadedSession = sessions.find(s => s.id === sessionId);
            if(this.ui.chatHeader) {
                const chatTitleEl = this.utils.$('.chat-title', this.ui.chatHeader);
                if(chatTitleEl) chatTitleEl.textContent = loadedSession ? (this.utils.truncate(loadedSession.title, 30) || 'Chat') : 'Chat';
            }
        });
        this.eventEmitter.on('newChatStarted', () => {
            if(this.ui.chatHeader) {
                 const chatTitleEl = this.utils.$('.chat-title', this.ui.chatHeader);
                 if(chatTitleEl) chatTitleEl.textContent = 'New Chat';
            }
        });
    }

    _setupStateSubscriptions() {
        this.stateManager.subscribe('change:isLoading', ({ newValue }) => {
            newValue ? this._showLoadingScreen() : this._hideLoadingScreen();
        });
        this.stateManager.subscribe('change:currentTheme', ({ newValue }) => {
            if (this.themeManager) this.themeManager.applyThemeToBody(newValue);
            const themeSelectSetting = this.utils.$('#themeSelectorSetting', this.ui.settingsForm);
            if (themeSelectSetting && this.stateManager.get('isSettingsModalOpen')) {
                themeSelectSetting.value = newValue;
            }
        });
        this.stateManager.subscribe('change:chatHistory', ({ newValue, oldValue }) => {
            if(this.chatMessages) this.chatMessages.renderHistory(newValue); 
            this._toggleEmptyState(newValue.length === 0);
            // Update session in history list on new messages
            if (newValue.length > (oldValue ? oldValue.length : 0) || 
               (newValue.length > 0 && (!oldValue || oldValue.length === 0)) ||
               (newValue.length === 0 && oldValue && oldValue.length > 0) ) { // Also update on clear
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
                this.ui.micBtn.classList.toggle('listening', newValue); 
                this.ui.micBtn.setAttribute('aria-pressed', newValue.toString());
                 // Change icon based on state (example)
                const iconSvg = this.utils.$('svg', this.ui.micBtn);
                if (iconSvg) {
                    if (newValue) { // Listening
                        iconSvg.innerHTML = '<path d="M12 15c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path>'; // Stop icon
                    } else { // Not listening
                        iconSvg.innerHTML = '<path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"></path>'; // Mic icon
                    }
                }
            }
        });
        this.stateManager.subscribe('change:userInput', ({newValue}) => {
            if(this.ui.chatInput && this.ui.chatInput.value !== newValue) {
                this.ui.chatInput.value = newValue;
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
        if (apiKey) this._showChatView(); else this._showLoginView();
    }

    _handleLoginSubmit(event) {
        if(event) event.preventDefault();
        if(!this.ui.apiKeyInput) return;
        const apiKey = this.ui.apiKeyInput.value.trim();

        if (this.apiService && this.apiService.validateApiKey(apiKey)) {
            this.stateManager.setApiKey(apiKey); 
            if(this.ui.loginErrorMessage) this.ui.loginErrorMessage.textContent = '';
            if (this.soundEffects) this.soundEffects.playSoundEffect('loginSuccess');
        } else {
            if(this.ui.loginErrorMessage) this.ui.loginErrorMessage.textContent = 'Invalid API Key format or value.';
            if (this.soundEffects) this.soundEffects.playSoundEffect('error');
            if(this.ui.loginForm && this.utils) this.utils.shake(this.ui.loginForm);
        }
    }

    _showLoginView() {
        if(this.ui.chatContainer) this.utils.addClass(this.ui.chatContainer, 'hidden');
        if(this.ui.loginContainer) this.utils.removeClass(this.ui.loginContainer, 'hidden');
        this.stateManager.set('currentView', 'login', true); 
        if(this.ui.apiKeyInput) this.ui.apiKeyInput.focus();
    }

    _showChatView() {
        if(this.ui.loginContainer) this.utils.addClass(this.ui.loginContainer, 'hidden');
        if(this.ui.chatContainer) this.utils.removeClass(this.ui.chatContainer, 'hidden');
        this.stateManager.set('currentView', 'chat', true); 
        if(this.chatMessages) this.chatMessages.scrollToBottom(true); // Force scroll when view becomes active
        if(this.ui.chatInput) this.ui.chatInput.focus();

        if(!this.chatViewShownBefore) {
            this.eventEmitter.emit('chatViewReady'); 
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
        this.stateManager.addMessageToHistory(userMessage); 

        this.stateManager.set('userInput', '');
        if(this.ui.chatInput) {
            this.ui.chatInput.value = '';
            this.ui.chatInput.style.height = 'auto'; // Reset height
            this.ui.chatInput.focus();
        }

        this._showTypingIndicator(true);

        if (!this.apiService) {
            this._handleApiError({message: "API Service not available."});
            this._showTypingIndicator(false);
            return;
        }
        
        // Pass a copy of chat history that ClaudeAPIService might modify for API call (e.g. system prompt)
        const historyForApi = this.utils.deepClone(this.stateManager.get('chatHistory'));

        this.apiService.sendMessage(messageText, historyForApi)
            .then(response => this._processAssistantResponse(response))
            .catch(error => this._handleApiError(error))
            .finally(() => this._showTypingIndicator(false));
    }
    
    _processAssistantResponse(apiResponse) {
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
        this.stateManager.addMessageToHistory(assistantMessage);

        if (this.stateManager.get('userPreferences.voiceOutputEnabled') && this.voiceSynthesis) {
            this.voiceSynthesis.speak(assistantMessage.content, assistantMessage.character);
        }
        if (this.soundEffects) this.soundEffects.playSoundEffect('messageReceived');
    }

    _handleApiError(error) {
        console.error("API Error in App:", error);
        const errorMessage = (error && error.message) ? error.message : "An unknown API error occurred.";
        const errorResponseMessage = {
            id: `msg-error-${this.utils.generateId('')}`,
            role: 'assistant', // Display as an assistant message for errors
            content: `⚠️ ${errorMessage}`,
            timestamp: Date.now(),
            isError: true
        };
        this.stateManager.addMessageToHistory(errorResponseMessage);
        this.eventEmitter.emit('errorDisplay', { message: errorMessage, type: 'api' });
    }

    _showTypingIndicator(show) {
        this.eventEmitter.emit('typingIndicator', { show }); 
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
            this.ui.chatInput.value = ""; // Clear input field
            this.ui.chatInput.style.height = 'auto'; // Reset height
            this.ui.chatInput.focus();
        }
        this._toggleEmptyState(true);
        if (this.soundEffects) this.soundEffects.playSoundEffect('newChat');
        this.eventEmitter.emit('newChatStarted');
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
        if(modelSelectEl) modelSelectEl.value = currentApiModel || 'claude-3-haiku-20240307';

        const autoScrollEl = this.utils.$('#autoScroll', this.ui.settingsForm);
        if(autoScrollEl) autoScrollEl.checked = !!prefs.autoScroll;
        
        const sendOnEnterEl = this.utils.$('#sendOnEnter', this.ui.settingsForm);
        if(sendOnEnterEl) sendOnEnterEl.checked = !!prefs.sendOnEnter;

        const markdownRenderingEl = this.utils.$('#markdownRendering', this.ui.settingsForm);
        if(markdownRenderingEl) markdownRenderingEl.checked = !!prefs.markdownRendering;

        const voiceInputEnabledEl = this.utils.$('#voiceInputEnabled', this.ui.settingsForm);
        if(voiceInputEnabledEl) voiceInputEnabledEl.checked = !!prefs.voiceInputEnabled;
        
        const voiceOutputEnabledEl = this.utils.$('#voiceOutputEnabled', this.ui.settingsForm);
        if(voiceOutputEnabledEl) voiceOutputEnabledEl.checked = !!prefs.voiceOutputEnabled;
        
        const soundEffectsEnabledEl = this.utils.$('#soundEffectsEnabled', this.ui.settingsForm);
        if(soundEffectsEnabledEl) soundEffectsEnabledEl.checked = !!prefs.soundEffectsEnabled;

        const reduceMotionEl = this.utils.$('#reduceMotion', this.ui.settingsForm);
        if(reduceMotionEl) reduceMotionEl.checked = !!prefs.reduceMotion;

        const themeSelect = this.utils.$('#themeSelectorSetting', this.ui.settingsForm);
        if (themeSelect && this.themeManager) {
            themeSelect.innerHTML = ''; 
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
            const characters = this.characterManager.getAvailableCharacters();
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
                if(apiKeySettingEl && this.utils) this.utils.shake(apiKeySettingEl);
                this.eventEmitter.emit('notificationDisplay', {message: 'Invalid API key format.', type: 'error'});
                return;
            }
        }

        const newTheme = formData.get('themeSelectorSetting');
        if (newTheme && newTheme !== this.stateManager.get('currentTheme') && this.themeManager) {
            this.themeManager.setCurrentTheme(newTheme);
        }

        ['autoScroll', 'sendOnEnter', 'markdownRendering', 'voiceInputEnabled', 'voiceOutputEnabled', 'soundEffectsEnabled', 'reduceMotion'].forEach(key => {
             const el = this.utils.$(`#${key}`, this.ui.settingsForm); // Ensure element exists before checking .has
             if(el) this.stateManager.setUserPreference(key, formData.has(key) && el.checked);
             else this.stateManager.setUserPreference(key, formData.has(key)); // Fallback for non-checkboxes or direct name
        });
        this.stateManager.setUserPreference('voiceCharacter', formData.get('characterVoiceSelector') || 'default');

        const newModel = formData.get('modelSelection');
        if (newModel) {
            const currentProvider = this.stateManager.get('currentApiProvider');
            this.stateManager.set(`modelPreferences.${currentProvider}.model`, newModel);
        }

        if (this.soundEffects) this.soundEffects.playSoundEffect('settingsSaved');
        this.stateManager.setModalOpen('isSettingsModalOpen', false);
        this.eventEmitter.emit('notificationDisplay', {message: 'Settings saved!', type: 'success'});
    }

    _handlePreferenceChange(event) {
        if(!event || !event.target) return;
        const target = event.target;
        // Use a mapping or more specific handling for preference keys if IDs/names are not direct matches
        let prefKey = target.name || target.id; 
        const value = target.type === 'checkbox' ? target.checked : target.value;

        if (['reduceMotion', 'soundEffectsEnabled', 'voiceInputEnabled', 'voiceOutputEnabled', 'autoScroll', 'sendOnEnter', 'markdownRendering'].includes(prefKey)) {
            this.stateManager.setUserPreference(prefKey, value);
        } else if (prefKey === 'themeSelectorSetting') {
            // Theme is applied on save, but could preview here if desired
        } else if (prefKey === 'characterVoiceSelector') {
            this.stateManager.setUserPreference('voiceCharacter', value);
        }
    }

    _handleGlobalKeyDown(event) {
        if (event.key === 'Escape') {
            if (this.stateManager.get('isSettingsModalOpen')) {
                this.stateManager.setModalOpen('isSettingsModalOpen', false);
            }
            // Add other global escape handlers here if needed
        }
    }

    _handleResize() {
        this.eventEmitter.emit('appResized', { width: window.innerWidth, height: window.innerHeight });
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
        if (this.ui.loadingOverlay) {
            this.utils.removeClass(this.ui.loadingOverlay, 'hidden');
            this.utils.fadeIn(this.ui.loadingOverlay, 100);
        }
        document.body.classList.add('app-loading');
    }

    _hideLoadingScreen() {
        if (this.ui.loadingOverlay) this.utils.fadeOut(this.ui.loadingOverlay, 500);
        document.body.classList.remove('app-loading');
    }

    _toggleModal(modalElement, show) {
        const overlay = modalElement && modalElement.classList.contains('modal-overlay') ? modalElement : (modalElement ? modalElement.closest('.modal-overlay') : null);
        if (!overlay) return;
        
        const transitionDurationStyle = this.utils.getStyle(overlay, 'transition-duration');
        const transitionDuration = transitionDurationStyle ? parseFloat(transitionDurationStyle) * 1000 : 300;


        if (show) {
            this.utils.removeClass(overlay, 'hidden');
            this.utils.requestFrame(() => { 
                this.utils.addClass(overlay, 'active');
                const firstFocusable = this.utils.$$('button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])', modalElement || overlay)
                                           .find(el => !el.disabled && el.offsetWidth > 0 && el.offsetHeight > 0 && window.getComputedStyle(el).visibility !== 'hidden');
                if (firstFocusable) firstFocusable.focus();
            });
        } else {
            this.utils.removeClass(overlay, 'active');
            setTimeout(() => {
                 if (!this.utils.hasClass(overlay, 'active')) this.utils.addClass(overlay, 'hidden');
            }, transitionDuration + 50);
        }
    }
    
    _toggleEmptyState(show) {
        if (!this.ui.emptyStateContainer) return;
        if (show) {
            this.utils.removeClass(this.ui.emptyStateContainer, 'hidden');
            this.utils.addClass(this.ui.emptyStateContainer, 'animate-in');
        } else {
            this.utils.addClass(this.ui.emptyStateContainer, 'hidden');
            this.utils.removeClass(this.ui.emptyStateContainer, 'animate-in');
        }
    }

    _displayError({ message, type = 'general' }) {
        console.error(`App Error (${type}):`, message);
        this.stateManager.set('lastError', { message, type, timestamp: Date.now() });
        // Replace with a more sophisticated UI notification system
        alert(`Error: ${message}`); 
    }

    _displayNotification({ message, type = 'info', duration = 3000}) {
        console.log(`Notification (${type}): ${message}`);
        // Replace with a more sophisticated UI notification system
        if(type !== 'error') alert(`Info: ${message}`);
    }

    destroy() {
        console.log('🛑 Destroying App...');
        if(this._debouncedResizeHandler) window.removeEventListener('resize', this._debouncedResizeHandler);
        document.removeEventListener('visibilitychange', this._handleVisibilityChange);

        if(this.voiceRecognition) this.voiceRecognition.destroy();
        if(this.voiceSynthesis) this.voiceSynthesis.destroy();
        if(this.themeManager) this.themeManager.destroy();
        if(this.audioWorker) this.audioWorker.terminate();
        // Destroy other managers and remove event listeners from eventEmitter as needed

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
            if(loadingOverlay.classList.contains('hidden')) loadingOverlay.classList.remove('hidden');
            loadingOverlay.style.opacity = '1'; loadingOverlay.style.visibility = 'visible';
        }
    });
});
