/**
 * Parkland AI - Opus Magnum Edition
 * Typing Indicator Manager
 *
 * Provides real-time typing indicators, message status tracking,
 * and visual feedback for chat interactions.
 */

class TypingIndicatorManager {
    constructor(utils, stateManager, eventEmitter) {
        if (!utils || !stateManager || !eventEmitter) {
            throw new Error("TypingIndicatorManager requires utils, stateManager, and eventEmitter instances.");
        }
        
        this.utils = utils;
        this.stateManager = stateManager;
        this.eventEmitter = eventEmitter;
        
        // Typing indicator state
        this.isTyping = false;
        this.typingStartTime = null;
        this.typingElement = null;
        this.typingAnimationFrame = null;
        
        // Message status tracking
        this.messageStatuses = new Map();
        this.statusUpdateQueue = [];
        
        // Configuration
        this.config = {
            typingDelay: 500, // ms delay before showing typing indicator
            typingTimeout: 10000, // ms timeout for typing indicator
            dotAnimationSpeed: 600, // ms between dot animations
            statusUpdateInterval: 100, // ms between status updates
            maxStatusHistory: 100, // maximum status entries to keep
            enableSounds: true // whether to play status sounds
        };
        
        // Animation states
        this.animationStates = {
            thinking: { text: 'Thinking', dots: 3, speed: 800 },
            processing: { text: 'Processing', dots: 3, speed: 600 },
            generating: { text: 'Generating response', dots: 3, speed: 400 },
            analyzing: { text: 'Analyzing', dots: 3, speed: 700 },
            searching: { text: 'Searching', dots: 3, speed: 500 }
        };
        
        // Current animation state
        this.currentAnimation = 'thinking';
        this.animationDotCount = 0;
        
        this._initialize();
        console.log('⌨️ TypingIndicatorManager initialized.');
    }
    
    /**
     * Initializes the typing indicator system
     * @private
     */
    _initialize() {
        this._createTypingIndicatorElement();
        this._setupEventListeners();
        this._setupStatusUpdateLoop();
    }
    
    /**
     * Creates the typing indicator DOM element
     * @private
     */
    _createTypingIndicatorElement() {
        this.typingElement = this.utils.createElement('div', {
            className: 'typing-indicator hidden',
            innerHTML: `
                <div class="typing-container">
                    <div class="typing-avatar">
                        <div class="typing-character-icon">🤖</div>
                    </div>
                    <div class="typing-content">
                        <div class="typing-text">
                            <span class="typing-label"></span>
                            <span class="typing-dots">
                                <span class="dot dot-1">•</span>
                                <span class="dot dot-2">•</span>
                                <span class="dot dot-3">•</span>
                            </span>
                        </div>
                        <div class="typing-progress">
                            <div class="progress-bar"></div>
                        </div>
                    </div>
                    <div class="typing-actions">
                        <button class="btn btn-xs btn-ghost typing-cancel" title="Cancel request">
                            <span class="icon">⏹️</span>
                        </button>
                    </div>
                </div>
            `
        });
        
        // Add to chat container
        const chatContainer = this.utils.$('.chat-container, .messages-container, #chatMessages');
        if (chatContainer) {
            chatContainer.appendChild(this.typingElement);
        }
        
        // Add event listeners to typing element
        const cancelBtn = this.typingElement.querySelector('.typing-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.eventEmitter.emit('typing:cancelRequested');
            });
        }
    }
    
    /**
     * Sets up event listeners
     * @private
     */
    _setupEventListeners() {
        // Listen for API request events
        this.eventEmitter.on('api:requestStart', this._handleRequestStart.bind(this));
        this.eventEmitter.on('api:requestProgress', this._handleRequestProgress.bind(this));
        this.eventEmitter.on('api:requestComplete', this._handleRequestComplete.bind(this));
        this.eventEmitter.on('api:requestError', this._handleRequestError.bind(this));
        this.eventEmitter.on('api:streamChunk', this._handleStreamChunk.bind(this));
        
        // Listen for message events
        this.eventEmitter.on('message:sending', this._handleMessageSending.bind(this));
        this.eventEmitter.on('message:sent', this._handleMessageSent.bind(this));
        this.eventEmitter.on('message:received', this._handleMessageReceived.bind(this));
        this.eventEmitter.on('message:error', this._handleMessageError.bind(this));
        
        // Listen for character changes
        this.stateManager.subscribe('change:activeCharacter', this._handleCharacterChange.bind(this));
        
        // Listen for theme changes
        this.stateManager.subscribe('change:currentTheme', this._updateTheme.bind(this));
    }
    
    /**
     * Sets up the status update loop
     * @private
     */
    _setupStatusUpdateLoop() {
        setInterval(() => {
            this._processStatusQueue();
            this._updateMessageStatuses();
        }, this.config.statusUpdateInterval);
    }
    
    /**
     * Shows typing indicator with specified animation
     * @param {string} animationType - Type of animation (thinking, processing, etc.)
     * @param {Object} options - Additional options
     */
    showTypingIndicator(animationType = 'thinking', options = {}) {
        if (this.isTyping) return;
        
        this.isTyping = true;
        this.typingStartTime = Date.now();
        this.currentAnimation = animationType;
        
        // Update character icon if specified
        if (options.character) {
            this._updateCharacterIcon(options.character);
        }
        
        // Update animation state
        const animation = this.animationStates[animationType] || this.animationStates.thinking;
        const labelElement = this.typingElement.querySelector('.typing-label');
        if (labelElement) {
            labelElement.textContent = animation.text;
        }
        
        // Show typing indicator
        this.utils.removeClass(this.typingElement, 'hidden');
        this.typingElement.classList.add('active');
        
        // Start dot animation
        this._startDotAnimation(animation.speed);
        
        // Start progress animation if enabled
        if (options.showProgress) {
            this._startProgressAnimation(options.estimatedDuration);
        }
        
        // Set timeout to auto-hide
        setTimeout(() => {
            if (this.isTyping) {
                this.hideTypingIndicator();
            }
        }, this.config.typingTimeout);
        
        // Scroll to typing indicator
        this._scrollToTypingIndicator();
        
        // Emit event
        this.eventEmitter.emit('typing:started', { type: animationType, options });
        
        // Play sound if enabled
        if (this.config.enableSounds) {
            this._playStatusSound('typing_start');
        }
    }
    
    /**
     * Hides typing indicator
     */
    hideTypingIndicator() {
        if (!this.isTyping) return;
        
        this.isTyping = false;
        this.typingStartTime = null;
        
        // Hide element
        this.utils.addClass(this.typingElement, 'hidden');
        this.typingElement.classList.remove('active');
        
        // Stop animations
        this._stopDotAnimation();
        this._stopProgressAnimation();
        
        // Reset progress bar
        const progressBar = this.typingElement.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = '0%';
        }
        
        // Emit event
        this.eventEmitter.emit('typing:stopped');
        
        // Play sound if enabled
        if (this.config.enableSounds) {
            this._playStatusSound('typing_stop');
        }
    }
    
    /**
     * Updates typing indicator animation type
     * @param {string} animationType - New animation type
     */
    updateTypingAnimation(animationType) {
        if (!this.isTyping) return;
        
        this.currentAnimation = animationType;
        const animation = this.animationStates[animationType] || this.animationStates.thinking;
        
        const labelElement = this.typingElement.querySelector('.typing-label');
        if (labelElement) {
            labelElement.textContent = animation.text;
        }
        
        // Restart dot animation with new speed
        this._stopDotAnimation();
        this._startDotAnimation(animation.speed);
    }
    
    /**
     * Sets message status
     * @param {string} messageId - Message ID
     * @param {string} status - Status (sending, sent, delivered, read, error)
     * @param {Object} metadata - Additional metadata
     */
    setMessageStatus(messageId, status, metadata = {}) {
        const statusEntry = {
            messageId,
            status,
            timestamp: Date.now(),
            metadata,
            id: this._generateStatusId()
        };
        
        this.messageStatuses.set(messageId, statusEntry);
        this.statusUpdateQueue.push(statusEntry);
        
        // Update UI immediately for important statuses
        if (['error', 'sent', 'delivered'].includes(status)) {
            this._updateMessageStatusUI(messageId, statusEntry);
        }
    }
    
    /**
     * Gets message status
     * @param {string} messageId - Message ID
     * @returns {Object|null} Status entry or null
     */
    getMessageStatus(messageId) {
        return this.messageStatuses.get(messageId) || null;
    }
    
    /**
     * Starts dot animation
     * @param {number} speed - Animation speed in ms
     * @private
     */
    _startDotAnimation(speed) {
        this._stopDotAnimation();
        
        const dots = this.typingElement.querySelectorAll('.dot');
        
        const animate = () => {
            this.animationDotCount = (this.animationDotCount + 1) % 4;
            
            dots.forEach((dot, index) => {
                if (index < this.animationDotCount) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
            
            this.typingAnimationFrame = setTimeout(animate, speed);
        };
        
        animate();
    }
    
    /**
     * Stops dot animation
     * @private
     */
    _stopDotAnimation() {
        if (this.typingAnimationFrame) {
            clearTimeout(this.typingAnimationFrame);
            this.typingAnimationFrame = null;
        }
        
        const dots = this.typingElement.querySelectorAll('.dot');
        dots.forEach(dot => dot.classList.remove('active'));
        this.animationDotCount = 0;
    }
    
    /**
     * Starts progress animation
     * @param {number} estimatedDuration - Estimated duration in ms
     * @private
     */
    _startProgressAnimation(estimatedDuration) {
        const progressBar = this.typingElement.querySelector('.progress-bar');
        if (!progressBar || !estimatedDuration) return;
        
        progressBar.style.transition = `width ${estimatedDuration}ms linear`;
        progressBar.style.width = '100%';
    }
    
    /**
     * Stops progress animation
     * @private
     */
    _stopProgressAnimation() {
        const progressBar = this.typingElement.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.transition = 'none';
            progressBar.style.width = '0%';
        }
    }
    
    /**
     * Updates character icon in typing indicator
     * @param {string} character - Character name
     * @private
     */
    _updateCharacterIcon(character) {
        const iconElement = this.typingElement.querySelector('.typing-character-icon');
        if (!iconElement) return;
        
        let icon = '🤖'; // Default
        
        if (character && window.parklandApp?.characterManager) {
            const characterData = window.parklandApp.characterManager.getCharacterData(character);
            icon = characterData?.icon || characterData?.emoji || icon;
        }
        
        iconElement.textContent = icon;
    }
    
    /**
     * Scrolls to typing indicator
     * @private
     */
    _scrollToTypingIndicator() {
        if (this.typingElement && this.typingElement.offsetParent) {
            this.typingElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }
    }
    
    /**
     * Handles API request start
     * @param {Object} data - Event data
     * @private
     */
    _handleRequestStart(data) {
        this.showTypingIndicator('processing', {
            showProgress: true,
            estimatedDuration: data.estimatedDuration || 5000,
            character: this.stateManager.get('activeCharacter')
        });
    }
    
    /**
     * Handles API request progress
     * @param {Object} data - Event data
     * @private
     */
    _handleRequestProgress(data) {
        if (data.stage) {
            this.updateTypingAnimation(data.stage);
        }
    }
    
    /**
     * Handles API request completion
     * @param {Object} data - Event data
     * @private
     */
    _handleRequestComplete(data) {
        this.hideTypingIndicator();
    }
    
    /**
     * Handles API request error
     * @param {Object} data - Event data
     * @private
     */
    _handleRequestError(data) {
        this.hideTypingIndicator();
        
        if (data.messageId) {
            this.setMessageStatus(data.messageId, 'error', {
                error: data.error,
                retryable: data.retryable
            });
        }
    }
    
    /**
     * Handles stream chunks
     * @param {Object} data - Event data
     * @private
     */
    _handleStreamChunk(data) {
        this.updateTypingAnimation('generating');
    }
    
    /**
     * Handles message sending
     * @param {Object} data - Event data
     * @private
     */
    _handleMessageSending(data) {
        if (data.messageId) {
            this.setMessageStatus(data.messageId, 'sending', {
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Handles message sent
     * @param {Object} data - Event data
     * @private
     */
    _handleMessageSent(data) {
        if (data.messageId) {
            this.setMessageStatus(data.messageId, 'sent', {
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Handles message received
     * @param {Object} data - Event data
     * @private
     */
    _handleMessageReceived(data) {
        if (data.messageId) {
            this.setMessageStatus(data.messageId, 'delivered', {
                timestamp: Date.now(),
                tokens: data.usage
            });
        }
    }
    
    /**
     * Handles message error
     * @param {Object} data - Event data
     * @private
     */
    _handleMessageError(data) {
        if (data.messageId) {
            this.setMessageStatus(data.messageId, 'error', {
                error: data.error,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Handles character change
     * @param {Object} data - Event data
     * @private
     */
    _handleCharacterChange(data) {
        if (this.isTyping) {
            this._updateCharacterIcon(data.newValue);
        }
    }
    
    /**
     * Updates theme styling
     * @param {Object} data - Event data
     * @private
     */
    _updateTheme(data) {
        const theme = data.newValue;
        if (this.typingElement) {
            this.typingElement.dataset.theme = theme;
        }
    }
    
    /**
     * Processes status update queue
     * @private
     */
    _processStatusQueue() {
        while (this.statusUpdateQueue.length > 0) {
            const statusEntry = this.statusUpdateQueue.shift();
            this._updateMessageStatusUI(statusEntry.messageId, statusEntry);
        }
    }
    
    /**
     * Updates message status in UI
     * @param {string} messageId - Message ID
     * @param {Object} statusEntry - Status entry
     * @private
     */
    _updateMessageStatusUI(messageId, statusEntry) {
        const messageElement = this.utils.$(`[data-message-id="${messageId}"]`);
        if (!messageElement) return;
        
        // Find or create status indicator
        let statusIndicator = messageElement.querySelector('.message-status');
        if (!statusIndicator) {
            statusIndicator = this.utils.createElement('div', {
                className: 'message-status'
            });
            messageElement.appendChild(statusIndicator);
        }
        
        // Update status display
        statusIndicator.className = `message-status status-${statusEntry.status}`;
        statusIndicator.innerHTML = this._getStatusIcon(statusEntry.status);
        statusIndicator.title = this._getStatusDescription(statusEntry.status, statusEntry.metadata);
        
        // Add timestamp for sent/delivered messages
        if (['sent', 'delivered'].includes(statusEntry.status)) {
            const timestamp = messageElement.querySelector('.message-timestamp');
            if (timestamp) {
                timestamp.textContent = new Date(statusEntry.timestamp).toLocaleTimeString();
            }
        }
        
        // Handle error status
        if (statusEntry.status === 'error') {
            messageElement.classList.add('message-error');
            
            // Add retry button if retryable
            if (statusEntry.metadata.retryable) {
                this._addRetryButton(messageElement, messageId);
            }
        }
    }
    
    /**
     * Gets status icon for display
     * @param {string} status - Message status
     * @returns {string} Icon HTML
     * @private
     */
    _getStatusIcon(status) {
        const icons = {
            sending: '<span class="status-icon sending">⏳</span>',
            sent: '<span class="status-icon sent">✓</span>',
            delivered: '<span class="status-icon delivered">✓✓</span>',
            read: '<span class="status-icon read">👁️</span>',
            error: '<span class="status-icon error">⚠️</span>'
        };
        
        return icons[status] || '';
    }
    
    /**
     * Gets status description for tooltip
     * @param {string} status - Message status
     * @param {Object} metadata - Status metadata
     * @returns {string} Description text
     * @private
     */
    _getStatusDescription(status, metadata) {
        const descriptions = {
            sending: 'Sending message...',
            sent: 'Message sent',
            delivered: 'Message delivered',
            read: 'Message read',
            error: `Error: ${metadata.error || 'Unknown error'}`
        };
        
        let description = descriptions[status] || status;
        
        if (metadata.timestamp) {
            description += ` at ${new Date(metadata.timestamp).toLocaleTimeString()}`;
        }
        
        return description;
    }
    
    /**
     * Adds retry button to error messages
     * @param {HTMLElement} messageElement - Message element
     * @param {string} messageId - Message ID
     * @private
     */
    _addRetryButton(messageElement, messageId) {
        if (messageElement.querySelector('.retry-button')) return;
        
        const retryButton = this.utils.createElement('button', {
            className: 'btn btn-xs btn-secondary retry-button',
            innerHTML: '<span class="icon">🔄</span> Retry',
            title: 'Retry sending this message'
        });
        
        retryButton.addEventListener('click', () => {
            this.eventEmitter.emit('message:retry', { messageId });
        });
        
        const statusIndicator = messageElement.querySelector('.message-status');
        if (statusIndicator) {
            statusIndicator.appendChild(retryButton);
        }
    }
    
    /**
     * Updates message statuses (cleanup old entries)
     * @private
     */
    _updateMessageStatuses() {
        if (this.messageStatuses.size > this.config.maxStatusHistory) {
            const entries = Array.from(this.messageStatuses.entries());
            entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
            
            this.messageStatuses.clear();
            entries.slice(0, this.config.maxStatusHistory).forEach(([id, status]) => {
                this.messageStatuses.set(id, status);
            });
        }
    }
    
    /**
     * Plays status sound
     * @param {string} soundType - Type of sound
     * @private
     */
    _playStatusSound(soundType) {
        if (!this.config.enableSounds) return;
        
        // Simple audio feedback using Web Audio API or built-in sounds
        try {
            const audioContext = window.AudioContext || window.webkitAudioContext;
            if (audioContext) {
                const context = new audioContext();
                const oscillator = context.createOscillator();
                const gainNode = context.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(context.destination);
                
                // Different frequencies for different sounds
                const frequencies = {
                    typing_start: 800,
                    typing_stop: 400,
                    message_sent: 600,
                    message_error: 200
                };
                
                oscillator.frequency.setValueAtTime(frequencies[soundType] || 500, context.currentTime);
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.1, context.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
                
                oscillator.start(context.currentTime);
                oscillator.stop(context.currentTime + 0.1);
            }
        } catch (error) {
            // Silently fail if audio is not available
        }
    }
    
    /**
     * Generates unique status ID
     * @returns {string} Status ID
     * @private
     */
    _generateStatusId() {
        return `status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Gets typing indicator statistics
     * @returns {Object} Statistics
     */
    getStatistics() {
        return {
            isCurrentlyTyping: this.isTyping,
            typingDuration: this.isTyping ? Date.now() - this.typingStartTime : 0,
            currentAnimation: this.currentAnimation,
            totalStatuses: this.messageStatuses.size,
            queuedUpdates: this.statusUpdateQueue.length
        };
    }
    
    /**
     * Updates configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    
    /**
     * Destroys the typing indicator manager
     */
    destroy() {
        this.hideTypingIndicator();
        
        // Remove event listeners
        this.eventEmitter.off('api:requestStart');
        this.eventEmitter.off('api:requestProgress');
        this.eventEmitter.off('api:requestComplete');
        this.eventEmitter.off('api:requestError');
        this.eventEmitter.off('api:streamChunk');
        this.eventEmitter.off('message:sending');
        this.eventEmitter.off('message:sent');
        this.eventEmitter.off('message:received');
        this.eventEmitter.off('message:error');
        
        // Remove typing element
        if (this.typingElement && this.typingElement.parentNode) {
            this.typingElement.parentNode.removeChild(this.typingElement);
        }
        
        // Clear data
        this.messageStatuses.clear();
        this.statusUpdateQueue = [];
        
        console.log('⌨️ TypingIndicatorManager destroyed.');
    }
}

// Global instance creation pattern
if (typeof window !== 'undefined') {
    window.TypingIndicatorManager = TypingIndicatorManager;
}