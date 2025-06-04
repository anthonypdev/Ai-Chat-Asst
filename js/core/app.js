/**
 * Parkland AI - Opus Magnum Edition
 * Main Application Controller (App.js)
 *
 * Orchestrates all core components, manages UI interactions,
 * and handles the main application lifecycle.
 */

class App {
    constructor() {
        // Core Modules (using global instances created in their respective files)
        if (!window.Utils || !window.StateManager || !window.AppEvents) {
            // This is a critical failure, means core scripts haven't loaded correctly.
            // Log an error and prevent further execution.
            const errorMsg = "Critical Error: Core utility scripts (Utils, StateManager, AppEvents) not found. App cannot initialize.";
            console.error(errorMsg);
            document.body.innerHTML = `<div style="color: red; font-family: sans-serif; padding: 20px;">${errorMsg} Please check console and script loading order in index.html.</div>`;
            throw new Error(errorMsg);
        }
        this.utils = window.UtilsInstance; // From utils.js (assuming UtilsInstance from your utils.js)
        this.stateManager = window.StateManager.getInstance(); // From state.js
        this.eventEmitter = window.AppEvents; // From events.js (assuming AppEvents from your events.js)


        // Feature Modules (instances to be created in init)
        this.themePersistence = null;
        this.themeTransition = null;
        this.characterManager = null;
        this.themeManager = null; // Must be after CharacterManager if it's a dependency

        this.apiService = null;
        this.voiceRecognition = null;
        this.voiceSynthesis = null;
        this.chatHistory = null;
        this.chatMessages = null;
        this.markdownProcessor = null;
        this.soundEffects = null;

        this.ui = {};
        this.isInitialized = false;
        this.chatViewShownBefore = false; // Flag for initial chat view presentation

        this._handleVisibilityChange = this._handleVisibilityChange.bind(this);

        if (this.stateManager.get('debugMode')) {
            console.log('App constructor: Debug mode is ON.');
        }
    }

    /**
     * Initializes the application.
     */
    async init() {
        if (this.isInitialized) {
            console.warn('App already initialized.');
            return;
        }

        console.log('🚀 Parkland AI - Opus Magnum Edition: Initializing App...');
        // isLoading is true by default from StateManager, body class added here.
        document.body.classList.add('app-loading');
        if (this.ui.loadingOverlay) this.utils.removeClass(this.ui.loadingOverlay, 'hidden'); // Ensure it's visible

        this._selectUIElements();

        // Initialize Feature Modules in correct order
        this.markdownProcessor = new MarkdownProcessor(); // Assumes MarkdownProcessor is globally defined

        // API Service
        this.apiService = new ClaudeAPIService(this.stateManager, this.utils); // Assumes ClaudeAPIService

        this.chatMessages = new ChatMessages(this.ui.chatMessagesContainer, this.utils, this.markdownProcessor, this.stateManager);
        this.chatHistory = new ChatHistory(this.ui.chatHistoryContainer, this.utils, this.eventEmitter, this.stateManager);

        this.voiceRecognition = new VoiceRecognition(this.stateManager, this.eventEmitter, this.utils, this.ui.micBtn);
        if (this.voiceRecognition.isSupported()) this.voiceRecognition.init(); // Init if supported

        this.voiceSynthesis = new VoiceSynthesis(this.stateManager, this.eventEmitter, this.utils);
        this.voiceSynthesis.init(); // Init to load voices

        this.themePersistence = new ThemePersistence(this.stateManager); // Assumes ThemePersistence class
        this.themeTransition = new ThemeTransition(this.utils, this.stateManager); // Assumes ThemeTransition class

        // Instantiate CharacterManager first, passing null for themeManager initially
        // CharacterManager, ThemeManager, BaseCharacter, and specific characters classes need to be defined globally or loaded
        this.characterManager = new CharacterManager(this.stateManager, this.eventEmitter, this.utils, null);

        // Now instantiate ThemeManager, passing the created characterManager
        this.themeManager = new ThemeManager(
            this.stateManager,
            this.utils,
            this.eventEmitter,
            this.themePersistence,
            this.themeTransition,
            this.characterManager // this.characterManager is now defined
        );

        // Now that themeManager exists, provide it to characterManager.
        // The CharacterManager's constructor event listener for 'themeChanged' will use this.
        this.characterManager.themeManager = this.themeManager;

        // Sound Effects (AudioProcessor worker)
        if (window.Worker) {
            try {
                // Assuming audio-processor.js is in 'workers/' directory relative to where JS is served
                this.audioWorker = new Worker('workers/audio-processor.js');
                this.soundEffects = {
                    playSoundEffect: (effectName, volume = 1.0, loop = false, soundId = null) => {
                        if (this.stateManager.get('userPreferences.soundEffectsEnabled') || effectName.includes('force')) { // Allow forced sounds
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
                 // Listen for messages back from audio worker if needed (e.g., errors, ready state)
                this.audioWorker.onmessage = (event) => {
                    if (this.stateManager.get('debugMode')) console.log('Msg from AudioWorker:', event.data);
                    if (event.data.type === 'SOUND_ERROR') console.error('AudioWorker Sound Error:', event.data.payload);
                };
                this.audioWorker.onerror = (error) => {
                    console.error("Error initializing AudioWorker:", error.message, error);
                    this.soundEffects = null; // Disable sound effects if worker fails
                };
                 // Example preloads:
                // this.soundEffects.preload(['uiClick', 'messageSent', 'messageReceived', 'error']);
            } catch (error) {
                console.error("Failed to create AudioProcessor worker:", error);
                this.soundEffects = null;
            }
        } else {
            console.warn("Web Workers not supported. Sound effects will be limited or disabled.");
            this.soundEffects = null;
        }
        // Make soundEffects globally accessible if needed by other modules easily, or pass instance
        if (this.soundEffects) window.soundEffects = this.soundEffects;


        await this.themeManager.init(); // Loads current theme, which might trigger 'themeChanged'
        this.characterManager.initCharacters(); // Now this has access to a fully init'd themeManager

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

        // Use StateManager to control loading state to ensure all subscribers react
        setTimeout(() => {
            this.stateManager.set('isLoading', false); // This will trigger _hideLoading via subscription
        }, 500); // Slightly longer delay for more complex init
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
        this.ui.sidebar = this.utils.$('#appSidebar'); // Used ID from index.html
        this.ui.chatHeader = this.utils.$('.chat-header'); // Assuming only one
        this.ui.chatInputForm = this.utils.$('#chatInputForm');
        this.ui.chatInput = this.utils.$('#chatInput');
        this.ui.sendBtn = this.utils.$('#sendBtn');
        this.ui.micBtn = this.utils.$('#micBtn');
        this.ui.chatMessagesContainer = this.utils.$('.messages-container .messages-inner');
        this.ui.chatHistoryContainer = this.utils.$('.sidebar-content .chat-history-list');
        this.ui.newChatBtn = this.utils.$('#newChatBtn');
        // Theme selector is now in settings modal
        this.ui.settingsBtn = this.utils.$('#settingsBtn');
        this.ui.sidebarToggleBtn = this.utils.$('#sidebarToggle');
        this.ui.settingsModal = this.utils.$('#appSettingsModal');
        this.ui.settingsForm = this.utils.$('#settingsForm', this.ui.settingsModal); // Scope to modal
        this.ui.closeSettingsModalBtn = this.utils.$('#closeSettingsModalBtn', this.ui.settingsModal);
        this.ui.emptyStateContainer = this.utils.$('.empty-state-container');
    }

    _registerEventListeners() {
        if (this.ui.loginForm) {
            this.ui.loginForm.addEventListener('submit', this._handleLoginSubmit.bind(this));
        } else if (this.ui.loginButton) {
            this.ui.loginButton.addEventListener('click', (e) => {
                 e.preventDefault(); // Prevent default if it's a button in a form
                 this._handleLoginSubmit(e);
            });
        }

        if(this.ui.chatInputForm) this.ui.chatInputForm.addEventListener('submit', this._handleSendMessage.bind(this));
        if(this.ui.chatInput) this.ui.chatInput.addEventListener('keydown', this._handleInputKeyDown.bind(this));
        if(this.ui.sendBtn) this.ui.sendBtn.addEventListener('click', this._handleSendMessage.bind(this));
        if(this.ui.micBtn && this.voiceRecognition) this.ui.micBtn.addEventListener('click', () => this.voiceRecognition.toggleListening());
        if(this.ui.newChatBtn) this.ui.newChatBtn.addEventListener('click', this._handleNewChat.bind(this));

        if (this.ui.settingsBtn) {
            this.ui.settingsBtn.addEventListener('click', () => this.stateManager.setModalOpen('isSettingsModalOpen', true));
        }
        if (this.ui.closeSettingsModalBtn) {
            this.ui.closeSettingsModalBtn.addEventListener('click', () => this.stateManager.setModalOpen('isSettingsModalOpen', false));
        }
         // Handle modal overlay click to close settings modal
        const settingsModalOverlay = this.utils.$('#appSettingsModal');
        if (settingsModalOverlay) {
            settingsModalOverlay.addEventListener('click', (event) => {
                if (event.target === settingsModalOverlay) { // Clicked on overlay itself, not modal content
                    this.stateManager.setModalOpen('isSettingsModalOpen', false);
                }
            });
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
        window.addEventListener('resize', this.utils.debounce(this._handleResize.bind(this), 200));
        document.addEventListener('visibilitychange', this._handleVisibilityChange);

        this.eventEmitter.on('errorDisplay', this._displayError.bind(this));
        this.eventEmitter.on('notificationDisplay', this._displayNotification.bind(this));
        this.eventEmitter.on('playSound', (payload) => { // Updated to match worker post message
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
                // Pass characterKey to allow VoiceSynthesis to use its voiceConfig
                // VoiceSynthesis.speak now takes characterKey as second param.
                this.voiceSynthesis.speak(text, characterKey, options);
            }
        });
    }

    _setupStateSubscriptions() {
        this.stateManager.subscribe('change:isLoading', ({ newValue }) => {
            newValue ? this._showLoadingScreen() : this._hideLoadingScreen();
        });
        this.stateManager.subscribe('change:currentTheme', ({ newValue }) => {
            if (this.themeManager) this.themeManager.applyThemeToBody(newValue);
             // Potentially update theme selector in settings modal if open
            const themeSelectSetting = this.utils.$('#themeSelectorSetting', this.ui.settingsForm);
            if (themeSelectSetting && this.stateManager.get('isSettingsModalOpen')) {
                themeSelectSetting.value = newValue;
            }
        });
        this.stateManager.subscribe('change:chatHistory', ({ newValue, oldValue }) => {
            this.chatMessages.renderHistory(newValue); // ChatMessages handles scrolling if needed
            this._toggleEmptyState(newValue.length === 0);
            if (newValue.length > (oldValue ? oldValue.length : 0)) { // If a new message was added
                this.chatHistory.addOrUpdateCurrentSession(); // Save session and update sidebar
            }
        });
        this.stateManager.subscribe('change:isSidebarOpen', ({ newValue }) => {
             this.ui.sidebar.classList.toggle('open', newValue);
             this.ui.sidebar.classList.toggle('collapsed', !newValue);
             this.ui.appContainer.classList.toggle('sidebar-collapsed', !newValue);
        });
        this.stateManager.subscribe('change:isLoginModalOpen', ({ newValue }) => {
            // This state now controls the visibility of the login *view*
            if (newValue) this._showLoginView(); else this._showChatView();
        });
        this.stateManager.subscribe('change:isSettingsModalOpen', ({ newValue }) => {
            this._toggleModal(this.ui.settingsModal, newValue);
             if (newValue) this._populateSettingsForm();
        });
        this.stateManager.subscribe('change:isMicListening', ({newValue}) => {
            if(this.ui.micBtn) {
                this.ui.micBtn.classList.toggle('active', newValue); // 'active' class from buttons.css
                this.ui.micBtn.classList.toggle('listening', newValue); // More specific class
                this.ui.micBtn.setAttribute('aria-pressed', newValue.toString());
            }
        });
        this.stateManager.subscribe('change:userInput', ({newValue}) => {
            if(this.ui.chatInput && this.ui.chatInput.value !== newValue) {
                this.ui.chatInput.value = newValue;
                // Adjust height if needed, though keydown also handles it
                this.ui.chatInput.style.height = 'auto';
                this.ui.chatInput.style.height = (this.ui.chatInput.scrollHeight) + 'px';
            }
        });
        this.stateManager.subscribe('change:activeCharacter', ({newValue}) => {
             if (this.characterManager) {
                // This might be redundant if switchCharacter already handles UI updates
                // this.characterManager._updateCharacterUI(newValue, true);
             }
             // Update preferred voice in settings modal if it's open
            const characterVoiceSelect = this.utils.$('#characterVoiceSelector', this.ui.settingsForm);
            if (characterVoiceSelect && this.stateManager.get('isSettingsModalOpen')) {
                // If user has a specific character voice preference, it might differ from active character.
                // This should reflect userPreferences.voiceCharacter.
                // _populateSettingsForm handles setting this select's value correctly.
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

        this.chatHistory.renderHistoryList();
        this.chatMessages.renderHistory(this.stateManager.get('chatHistory'));
        this._toggleEmptyState(this.stateManager.get('chatHistory').length === 0);

        const apiKey = this.stateManager.get('apiKey');
        if (apiKey) this._showChatView(); else this._showLoginView();
    }

    _handleLoginSubmit(event) {
        event.preventDefault();
        const apiKey = this.ui.apiKeyInput.value.trim();
        if (this.apiService.validateApiKey(apiKey)) {
            this.stateManager.setApiKey(apiKey); // This will trigger view change via state subscription
            if(this.ui.loginErrorMessage) this.ui.loginErrorMessage.textContent = '';
            if (this.soundEffects) this.soundEffects.playSoundEffect('loginSuccess');
        } else {
            if(this.ui.loginErrorMessage) this.ui.loginErrorMessage.textContent = 'Invalid API Key format or value.';
            if (this.soundEffects) this.soundEffects.playSoundEffect('error');
            this.utils.shake(this.ui.loginForm);
        }
    }

    _showLoginView() {
        if(this.ui.chatContainer) this.utils.addClass(this.ui.chatContainer, 'hidden');
        if(this.ui.loginContainer) this.utils.removeClass(this.ui.loginContainer, 'hidden');
        this.stateManager.set('currentView', 'login', true); // Silent as it's a direct consequence
        if(this.ui.apiKeyInput) this.ui.apiKeyInput.focus();
    }

    _showChatView() {
        if(this.ui.loginContainer) this.utils.addClass(this.ui.loginContainer, 'hidden');
        if(this.ui.chatContainer) this.utils.removeClass(this.ui.chatContainer, 'hidden');
        this.stateManager.set('currentView', 'chat', true); // Silent
        this.chatMessages.scrollToBottom();
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
            id: `msg-user-${Date.now()}`, // Add ID for potential later reference
            role: 'user',
            content: messageText,
            timestamp: Date.now()
        };
        this.stateManager.addMessageToHistory(userMessage); // This triggers chatHistory save and UI update

        this.stateManager.set('userInput', '');
        this.ui.chatInput.value = '';
        this.ui.chatInput.style.height = 'auto';
        this.ui.chatInput.focus(); // Keep focus on input

        this._showTypingIndicator(true);

        this.apiService.sendMessage(messageText, this.stateManager.get('chatHistory'))
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
            if (apiResponse.character) character = apiResponse.character;
        } else {
            content = "Sorry, I received an unexpected response.";
        }

        const assistantMessage = {
            id: `msg-assistant-${Date.now()}`,
            role: 'assistant',
            content: content,
            timestamp: Date.now(),
            character: character
        };
        this.stateManager.addMessageToHistory(assistantMessage); // Triggers save & UI update

        if (this.stateManager.get('userPreferences.voiceOutputEnabled') && this.voiceSynthesis) {
            this.voiceSynthesis.speak(assistantMessage.content, assistantMessage.character);
        }
        if (this.soundEffects) this.soundEffects.playSoundEffect('messageReceived');
    }

    _handleApiError(error) {
        console.error("API Error in App:", error);
        const errorMessage = error.message || "An unknown API error occurred.";
        const errorResponseMessage = {
            id: `msg-error-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ ${errorMessage}`,
            timestamp: Date.now(),
            isError: true
        };
        this.stateManager.addMessageToHistory(errorResponseMessage);
        this.eventEmitter.emit('errorDisplay', { message: errorMessage, type: 'api' });
    }

    _showTypingIndicator(show) {
        this.eventEmitter.emit('typingIndicator', { show }); // ChatMessages listens to this
    }

    _handleInputKeyDown(event) {
        this.stateManager.set('userInput', event.target.value, true); // Silent update for input value state

        const sendOnEnter = this.stateManager.get('userPreferences.sendOnEnter');
        if (event.key === 'Enter' && sendOnEnter && !event.shiftKey) {
            event.preventDefault();
            this._handleSendMessage();
        }
        // Auto-resize textarea (ensure it doesn't exceed max-height if defined in CSS)
        event.target.style.height = 'auto';
        const maxHeight = parseInt(this.utils.getStyle(event.target, 'max-height'), 10) || Infinity;
        event.target.style.height = Math.min(event.target.scrollHeight, maxHeight) + 'px';
    }

    _handleNewChat() {
        this.stateManager.clearChatHistory(); // This also triggers history update
        this.stateManager.set('activeSessionId', null); // Crucial for starting a new session
        this.chatHistory.renderHistoryList(); // Re-render sidebar to reflect new/no active session
        if(this.ui.chatInput) this.ui.chatInput.focus();
        this._toggleEmptyState(true);
        if (this.soundEffects) this.soundEffects.playSoundEffect('newChat');
        this.eventEmitter.emit('newChatStarted');
    }
    
    _populateSettingsForm() {
        if (!this.ui.settingsForm) return;
        const prefs = this.stateManager.get('userPreferences');
        const apiKey = this.stateManager.get('apiKey');
        const currentProvider = this.stateManager.get('currentApiProvider');
        const currentApiModel = this.stateManager.get(`modelPreferences.${currentProvider}.model`);

        this.utils.$('#apiKeySetting', this.ui.settingsForm).value = apiKey || '';
        const modelSelect = this.utils.$('#modelSelection', this.ui.settingsForm);
        if(modelSelect) modelSelect.value = currentApiModel || 'claude-3-haiku-20240307';

        this.utils.$('#autoScroll', this.ui.settingsForm).checked = prefs.autoScroll;
        this.utils.$('#sendOnEnter', this.ui.settingsForm).checked = prefs.sendOnEnter;
        this.utils.$('#markdownRendering', this.ui.settingsForm).checked = prefs.markdownRendering;
        this.utils.$('#voiceInputEnabled', this.ui.settingsForm).checked = prefs.voiceInputEnabled;
        this.utils.$('#voiceOutputEnabled', this.ui.settingsForm).checked = prefs.voiceOutputEnabled;
        this.utils.$('#soundEffectsEnabled', this.ui.settingsForm).checked = prefs.soundEffectsEnabled;
        this.utils.$('#reduceMotion', this.ui.settingsForm).checked = prefs.reduceMotion;

        const themeSelect = this.utils.$('#themeSelectorSetting', this.ui.settingsForm);
        if (themeSelect) {
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
        const formData = new FormData(this.ui.settingsForm);
        
        const newApiKey = formData.get('apiKeySetting')?.trim() || null; // Ensure null if empty
        if (newApiKey !== this.stateManager.get('apiKey')) {
            if (newApiKey === null || this.apiService.validateApiKey(newApiKey)) {
                this.stateManager.setApiKey(newApiKey); // This saves and updates view
            } else {
                this.utils.shake(this.utils.$('#apiKeySetting', this.ui.settingsForm));
                this.eventEmitter.emit('notificationDisplay', {message: 'Invalid API key format.', type: 'error'});
                return;
            }
        }

        const newTheme = formData.get('themeSelectorSetting');
        if (newTheme && newTheme !== this.stateManager.get('currentTheme')) {
            this.themeManager.setCurrentTheme(newTheme);
        }

        ['autoScroll', 'sendOnEnter', 'markdownRendering', 'voiceInputEnabled', 'voiceOutputEnabled', 'soundEffectsEnabled', 'reduceMotion'].forEach(key => {
            this.stateManager.setUserPreference(key, formData.has(key));
        });
        this.stateManager.setUserPreference('voiceCharacter', formData.get('characterVoiceSelector') || 'default');

        const newModel = formData.get('modelSelection');
        if (newModel) {
            const currentProvider = this.stateManager.get('currentApiProvider');
            this.stateManager.set(`modelPreferences.${currentProvider}.model`, newModel);
            // this.stateManager.saveState(['modelPreferences']); // If model prefs need separate save
        }

        if (this.soundEffects) this.soundEffects.playSoundEffect('settingsSaved');
        this.stateManager.setModalOpen('isSettingsModalOpen', false);
        this.eventEmitter.emit('notificationDisplay', {message: 'Settings saved!', type: 'success'});
    }

    _handlePreferenceChange(event) {
        const target = event.target;
        const key = target.name || target.id; // Use name or id
        let prefKey = key;

        // Map specific IDs/names to preference keys if they differ
        if (key === 'apiKeySetting' || key === 'modelSelection' || key === 'themeSelectorSetting' || key === 'characterVoiceSelector') {
            return; // These are handled on save explicitly, not as general preferences here
        }
        // For checkboxes that directly map to userPreferences keys:
        // e.g., if input name="autoScroll", prefKey is 'autoScroll'
        const value = target.type === 'checkbox' ? target.checked : target.value;

        // For "instant apply" preferences like reduceMotion or soundEffectsEnabled
        if (prefKey === 'reduceMotion' || prefKey === 'soundEffectsEnabled') {
            this.stateManager.setUserPreference(prefKey, value);
        }
    }

    _handleGlobalKeyDown(event) {
        if (event.key === 'Escape') {
            if (this.stateManager.get('isSettingsModalOpen')) {
                this.stateManager.setModalOpen('isSettingsModalOpen', false);
            }
        }
    }

    _handleResize() {
        this.eventEmitter.emit('appResized', { width: window.innerWidth, height: window.innerHeight });
    }

    _handleVisibilityChange() {
        if (document.hidden) {
            this.eventEmitter.emit('appHidden');
            if(this.voiceRecognition && this.stateManager.get('isMicListening')) this.voiceRecognition.stopListening();
            if(this.voiceSynthesis && this.stateManager.get('isSpeaking')) this.voiceSynthesis.cancel();
        } else {
            this.eventEmitter.emit('appVisible');
        }
    }

    _showLoadingScreen() { // Renamed from _showLoading
        if (this.ui.loadingOverlay) {
            this.utils.removeClass(this.ui.loadingOverlay, 'hidden');
            this.utils.fadeIn(this.ui.loadingOverlay, 100); // Quick fade for consistency
        }
        document.body.classList.add('app-loading');
    }

    _hideLoadingScreen() { // Renamed from _hideLoading
        if (this.ui.loadingOverlay) this.utils.fadeOut(this.ui.loadingOverlay, 500);
        document.body.classList.remove('app-loading');
    }

    _toggleModal(modalElement, show) {
        const overlay = modalElement && modalElement.classList.contains('modal-overlay') ? modalElement : modalElement.closest('.modal-overlay');
        if (!overlay) return;

        if (show) {
            this.utils.removeClass(overlay, 'hidden');
            this.utils.requestFrame(() => { // Ensure display:block is applied before adding .active for transition
                this.utils.addClass(overlay, 'active');
                const focusable = this.utils.$$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modalElement || overlay)[0];
                if (focusable) focusable.focus();
            });
        } else {
            this.utils.removeClass(overlay, 'active');
            // Listen for transition end to add 'hidden' for accessibility
            const onTransitionEnd = () => {
                overlay.removeEventListener('transitionend', onTransitionEnd);
                if (!overlay.classList.contains('active')) { // Check if still meant to be hidden
                    this.utils.addClass(overlay, 'hidden');
                }
            };
            overlay.addEventListener('transitionend', onTransitionEnd);
            // Fallback timeout in case transitionend doesn't fire reliably
            setTimeout(() => {
                 if (!overlay.classList.contains('active')) this.utils.addClass(overlay, 'hidden');
            }, 500); // Match typical transition duration
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
        // Future: Integrate with a visual toast/notification system
        alert(`Error: ${message}`); // Simple alert for now
    }

    _displayNotification({ message, type = 'info', duration = 3000}) {
        console.log(`Notification (${type}): ${message}`);
        // Future: Integrate with a visual toast/notification system
        // Simple alert for now, if not an error
        if(type !== 'error') alert(`Info: ${message}`);
    }

    destroy() {
        console.log('🛑 Destroying App...');
        // Remove global event listeners - ensure debounced/throttled functions are properly handled if stored
        // window.removeEventListener('resize', this._debouncedResizeHandler || this._handleResize);
        document.removeEventListener('visibilitychange', this._handleVisibilityChange);
        if(this.voiceRecognition) this.voiceRecognition.destroy();
        if(this.voiceSynthesis) this.voiceSynthesis.destroy();
        if(this.themeManager) this.themeManager.destroy();
        if(this.characterManager) { /* characterManager might not have explicit destroy */ }
        if(this.audioWorker) this.audioWorker.terminate();

        this.stateManager.enableDebugging(false);
        this.isInitialized = false;
    }
}

// Global error handling & App instantiation
// These are kept as in the original file but placed after App class definition.
window.addEventListener('error', (event) => {
    console.error('Unhandled global error:', event.error || event.message, event);
    if (window.StateManager && typeof StateManager.getInstance === 'function' && StateManager.getInstance()) {
        StateManager.getInstance().set('lastError', {
            message: 'Unhandled global error: ' + (event.error ? event.error.message : event.message),
            stack: event.error ? event.error.stack : null,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            timestamp: new Date().toISOString()
        });
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
     if (window.StateManager && typeof StateManager.getInstance === 'function' && StateManager.getInstance()) {
        StateManager.getInstance().set('lastError', {
            message: 'Unhandled promise rejection: ' + (event.reason && event.reason.message ? event.reason.message : event.reason),
            stack: event.reason ? event.reason.stack : null,
            timestamp: new Date().toISOString()
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Ensure core global singletons/classes are ready
    if (!window.UtilsInstance || !window.StateManager || !window.AppEvents) {
        const criticalErrorMsg = "FATAL: Core Singleton JS files (Utils, StateManager, AppEvents) failed to load or initialize their globals correctly. App cannot start.";
        console.error(criticalErrorMsg);
        document.body.innerHTML = `<div style="font-family:sans-serif;color:red;padding:20px;">${criticalErrorMsg} Check script order and definitions.</div>`;
        return;
    }

    const parklandApp = new App();
    window.parklandApp = parklandApp;
    parklandApp.init().catch(err => {
        console.error("Fatal error during app initialization sequence:", err);
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.innerHTML = `<div class="loading-text" style="color:red; font-size:16px; padding:20px;">Critical Error Initializing Application. Details in console. Please refresh.</div>`;
            if(loadingOverlay.classList.contains('hidden')) loadingOverlay.classList.remove('hidden');
            loadingOverlay.style.opacity = '1';
            loadingOverlay.style.visibility = 'visible';
        }
    });
});
