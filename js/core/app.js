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
        this.utils = window.utils; // From utils.js
        this.stateManager = window.StateManager.getInstance(); // From state.js
        this.eventEmitter = window.appEvents; // From events.js

        // Feature Modules (instances to be created)
        this.themeManager = null;
        this.characterManager = null;
        this.apiService = null; // Will be an instance of ClaudeAPIService or similar
        this.voiceRecognition = null;
        this.voiceSynthesis = null;
        this.chatHistory = null;
        this.chatMessages = null;
        this.markdownProcessor = null;
        this.themeTransition = null; // From features/themes/transitions.js
        this.soundEffects = null; // Placeholder for dedicated sound effects module

        this.ui = {}; // To store DOM element references
        this.isInitialized = false;

        // Bind `this` for methods used as event handlers
        this._handleVisibilityChange = this._handleVisibilityChange.bind(this);

        // Early debug setup
        if (this.stateManager.get('debugMode')) {
            console.log('App constructor: Debug mode is ON.');
        }
    }

    /**
     * Initializes the application.
     * Sets up UI elements, initializes modules, registers event listeners.
     */
    async init() {
        if (this.isInitialized) {
            console.warn('App already initialized.');
            return;
        }

        console.log('🚀 Parkland AI - Opus Magnum Edition: Initializing App...');
        this.stateManager.set('isLoading', true);
        document.body.classList.add('app-loading');

        this._selectUIElements();

        // Initialize Core Modules that might have dependencies or need early setup
        // Utils, StateManager, EventEmitter are already instantiated globally.

        // Initialize Feature Modules
        // Markdown Processor (Example, actual instantiation depends on its structure)
        this.markdownProcessor = new MarkdownProcessor(); // Assuming MarkdownProcessor class exists

        // API Service (Example for Claude, can be made dynamic)
        this.apiService = new ClaudeAPIService(this.stateManager, this.utils);

        this.chatMessages = new ChatMessages(this.ui.chatMessagesContainer, this.utils, this.markdownProcessor, this.stateManager);
        this.chatHistory = new ChatHistory(this.ui.chatHistoryContainer, this.utils, this.eventEmitter, this.stateManager);

        this.voiceRecognition = new VoiceRecognition(this.stateManager, this.eventEmitter, this.utils, this.ui.micBtn);
        this.voiceSynthesis = new VoiceSynthesis(this.stateManager, this.eventEmitter, this.utils);
        
        this.themeTransition = new ThemeTransition(this.utils, this.stateManager); // Initialize ThemeTransition

        this.themeManager = new ThemeManager(this.stateManager, this.utils, this.eventEmitter, this.themeTransition);
        await this.themeManager.init(); // Loads current theme, including its CSS

        this.characterManager = new CharacterManager(this.stateManager, this.utils, this.eventEmitter, this.themeManager);
        this.characterManager.initCharacters(); // Initialize character instances

        // Initialize Sound Effects module if available (placeholder from report)
        // Assuming AudioProcessor might be a class for handling sound effects
        if (typeof AudioProcessor === 'function') {
             this.soundEffects = new AudioProcessor(this.stateManager); // or utils.createAudioContext() if more direct
        } else if (typeof window.audioProcessor !== 'undefined' && typeof window.audioProcessor.playSoundEffect === 'function') {
            // If audio-processor.js exposes a global object with playSoundEffect
            this.soundEffects = window.audioProcessor;
        }


        this._registerEventListeners();
        this._setupStateSubscriptions();

        this._updateUIBasedOnState(); // Initial UI setup based on loaded state

        // Handle initial view (login or chat)
        if (this.stateManager.get('apiKey')) {
            this._showChatView();
        } else {
            this._showLoginView();
        }
        
        this.isInitialized = true;
        console.log('✅ App initialized successfully.');

        // Delay hiding loading screen slightly to allow initial paint
        setTimeout(() => {
            this.stateManager.set('isLoading', false);
            document.body.classList.remove('app-loading');
            this.utils.fadeOut(this.ui.loadingOverlay, 500);
            if (this.soundEffects && typeof this.soundEffects.playSoundEffect === 'function') {
                this.soundEffects.playSoundEffect('appReady');
            }
        }, 1000); // Adjust delay as needed
    }

    /**
     * Selects and stores references to frequently used UI elements.
     */
    _selectUIElements() {
        this.ui.loadingOverlay = this.utils.$('#loadingOverlay');
        this.ui.appContainer = this.utils.$('#appContainer');
        this.ui.loginContainer = this.utils.$('#loginContainer');
        this.ui.chatContainer = this.utils.$('#chatContainer');

        // Login View
        this.ui.loginForm = this.utils.$('#loginForm');
        this.ui.apiKeyInput = this.utils.$('#apiKeyInput');
        this.ui.loginButton = this.utils.$('#loginButton'); // Added from HTML
        this.ui.loginErrorMessage = this.utils.$('#loginErrorMessage');

        // Chat View
        this.ui.sidebar = this.utils.$('.sidebar');
        this.ui.chatHeader = this.utils.$('.chat-header');
        this.ui.chatInputForm = this.utils.$('#chatInputForm');
        this.ui.chatInput = this.utils.$('#chatInput');
        this.ui.sendBtn = this.utils.$('#sendBtn');
        this.ui.micBtn = this.utils.$('#micBtn');
        this.ui.chatMessagesContainer = this.utils.$('.messages-container .messages-inner'); // Ensure correct selection
        this.ui.chatHistoryContainer = this.utils.$('.sidebar-content .chat-history-list'); // From sidebar.css context
        this.ui.newChatBtn = this.utils.$('.new-chat-btn');
        this.ui.themeSelector = this.utils.$('#themeSelector'); // Assumed ID for theme dropdown
        this.ui.settingsBtn = this.utils.$('#settingsBtn'); // Assumed ID
        this.ui.sidebarToggleBtn = this.utils.$('#sidebarToggle'); // Assumed ID

        // Modals (assuming they exist in index.html)
        this.ui.settingsModal = this.utils.$('#appSettingsModal');
        this.ui.settingsForm = this.utils.$('#settingsForm'); // Inside settings modal
        this.ui.closeSettingsModalBtn = this.utils.$('#appSettingsModal .modal-close');

        // Empty State
        this.ui.emptyStateContainer = this.utils.$('.empty-state-container');
    }

    /**
     * Registers global event listeners for UI interactions and browser events.
     */
    _registerEventListeners() {
        // Login form submission
        if (this.ui.loginForm) {
            this.ui.loginForm.addEventListener('submit', this._handleLoginSubmit.bind(this));
        } else if(this.ui.loginButton) { // Fallback if form doesn't exist but button does
            this.ui.loginButton.addEventListener('click', this._handleLoginSubmit.bind(this));
        }


        // Chat input form submission
        this.ui.chatInputForm.addEventListener('submit', this._handleSendMessage.bind(this));
        this.ui.chatInput.addEventListener('keydown', this._handleInputKeyDown.bind(this));
        this.ui.sendBtn.addEventListener('click', this._handleSendMessage.bind(this));

        // Mic button
        this.ui.micBtn.addEventListener('click', () => this.voiceRecognition.toggleListening());

        // New chat button
        this.ui.newChatBtn.addEventListener('click', this._handleNewChat.bind(this));

        // Theme selector (example, actual implementation might be in ThemeManager or Settings)
        if (this.ui.themeSelector) {
            this.ui.themeSelector.addEventListener('change', (e) => {
                this.themeManager.setCurrentTheme(e.target.value);
            });
        }

        // Settings button and modal
        if (this.ui.settingsBtn) {
            this.ui.settingsBtn.addEventListener('click', () => this.stateManager.setModalOpen('isSettingsModalOpen', true));
        }
        if (this.ui.closeSettingsModalBtn) {
            this.ui.closeSettingsModalBtn.addEventListener('click', () => this.stateManager.setModalOpen('isSettingsModalOpen', false));
        }
        if (this.ui.settingsForm) {
            this.ui.settingsForm.addEventListener('submit', this._handleSettingsSave.bind(this));
            // Listen for changes in settings form to update preferences in real-time or on save
            this.utils.$$('input, select', this.ui.settingsForm).forEach(input => {
                input.addEventListener('change', this._handlePreferenceChange.bind(this));
            });
        }


        // Sidebar toggle
        if (this.ui.sidebarToggleBtn) {
            this.ui.sidebarToggleBtn.addEventListener('click', () => this.stateManager.toggleSidebar());
        }

        // Global keyboard shortcuts (example)
        window.addEventListener('keydown', this._handleGlobalKeyDown.bind(this));

        // Handle window resize for responsive adjustments
        window.addEventListener('resize', this.utils.debounce(this._handleResize.bind(this), 200));

        // Handle visibility change to pause/resume activities
        document.addEventListener('visibilitychange', this._handleVisibilityChange);

        // Listen for custom app events
        this.eventEmitter.on('errorDisplay', this._displayError.bind(this));
        this.eventEmitter.on('notificationDisplay', this._displayNotification.bind(this));
        this.eventEmitter.on('playSound', (soundName) => {
            if (this.soundEffects && typeof this.soundEffects.playSoundEffect === 'function') {
                this.soundEffects.playSoundEffect(soundName);
            }
        });
    }

    /**
     * Subscribes to state changes from the StateManager.
     */
    _setupStateSubscriptions() {
        this.stateManager.subscribe('change:isLoading', ({ newValue }) => {
            newValue ? this._showLoading() : this._hideLoading();
        });

        this.stateManager.subscribe('change:currentTheme', ({ newValue }) => {
            if (this.themeManager) this.themeManager.applyThemeToBody(newValue);
        });

        this.stateManager.subscribe('change:chatHistory', ({ newValue }) => {
            this.chatMessages.renderHistory(newValue);
            this._toggleEmptyState(newValue.length === 0);
        });
        
        this.stateManager.subscribe('change:isSidebarOpen', ({ newValue }) => {
             this.ui.sidebar.classList.toggle('open', newValue);
             this.ui.sidebar.classList.toggle('collapsed', !newValue); // Ensure correct class for collapsed state
             this.ui.appContainer.classList.toggle('sidebar-collapsed', !newValue);
        });

        this.stateManager.subscribe('change:isLoginModalOpen', ({ newValue }) => {
            this._toggleModal(this.ui.loginContainer, newValue); // Login view is now a container, not modal
        });
        this.stateManager.subscribe('change:isSettingsModalOpen', ({ newValue }) => {
            this._toggleModal(this.ui.settingsModal, newValue);
             if (newValue) this._populateSettingsForm(); // Populate form when opened
        });

        this.stateManager.subscribe('change:isMicListening', ({newValue}) => {
            this.ui.micBtn.classList.toggle('active', newValue);
            this.ui.micBtn.setAttribute('aria-pressed', newValue);
            // Could also update mic button icon/text
        });

        this.stateManager.subscribe('change:userInput', ({newValue}) => {
            if(this.ui.chatInput.value !== newValue) { // Avoid cursor jump if updated programmatically
                this.ui.chatInput.value = newValue;
            }
        });
    }

    /**
     * Updates UI elements based on the current state.
     * Called on init and potentially after certain state changes.
     */
    _updateUIBasedOnState() {
        // Theme
        if (this.themeManager) this.themeManager.applyThemeToBody(this.stateManager.get('currentTheme'));
        
        // Sidebar
        const isSidebarOpen = this.stateManager.get('isSidebarOpen');
        this.ui.sidebar.classList.toggle('open', isSidebarOpen);
        this.ui.sidebar.classList.toggle('collapsed', !isSidebarOpen);
        this.ui.appContainer.classList.toggle('sidebar-collapsed', !isSidebarOpen);

        // Chat history
        this.chatHistory.renderHistoryList(); // Renders sidebar history
        this.chatMessages.renderHistory(this.stateManager.get('chatHistory')); // Renders messages in chat area
        this._toggleEmptyState(this.stateManager.get('chatHistory').length === 0);

        // API key input if present
        const apiKey = this.stateManager.get('apiKey');
        if (this.ui.apiKeyInput && apiKey) {
             // this.ui.apiKeyInput.value = apiKey; // No, this should be populated in settings
        }
        if (this.ui.loginContainer && this.ui.chatContainer) {
            if (apiKey) {
                this._showChatView();
            } else {
                this._showLoginView();
            }
        }
    }

    _handleLoginSubmit(event) {
        event.preventDefault();
        const apiKey = this.ui.apiKeyInput.value.trim();
        if (this.apiService.validateApiKey(apiKey)) { // Assuming API service has a validation method
            this.stateManager.setApiKey(apiKey);
            if(this.ui.loginErrorMessage) this.ui.loginErrorMessage.textContent = '';
            if (this.soundEffects && typeof this.soundEffects.playSoundEffect === 'function') {
                this.soundEffects.playSoundEffect('loginSuccess');
            }
        } else {
            if(this.ui.loginErrorMessage) this.ui.loginErrorMessage.textContent = 'Invalid API Key format.';
             if (this.soundEffects && typeof this.soundEffects.playSoundEffect === 'function') {
                this.soundEffects.playSoundEffect('error');
            }
            this.utils.shake(this.ui.loginForm);
        }
    }

    _showLoginView() {
        this.utils.addClass(this.ui.chatContainer, 'hidden');
        this.utils.removeClass(this.ui.loginContainer, 'hidden');
        this.stateManager.set('currentView', 'login');
        if(this.ui.apiKeyInput) this.ui.apiKeyInput.focus();
    }

    _showChatView() {
        this.utils.addClass(this.ui.loginContainer, 'hidden');
        this.utils.removeClass(this.ui.chatContainer, 'hidden');
        this.stateManager.set('currentView', 'chat');
        this.chatMessages.scrollToBottom(); // Scroll to bottom when chat view is shown
        this.ui.chatInput.focus();

        // If it's the first time showing chat view after login, maybe play an intro
        // or trigger character appearance
        if(!this.chatViewShownBefore) {
            this.eventEmitter.emit('chatViewReady');
            this.chatViewShownBefore = true; // Simple flag
        }
    }

    _handleSendMessage(event) {
        if (event) event.preventDefault(); // Prevent default if triggered by form submit/button click
        const messageText = this.stateManager.get('userInput').trim();

        if (!messageText) return;

        if (this.soundEffects && typeof this.soundEffects.playSoundEffect === 'function') {
            this.soundEffects.playSoundEffect('messageSent');
        }

        const userMessage = {
            role: 'user',
            content: messageText,
            timestamp: Date.now()
        };
        this.stateManager.addMessageToHistory(userMessage);
        this.chatHistory.addOrUpdateChatItem(userMessage); // Update sidebar history

        this.stateManager.set('userInput', ''); // Clear input field
        this.ui.chatInput.value = ''; // Directly clear input
        this.ui.chatInput.style.height = 'auto'; // Reset height for textarea

        this._showTypingIndicator(true);

        this.apiService.sendMessage(messageText, this.stateManager.get('chatHistory'))
            .then(response => {
                this._processAssistantResponse(response);
            })
            .catch(error => {
                this._handleApiError(error);
            })
            .finally(() => {
                this._showTypingIndicator(false);
            });
    }
    
    _processAssistantResponse(apiResponse) {
        // Assuming apiResponse is an object like { role: 'assistant', content: '...', character: 'mr-dna' }
        // The actual structure depends on your APIService implementation
        
        let content = '';
        let character = this.stateManager.get('activeCharacter'); // Default to current active character

        if (typeof apiResponse === 'string') { // Simple string response
            content = apiResponse;
        } else if (apiResponse && typeof apiResponse.content === 'string') {
            content = apiResponse.content;
            if (apiResponse.character) { // API might suggest a character
                character = apiResponse.character;
                 // Optionally, set this as the active character if design allows
                 // this.stateManager.setActiveCharacter(character);
            }
        } else {
            console.error("Unexpected API response format:", apiResponse);
            content = "Sorry, I received an unexpected response.";
        }


        const assistantMessage = {
            role: 'assistant',
            content: content, // Raw content, Markdown rendering happens in ChatMessages
            timestamp: Date.now(),
            character: character || this.stateManager.get('activeCharacter') || undefined
        };
        this.stateManager.addMessageToHistory(assistantMessage);
        this.chatHistory.addOrUpdateChatItem(assistantMessage);

        if (this.stateManager.get('userPreferences.voiceOutputEnabled') && this.voiceSynthesis) {
            this.voiceSynthesis.speak(assistantMessage.content, assistantMessage.character);
        }

        if (this.soundEffects && typeof this.soundEffects.playSoundEffect === 'function') {
            this.soundEffects.playSoundEffect('messageReceived');
        }
    }

    _handleApiError(error) {
        console.error("API Error:", error);
        let errorMessage = "Sorry, something went wrong while contacting the AI.";
        if (error && error.message) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        const errorResponseMessage = {
            role: 'assistant',
            content: errorMessage,
            timestamp: Date.now(),
            isError: true // Custom flag
        };
        this.stateManager.addMessageToHistory(errorResponseMessage);
        this.eventEmitter.emit('errorDisplay', { message: errorMessage, type: 'api' }); // For toast/global error display
    }

    _showTypingIndicator(show) {
        this.eventEmitter.emit('typingIndicator', { show });
    }

    _handleInputKeyDown(event) {
        this.stateManager.set('userInput', event.target.value, true); // Silent update for performance

        const sendOnEnter = this.stateManager.get('userPreferences.sendOnEnter');
        if (event.key === 'Enter' && sendOnEnter && !event.shiftKey) {
            event.preventDefault();
            this._handleSendMessage();
        }
        // Auto-resize textarea
        event.target.style.height = 'auto';
        event.target.style.height = (event.target.scrollHeight) + 'px';
    }

    _handleNewChat() {
        this.stateManager.clearChatHistory();
        this.chatHistory.clearHistoryList(); // Clear sidebar history display
        this.ui.chatInput.focus();
        this._toggleEmptyState(true); // Show empty state
        if (this.soundEffects && typeof this.soundEffects.playSoundEffect === 'function') {
            this.soundEffects.playSoundEffect('newChat');
        }
        this.eventEmitter.emit('newChatStarted');
    }
    
    _populateSettingsForm() {
        const prefs = this.stateManager.get('userPreferences');
        const apiKey = this.stateManager.get('apiKey');
        const currentApiModel = this.stateManager.get(`modelPreferences.${this.stateManager.get('currentApiProvider')}.model`);

        if (!this.ui.settingsForm) return;

        this.utils.$('#apiKeySetting', this.ui.settingsForm).value = apiKey || '';
        this.utils.$('#modelSelection', this.ui.settingsForm).value = currentApiModel || ''; // Adjust based on actual select options
        this.utils.$('#autoScroll', this.ui.settingsForm).checked = prefs.autoScroll;
        this.utils.$('#sendOnEnter', this.ui.settingsForm).checked = prefs.sendOnEnter;
        this.utils.$('#markdownRendering', this.ui.settingsForm).checked = prefs.markdownRendering;
        this.utils.$('#voiceInputEnabled', this.ui.settingsForm).checked = prefs.voiceInputEnabled;
        this.utils.$('#voiceOutputEnabled', this.ui.settingsForm).checked = prefs.voiceOutputEnabled;
        this.utils.$('#soundEffectsEnabled', this.ui.settingsForm).checked = prefs.soundEffectsEnabled;
        this.utils.$('#reduceMotion', this.ui.settingsForm).checked = prefs.reduceMotion;

        // Populate theme selector inside modal
        const themeSelect = this.utils.$('#themeSelectorSetting', this.ui.settingsForm);
        if(themeSelect) {
            themeSelect.value = this.stateManager.get('currentTheme');
        }
         // Populate character voice selector
        const characterVoiceSelect = this.utils.$('#characterVoiceSelector', this.ui.settingsForm);
        if (characterVoiceSelect && this.characterManager) {
            characterVoiceSelect.innerHTML = ''; // Clear existing options
            const characters = this.characterManager.getAvailableCharacters(); // Get {key: name} map
            
            // Add default option
            const defaultOpt = this.utils.createElement('option', { value: 'default'}, 'Default Voice');
            characterVoiceSelect.appendChild(defaultOpt);

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
        
        const newApiKey = formData.get('apiKeySetting')?.trim();
        if (newApiKey !== this.stateManager.get('apiKey')) {
            if (this.apiService.validateApiKey(newApiKey) || newApiKey === '') { // Allow clearing API key
                this.stateManager.setApiKey(newApiKey);
                 if(this.ui.loginErrorMessage) this.ui.loginErrorMessage.textContent = '';
            } else {
                // Handle invalid API key format in settings modal, perhaps with a message
                this.utils.shake(this.utils.$('#apiKeySetting', this.ui.settingsForm));
                this.eventEmitter.emit('notificationDisplay', {message: 'Invalid API key format.', type: 'error'});
                return; // Prevent saving other settings if API key is invalid
            }
        }

        // Update theme
        const newTheme = formData.get('themeSelectorSetting');
        if (newTheme && newTheme !== this.stateManager.get('currentTheme')) {
            this.themeManager.setCurrentTheme(newTheme); // ThemeManager handles saving theme to state/localStorage
        }

        // Update preferences
        this.stateManager.setUserPreference('autoScroll', formData.has('autoScroll'));
        this.stateManager.setUserPreference('sendOnEnter', formData.has('sendOnEnter'));
        this.stateManager.setUserPreference('markdownRendering', formData.has('markdownRendering'));
        this.stateManager.setUserPreference('voiceInputEnabled', formData.has('voiceInputEnabled'));
        this.stateManager.setUserPreference('voiceOutputEnabled', formData.has('voiceOutputEnabled'));
        this.stateManager.setUserPreference('soundEffectsEnabled', formData.has('soundEffectsEnabled'));
        this.stateManager.setUserPreference('reduceMotion', formData.has('reduceMotion'));
        this.stateManager.setUserPreference('voiceCharacter', formData.get('characterVoiceSelector') || 'default');


        // Update API model (example, assuming simple select for now)
        const newModel = formData.get('modelSelection');
        if (newModel) {
            const currentProvider = this.stateManager.get('currentApiProvider');
            this.stateManager.set(`modelPreferences.${currentProvider}.model`, newModel);
            // Potentially save modelPreferences if they are meant to persist
            // this.stateManager.saveState(['modelPreferences']);
        }

        if (this.soundEffects && typeof this.soundEffects.playSoundEffect === 'function') {
            this.soundEffects.playSoundEffect('settingsSaved');
        }
        this.stateManager.setModalOpen('isSettingsModalOpen', false);
        this.eventEmitter.emit('notificationDisplay', {message: 'Settings saved!', type: 'success'});
    }

    _handlePreferenceChange(event) {
        const target = event.target;
        const key = target.name; // Ensure name attribute maps to userPreference sub-key
        const value = target.type === 'checkbox' ? target.checked : target.value;

        if (key) {
            // For direct preference updates if desired (e.g., for instant visual feedback like reduceMotion)
            // this.stateManager.setUserPreference(key, value);
            // However, it's safer to update all on save to avoid partial updates if modal is closed without saving.
            // Or, handle specific "instant apply" preferences here.
            if (key === 'reduceMotion') {
                this.stateManager.setUserPreference('reduceMotion', value);
            }
            if (key === 'soundEffectsEnabled') {
                 this.stateManager.setUserPreference('soundEffectsEnabled', value);
            }
        }
    }

    _handleGlobalKeyDown(event) {
        // Example: Escape key to close modals
        if (event.key === 'Escape') {
            if (this.stateManager.get('isSettingsModalOpen')) {
                this.stateManager.setModalOpen('isSettingsModalOpen', false);
            }
            // Add other modal checks here
        }
        // Example: Ctrl/Cmd + K to focus search or new chat (conceptual)
        // if ((event.ctrlKey || event.metaKey) && event.key === 'k') { ... }
    }

    _handleResize() {
        // Handle responsive adjustments if needed, e.g., for canvas elements or complex layouts
        this.eventEmitter.emit('appResized', {
            width: window.innerWidth,
            height: window.innerHeight
        });
    }

    _handleVisibilityChange() {
        if (document.hidden) {
            this.eventEmitter.emit('appHidden');
            // Example: Pause animations, stop audio processing
            if(this.voiceRecognition && this.stateManager.get('isMicListening')) {
                this.voiceRecognition.stopListening();
            }
            if(this.voiceSynthesis && this.stateManager.get('isSpeaking')) {
                this.voiceSynthesis.cancel();
            }
        } else {
            this.eventEmitter.emit('appVisible');
            // Example: Resume activities
        }
    }

    _showLoading() {
        if (this.ui.loadingOverlay) this.utils.fadeIn(this.ui.loadingOverlay, 200);
        document.body.classList.add('app-loading');
    }

    _hideLoading() {
        if (this.ui.loadingOverlay) this.utils.fadeOut(this.ui.loadingOverlay, 500);
        document.body.classList.remove('app-loading');
    }

    _toggleModal(modalElement, show) {
        if (!modalElement) return;
        if (show) {
            this.utils.removeClass(modalElement.closest('.modal-overlay') || modalElement, 'hidden');
            this.utils.addClass(modalElement.closest('.modal-overlay') || modalElement, 'active');
            // Focus first focusable element in modal (accessibility)
            const focusable = this.utils.$$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modalElement)[0];
            if (focusable) focusable.focus();
        } else {
            this.utils.removeClass(modalElement.closest('.modal-overlay') || modalElement, 'active');
            this.utils.addClass(modalElement.closest('.modal-overlay') || modalElement, 'hidden'); // Add hidden after transition
        }
    }
    
    _toggleEmptyState(show) {
        if (!this.ui.emptyStateContainer) return;
        if (show) {
            this.utils.removeClass(this.ui.emptyStateContainer, 'hidden');
            // Trigger animation for empty state if it has one
            this.ui.emptyStateContainer.classList.add('animate-in'); // Assuming this class exists
        } else {
            this.utils.addClass(this.ui.emptyStateContainer, 'hidden');
            this.ui.emptyStateContainer.classList.remove('animate-in');
        }
    }

    _displayError({ message, type = 'general' }) { // type can be 'api', 'validation', etc.
        // This could be a toast notification, an inline message, etc.
        // For now, simple console log and update lastError state
        console.error(`App Error (${type}):`, message);
        this.stateManager.set('lastError', { message, type, timestamp: Date.now() });
        // Example: Show toast notification
        // if(this.toastNotificationManager) this.toastNotificationManager.show(message, 'error');
    }

    _displayNotification({ message, type = 'info', duration = 3000}) {
         // if(this.toastNotificationManager) this.toastNotificationManager.show(message, type, duration);
        console.log(`Notification (${type}): ${message}`);
    }

    /**
     * Clean up resources, remove event listeners.
     */
    destroy() {
        console.log('🛑 Destroying App...');
        // Remove global event listeners
        window.removeEventListener('resize', this.utils.debounce(this._handleResize.bind(this), 200)); // Need to store the debounced ref to remove
        document.removeEventListener('visibilitychange', this._handleVisibilityChange);
        // Stop any ongoing processes
        if(this.voiceRecognition) this.voiceRecognition.destroy();
        if(this.voiceSynthesis) this.voiceSynthesis.destroy();
        if(this.themeManager) this.themeManager.destroy();
        // ... destroy other modules

        this.stateManager.enableDebugging(false); // Turn off debugging before destroying state related items
        // Unsubscribe all listeners (optional, depends on architecture)
        // this.eventEmitter.removeAllListeners();

        this.isInitialized = false;
    }
}

// Global error handling for uncaught exceptions (can be part of utils or here)
window.addEventListener('error', (event) => {
    console.error('Unhandled global error:', event.error || event.message, event);
    if (window.StateManager && window.StateManager.getInstance()) {
        window.StateManager.getInstance().set('lastError', {
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
     if (window.StateManager && window.StateManager.getInstance()) {
        window.StateManager.getInstance().set('lastError', {
            message: 'Unhandled promise rejection: ' + (event.reason.message || event.reason),
            stack: event.reason.stack,
            timestamp: new Date().toISOString()
        });
    }
});

// Initialize the app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const parklandApp = new App();
    window.parklandApp = parklandApp; // Expose for debugging or global access if needed
    parklandApp.init().catch(err => {
        console.error("Fatal error during app initialization:", err);
        // Display a user-friendly error message on the page itself if critical init fails
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.innerHTML = `<div class="loading-text" style="color:red;">Critical Error Initializing Application. Please refresh.</div>`;
            loadingOverlay.style.opacity = '1';
            loadingOverlay.style.visibility = 'visible';
        }
    });
});
