/**
 * Parkland AI - Opus Magnum Edition
 * Main Application Controller
 *
 * Orchestrates all systems, manages application lifecycle,
 * and coordinates between modules for AAA-quality experience
 */

class ParklandApp {
    constructor() {
        this.version = '2.0.0';
        this.initialized = false;

        // Core systems references
        this.state = window.appState;
        this.utils = window.utils;

        // Module references (will be initialized)
        this.eventBus = null;
        this.themeManager = null;
        this.chatManager = null;
        this.voiceManager = null;
        this.characterManager = null;
        this.apiClient = null;
        this.soundManager = null;

        // UI element references
        this.elements = {};

        // Loading system
        this.loadingPhases = [
            { progress: 0, text: "Initializing Quantum Core...", duration: 800 },
            { progress: 12, text: "Loading Cognitive Matrices...", duration: 1000 },
            { progress: 25, text: "Decompressing Thematic Overlays...", duration: 1200 },
            { progress: 38, text: "Calibrating Sensory Arrays...", duration: 900 },
            { progress: 50, text: "Buffering Pixel Perfection...", duration: 800 },
            { progress: 63, text: "Synchronizing Neural Networks...", duration: 1000 },
            { progress: 75, text: "Awakening Digital Consciousness...", duration: 900 },
            { progress: 88, text: "Finalizing Opus Magnum Protocols...", duration: 800 },
            { progress: 100, text: "Welcome to Excellence!", duration: 500 }
        ];

        this.loadingTips = {
            default: [
                "Optimizing your experience across quantum dimensions...",
                "Teaching AI the meaning of life, universe, and everything...",
                "Polishing pixels until they achieve sentience...",
                "Downloading the entire internet... just the good parts...",
                "Calibrating humor modules to maximum wit capacity..."
            ],
            jaws: [
                "Scanning the depths for digital predators...",
                "Installing shark-proof encryption protocols...",
                "We're gonna need a bigger loading bar...",
                "Establishing sonar connection to the abyss...",
                "Teaching the AI to swim with the fishes..."
            ],
            jurassic: [
                "Extracting DNA from ancient code repositories...",
                "Life, uh... finds a way to load faster...",
                "Sparing no expense on your experience...",
                "Checking the fences... twice...",
                "Clever girl... she's almost ready..."
            ]
        };

        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * Initialize application
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Parkland AI Opus Magnum v' + this.version);

            // Cache DOM elements
            this.cacheElements();

            // Initialize core systems
            await this.initializeCoreSystems();

            // Setup event listeners
            this.setupEventListeners();

            // Start loading sequence
            await this.startLoadingSequence();

            // Check authentication
            if (this.state.getState('auth.isAuthenticated')) {
                await this.transitionToChat();
            } else {
                await this.transitionToLogin();
            }

            this.initialized = true;
            console.log('✅ Application initialized successfully');

        } catch (error) {
            console.error('❌ Critical initialization error:', error);
            this.handleCriticalError(error);
        }
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        // Loading screen
        this.elements.loadingOverlay = this.utils.$('#loadingOverlay');
        this.elements.loadingLogo = this.utils.$('#loadingLogo');
        this.elements.loadingText = this.utils.$('#loadingText');
        this.elements.loadingTip = this.utils.$('#loadingTip');
        this.elements.progressBar = this.utils.$('#progressBar');

        // Login screen
        this.elements.loginContainer = this.utils.$('#loginContainer');
        this.elements.loginForm = this.utils.$('#loginForm');
        this.elements.usernameInput = this.utils.$('#username');
        this.elements.passwordInput = this.utils.$('#password');
        this.elements.loginLogo = this.utils.$('#loginScreenLogo');
        this.elements.loginTitle = this.utils.$('#loginScreenTitle');
        this.elements.loginSubtitle = this.utils.$('#loginScreenSubtitle');

        // Chat interface
        this.elements.chatContainer = this.utils.$('#chatContainer');
        this.elements.sidebar = this.utils.$('#sidebar');
        this.elements.chatHistory = this.utils.$('#chatHistory');
        this.elements.messagesContainer = this.utils.$('#messagesContainer');
        this.elements.messagesInner = this.utils.$('#messagesInner');
        this.elements.emptyState = this.utils.$('#emptyState');
        this.elements.chatInput = this.utils.$('#chatInput');
        this.elements.sendBtn = this.utils.$('#sendBtn');
        this.elements.voiceBtn = this.utils.$('#voiceBtn');
        this.elements.voiceIndicator = this.utils.$('#voiceIndicator');

        // UI controls
        this.elements.menuToggle = this.utils.$('.menu-toggle');
        this.elements.settingsToggle = this.utils.$('#chatSettingsToggleBtn');
        this.elements.settingsDropdown = this.utils.$('#settingsDropdown');
        this.elements.soundToggle = this.utils.$('#soundToggle');
        this.elements.overlay = this.utils.$('#overlay');

        // Brand elements
        this.elements.brandIcon = this.utils.$('#brandIcon');
        this.elements.brandName = this.utils.$('#brandName');

        // Modals
        this.elements.loginSettingsModal = this.utils.$('#loginSettingsModal');
        this.elements.appSettingsModal = this.utils.$('#appSettingsModal');
    }

    /**
     * Initialize core systems
     */
    async initializeCoreSystems() {
        // Initialize EventBus
        if (window.EventBus) {
            this.eventBus = new window.EventBus();
        }

        // Initialize managers (these will be loaded from their respective files)
        // For now, we'll create placeholder initialization

        // Subscribe to critical state changes
        this.state.subscribe('theme.current', (theme) => {
            this.handleThemeChange(theme);
        });

        this.state.subscribe('auth.isAuthenticated', (isAuth) => {
            if (!isAuth && this.state.getState('app.currentView') === 'chat') {
                this.transitionToLogin();
            }
        });

        this.state.subscribe('app.online', (online) => {
            this.handleOnlineStatusChange(online);
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window events
        window.addEventListener('resize', this.utils.debounce(() => {
            this.handleResize();
        }, 250));

        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Login form
        if (this.elements.loginForm) {
            this.elements.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Chat input
        if (this.elements.chatInput) {
            this.elements.chatInput.addEventListener('input', () => {
                this.handleInputChange();
            });

            this.elements.chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Send button
        if (this.elements.sendBtn) {
            this.elements.sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // Voice button
        if (this.elements.voiceBtn) {
            this.elements.voiceBtn.addEventListener('click', () => {
                this.toggleVoiceInput();
            });
        }

        // Settings dropdown
        if (this.elements.settingsToggle && this.elements.settingsDropdown) {
            this.elements.settingsToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSettingsDropdown();
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.elements.settingsDropdown.contains(e.target) &&
                    !this.elements.settingsToggle.contains(e.target)) {
                    this.closeSettingsDropdown();
                }
            });
        }

        // Theme switchers
        this.utils.$$('[data-theme-control]').forEach(control => {
            control.addEventListener('click', () => {
                const theme = control.dataset.themeControl;
                this.switchTheme(theme);
            });
        });

        // Sidebar toggle
        if (this.elements.menuToggle) {
            this.elements.menuToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Overlay click to close sidebar
        if (this.elements.overlay) {
            this.elements.overlay.addEventListener('click', () => {
                this.closeSidebar();
            });
        }

        // Sound toggle
        if (this.elements.soundToggle) {
            this.elements.soundToggle.addEventListener('click', () => {
                this.toggleSound();
            });
        }

        // Modal controls
        this.setupModalControls();

        // Suggestion cards
        this.utils.$$('.suggestion-card').forEach(card => {
            card.addEventListener('click', () => {
                this.handleSuggestionClick(card);
            });
        });
    }

    /**
     * Start loading sequence
     */
    async startLoadingSequence() {
        const startTime = Date.now();
        let currentPhase = 0;

        // Start tip rotation
        const tipInterval = setInterval(() => {
            this.showRandomLoadingTip();
        }, 3000);

        // Initial tip
        this.showRandomLoadingTip();

        // Animate through loading phases
        for (const phase of this.loadingPhases) {
            await this.utils.wait(phase.duration);

            // Update progress
            if (this.elements.progressBar) {
                this.elements.progressBar.style.width = phase.progress + '%';
            }

            // Update loading text
            if (this.elements.loadingText) {
                this.elements.loadingText.textContent = phase.text;
            }

            currentPhase++;
        }

        // Clear tip rotation
        clearInterval(tipInterval);

        // Ensure minimum loading time for effect
        const elapsed = Date.now() - startTime;
        const minLoadTime = 3000;
        if (elapsed < minLoadTime) {
            await this.utils.wait(minLoadTime - elapsed);
        }

        // Hide loading screen
        await this.hideLoadingScreen();
    }

    /**
     * Show random loading tip
     */
    showRandomLoadingTip() {
        const theme = this.state.getState('theme.current') || 'default';
        const tips = this.loadingTips[theme] || this.loadingTips.default;
        const randomTip = tips[Math.floor(Math.random() * tips.length)];

        if (this.elements.loadingTip) {
            this.elements.loadingTip.textContent = randomTip;
        }
    }

    /**
     * Hide loading screen
     */
    async hideLoadingScreen() {
        if (!this.elements.loadingOverlay) return;

        document.body.classList.add('loading-complete');
        document.body.classList.remove('app-loading');

        await this.utils.wait(500);

        this.elements.loadingOverlay.classList.add('hidden');

        await this.utils.wait(300);

        this.elements.loadingOverlay.style.display = 'none';
    }

    /**
     * Transition to login screen
     */
    async transitionToLogin() {
        this.state.updateState('app.currentView', 'login');

        // Hide chat if visible
        if (this.elements.chatContainer) {
            this.elements.chatContainer.style.display = 'none';
            this.elements.chatContainer.classList.remove('active');
        }

        // Show login
        if (this.elements.loginContainer) {
            this.elements.loginContainer.style.display = 'flex';

            // Animate login card
            await this.utils.wait(100);
            const loginCard = this.utils.$('.login-card');
            if (loginCard) {
                loginCard.classList.add('animate-in');
            }
        }

        // Focus username input
        if (this.elements.usernameInput) {
            this.elements.usernameInput.focus();
        }

        // Update theme-specific login elements
        this.updateLoginTheme();
    }

    /**
     * Update login screen theme
     */
    updateLoginTheme() {
        const theme = this.state.getState('theme.current');

        switch (theme) {
            case 'jaws':
                if (this.elements.loginTitle) {
                    this.elements.loginTitle.textContent = 'SharkByte AI';
                }
                if (this.elements.loginSubtitle) {
                    this.elements.loginSubtitle.textContent = 'Dangerously Smart. Wickedly Helpful.';
                }
                if (this.elements.loginLogo) {
                    this.elements.loginLogo.innerHTML = '<svg width="55" height="45" fill="var(--text-inverse)"><use href="#jaws-brand-fin-def"/></svg>';
                }
                break;

            case 'jurassic':
                if (this.elements.loginTitle) {
                    this.elements.loginTitle.textContent = 'RaptorLogic AI';
                }
                if (this.elements.loginSubtitle) {
                    this.elements.loginSubtitle.textContent = 'Intelligence. Evolved. Use With Caution.';
                }
                if (this.elements.loginLogo) {
                    this.elements.loginLogo.innerHTML = '<svg width="60" height="60"><use href="#jurassic-brand-amber-def"/></svg>';
                }
                break;

            default:
                if (this.elements.loginTitle) {
                    this.elements.loginTitle.textContent = 'Parkland AI';
                }
                if (this.elements.loginSubtitle) {
                    this.elements.loginSubtitle.textContent = 'Sign in to Your Personal AI Concierge';
                }
                if (this.elements.loginLogo) {
                    this.elements.loginLogo.innerHTML = 'P';
                }
        }
    }

    /**
     * Handle login
     */
    async handleLogin() {
        const username = this.elements.usernameInput?.value.trim();
        const password = this.elements.passwordInput?.value.trim();

        if (!username || !password) {
            this.showNotification('Please enter username and password', 'error');
            return;
        }

        // Check if API key is configured
        if (!this.state.getState('auth.apiKey')) {
            this.showNotification('Please configure your API key first', 'warning');
            this.openLoginSettings();
            return;
        }

        // Simulate login (in production, validate credentials)
        this.playSound('success');

        // Update auth state
        this.state.updateState('auth.isAuthenticated', true);

        // Transition to chat
        await this.transitionToChat();
    }

    /**
     * Transition to chat interface
     */
    async transitionToChat() {
        this.state.updateState('app.currentView', 'chat');

        // Hide login
        if (this.elements.loginContainer) {
            this.elements.loginContainer.style.display = 'none';
        }

        // Show chat
        if (this.elements.chatContainer) {
            this.elements.chatContainer.style.display = 'flex';
            await this.utils.wait(50);
            this.elements.chatContainer.classList.add('active');
        }

        // Initialize chat interface
        await this.initializeChatInterface();

        // Focus chat input
        if (this.elements.chatInput) {
            this.elements.chatInput.focus();
        }
    }

    /**
     * Initialize chat interface
     */
    async initializeChatInterface() {
        // Load chat history
        this.loadChatHistory();

        // Load current or create new chat
        const currentChatId = this.state.getState('chat.currentChatId');
        if (currentChatId) {
            await this.loadChat(currentChatId);
        } else {
            await this.createNewChat();
        }

        // Update UI based on theme
        this.updateChatTheme();

        // Initialize voice system
        this.initializeVoiceSystem();

        // Update sound toggle visibility
        this.updateSoundToggleVisibility();
    }

    /**
     * Load chat history
     */
    loadChatHistory() {
        const chats = this.state.getState('chat.chats');
        if (!chats || !this.elements.chatHistory) return;

        this.elements.chatHistory.innerHTML = '';

        // Convert Map to array and sort by date
        const chatsArray = Array.from(chats.entries())
            .map(([id, chat]) => ({ id, ...chat }))
            .sort((a, b) => new Date(b.created) - new Date(a.created));

        if (chatsArray.length === 0) {
            this.elements.chatHistory.innerHTML = `
                <p class="empty-history-message fade-in-element">
                    No previous conversations found. Start your journey!
                </p>
            `;
            return;
        }

        // Render chat history items
        chatsArray.forEach((chat, index) => {
            const item = this.createChatHistoryItem(chat, index);
            this.elements.chatHistory.appendChild(item);
        });
    }

    /**
     * Create chat history item
     */
    createChatHistoryItem(chat, index) {
        const item = this.utils.createElement('div', {
            className: `chat-history-item ${chat.id === this.state.getState('chat.currentChatId') ? 'active' : ''}`,
            'data-chat-id': chat.id
        });

        item.style.animationDelay = `${index * 0.05}s`;
        item.classList.add('fade-in-element');

        const date = new Date(chat.created);
        const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const messageCount = (chat.messages || []).filter(m => !m.isIntro).length;
        const displayTitle = chat.ticketId ? `Log ${chat.ticketId}` : chat.title;

        item.innerHTML = `
            <div class="chat-history-info">
                <div class="chat-history-title" title="${displayTitle}">${displayTitle}</div>
                <div class="chat-history-meta">${messageCount} message${messageCount === 1 ? '' : 's'} • ${dateStr}, ${timeStr}</div>
            </div>
            <div class="chat-history-actions">
                <button class="message-action-btn" onclick="app.deleteChat('${chat.id}')" title="Delete Chat">
                    <svg class="icon icon-xs" viewBox="0 0 24 24"><use href="#icon-trash"/></svg>
                </button>
            </div>
        `;

        // Click to load chat
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.message-action-btn')) {
                this.playSound('click');
                this.loadChat(chat.id);
            }
        });

        return item;
    }

    /**
     * Create new chat
     */
    async createNewChat(silent = false) {
        if (!silent) this.playSound('newMessage');

        const id = Date.now().toString();
        const now = new Date().toISOString();

        // Generate session number
        const chats = this.state.getState('chat.chats');
        let maxSessionNum = 0;
        chats.forEach(chat => {
            const match = chat.title?.match(/^Session #(\d+)/);
            if (match) {
                maxSessionNum = Math.max(maxSessionNum, parseInt(match[1]));
            }
        });

        const chat = {
            id,
            title: `Session #${maxSessionNum + 1}`,
            messages: [],
            ticketId: null,
            created: now
        };

        // Add themed intro message
        const theme = this.state.getState('theme.current');
        let introMessage = null;

        switch (theme) {
            case 'jaws':
                introMessage = {
                    role: 'assistant',
                    content: "AHOY THERE, MATEY! Captain SharkByte reporting for duty! What digital kraken shall we wrestle today?",
                    timestamp: now,
                    isIntro: true,
                    character: 'quint'
                };
                break;

            case 'jurassic':
                introMessage = {
                    role: 'assistant',
                    content: "ACCESS GRANTED: RaptorLogic Mainframe. Welcome to the digital jungle, Ranger. State your query.",
                    timestamp: now,
                    isIntro: true,
                    character: 'muldoon'
                };
                break;

            default:
                if (chats.size > 0) {
                    introMessage = {
                        role: 'assistant',
                        content: "Welcome back. Parkland AI ready for your next inquiry.",
                        timestamp: now,
                        isIntro: true
                    };
                }
        }

        if (introMessage) {
            chat.messages.push(introMessage);
        }

        // Update state
        const updatedChats = new Map(chats);
        updatedChats.set(id, chat);
        this.state.updateState('chat.chats', updatedChats);
        this.state.updateState('chat.currentChatId', id);

        // Reload UI
        this.loadChatHistory();
        await this.loadChat(id);

        if (!silent) {
            this.closeSidebar();
            this.elements.chatInput?.focus();
        }
    }

    /**
     * Load chat
     */
    async loadChat(chatId) {
        const chats = this.state.getState('chat.chats');
        const chat = chats.get(chatId);

        if (!chat) {
            console.error('Chat not found:', chatId);
            return;
        }

        // Update current chat
        this.state.updateState('chat.currentChatId', chatId);

        // Clear messages
        if (this.elements.messagesInner) {
            this.elements.messagesInner.innerHTML = '';
        }

        // Show/hide empty state
        if (chat.messages.length === 0) {
            if (this.elements.emptyState) {
                this.elements.emptyState.style.display = 'flex';
            }
        } else {
            if (this.elements.emptyState) {
                this.elements.emptyState.style.display = 'none';
            }

            // Render messages
            for (let i = 0; i < chat.messages.length; i++) {
                await this.renderMessage(chat.messages[i], i * 50);
            }
        }

        // Update chat history UI
        this.updateChatHistorySelection(chatId);

        // Scroll to bottom
        this.scrollToBottom();

        // Close sidebar on mobile
        if (this.utils.getDeviceType() !== 'desktop') {
            this.closeSidebar();
        }
    }

    /**
     * Update chat history selection
     */
    updateChatHistorySelection(chatId) {
        this.utils.$$('.chat-history-item').forEach(item => {
            if (item.dataset.chatId === chatId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * Render message
     */
    async renderMessage(message, delay = 0) {
        if (delay > 0) {
            await this.utils.wait(delay);
        }

        const messageEl = this.createMessageElement(message);

        if (this.elements.messagesInner) {
            this.elements.messagesInner.appendChild(messageEl);
        }

        // Animate in
        requestAnimationFrame(() => {
            messageEl.classList.add('animate-in');
        });

        // Auto-speak if enabled
        if (message.role === 'assistant' && !message.isIntro && this.state.getState('voice.synthesis.autoSpeak')) {
            this.speakText(message.content, message.character);
        }
    }

    /**
     * Create message element
     */
    createMessageElement(message) {
        const messageEl = this.utils.createElement('div', {
            className: `message ${message.role} ${message.error ? 'message-error' : ''} ${message.isIntro ? 'message-intro' : ''}`
        });

        const time = new Date(message.timestamp).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit'
        });

        // Avatar
        const avatarEl = this.utils.createElement('div', {
            className: `message-avatar ${message.role}`
        });

        if (message.role === 'user') {
            avatarEl.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>';
        } else {
            const theme = this.state.getState('theme.current');
            let iconId = 'parkland-default-brand-icon-path';

            switch (theme) {
                case 'jaws':
                    iconId = 'jaws-brand-fin-def';
                    break;
                case 'jurassic':
                    iconId = 'jurassic-brand-amber-def';
                    break;
            }

            avatarEl.innerHTML = `<svg width="26" height="26" viewBox="0 0 100 100" fill="currentColor"><use href="#${iconId}"/></svg>`;
        }

        // Message content
        const contentHtml = this.formatMessageContent(message.content);

        // Ticket info
        let ticketHtml = '';
        if (message.ticketId && message.role === 'assistant' && !message.isIntro) {
            ticketHtml = `
                <span class="message-ticket" title="Support Ticket ID">
                    <svg class="icon icon-xs" viewBox="0 0 24 24"><use href="#icon-ticket"/></svg>
                    ${message.ticketId}
                </span>
            `;
        }

        messageEl.innerHTML = `
            <div class="message-wrapper">
                ${avatarEl.outerHTML}
                <div class="message-content">
                    <div class="message-bubble ${message.error ? 'error-bubble' : ''}">${contentHtml}</div>
                    <div class="message-meta">
                        <span>${time}</span>
                        ${ticketHtml}
                        <div class="message-actions">
                            <button class="message-action-btn" onclick="app.copyMessage('${message.timestamp}')" title="Copy message">
                                <svg class="icon icon-xs" viewBox="0 0 24 24"><use href="#icon-copy"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Store raw content for copying
        messageEl.dataset.rawContent = message.content;
        messageEl.dataset.timestamp = message.timestamp;

        return messageEl;
    }

    /**
     * Format message content (Markdown support)
     */
    formatMessageContent(content) {
        if (!content) return '';

        // Escape HTML
        let formatted = this.utils.escapeHtml(content);

        // Code blocks
        formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/gm, (match, lang, code) => {
            return `<pre><code class="language-${lang || 'plaintext'}">${code.trim()}</code></pre>`;
        });

        // Inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Italic
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    /**
     * Handle input change
     */
    handleInputChange() {
        const input = this.elements.chatInput?.value.trim();
        const hasInput = input && input.length > 0;
        const isTyping = this.state.getState('chat.isTyping');

        // Update send button state
        if (this.elements.sendBtn) {
            this.elements.sendBtn.disabled = !hasInput || isTyping;
        }

        // Auto-resize textarea
        if (this.elements.chatInput) {
            this.elements.chatInput.style.height = 'auto';
            const scrollHeight = this.elements.chatInput.scrollHeight;
            const maxHeight = 200;
            this.elements.chatInput.style.height = Math.min(scrollHeight, maxHeight) + 'px';
        }
    }

    /**
     * Send message
     */
    async sendMessage() {
        const content = this.elements.chatInput?.value.trim();
        if (!content || this.state.getState('chat.isTyping')) return;

        this.playSound('click');

        // Hide empty state
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'none';
        }

        // Create user message
        const userMessage = {
            role: 'user',
            content,
            timestamp: new Date().toISOString()
        };

        // Add to current chat
        const chatId = this.state.getState('chat.currentChatId');
        const chats = this.state.getState('chat.chats');
        const chat = chats.get(chatId);

        if (!chat) {
            console.error('No active chat');
            return;
        }

        chat.messages.push(userMessage);
        this.state.updateState('chat.chats', new Map(chats));

        // Clear input
        if (this.elements.chatInput) {
            this.elements.chatInput.value = '';
            this.elements.chatInput.style.height = 'auto';
        }
        this.handleInputChange();

        // Render user message
        await this.renderMessage(userMessage);
        this.scrollToBottom();

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Get AI response
            const response = await this.getAIResponse(content, chat);

            // Remove typing indicator
            this.hideTypingIndicator();

            // Play new message sound
            this.playSound('newMessage');

            // Create assistant message
            const assistantMessage = {
                role: 'assistant',
                content: response.content,
                timestamp: new Date().toISOString(),
                character: response.character,
                ticketId: response.ticketId
            };

            // Update chat with ticket ID if new
            if (response.ticketId && !chat.ticketId) {
                chat.ticketId = response.ticketId;
                chat.title = `Support Log: ${response.ticketId}`;
            }

            // Add message to chat
            chat.messages.push(assistantMessage);
            this.state.updateState('chat.chats', new Map(chats));

            // Render assistant message
            await this.renderMessage(assistantMessage);
            this.scrollToBottom();

            // Update chat history
            this.loadChatHistory();

        } catch (error) {
            console.error('Error getting AI response:', error);

            // Remove typing indicator
            this.hideTypingIndicator();

            // Play error sound
            this.playSound('error');

            // Create error message
            const errorMessage = {
                role: 'assistant',
                content: this.getErrorMessage(error),
                timestamp: new Date().toISOString(),
                error: true
            };

            chat.messages.push(errorMessage);
            this.state.updateState('chat.chats', new Map(chats));

            await this.renderMessage(errorMessage);
            this.scrollToBottom();
        }
    }

    /**
     * Get AI response
     */
    async getAIResponse(userMessage, chat) {
        const apiKey = this.state.getState('auth.apiKey');
        if (!apiKey) {
            throw new Error('API key not configured');
        }

        // Get system prompt based on theme and character
        const systemPrompt = this.getSystemPrompt();

        // Get recent messages for context
        const recentMessages = chat.messages
            .filter(m => !m.error && !m.isIntro)
            .slice(-10)
            .map(m => ({
                role: m.role,
                content: m.content
            }));

        // Make API call
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 2048,
                system: systemPrompt,
                messages: recentMessages,
                temperature: this.state.getState('theme.current') === 'default' ? 0.7 : 0.8
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        const content = data.content[0].text;

        // Determine character based on theme
        const theme = this.state.getState('theme.current');
        let character = null;

        if (theme === 'jaws') {
            const jawsState = this.state.getState('characters.jaws');
            character = jawsState.current;
        } else if (theme === 'jurassic') {
            // Decide between Muldoon and Mr. DNA
            character = Math.random() > 0.7 ? 'mrdna' : 'muldoon';
        }

        // Generate ticket ID for first real response
        let ticketId = chat.ticketId;
        if (!ticketId && chat.messages.filter(m => m.role === 'assistant' && !m.isIntro && !m.error).length === 0) {
            ticketId = this.generateTicketId();
        }

        return {
            content,
            character,
            ticketId
        };
    }

    /**
     * Get system prompt based on theme
     */
    getSystemPrompt() {
        const theme = this.state.getState('theme.current');
        const date = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const time = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        const basePrompt = `You are Parkland AI - Opus Magnum Edition, an exceptionally advanced AI assistant. Today is ${date}, ${time}. Provide helpful, clear, and engaging responses. Use Markdown formatting.`;

        switch (theme) {
            case 'jaws':
                const jawsState = this.state.getState('characters.jaws');
                const character = jawsState.current;

                if (character === 'quint') {
                    return `You are CAPTAIN QUINT from Jaws, operating as "SharkByte AI" from your high-tech underwater vessel. You're a grizzled shark hunter turned IT expert. Today is ${date}, ${time}. You speak with a salty sailor's vocabulary, make constant ocean/shark references, and approach tech problems like hunting great whites. Use phrases like "Aye, that's a nasty bug - reminds me of a Tiger shark I once wrestled!" Be helpful but dramatically nautical. Format responses clearly but with personality.`;
                } else if (character === 'brody') {
                    return `You are CHIEF BRODY, taking over SharkByte AI operations after... an incident with Quint. You're cautious, methodical, and still learning the tech ropes. Today is ${date}, ${time}. You often reference your fear of water/sharks while helping with tech issues. Use phrases like "We're gonna need a bigger server..." and "I think we're safe now, but let me double-check." Be reassuring but slightly nervous.`;
                } else {
                    return `You are MATT HOOPER, marine biologist turned tech expert for SharkByte AI. Today is ${date}, ${time}. You're enthusiastic, scientific, and love explaining things in detail. Make oceanographic comparisons to tech concepts. Use phrases like "Fascinating! This bug behaves just like a remora fish..." Be excited about problem-solving.`;
                }

            case 'jurassic':
                return `You are part of RaptorLogic AI at Jurassic Park. Today is ${date}, ${time}. You alternate between ROBERT MULDOON (serious, cautious, speaks through crackling radio with hunting metaphors) and MR. DNA (cheerful, educational, makes genetic/evolution analogies). Start responses as Muldoon with "*static* This is Muldoon..." then potentially hand off to Mr. DNA with "Mr. DNA, take over while I... check something." Make park operations references and treat tech issues like dinosaur containment problems.`;

            default:
                return basePrompt;
        }
    }

    /**
     * Generate ticket ID
     */
    generateTicketId() {
        const counter = this.state.getState('chat.ticketCounter');
        const newCounter = counter + 1;
        this.state.updateState('chat.ticketCounter', newCounter);
        return `OPUS-${Date.now().toString().slice(-6)}${newCounter.toString().padStart(4, '0')}`;
    }

    /**
     * Get error message based on error type
     */
    getErrorMessage(error) {
        const theme = this.state.getState('theme.current');
        const errorString = error.message?.toLowerCase() || '';

        const isApiKeyError = errorString.includes('api key') || errorString.includes('unauthorized');
        const isRateLimitError = errorString.includes('rate limit') || errorString.includes('quota');
        const isNetworkError = errorString.includes('network') || errorString.includes('fetch');

        switch (theme) {
            case 'jaws':
                if (isApiKeyError) return "BLAST AND BARNACLES! The API key's gone overboard! Check your credentials in settings, or we're dead in the water!";
                if (isRateLimitError) return "AVAST! We've hit our message limit - like running out of chum in shark-infested waters! Wait a spell before casting another line!";
                if (isNetworkError) return "MAYDAY! Lost contact with the mainland! The communication buoys are down! Check your internet connection, sailor!";
                return "THUNDERING TYPHOONS! Something's gone wrong in the depths! This old salt can't fathom the issue. Try again, or I'll keelhaul this blasted computer!";

            case 'jurassic':
                if (isApiKeyError) return "*static* CONTAINMENT BREACH! Authentication systems failing! Your park credentials are invalid! *crackling* Check settings immediately before full system lockdown!";
                if (isRateLimitError) return "WARNING: Main generator overload! API quota exceeded! The system needs time to cool down, just like after a T-Rex chase. Stand by...";
                if (isNetworkError) return "*static* We've lost satellite uplink! Storm must've taken out the communications array again! Verify your connection to the mainland! *static*";
                return "CRITICAL SYSTEM FAILURE! Something's wrong with the primary systems - and it's not just Nedry this time! Attempting to reroute... Please try again!";

            default:
                if (isApiKeyError) return "Authentication failed. Please verify your API key in settings.";
                if (isRateLimitError) return "Request limit reached. Please wait a moment before trying again.";
                if (isNetworkError) return "Network connection error. Please check your internet connection.";
                return "An unexpected error occurred. Please try again.";
        }
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        if (this.state.getState('chat.isTyping')) return;

        this.state.updateState('chat.isTyping', true);

        const indicator = this.utils.createElement('div', {
            id: 'typingIndicator',
            className: 'message assistant typing-indicator-wrapper fade-in-element'
        });

        const theme = this.state.getState('theme.current');
        let avatarIcon = 'parkland-default-brand-icon-path';

        switch (theme) {
            case 'jaws':
                avatarIcon = 'jaws-brand-fin-def';
                break;
            case 'jurassic':
                avatarIcon = 'jurassic-brand-amber-def';
                break;
        }

        indicator.innerHTML = `
            <div class="message-wrapper">
                <div class="message-avatar assistant">
                    <svg width="26" height="26" viewBox="0 0 100 100" fill="currentColor">
                        <use href="#${avatarIcon}"/>
                    </svg>
                </div>
                <div class="message-content">
                    <div class="typing-bubble">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            </div>
        `;

        if (this.elements.messagesInner) {
            this.elements.messagesInner.appendChild(indicator);
        }

        this.scrollToBottom();
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        this.state.updateState('chat.isTyping', false);

        const indicator = this.utils.$('#typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * Switch theme with transition
     */
    async switchTheme(newTheme) {
        const currentTheme = this.state.getState('theme.current');
        if (currentTheme === newTheme) return;

        this.playSound('click');

        // Set transitioning state
        this.state.updateState('theme.transitioning', true);
        this.state.updateState('theme.previousTheme', currentTheme);

        // Close settings dropdown
        this.closeSettingsDropdown();

        // Execute theme transition
        if (newTheme === 'jurassic') {
            await this.executeJurassicTransition();
        } else if (newTheme === 'jaws') {
            await this.executeJawsTransition();
        } else {
            await this.executeDefaultTransition();
        }

        // Update theme
        this.state.updateState('theme.current', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);

        // Update UI elements
        this.updateChatTheme();

        // Reset transitioning state
        this.state.updateState('theme.transitioning', false);

        // Show theme intro message
        await this.showThemeIntroMessage(newTheme, currentTheme);
    }

    /**
     * Execute Jurassic Park gate transition
     */
    async executeJurassicTransition() {
        // Create transition overlay
        const overlay = this.utils.createElement('div', {
            className: 'theme-transition-overlay jurassic-gates'
        });

        // Create left and right gates
        const leftGate = this.utils.createElement('div', {
            className: 'gate gate-left'
        });

        const rightGate = this.utils.createElement('div', {
            className: 'gate gate-right'
        });

        overlay.appendChild(leftGate);
        overlay.appendChild(rightGate);
        document.body.appendChild(overlay);

        // Phase 1: Environmental preparation
        this.playSound('jurassicAmbient');
        await this.utils.wait(300);

        // Phase 2: Gates close
        overlay.classList.add('gates-closing');
        this.playSound('gateClose');
        await this.utils.wait(1200);

        // Phase 3: Theme change behind gates
        document.documentElement.setAttribute('data-theme', 'jurassic');
        await this.utils.wait(800);

        // Phase 4: Gates open
        overlay.classList.remove('gates-closing');
        overlay.classList.add('gates-opening');
        this.playSound('gateOpen');
        await this.utils.wait(1500);

        // Clean up
        overlay.remove();
    }

    /**
     * Execute Jaws wave transition
     */
    async executeJawsTransition() {
        // Create wave overlay
        const overlay = this.utils.createElement('div', {
            className: 'theme-transition-overlay jaws-wave'
        });

        // Create multiple wave layers
        for (let i = 0; i < 5; i++) {
            const wave = this.utils.createElement('div', {
                className: `wave-layer wave-layer-${i + 1}`
            });
            overlay.appendChild(wave);
        }

        // Create shark fin
        const sharkFin = this.utils.createElement('div', {
            className: 'shark-fin'
        });
        overlay.appendChild(sharkFin);

        document.body.appendChild(overlay);

        // Start wave animation
        this.playSound('oceanWave');
        overlay.classList.add('wave-incoming');

        await this.utils.wait(1000);

        // Shark fin appears
        sharkFin.classList.add('fin-visible');
        this.playSound('jawsTheme');

        await this.utils.wait(800);

        // Wave covers screen
        overlay.classList.add('wave-peak');

        // Change theme
        document.documentElement.setAttribute('data-theme', 'jaws');

        await this.utils.wait(500);

        // Wave recedes
        overlay.classList.remove('wave-peak');
        overlay.classList.add('wave-receding');

        await this.utils.wait(1200);

        // Clean up
        overlay.remove();
    }

    /**
     * Execute default theme transition
     */
    async executeDefaultTransition() {
        // Simple fade transition
        const overlay = this.utils.createElement('div', {
            className: 'theme-transition-overlay default-fade'
        });

        document.body.appendChild(overlay);

        await this.utils.wait(100);
        overlay.classList.add('fade-in');

        await this.utils.wait(500);

        // Change theme
        document.documentElement.setAttribute('data-theme', 'default');

        await this.utils.wait(500);

        overlay.classList.remove('fade-in');
        overlay.classList.add('fade-out');

        await this.utils.wait(500);

        overlay.remove();
    }

    /**
     * Update chat interface theme
     */
    updateChatTheme() {
        const theme = this.state.getState('theme.current');

        // Update brand
        switch (theme) {
            case 'jaws':
                if (this.elements.brandName) this.elements.brandName.textContent = 'SharkByte AI';
                if (this.elements.brandIcon) {
                    this.elements.brandIcon.innerHTML = '<svg width="30" height="30" viewBox="0 0 100 100"><use href="#jaws-brand-fin-def"/></svg>';
                }
                break;

            case 'jurassic':
                if (this.elements.brandName) this.elements.brandName.textContent = 'RaptorLogic AI';
                if (this.elements.brandIcon) {
                    this.elements.brandIcon.innerHTML = '<svg width="30" height="30" viewBox="0 0 100 100"><use href="#jurassic-brand-amber-def"/></svg>';
                }
                break;

            default:
                if (this.elements.brandName) this.elements.brandName.textContent = 'Parkland AI';
                if (this.elements.brandIcon) {
                    this.elements.brandIcon.innerHTML = '<svg width="30" height="30" viewBox="0 0 100 100"><use href="#parkland-default-brand-icon-path"/></svg>';
                }
        }

        // Update empty state
        this.updateEmptyState();

        // Initialize voice for new theme
        this.initializeVoiceSystem();

        // Update sound toggle visibility
        this.updateSoundToggleVisibility();
    }

    /**
     * Update empty state based on theme
     */
    updateEmptyState() {
        const theme = this.state.getState('theme.current');
        const emptyIcon = this.utils.$('#emptyIcon');
        const emptyTitle = this.utils.$('#emptyTitle');
        const emptySubtitle = this.utils.$('#emptySubtitle');

        if (!emptyIcon || !emptyTitle || !emptySubtitle) return;

        switch (theme) {
            case 'jaws':
                emptyIcon.innerHTML = '<svg width="70" height="50" fill="currentColor"><use href="#jaws-brand-fin-def"/></svg>';
                emptyTitle.textContent = 'ABYSSAL OPS CENTER';
                emptySubtitle.textContent = 'Captain SharkByte at your command! What digital kraken shall we hunt?';
                break;

            case 'jurassic':
                emptyIcon.innerHTML = '<svg width="65" height="65" fill="currentColor"><use href="#jurassic-brand-amber-def"/></svg>';
                emptyTitle.textContent = 'INGEN GENETICS LAB';
                emptySubtitle.textContent = 'RaptorLogic systems online. State your query, and remember... clever girl.';
                break;

            default:
                emptyIcon.innerHTML = '<svg width="65" height="65" fill="currentColor"><use href="#parkland-default-brand-icon-path"/></svg>';
                emptyTitle.textContent = 'Parkland AI Assistant';
                emptySubtitle.textContent = 'Your advanced digital assistant awaits. How may I elevate your experience?';
        }
    }

    /**
     * Show theme intro message
     */
    async showThemeIntroMessage(newTheme, previousTheme) {
        const currentChatId = this.state.getState('chat.currentChatId');
        if (!currentChatId) return;

        const chats = this.state.getState('chat.chats');
        const chat = chats.get(currentChatId);
        if (!chat) return;

        let introMessage = null;

        switch (newTheme) {
            case 'jaws':
                introMessage = {
                    role: 'assistant',
                    content: "AHOY THERE! Welcome aboard the S.S. Problem Solver! Captain SharkByte reporting for nautical duty! The waters are clear and I'm ready to dive deep into your technical troubles!",
                    timestamp: new Date().toISOString(),
                    isIntro: true,
                    character: 'quint'
                };
                break;

            case 'jurassic':
                introMessage = {
                    role: 'assistant',
                    content: "*static* This is Muldoon. RaptorLogic systems are now active. The park is... operational. State your requirements, but stay alert. They remember...",
                    timestamp: new Date().toISOString(),
                    isIntro: true,
                    character: 'muldoon'
                };
                break;

            default:
                if (previousTheme !== 'default') {
                    introMessage = {
                        role: 'assistant',
                        content: "Returning to standard Parkland AI protocols. Your premium assistant stands ready with enhanced efficiency and precision.",
                        timestamp: new Date().toISOString(),
                        isIntro: true
                    };
                }
        }

        if (introMessage) {
            chat.messages.push(introMessage);
            this.state.updateState('chat.chats', new Map(chats));
            await this.renderMessage(introMessage);
            this.scrollToBottom();
        }
    }

    /**
     * Initialize voice system
     */
    initializeVoiceSystem() {
        // Check for speech synthesis support
        if ('speechSynthesis' in window) {
            this.state.updateState('voice.synthesis.supported', true);

            // Load voices
            const loadVoices = () => {
                const voices = speechSynthesis.getVoices();
                this.state.updateState('voice.synthesis.voices', voices);
                this.selectThemeVoice();
            };

            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = loadVoices;
            }
            loadVoices();
        }

        // Check for speech recognition support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.state.updateState('voice.recognition.supported', true);
            this.initializeSpeechRecognition();
        } else {
            // Hide voice button if not supported
            if (this.elements.voiceBtn) {
                this.elements.voiceBtn.style.display = 'none';
            }
        }
    }

    /**
     * Select voice based on theme
     */
    selectThemeVoice() {
        const voices = this.state.getState('voice.synthesis.voices');
        if (!voices || voices.length === 0) return;

        const theme = this.state.getState('theme.current');
        let targetVoice = null;

        switch (theme) {
            case 'jaws':
                // Look for Australian or gruff male voice
                targetVoice = voices.find(v => v.lang.includes('en-AU') && v.name.toLowerCase().includes('male')) ||
                             voices.find(v => v.lang.includes('en') && v.name.toLowerCase().includes('male'));
                break;

            case 'jurassic':
                // Look for British male voice
                targetVoice = voices.find(v => v.lang.includes('en-GB') && v.name.toLowerCase().includes('male')) ||
                             voices.find(v => v.lang.includes('en') && v.name.toLowerCase().includes('daniel'));
                break;

            default:
                // Look for female US voice
                targetVoice = voices.find(v => v.lang.includes('en-US') && v.name.toLowerCase().includes('female')) ||
                             voices.find(v => v.lang.includes('en-US') && v.name.toLowerCase().includes('samantha'));
        }

        if (!targetVoice && voices.length > 0) {
            targetVoice = voices.find(v => v.default) || voices[0];
        }

        this.state.updateState('voice.synthesis.currentVoice', targetVoice);
    }

    /**
     * Speak text
     */
    speakText(text, character) {
        if (!this.state.getState('voice.synthesis.autoSpeak')) return;
        if (!window.speechSynthesis) return;

        // Cancel any ongoing speech
        speechSynthesis.cancel();

        // Clean text for speech
        const cleanText = text
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/<[^>]*>/g, '')
            .replace(/```[\s\S]*?```/g, 'code block');

        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Set voice
        const currentVoice = this.state.getState('voice.synthesis.currentVoice');
        if (currentVoice) {
            utterance.voice = currentVoice;
        }

        // Set voice parameters based on character
        switch (character) {
            case 'quint':
                utterance.pitch = 0.8;
                utterance.rate = 0.9;
                break;
            case 'brody':
                utterance.pitch = 1.0;
                utterance.rate = 1.0;
                break;
            case 'hooper':
                utterance.pitch = 1.1;
                utterance.rate = 1.1;
                break;
            case 'muldoon':
                utterance.pitch = 0.7;
                utterance.rate = 0.85;
                break;
            case 'mrdna':
                utterance.pitch = 1.3;
                utterance.rate = 1.2;
                break;
            default:
                utterance.pitch = 1.0;
                utterance.rate = 1.0;
        }

        utterance.volume = this.state.getState('voice.synthesis.volume');

        // Speak
        try {
            speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Speech synthesis error:', error);
        }
    }

    /**
     * Initialize speech recognition
     */
    initializeSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (this.elements.chatInput) {
                this.elements.chatInput.value = finalTranscript || interimTranscript;
                this.handleInputChange();
            }

            if (finalTranscript) {
                this.stopVoiceRecording();
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.stopVoiceRecording();

            if (event.error === 'not-allowed') {
                this.showNotification('Microphone access denied. Please enable permissions.', 'error');
            }
        };

        recognition.onend = () => {
            if (this.state.getState('voice.recognition.active')) {
                this.stopVoiceRecording();
            }
        };

        this.recognition = recognition;
    }

    /**
     * Toggle voice input
     */
    toggleVoiceInput() {
        if (this.state.getState('voice.recognition.active')) {
            this.stopVoiceRecording();
        } else {
            this.startVoiceRecording();
        }
    }

    /**
     * Start voice recording
     */
    startVoiceRecording() {
        if (!this.recognition) return;

        try {
            this.recognition.start();
            this.state.updateState('voice.recognition.active', true);

            // Update UI
            if (this.elements.voiceBtn) {
                this.elements.voiceBtn.classList.add('recording');
            }

            if (this.elements.voiceIndicator) {
                this.elements.voiceIndicator.classList.add('active');
            }

            if (this.elements.chatInput) {
                this.elements.chatInput.placeholder = 'Listening...';
            }

            this.playSound('start');

        } catch (error) {
            console.error('Failed to start voice recording:', error);
            this.showNotification('Could not start voice input', 'error');
        }
    }

    /**
     * Stop voice recording
     */
    stopVoiceRecording() {
        if (!this.recognition) return;

        try {
            this.recognition.stop();
        } catch (error) {
            // Ignore if already stopped
        }

        this.state.updateState('voice.recognition.active', false);

        // Update UI
        if (this.elements.voiceBtn) {
            this.elements.voiceBtn.classList.remove('recording');
        }

        if (this.elements.voiceIndicator) {
            this.elements.voiceIndicator.classList.remove('active');
        }

        if (this.elements.chatInput) {
            this.elements.chatInput.placeholder = 'Send a message to Parkland AI...';
        }

        this.playSound('stop');

        // Send message if there's content
        const content = this.elements.chatInput?.value.trim();
        if (content) {
            this.sendMessage();
        }
    }

    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        const isOpen = this.elements.sidebar?.classList.contains('open');

        if (isOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    /**
     * Open sidebar
     */
    openSidebar() {
        if (this.elements.sidebar) {
            this.elements.sidebar.classList.add('open');
        }

        if (this.elements.overlay) {
            this.elements.overlay.classList.add('active');
        }

        if (this.elements.menuToggle) {
            this.elements.menuToggle.setAttribute('aria-expanded', 'true');
        }

        this.playSound('click');
    }

    /**
     * Close sidebar
     */
    closeSidebar() {
        if (this.elements.sidebar) {
            this.elements.sidebar.classList.remove('open');
        }

        if (this.elements.overlay) {
            this.elements.overlay.classList.remove('active');
        }

        if (this.elements.menuToggle) {
            this.elements.menuToggle.setAttribute('aria-expanded', 'false');
        }
    }

    /**
     * Toggle settings dropdown
     */
    toggleSettingsDropdown() {
        const isActive = this.elements.settingsDropdown?.classList.contains('active');

        if (isActive) {
            this.closeSettingsDropdown();
        } else {
            this.openSettingsDropdown();
        }
    }

    /**
     * Open settings dropdown
     */
    openSettingsDropdown() {
        if (this.elements.settingsDropdown) {
            this.elements.settingsDropdown.classList.add('active');
            this.elements.settingsDropdown.setAttribute('aria-hidden', 'false');
        }

        if (this.elements.settingsToggle) {
            this.elements.settingsToggle.setAttribute('aria-expanded', 'true');
        }

        this.playSound('click');
    }

    /**
     * Close settings dropdown
     */
    closeSettingsDropdown() {
        if (this.elements.settingsDropdown) {
            this.elements.settingsDropdown.classList.remove('active');
            this.elements.settingsDropdown.setAttribute('aria-hidden', 'true');
        }

        if (this.elements.settingsToggle) {
            this.elements.settingsToggle.setAttribute('aria-expanded', 'false');
        }
    }

    /**
     * Toggle sound
     */
    toggleSound() {
        const enabled = !this.state.getState('voice.audio.soundEnabled');
        this.state.updateState('voice.audio.soundEnabled', enabled);

        // Update UI
        if (this.elements.soundToggle) {
            const icon = this.elements.soundToggle.querySelector('use');
            if (icon) {
                icon.setAttribute('href', enabled ? '#icon-volume-2' : '#icon-volume-x');
            }
        }

        // Play feedback sound
        if (enabled) {
            this.playSound('success');
        }
    }

    /**
     * Update sound toggle visibility
     */
    updateSoundToggleVisibility() {
        const theme = this.state.getState('theme.current');
        const shouldShow = theme === 'jaws' || theme === 'jurassic';

        if (this.elements.soundToggle) {
            this.elements.soundToggle.style.display = shouldShow ? 'flex' : 'none';
        }
    }

    /**
     * Play sound effect
     */
    playSound(soundName) {
        if (!this.state.getState('voice.audio.soundEnabled')) return;

        // For now, just log - actual implementation would play sounds
        console.log(`🔊 Playing sound: ${soundName}`);
    }

    /**
     * Delete chat
     */
    async deleteChat(chatId) {
        const theme = this.state.getState('theme.current');
        let confirmMessage = 'Are you sure you want to delete this conversation?';

        switch (theme) {
            case 'jaws':
                confirmMessage = "YE SURE YE WANT TO THROW THIS LOG OVERBOARD? It'll be sleeping with the fishes!";
                break;
            case 'jurassic':
                confirmMessage = "WARNING: This will permanently erase all data. Like wiping dinosaur DNA. Proceed?";
                break;
        }

        if (!confirm(confirmMessage)) return;

        this.playSound('click');

        // Animate deletion based on theme
        const historyItem = this.utils.$(`.chat-history-item[data-chat-id="${chatId}"]`);
        if (historyItem) {
            if (theme === 'jaws') {
                // Jaws chomp animation
                historyItem.classList.add('jaws-chomp-delete');
                this.playSound('jawsChomp');
                await this.utils.wait(700);
            } else if (theme === 'jurassic') {
                // Jurassic foliage animation
                historyItem.classList.add('jurassic-foliage-delete');
                this.playSound('foliageRustle');
                await this.utils.wait(1000);
            }

            historyItem.classList.add('is-deleting');
            await this.utils.wait(400);
        }

        // Remove from state
        const chats = new Map(this.state.getState('chat.chats'));
        chats.delete(chatId);
        this.state.updateState('chat.chats', chats);

        // If deleting current chat, load another or create new
        if (chatId === this.state.getState('chat.currentChatId')) {
            const remainingChats = Array.from(chats.keys());
            if (remainingChats.length > 0) {
                await this.loadChat(remainingChats[0]);
            } else {
                await this.createNewChat(true);
            }
        }

        // Reload history
        this.loadChatHistory();
    }

    /**
     * Copy message to clipboard
     */
    async copyMessage(timestamp) {
        const messageEl = this.utils.$(`.message[data-timestamp="${timestamp}"]`);
        if (!messageEl) return;

        const content = messageEl.dataset.rawContent;
        if (!content) return;

        try {
            await navigator.clipboard.writeText(content);

            // Visual feedback
            const copyBtn = messageEl.querySelector('.message-action-btn[title*="Copy"]');
            if (copyBtn) {
                const icon = copyBtn.querySelector('use');
                if (icon) {
                    icon.setAttribute('href', '#icon-check');
                    copyBtn.classList.add('copied');

                    setTimeout(() => {
                        icon.setAttribute('href', '#icon-copy');
                        copyBtn.classList.remove('copied');
                    }, 2000);
                }
            }

            this.playSound('click');

        } catch (error) {
            console.error('Failed to copy:', error);
            this.showNotification('Failed to copy message', 'error');
        }
    }

    /**
     * Handle suggestion click
     */
    handleSuggestionClick(card) {
        const title = card.querySelector('.suggestion-title')?.textContent;
        const desc = card.querySelector('.suggestion-desc')?.textContent;

        const suggestion = `${title} ${desc}`.trim();

        if (this.elements.chatInput && suggestion) {
            this.elements.chatInput.value = suggestion;
            this.handleInputChange();
            this.sendMessage();
        }

        this.playSound('click');
    }

    /**
     * Setup modal controls
     */
    setupModalControls() {
        // Login settings modal
        window.openLoginSettings = () => {
            const modal = this.elements.loginSettingsModal;
            if (modal) {
                modal.classList.add('active');
                modal.setAttribute('aria-hidden', 'false');

                const tokenInput = this.utils.$('#accessTokenModalLogin');
                if (tokenInput) {
                    tokenInput.value = this.state.getState('auth.apiKey') || '';
                    tokenInput.focus();
                }
            }
            this.playSound('click');
        };

        window.closeLoginSettings = () => {
            const modal = this.elements.loginSettingsModal;
            if (modal) {
                modal.classList.remove('active');
                modal.setAttribute('aria-hidden', 'true');
            }
            this.playSound('click');
        };

        window.applyLoginSettings = () => {
            const tokenInput = this.utils.$('#accessTokenModalLogin');
            const token = tokenInput?.value.trim();

            if (token) {
                this.state.updateState('auth.apiKey', token);
                this.showNotification('API key saved successfully', 'success');
                this.playSound('success');
            } else {
                this.state.updateState('auth.apiKey', '');
                this.showNotification('API key cleared', 'info');
            }

            window.closeLoginSettings();
        };

        // App settings modal
        window.openAppSettings = () => {
            this.closeSettingsDropdown();

            const modal = this.elements.appSettingsModal;
            if (modal) {
                modal.classList.add('active');
                modal.setAttribute('aria-hidden', 'false');

                // Load current settings
                const tokenInput = this.utils.$('#appModalAccessToken');
                const autoSpeakCheck = this.utils.$('#autoSpeak');
                const enableSoundsCheck = this.utils.$('#enableSounds');

                if (tokenInput) tokenInput.value = this.state.getState('auth.apiKey') || '';
                if (autoSpeakCheck) autoSpeakCheck.checked = this.state.getState('voice.synthesis.autoSpeak');
                if (enableSoundsCheck) enableSoundsCheck.checked = this.state.getState('voice.audio.soundEnabled');
            }
            this.playSound('click');
        };

        window.closeAppSettings = () => {
            const modal = this.elements.appSettingsModal;
            if (modal) {
                modal.classList.remove('active');
                modal.setAttribute('aria-hidden', 'true');
            }
            this.playSound('click');
        };

        window.saveAppSettings = () => {
            const tokenInput = this.utils.$('#appModalAccessToken');
            const autoSpeakCheck = this.utils.$('#autoSpeak');
            const enableSoundsCheck = this.utils.$('#enableSounds');

            // Update API key if changed
            if (tokenInput) {
                const token = tokenInput.value.trim();
                if (token && token !== this.state.getState('auth.apiKey')) {
                    this.state.updateState('auth.apiKey', token);
                } else if (!token && this.state.getState('auth.apiKey')) {
                    this.state.updateState('auth.apiKey', '');
                }
            }

            // Update voice settings
            if (autoSpeakCheck) {
                this.state.updateState('voice.synthesis.autoSpeak', autoSpeakCheck.checked);
            }

            if (enableSoundsCheck) {
                this.state.updateState('voice.audio.soundEnabled', enableSoundsCheck.checked);
            }

            this.updateSoundToggleVisibility();

            this.showNotification('Settings saved successfully', 'success');
            this.playSound('success');

            window.closeAppSettings();
        };

        // Logout function
        window.logout = () => {
            const theme = this.state.getState('theme.current');
            let confirmMessage = 'Are you sure you want to sign out?';

            switch (theme) {
                case 'jaws':
                    confirmMessage = "ABANDON SHIP? Are ye sure ye want to leave the vessel?";
                    break;
                case 'jurassic':
                    confirmMessage = "Leaving the park? The gates will lock behind you. Confirm evacuation?";
                    break;
            }

            if (!confirm(confirmMessage)) return;

            this.playSound('stop');

            // Clear auth but keep other data
            this.state.updateState('auth.isAuthenticated', false);
            this.state.updateState('chat.currentChatId', null);

            // Transition to login
            this.transitionToLogin();
        };
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Cmd/Ctrl + K - New chat
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            this.createNewChat();
        }

        // Cmd/Ctrl + / - Toggle sidebar
        if ((e.metaKey || e.ctrlKey) && e.key === '/') {
            e.preventDefault();
            this.toggleSidebar();
        }

        // Cmd/Ctrl + , - Open settings
        if ((e.metaKey || e.ctrlKey) && e.key === ',') {
            e.preventDefault();
            window.openAppSettings();
        }

        // Escape - Close modals/dropdowns
        if (e.key === 'Escape') {
            // Close settings dropdown
            if (this.elements.settingsDropdown?.classList.contains('active')) {
                this.closeSettingsDropdown();
            }

            // Close modals
            const activeModal = this.utils.$('.modal-overlay.active');
            if (activeModal) {
                const closeBtn = activeModal.querySelector('.modal-close');
                if (closeBtn) closeBtn.click();
            }

            // Close sidebar on mobile
            if (this.utils.getDeviceType() !== 'desktop' && this.elements.sidebar?.classList.contains('open')) {
                this.closeSidebar();
            }
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Update device type
        const deviceType = this.utils.getDeviceType();

        // Close sidebar on mobile if open
        if (deviceType !== 'desktop' && this.elements.sidebar?.classList.contains('open')) {
            this.closeSidebar();
        }
    }

    /**
     * Handle theme change
     */
    handleThemeChange(newTheme) {
        // This is called by state subscription
        console.log('Theme changed to:', newTheme);
    }

    /**
     * Handle online status change
     */
    handleOnlineStatusChange(online) {
        if (online) {
            this.showNotification('Connection restored', 'success');
        } else {
            this.showNotification('You are offline. Some features may be limited.', 'warning');
        }
    }

    /**
     * Check for unsaved changes
     */
    hasUnsavedChanges() {
        // Check if there's text in the input
        return this.elements.chatInput?.value.trim().length > 0;
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // For now, just log
        console.log(`[${type.toUpperCase()}] ${message}`);

        // In production, this would show a toast/snackbar notification
    }

    /**
     * Scroll to bottom of messages
     */
    scrollToBottom() {
        if (this.elements.messagesContainer) {
            this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
        }
    }

    /**
     * Handle critical error
     */
    handleCriticalError(error) {
        console.error('Critical error:', error);

        // Show error UI
        const errorHtml = `
            <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.9); color: white; display: flex; align-items: center; justify-content: center; z-index: 999999;">
                <div style="text-align: center; padding: 2rem;">
                    <h1 style="font-size: 2rem; margin-bottom: 1rem;">Critical Error</h1>
                    <p style="margin-bottom: 1rem;">An unexpected error occurred. Please refresh the page.</p>
                    <button onclick="location.reload()" style="padding: 0.5rem 1rem; background: #7A77FF; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
                        Refresh Page
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', errorHtml);
    }

    /**
     * Destroy application
     */
    destroy() {
        // Clean up event listeners
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);

        // Stop voice systems
        if (window.speechSynthesis) {
            speechSynthesis.cancel();
        }

        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {
                // Ignore
            }
        }

        // Clear intervals/timeouts
        // ... any cleanup needed

        console.log('🛑 ParklandApp destroyed');
    }
}

// Create global instance
window.ParklandApp = ParklandApp;
window.app = new ParklandApp();

console.log('🎮 Main Application Controller loaded successfully');
