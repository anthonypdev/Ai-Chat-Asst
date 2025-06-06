/**
 * Parkland AI - Opus Magnum Edition
 * Accessibility Manager
 *
 * Provides comprehensive accessibility features including screen reader support,
 * keyboard navigation, high contrast modes, and WCAG compliance utilities.
 */

class AccessibilityManager {
    constructor(utils, stateManager, eventEmitter) {
        if (!utils || !stateManager || !eventEmitter) {
            throw new Error("AccessibilityManager requires utils, stateManager, and eventEmitter instances.");
        }
        
        this.utils = utils;
        this.stateManager = stateManager;
        this.eventEmitter = eventEmitter;
        
        // Accessibility state
        this.isScreenReaderActive = false;
        this.isHighContrastMode = false;
        this.isReducedMotionMode = false;
        this.currentFocusIndex = -1;
        this.focusableElements = [];
        this.announcements = [];
        
        // Screen reader announcements
        this.liveRegion = null;
        this.statusRegion = null;
        
        // Keyboard navigation
        this.keyboardShortcuts = new Map();
        this.modalStack = [];
        this.lastFocusedElement = null;
        
        // Voice commands for accessibility
        this.voiceCommands = new Map();
        
        this._initialize();
        console.log('♿ AccessibilityManager initialized.');
    }

    /**
     * Initializes accessibility features
     * @private
     */
    _initialize() {
        this._detectAccessibilityPreferences();
        this._createLiveRegions();
        this._setupKeyboardNavigation();
        this._setupVoiceCommands();
        this._setupEventListeners();
        this._enhanceExistingElements();
        this._monitorFocusableElements();
    }

    /**
     * Detects user accessibility preferences
     * @private
     */
    _detectAccessibilityPreferences() {
        // Detect if screen reader is active
        this.isScreenReaderActive = this._detectScreenReader();
        
        // Check for high contrast preference
        if (window.matchMedia) {
            const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
            this.isHighContrastMode = highContrastQuery.matches;
            highContrastQuery.addEventListener('change', (e) => {
                this.isHighContrastMode = e.matches;
                this._toggleHighContrast(e.matches);
            });
            
            // Check for reduced motion preference
            const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.isReducedMotionMode = reducedMotionQuery.matches;
            reducedMotionQuery.addEventListener('change', (e) => {
                this.isReducedMotionMode = e.matches;
                this.stateManager.setUserPreference('reduceMotion', e.matches);
            });
        }
        
        // Update state
        this.stateManager.setUserPreference('screenReaderActive', this.isScreenReaderActive);
        this.stateManager.setUserPreference('highContrastMode', this.isHighContrastMode);
        this.stateManager.setUserPreference('reducedMotion', this.isReducedMotionMode);
    }

    /**
     * Detects if screen reader is active
     * @returns {boolean} Whether screen reader is likely active
     * @private
     */
    _detectScreenReader() {
        // Check for common screen reader indicators
        const indicators = [
            // NVDA, JAWS, etc.
            navigator.userAgent.includes('NVDA') || 
            navigator.userAgent.includes('JAWS') ||
            // Voice Over on Mac
            window.speechSynthesis && window.speechSynthesis.getVoices().length > 0,
            // High contrast mode often indicates screen reader use
            window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches,
            // Check for accessibility APIs
            document.documentElement.getAttribute('data-at-shortcutkeys') !== null
        ];
        
        return indicators.some(indicator => indicator);
    }

    /**
     * Creates ARIA live regions for announcements
     * @private
     */
    _createLiveRegions() {
        // Main live region for announcements
        this.liveRegion = this.utils.createElement('div', {
            id: 'accessibility-live-region',
            'aria-live': 'polite',
            'aria-atomic': 'true',
            className: 'sr-only',
            style: {
                position: 'absolute',
                left: '-10000px',
                width: '1px',
                height: '1px',
                overflow: 'hidden'
            }
        });
        
        // Status region for immediate announcements
        this.statusRegion = this.utils.createElement('div', {
            id: 'accessibility-status-region',
            'aria-live': 'assertive',
            'aria-atomic': 'true',
            className: 'sr-only',
            style: {
                position: 'absolute',
                left: '-10000px',
                width: '1px',
                height: '1px',
                overflow: 'hidden'
            }
        });
        
        document.body.appendChild(this.liveRegion);
        document.body.appendChild(this.statusRegion);
    }

    /**
     * Sets up keyboard navigation
     * @private
     */
    _setupKeyboardNavigation() {
        // Global keyboard shortcuts
        this.addKeyboardShortcut('Alt+1', () => this._focusMainContent());
        this.addKeyboardShortcut('Alt+2', () => this._focusNavigation());
        this.addKeyboardShortcut('Alt+3', () => this._focusChatInput());
        this.addKeyboardShortcut('Alt+S', () => this._openSettings());
        this.addKeyboardShortcut('Alt+H', () => this._showKeyboardHelp());
        this.addKeyboardShortcut('Escape', () => this._handleEscape());
        
        // Arrow key navigation for messages
        this.addKeyboardShortcut('ArrowUp', (e) => this._navigateMessages('up', e));
        this.addKeyboardShortcut('ArrowDown', (e) => this._navigateMessages('down', e));
        
        // Quick actions
        this.addKeyboardShortcut('Ctrl+Enter', () => this._sendMessage());
        this.addKeyboardShortcut('Ctrl+N', () => this._startNewChat());
        this.addKeyboardShortcut('Ctrl+E', () => this._exportChat());
        
        // Voice control shortcuts
        this.addKeyboardShortcut('Ctrl+M', () => this._toggleMicrophone());
        this.addKeyboardShortcut('Ctrl+Shift+S', () => this._stopSpeaking());
        
        // Set up global keyboard listener
        document.addEventListener('keydown', this._handleKeyDown.bind(this));
    }

    /**
     * Sets up voice commands for accessibility
     * @private
     */
    _setupVoiceCommands() {
        this.voiceCommands.set('send message', () => this._sendMessage());
        this.voiceCommands.set('new chat', () => this._startNewChat());
        this.voiceCommands.set('open settings', () => this._openSettings());
        this.voiceCommands.set('focus input', () => this._focusChatInput());
        this.voiceCommands.set('read last message', () => this._readLastMessage());
        this.voiceCommands.set('export chat', () => this._exportChat());
        this.voiceCommands.set('help', () => this._showHelp());
        this.voiceCommands.set('stop speaking', () => this._stopSpeaking());
    }

    /**
     * Sets up event listeners for accessibility features
     * @private
     */
    _setupEventListeners() {
        // Monitor focus changes
        document.addEventListener('focusin', this._handleFocusIn.bind(this));
        document.addEventListener('focusout', this._handleFocusOut.bind(this));
        
        // Monitor modal state changes
        this.stateManager.subscribe('change:isSettingsModalOpen', this._handleModalChange.bind(this));
        
        // Monitor chat messages for announcements
        this.stateManager.subscribe('change:chatHistory', this._handleChatUpdate.bind(this));
        
        // Monitor app state changes
        this.eventEmitter.on('errorDisplay', this._announceError.bind(this));
        this.eventEmitter.on('notificationDisplay', this._announceNotification.bind(this));
        this.eventEmitter.on('themeChanged', this._announceThemeChange.bind(this));
        
        // Voice recognition events
        this.eventEmitter.on('recognition:start', () => {
            this.announce('Voice recognition started. Speak your command.');
        });
        this.eventEmitter.on('recognition:end', () => {
            this.announce('Voice recognition stopped.');
        });
    }

    /**
     * Enhances existing elements with accessibility features
     * @private
     */
    _enhanceExistingElements() {
        // Add skip links
        this._addSkipLinks();
        
        // Enhance form controls
        this._enhanceFormControls();
        
        // Add ARIA labels where missing
        this._addMissingAriaLabels();
        
        // Enhance buttons with proper roles
        this._enhanceButtons();
        
        // Add landmark roles
        this._addLandmarkRoles();
    }

    /**
     * Adds skip links for keyboard navigation
     * @private
     */
    _addSkipLinks() {
        const skipLinks = this.utils.createElement('div', {
            className: 'skip-links',
            innerHTML: `
                <a href="#main-content" class="skip-link">Skip to main content</a>
                <a href="#chat-input" class="skip-link">Skip to chat input</a>
                <a href="#navigation" class="skip-link">Skip to navigation</a>
            `
        });
        
        document.body.insertBefore(skipLinks, document.body.firstChild);
    }

    /**
     * Enhances form controls with accessibility features
     * @private
     */
    _enhanceFormControls() {
        const inputs = this.utils.$$('input, textarea, select');
        inputs.forEach(input => {
            // Add required indicators
            if (input.required && !input.getAttribute('aria-required')) {
                input.setAttribute('aria-required', 'true');
            }
            
            // Add invalid state handling
            input.addEventListener('invalid', () => {
                this.announce(`${input.name || 'Field'} is invalid. ${input.validationMessage}`);
            });
            
            // Add descriptions for complex inputs
            if (input.type === 'password' && !input.getAttribute('aria-describedby')) {
                const description = this.utils.createElement('div', {
                    id: `${input.id || 'password'}-desc`,
                    className: 'sr-only',
                    textContent: 'Enter your password. This field is secure and will not display your input.'
                });
                input.parentNode.insertBefore(description, input.nextSibling);
                input.setAttribute('aria-describedby', description.id);
            }
        });
    }

    /**
     * Adds missing ARIA labels
     * @private
     */
    _addMissingAriaLabels() {
        // Add labels to unlabeled buttons
        const buttons = this.utils.$$('button:not([aria-label]):not([aria-labelledby])');
        buttons.forEach(button => {
            const text = button.textContent.trim();
            const icon = button.querySelector('.icon, svg');
            
            if (!text && icon) {
                // Button with only icon needs a label
                const label = this._inferButtonLabel(button);
                if (label) {
                    button.setAttribute('aria-label', label);
                }
            }
        });
        
        // Add labels to form controls without labels
        const unlabeledInputs = this.utils.$$('input:not([aria-label]):not([aria-labelledby])');
        unlabeledInputs.forEach(input => {
            const label = input.previousElementSibling?.tagName === 'LABEL' ? 
                input.previousElementSibling.textContent.trim() :
                input.placeholder || input.name || 'Input field';
            
            input.setAttribute('aria-label', label);
        });
    }

    /**
     * Infers button label from context
     * @param {HTMLElement} button - Button element
     * @returns {string} Inferred label
     * @private
     */
    _inferButtonLabel(button) {
        const classNames = button.className.toLowerCase();
        const title = button.title;
        
        if (title) return title;
        
        // Common patterns
        if (classNames.includes('close')) return 'Close';
        if (classNames.includes('send')) return 'Send message';
        if (classNames.includes('mic')) return 'Toggle microphone';
        if (classNames.includes('settings')) return 'Open settings';
        if (classNames.includes('menu')) return 'Open menu';
        if (classNames.includes('sidebar')) return 'Toggle sidebar';
        if (classNames.includes('new-chat')) return 'Start new chat';
        
        return 'Button';
    }

    /**
     * Enhances buttons with proper accessibility
     * @private
     */
    _enhanceButtons() {
        const buttons = this.utils.$$('button');
        buttons.forEach(button => {
            // Add button role if missing
            if (!button.getAttribute('role')) {
                button.setAttribute('role', 'button');
            }
            
            // Add keyboard interaction
            if (!button.hasAttribute('tabindex')) {
                button.setAttribute('tabindex', '0');
            }
            
            // Add enter key support for non-button elements with button role
            if (button.tagName !== 'BUTTON') {
                button.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        button.click();
                    }
                });
            }
        });
    }

    /**
     * Adds landmark roles to page sections
     * @private
     */
    _addLandmarkRoles() {
        // Main content area
        const mainContent = this.utils.$('.chat-container, main, #main-content');
        if (mainContent && !mainContent.getAttribute('role')) {
            mainContent.setAttribute('role', 'main');
            mainContent.id = mainContent.id || 'main-content';
        }
        
        // Navigation area
        const navigation = this.utils.$('.sidebar, nav, #navigation');
        if (navigation && !navigation.getAttribute('role')) {
            navigation.setAttribute('role', 'navigation');
            navigation.id = navigation.id || 'navigation';
        }
        
        // Chat input area
        const chatInput = this.utils.$('#chatInput, .chat-input');
        if (chatInput) {
            chatInput.id = chatInput.id || 'chat-input';
        }
    }

    /**
     * Monitors focusable elements in the page
     * @private
     */
    _monitorFocusableElements() {
        this._updateFocusableElements();
        
        // Update when DOM changes
        const observer = new MutationObserver(() => {
            this._updateFocusableElements();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['tabindex', 'disabled', 'hidden']
        });
    }

    /**
     * Updates list of focusable elements
     * @private
     */
    _updateFocusableElements() {
        const focusableSelector = `
            a[href]:not([disabled]),
            button:not([disabled]),
            textarea:not([disabled]),
            input:not([disabled]):not([type="hidden"]),
            select:not([disabled]),
            [tabindex]:not([tabindex="-1"]):not([disabled]),
            [contenteditable]:not([contenteditable="false"])
        `;
        
        this.focusableElements = this.utils.$$(focusableSelector)
            .filter(el => this._isElementVisible(el))
            .sort((a, b) => {
                const aIndex = parseInt(a.tabIndex) || 0;
                const bIndex = parseInt(b.tabIndex) || 0;
                return aIndex - bIndex;
            });
    }

    /**
     * Checks if element is visible
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} Whether element is visible
     * @private
     */
    _isElementVisible(element) {
        if (!element.offsetParent && element.offsetWidth === 0 && element.offsetHeight === 0) {
            return false;
        }
        
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0';
    }

    /**
     * Adds keyboard shortcut
     * @param {string} key - Key combination (e.g., 'Ctrl+Enter')
     * @param {Function} handler - Handler function
     */
    addKeyboardShortcut(key, handler) {
        this.keyboardShortcuts.set(key.toLowerCase(), handler);
    }

    /**
     * Removes keyboard shortcut
     * @param {string} key - Key combination
     */
    removeKeyboardShortcut(key) {
        this.keyboardShortcuts.delete(key.toLowerCase());
    }

    /**
     * Handles keyboard events
     * @param {KeyboardEvent} e - Keyboard event
     * @private
     */
    _handleKeyDown(e) {
        const key = this._getKeyCombo(e);
        const handler = this.keyboardShortcuts.get(key);
        
        if (handler) {
            e.preventDefault();
            handler(e);
            return;
        }
        
        // Handle roving tabindex for arrow keys in certain contexts
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            const activeElement = document.activeElement;
            if (activeElement && activeElement.classList.contains('message')) {
                this._navigateMessages(e.key === 'ArrowUp' ? 'up' : 'down', e);
            }
        }
    }

    /**
     * Gets key combination string from event
     * @param {KeyboardEvent} e - Keyboard event
     * @returns {string} Key combination
     * @private
     */
    _getKeyCombo(e) {
        const parts = [];
        
        if (e.ctrlKey) parts.push('ctrl');
        if (e.altKey) parts.push('alt');
        if (e.shiftKey) parts.push('shift');
        if (e.metaKey) parts.push('meta');
        
        parts.push(e.key.toLowerCase());
        
        return parts.join('+');
    }

    /**
     * Announces text to screen readers
     * @param {string} text - Text to announce
     * @param {boolean} assertive - Whether to use assertive live region
     */
    announce(text, assertive = false) {
        if (!text) return;
        
        const region = assertive ? this.statusRegion : this.liveRegion;
        
        // Clear previous announcement
        region.textContent = '';
        
        // Add new announcement with slight delay for better screen reader support
        setTimeout(() => {
            region.textContent = text;
        }, 100);
        
        // Log for debugging
        if (this.stateManager.get('debugMode')) {
            console.log(`[A11Y Announce]: ${text}`);
        }
        
        // Store announcement history
        this.announcements.unshift({
            text,
            timestamp: Date.now(),
            assertive
        });
        
        // Keep only recent announcements
        if (this.announcements.length > 50) {
            this.announcements = this.announcements.slice(0, 50);
        }
    }

    /**
     * Focuses main content area
     * @private
     */
    _focusMainContent() {
        const mainContent = this.utils.$('[role="main"], main, .chat-container');
        if (mainContent) {
            mainContent.focus();
            this.announce('Focused main content area');
        }
    }

    /**
     * Focuses navigation area
     * @private
     */
    _focusNavigation() {
        const navigation = this.utils.$('[role="navigation"], nav, .sidebar');
        if (navigation) {
            navigation.focus();
            this.announce('Focused navigation area');
        }
    }

    /**
     * Focuses chat input
     * @private
     */
    _focusChatInput() {
        const chatInput = this.utils.$('#chatInput, .chat-input');
        if (chatInput) {
            chatInput.focus();
            this.announce('Focused chat input');
        }
    }

    /**
     * Opens settings modal
     * @private
     */
    _openSettings() {
        this.stateManager.setModalOpen('isSettingsModalOpen', true);
        this.announce('Settings dialog opened');
    }

    /**
     * Shows keyboard help
     * @private
     */
    _showKeyboardHelp() {
        const shortcuts = Array.from(this.keyboardShortcuts.entries())
            .map(([key, handler]) => `${key}: ${this._getShortcutDescription(key)}`)
            .join('\n');
        
        this.announce(`Keyboard shortcuts: ${shortcuts}`);
    }

    /**
     * Gets description for keyboard shortcut
     * @param {string} key - Key combination
     * @returns {string} Description
     * @private
     */
    _getShortcutDescription(key) {
        const descriptions = {
            'alt+1': 'Focus main content',
            'alt+2': 'Focus navigation',
            'alt+3': 'Focus chat input',
            'alt+s': 'Open settings',
            'alt+h': 'Show keyboard help',
            'escape': 'Close dialogs',
            'ctrl+enter': 'Send message',
            'ctrl+n': 'New chat',
            'ctrl+e': 'Export chat',
            'ctrl+m': 'Toggle microphone',
            'ctrl+shift+s': 'Stop speaking'
        };
        
        return descriptions[key] || 'Custom action';
    }

    /**
     * Handles escape key
     * @private
     */
    _handleEscape() {
        // Close topmost modal
        if (this.stateManager.get('isSettingsModalOpen')) {
            this.stateManager.setModalOpen('isSettingsModalOpen', false);
            this.announce('Settings closed');
        } else {
            // Return focus to main content
            this._focusMainContent();
        }
    }

    /**
     * Navigates through messages
     * @param {string} direction - 'up' or 'down'
     * @param {Event} e - Keyboard event
     * @private
     */
    _navigateMessages(direction, e) {
        const messages = this.utils.$$('.message');
        if (messages.length === 0) return;
        
        const currentIndex = messages.findIndex(msg => msg === document.activeElement);
        let newIndex;
        
        if (direction === 'up') {
            newIndex = currentIndex > 0 ? currentIndex - 1 : messages.length - 1;
        } else {
            newIndex = currentIndex < messages.length - 1 ? currentIndex + 1 : 0;
        }
        
        const targetMessage = messages[newIndex];
        if (targetMessage) {
            targetMessage.tabIndex = 0;
            targetMessage.focus();
            
            // Remove tabindex from other messages
            messages.forEach((msg, index) => {
                if (index !== newIndex) {
                    msg.tabIndex = -1;
                }
            });
            
            // Announce message content
            const content = targetMessage.querySelector('.message-content')?.textContent || '';
            const role = targetMessage.classList.contains('user') ? 'User' : 'Assistant';
            this.announce(`${role} message: ${content.substring(0, 100)}`);
        }
        
        e.preventDefault();
    }

    /**
     * Sends current message
     * @private
     */
    _sendMessage() {
        const chatInput = this.utils.$('#chatInput');
        if (chatInput && chatInput.value.trim()) {
            const sendButton = this.utils.$('#sendBtn, .send-button');
            if (sendButton) {
                sendButton.click();
                this.announce('Message sent');
            }
        } else {
            this.announce('No message to send');
        }
    }

    /**
     * Starts new chat
     * @private
     */
    _startNewChat() {
        const newChatButton = this.utils.$('#newChatBtn, .new-chat-btn');
        if (newChatButton) {
            newChatButton.click();
            this.announce('New chat started');
        }
    }

    /**
     * Exports chat
     * @private
     */
    _exportChat() {
        // This would trigger the export functionality
        this.eventEmitter.emit('chat:exportRequested');
        this.announce('Chat export requested');
    }

    /**
     * Toggles microphone
     * @private
     */
    _toggleMicrophone() {
        const micButton = this.utils.$('#micBtn, .mic-button');
        if (micButton) {
            micButton.click();
            const isListening = this.stateManager.get('isMicListening');
            this.announce(isListening ? 'Microphone disabled' : 'Microphone enabled');
        }
    }

    /**
     * Stops speaking
     * @private
     */
    _stopSpeaking() {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            this.announce('Speech stopped');
        }
    }

    /**
     * Reads last message
     * @private
     */
    _readLastMessage() {
        const messages = this.utils.$$('.message');
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage) {
            const content = lastMessage.querySelector('.message-content')?.textContent || '';
            const role = lastMessage.classList.contains('user') ? 'User' : 'Assistant';
            
            this.announce(`Last message from ${role}: ${content}`);
            
            // Also use speech synthesis if available
            if (window.speechSynthesis && this.stateManager.get('userPreferences.voiceOutputEnabled')) {
                const utterance = new SpeechSynthesisUtterance(content);
                utterance.rate = 0.9;
                window.speechSynthesis.speak(utterance);
            }
        } else {
            this.announce('No messages to read');
        }
    }

    /**
     * Shows help information
     * @private
     */
    _showHelp() {
        const helpText = `
            Parkland AI Help. Available keyboard shortcuts:
            Alt+1: Focus main content
            Alt+2: Focus navigation  
            Alt+3: Focus chat input
            Alt+S: Open settings
            Ctrl+Enter: Send message
            Ctrl+N: New chat
            Ctrl+M: Toggle microphone
            Escape: Close dialogs
            Arrow keys: Navigate messages when focused
        `;
        this.announce(helpText);
    }

    /**
     * Handles focus in events
     * @param {FocusEvent} e - Focus event
     * @private
     */
    _handleFocusIn(e) {
        this.lastFocusedElement = e.target;
        
        // Announce focused element if screen reader is active
        if (this.isScreenReaderActive) {
            const element = e.target;
            const label = this._getElementLabel(element);
            const role = element.getAttribute('role') || element.tagName.toLowerCase();
            
            if (label && label !== element.textContent) {
                this.announce(`${label}, ${role}`);
            }
        }
    }

    /**
     * Handles focus out events
     * @param {FocusEvent} e - Focus event
     * @private
     */
    _handleFocusOut(e) {
        // Implementation for focus tracking
    }

    /**
     * Gets accessible label for element
     * @param {HTMLElement} element - Element to get label for
     * @returns {string} Element label
     * @private
     */
    _getElementLabel(element) {
        return element.getAttribute('aria-label') ||
               element.getAttribute('aria-labelledby') && 
               document.getElementById(element.getAttribute('aria-labelledby'))?.textContent ||
               element.title ||
               element.placeholder ||
               element.textContent?.trim() ||
               '';
    }

    /**
     * Handles modal state changes
     * @param {Object} data - State change data
     * @private
     */
    _handleModalChange({ newValue }) {
        if (newValue) {
            // Modal opened
            this.modalStack.push(this.lastFocusedElement);
            
            // Focus first focusable element in modal
            setTimeout(() => {
                const modal = this.utils.$('.modal:not(.hidden)');
                if (modal) {
                    const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
                    if (firstFocusable) {
                        firstFocusable.focus();
                    }
                }
            }, 100);
        } else {
            // Modal closed - restore focus
            const previousElement = this.modalStack.pop();
            if (previousElement && previousElement.isConnected) {
                previousElement.focus();
            }
        }
    }

    /**
     * Handles chat history updates
     * @param {Object} data - Chat history data
     * @private
     */
    _handleChatUpdate({ newValue, oldValue }) {
        if (newValue.length > (oldValue?.length || 0)) {
            const newMessage = newValue[newValue.length - 1];
            if (newMessage.role === 'assistant') {
                this.announce(`Assistant replied: ${newMessage.content.substring(0, 100)}`);
            }
        }
    }

    /**
     * Announces error messages
     * @param {Object} data - Error data
     * @private
     */
    _announceError({ message }) {
        this.announce(`Error: ${message}`, true);
    }

    /**
     * Announces notifications
     * @param {Object} data - Notification data
     * @private
     */
    _announceNotification({ message, type }) {
        this.announce(`${type}: ${message}`);
    }

    /**
     * Announces theme changes
     * @param {Object} data - Theme change data
     * @private
     */
    _announceThemeChange({ themeName }) {
        this.announce(`Theme changed to ${themeName}`);
    }

    /**
     * Toggles high contrast mode
     * @param {boolean} enabled - Whether to enable high contrast
     * @private
     */
    _toggleHighContrast(enabled) {
        document.body.classList.toggle('high-contrast', enabled);
        this.announce(`High contrast mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Gets accessibility statistics
     * @returns {Object} Accessibility statistics
     */
    getAccessibilityStats() {
        return {
            screenReaderActive: this.isScreenReaderActive,
            highContrastMode: this.isHighContrastMode,
            reducedMotionMode: this.isReducedMotionMode,
            totalFocusableElements: this.focusableElements.length,
            announcementCount: this.announcements.length,
            keyboardShortcuts: this.keyboardShortcuts.size,
            voiceCommands: this.voiceCommands.size
        };
    }

    /**
     * Validates page accessibility
     * @returns {Object} Validation results
     */
    validateAccessibility() {
        const issues = [];
        
        // Check for missing alt text on images
        const images = this.utils.$$('img:not([alt])');
        if (images.length > 0) {
            issues.push(`${images.length} images missing alt text`);
        }
        
        // Check for missing labels
        const unlabeledInputs = this.utils.$$('input:not([aria-label]):not([aria-labelledby])');
        if (unlabeledInputs.length > 0) {
            issues.push(`${unlabeledInputs.length} form controls missing labels`);
        }
        
        // Check for sufficient color contrast (simplified check)
        const lowContrastElements = this.utils.$$('*').filter(el => {
            const style = window.getComputedStyle(el);
            const bg = style.backgroundColor;
            const color = style.color;
            return bg !== 'rgba(0, 0, 0, 0)' && color && !this._hasSufficientContrast(color, bg);
        });
        
        if (lowContrastElements.length > 0) {
            issues.push(`${lowContrastElements.length} elements may have insufficient color contrast`);
        }
        
        return {
            valid: issues.length === 0,
            issues,
            score: Math.max(0, 100 - (issues.length * 10))
        };
    }

    /**
     * Simplified contrast checker
     * @param {string} color1 - First color
     * @param {string} color2 - Second color
     * @returns {boolean} Whether contrast is sufficient
     * @private
     */
    _hasSufficientContrast(color1, color2) {
        // This is a simplified implementation
        // A full implementation would parse RGB values and calculate actual contrast ratio
        return true; // Placeholder
    }

    /**
     * Processes voice command
     * @param {string} command - Voice command text
     * @returns {boolean} Whether command was processed
     */
    processVoiceCommand(command) {
        const normalizedCommand = command.toLowerCase().trim();
        
        for (const [cmdText, handler] of this.voiceCommands) {
            if (normalizedCommand.includes(cmdText)) {
                handler();
                this.announce(`Executed command: ${cmdText}`);
                return true;
            }
        }
        
        return false;
    }

    /**
     * Destroys the accessibility manager
     */
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this._handleKeyDown);
        document.removeEventListener('focusin', this._handleFocusIn);
        document.removeEventListener('focusout', this._handleFocusOut);
        
        // Remove live regions
        if (this.liveRegion && this.liveRegion.parentNode) {
            this.liveRegion.parentNode.removeChild(this.liveRegion);
        }
        if (this.statusRegion && this.statusRegion.parentNode) {
            this.statusRegion.parentNode.removeChild(this.statusRegion);
        }
        
        // Clear state
        this.keyboardShortcuts.clear();
        this.voiceCommands.clear();
        this.announcements = [];
        
        console.log('♿ AccessibilityManager destroyed.');
    }
}

// Global instance creation pattern
if (typeof window !== 'undefined') {
    window.AccessibilityManager = AccessibilityManager;
}