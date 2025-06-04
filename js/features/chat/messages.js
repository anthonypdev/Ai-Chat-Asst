/**
 * Parkland AI - Opus Magnum Edition
 * ChatMessages Module
 *
 * Handles rendering and management of chat messages in the UI,
 * including markdown processing, syntax highlighting, and user interactions.
 */

class ChatMessages {
    /**
     * @param {HTMLElement} container - The DOM element to render messages into.
     * @param {ParklandUtils} utils - Instance of ParklandUtils.
     * @param {MarkdownProcessor} markdownProcessor - Instance of MarkdownProcessor.
     * @param {StateManager} stateManager - Instance of StateManager.
     */
    constructor(container, utils, markdownProcessor, stateManager) {
        if (!container || !utils || !markdownProcessor || !stateManager) {
            throw new Error("ChatMessages requires container, utils, markdownProcessor, and stateManager.");
        }
        this.container = container;
        this.utils = utils;
        this.markdownProcessor = markdownProcessor;
        this.stateManager = stateManager;
        this.typingIndicatorElement = null;

        this.stateManager.subscribe('typingIndicator', ({ show }) => this.showTypingIndicator(show));
        console.log('💬 ChatMessages initialized.');
    }

    /**
     * Clears the message container and renders all messages from history.
     * @param {Array<Object>} chatHistory - Array of message objects.
     */
    renderHistory(chatHistory) {
        this.container.innerHTML = ''; // Clear existing messages
        if (Array.isArray(chatHistory)) {
            const fragment = document.createDocumentFragment();
            chatHistory.forEach(message => {
                if (message && message.role && message.content) {
                    const messageEl = this._createMessageElement(message);
                    fragment.appendChild(messageEl);
                }
            });
            this.container.appendChild(fragment);
        }
        this.scrollToBottom(true); // Force scroll on history render
    }

    /**
     * Adds a single message to the UI, or updates an existing one if streaming.
     * @param {Object} message - The message object { id?, role, content, timestamp, character?, isError? }.
     * @param {boolean} [isStreaming=false] - True if this is a streaming update to an existing message.
     */
    addMessage(message, isStreaming = false) {
        if (!message || typeof message.role !== 'string' || typeof message.content !== 'string') {
            console.error('Invalid message object:', message);
            return;
        }

        let messageElement;
        const messageId = message.id || `msg-${message.timestamp}-${message.role}`;

        if (isStreaming && message.role === 'assistant') {
            messageElement = this.utils.$(`#${messageId}`, this.container);
        }

        if (messageElement) { // Update existing streaming message
            const bubble = this.utils.$('.message-bubble', messageElement);
            if (bubble) {
                bubble.innerHTML = this.markdownProcessor.process(message.content);
                this._addCodeCopyButtons(bubble); // Re-add for updated content
            }
        } else { // Create new message element
            messageElement = this._createMessageElement(message, messageId);
            // If typing indicator is present, insert message before it
            if (this.typingIndicatorElement && this.container.contains(this.typingIndicatorElement)) {
                this.container.insertBefore(messageElement, this.typingIndicatorElement);
            } else {
                this.container.appendChild(messageElement);
            }
             // Add fade-in animation class after appending
            this.utils.requestFrame(() => {
                messageElement.classList.add('animate-in');
            });
        }

        if (this.stateManager.get('userPreferences.autoScroll') !== false) {
            this.scrollToBottom();
        }
    }

    /**
     * Creates the DOM structure for a single message.
     * @param {Object} message - The message object.
     * @param {string} [elementId] - Optional ID for the message element.
     * @returns {HTMLElement} The created message element.
     * @private
     */
    _createMessageElement(message, elementId) {
        const messageRole = message.role.toLowerCase(); // user, assistant, system (system usually not displayed)
        const uniqueId = elementId || `msg-${message.timestamp}-${messageRole}-${this.utils.generateId('')}`;

        const messageDiv = this.utils.createElement('div', {
            className: `message ${messageRole}`,
            id: uniqueId,
            role: 'log', // ARIA role for chat messages
            'aria-live': messageRole === 'assistant' ? 'polite' : 'off',
            'aria-atomic': 'false' // Content may change, but usually whole new message
        });

        const wrapperDiv = this.utils.createElement('div', { className: 'message-wrapper' });

        // Avatar
        const avatarDiv = this.utils.createElement('div', {
            className: `message-avatar character-avatar ${message.character || messageRole}`,
            title: message.character ?
                   (window.parklandApp && window.parklandApp.characterManager ?
                    window.parklandApp.characterManager.getCharacterData(message.character)?.name : message.character)
                   : (messageRole === 'user' ? 'You' : 'Assistant')
        });
        // Avatar content (e.g., initials, SVG, or theme-specific through CSS)
        const avatarInitial = message.character ?
                              (window.parklandApp && window.parklandApp.characterManager ?
                               window.parklandApp.characterManager.getCharacterData(message.character)?.name[0].toUpperCase() : message.character[0].toUpperCase())
                              : (messageRole === 'user' ? 'U' : 'A');
        avatarDiv.textContent = avatarInitial;


        // Message Content (Bubble, Meta, Actions)
        const contentDiv = this.utils.createElement('div', { className: 'message-content' });
        const bubbleDiv = this.utils.createElement('div', { className: 'message-bubble' });

        if (message.content.trim() === '' && message.role === 'assistant' && !message.isError) {
            // Placeholder for empty assistant messages (e.g., during initial stream or error)
             const placeholder = this.utils.createElement('div', {className: 'empty-bubble-placeholder'});
             bubbleDiv.appendChild(placeholder);
        } else {
            bubbleDiv.innerHTML = this.markdownProcessor.process(message.content);
            this._addCodeCopyButtons(bubbleDiv);
        }


        if (message.isError) {
            this.utils.addClass(messageDiv, 'error'); // Specific styling for error messages
        }

        // Metadata (Timestamp, Ticket ID, etc.)
        const metaDiv = this.utils.createElement('div', { className: 'message-meta' });
        const timestampSpan = this.utils.createElement('span', {
            className: 'message-timestamp',
            textContent: this._formatTimestamp(message.timestamp)
        });
        metaDiv.appendChild(timestampSpan);

        // Optional: Ticket ID (example, if messages have unique IDs from a backend)
        if (message.ticketId) {
            const ticketSpan = this.utils.createElement('span', { className: 'message-ticket' });
            ticketSpan.innerHTML = `<span class="icon">${this.utils.getIconSVG('ticket')}</span> ${message.ticketId}`;
            metaDiv.appendChild(ticketSpan);
        }

        // Message Actions (Copy, Retry, Edit)
        const actionsDiv = this._addMessageActions(message);
        
        // Assemble message
        contentDiv.appendChild(bubbleDiv);
        contentDiv.appendChild(metaDiv);

        if (messageRole === 'user') {
            metaDiv.insertBefore(actionsDiv, timestampSpan); // Actions before timestamp for user
            wrapperDiv.appendChild(contentDiv);
            wrapperDiv.appendChild(avatarDiv);
        } else { // Assistant
            metaDiv.appendChild(actionsDiv); // Actions after timestamp for assistant
            wrapperDiv.appendChild(avatarDiv);
            wrapperDiv.appendChild(contentDiv);
        }
        messageDiv.appendChild(wrapperDiv);

        return messageDiv;
    }

    /**
     * Finds all <pre> elements within a rendered message bubble and adds a "Copy Code" button.
     * @param {HTMLElement} bubbleElement - The message bubble element.
     * @private
     */
    _addCodeCopyButtons(bubbleElement) {
        const pres = this.utils.$$('pre', bubbleElement);
        pres.forEach(preElement => {
            // Avoid adding multiple buttons if content is re-rendered
            if (this.utils.$('.code-copy-btn', preElement.parentElement)) {
                return;
            }

            const copyButton = this.utils.createElement('button', {
                className: 'code-copy-btn btn btn-xs btn-ghost', // Use existing button styles
                title: 'Copy code',
                innerHTML: `<span class="icon">${this.utils.getIconSVG ? this.utils.getIconSVG('copy') : 'Copy'}</span>` // Use utility for icons
            });

            copyButton.addEventListener('click', () => {
                const codeElement = this.utils.$('code', preElement);
                const codeToCopy = codeElement ? codeElement.textContent : preElement.textContent;
                this._handleCopyCode(codeToCopy, copyButton);
            });
            
            // Insert button: Some themes might want it inside the pre, some outside.
            // Let's place it conceptually "with" the pre block.
            // If 'pre' is wrapped by a 'figure' or another div, adjust.
            if (preElement.parentElement && preElement.parentElement !== bubbleElement) {
                 // If pre is wrapped (e.g. by a figure for a caption), add button to wrapper
                preElement.parentElement.style.position = 'relative'; // Ensure wrapper can position button
                preElement.parentElement.appendChild(copyButton);
            } else {
                preElement.style.position = 'relative'; // Ensure pre can position button
                preElement.appendChild(copyButton);
            }

        });
    }

    /**
     * Handles copying code to the clipboard.
     * @param {string} codeText - The text to copy.
     * @param {HTMLElement} buttonElement - The button that was clicked.
     * @private
     */
    async _handleCopyCode(codeText, buttonElement) {
        if (!navigator.clipboard) {
            console.warn('Clipboard API not available.');
            // Fallback or error message
            buttonElement.innerHTML = `<span class="icon">${this.utils.getIconSVG ? this.utils.getIconSVG('error') : 'Error'}</span>`;
            return;
        }
        try {
            await navigator.clipboard.writeText(codeText);
            buttonElement.innerHTML = `<span class="icon">${this.utils.getIconSVG ? this.utils.getIconSVG('check') : 'Copied!'}</span>`;
            this.utils.addClass(buttonElement, 'copied-feedback');

            setTimeout(() => {
                buttonElement.innerHTML = `<span class="icon">${this.utils.getIconSVG ? this.utils.getIconSVG('copy') : 'Copy'}</span>`;
                this.utils.removeClass(buttonElement, 'copied-feedback');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy code: ', err);
            buttonElement.innerHTML = `<span class="icon">${this.utils.getIconSVG ? this.utils.getIconSVG('error') : 'Error'}</span>`;
        }
    }


    /**
     * Formats a timestamp into a human-readable string.
     * @param {number} timestamp - The Unix timestamp (milliseconds).
     * @returns {string} Formatted time string.
     * @private
     */
    _formatTimestamp(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    /**
     * Creates and appends action buttons (Copy, Retry, Edit) to a message.
     * @param {Object} message - The message object.
     * @returns {HTMLElement} The div containing action buttons.
     * @private
     */
    _addMessageActions(message) {
        const actionsDiv = this.utils.createElement('div', { className: 'message-actions' });

        // Copy Button
        const copyBtn = this.utils.createElement('button', {
            className: 'message-action-btn copy-btn',
            title: 'Copy message',
            innerHTML: `<span class="icon">${this.utils.getIconSVG ? this.utils.getIconSVG('copy') : 'Copy'}</span>`
        });
        copyBtn.addEventListener('click', () => this._handleCopyMessage(message.content, copyBtn));
        actionsDiv.appendChild(copyBtn);

        // Retry Button (e.g., for user messages that failed or to regenerate assistant response)
        if (message.role === 'user' || (message.role === 'assistant' && !message.isError)) { // Allow retry for user or regen for assistant
            const retryBtn = this.utils.createElement('button', {
                className: 'message-action-btn retry-btn',
                title: message.role === 'user' ? 'Retry sending' : 'Regenerate response',
                innerHTML: `<span class="icon">${this.utils.getIconSVG ? this.utils.getIconSVG('refresh') : 'Retry'}</span>`
            });
            retryBtn.addEventListener('click', () => this._handleRetryMessage(message));
            actionsDiv.appendChild(retryBtn);
        }

        // Edit Button (typically for user messages)
        if (message.role === 'user') {
            const editBtn = this.utils.createElement('button', {
                className: 'message-action-btn edit-btn',
                title: 'Edit message',
                innerHTML: `<span class="icon">${this.utils.getIconSVG ? this.utils.getIconSVG('edit') : 'Edit'}</span>`
            });
            editBtn.addEventListener('click', () => this._handleEditMessage(message));
            actionsDiv.appendChild(editBtn);
        }
        return actionsDiv;
    }

    async _handleCopyMessage(content, buttonElement) {
        try {
            await navigator.clipboard.writeText(content);
            // Visual feedback
            const originalHTML = buttonElement.innerHTML;
            buttonElement.innerHTML = `<span class="icon">${this.utils.getIconSVG ? this.utils.getIconSVG('check') : 'Copied!'}</span>`;
            this.utils.addClass(buttonElement, 'copied-feedback');
            setTimeout(() => {
                buttonElement.innerHTML = originalHTML;
                this.utils.removeClass(buttonElement, 'copied-feedback');
            }, 2000);
            if (this.stateManager.get('userPreferences.soundEffectsEnabled') && window.parklandApp && window.parklandApp.soundEffects) {
                window.parklandApp.soundEffects.playSoundEffect('actionSuccess');
            }
        } catch (err) {
            console.error('Failed to copy message: ', err);
            this.stateManager.set('lastError', { message: 'Failed to copy message.', type: 'clipboard' });
            if (this.stateManager.get('userPreferences.soundEffectsEnabled') && window.parklandApp && window.parklandApp.soundEffects) {
                window.parklandApp.soundEffects.playSoundEffect('error');
            }
        }
    }

    _handleRetryMessage(message) {
        // Logic depends on whether it's a user message or assistant response
        // For user message: Resend to API
        // For assistant: Request regeneration
        console.log('Retry/Regenerate message:', message);
        this.stateManager.emit('messageRetryRequested', message); // App.js can listen to this
        if (this.stateManager.get('userPreferences.soundEffectsEnabled') && window.parklandApp && window.parklandApp.soundEffects) {
            window.parklandApp.soundEffects.playSoundEffect('actionInitiated');
        }
    }

    _handleEditMessage(message) {
        // Populate chat input with message content for editing
        console.log('Edit message:', message);
        this.stateManager.set('userInput', message.content);
        this.stateManager.emit('messageEditRequested', message); // App.js can focus input
        if (window.parklandApp && window.parklandApp.ui && window.parklandApp.ui.chatInput) {
            window.parklandApp.ui.chatInput.focus();
        }
    }


    /**
     * Scrolls the message container to the bottom.
     * @param {boolean} [force=false] - If true, scrolls even if auto-scroll is off.
     */
    scrollToBottom(force = false) {
        if (force || this.stateManager.get('userPreferences.autoScroll')) {
            this.utils.requestFrame(() => {
                this.container.scrollTop = this.container.scrollHeight;
            });
        }
    }

    /**
     * Creates the DOM structure for the typing indicator.
     * @returns {HTMLElement} The typing indicator element.
     * @private
     */
    _createTypingIndicator() {
        const indicatorDiv = this.utils.createElement('div', {
            className: 'message assistant typing-indicator-wrapper', // Reuse message structure
            role: 'status',
            'aria-live': 'polite'
        });

        const wrapperDiv = this.utils.createElement('div', { className: 'message-wrapper' });
        const avatarDiv = this.utils.createElement('div', { className: 'message-avatar assistant' }); // Use assistant avatar
        // Avatar styling could be character-specific if known
        const activeCharacter = this.stateManager.get('activeCharacter');
        if (activeCharacter && window.parklandApp && window.parklandApp.characterManager) {
            const charData = window.parklandApp.characterManager.getCharacterData(activeCharacter);
            this.utils.addClass(avatarDiv, activeCharacter);
            avatarDiv.textContent = charData ? charData.name[0].toUpperCase() : 'A';
            if(charData && charData.avatarUrl) { // If avatar URL is available
                avatarDiv.style.backgroundImage = `url('${charData.avatarUrl}')`;
                avatarDiv.textContent = ''; // Clear initial if image is used
            }
        } else {
            avatarDiv.textContent = 'A';
        }


        const contentDiv = this.utils.createElement('div', { className: 'message-content' });
        const bubbleDiv = this.utils.createElement('div', { className: 'typing-bubble' });

        for (let i = 0; i < 3; i++) {
            bubbleDiv.appendChild(this.utils.createElement('div', { className: 'typing-dot' }));
        }

        contentDiv.appendChild(bubbleDiv);
        wrapperDiv.appendChild(avatarDiv);
        wrapperDiv.appendChild(contentDiv);
        indicatorDiv.appendChild(wrapperDiv);

        return indicatorDiv;
    }

    /**
     * Shows or hides the typing indicator.
     * @param {boolean} show - True to show, false to hide.
     */
    showTypingIndicator(show) {
        if (show) {
            if (!this.typingIndicatorElement || !this.container.contains(this.typingIndicatorElement)) {
                this.typingIndicatorElement = this._createTypingIndicator();
                this.container.appendChild(this.typingIndicatorElement);
                this.utils.requestFrame(() => { // Ensure it's rendered before animating
                    this.typingIndicatorElement.classList.add('animate-in');
                });
            }
        } else {
            if (this.typingIndicatorElement && this.container.contains(this.typingIndicatorElement)) {
                this.typingIndicatorElement.classList.remove('animate-in'); // Optional: animate out
                // A fade-out animation could be added here via CSS or JS
                this.container.removeChild(this.typingIndicatorElement);
                this.typingIndicatorElement = null;
            }
        }
        if (show && this.stateManager.get('userPreferences.autoScroll') !== false) {
            this.scrollToBottom();
        }
    }
}

// If not using ES modules:
// window.ChatMessages = ChatMessages;
