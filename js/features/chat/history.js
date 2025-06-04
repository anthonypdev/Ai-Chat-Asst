/**
 * Parkland AI - Opus Magnum Edition
 * ChatHistory Module
 *
 * Manages the display and persistence of chat history sessions in the sidebar.
 * Interacts with StateManager and localStorage.
 */

class ChatHistory {
    /**
     * @param {HTMLElement} container - The DOM element to render history items into (e.g., .chat-history-list).
     * @param {ParklandUtils} utils - Instance of ParklandUtils.
     * @param {EventEmitter} eventEmitter - Instance of EventEmitter.
     * @param {StateManager} stateManager - Instance of StateManager.
     */
    constructor(container, utils, eventEmitter, stateManager) {
        if (!container || !utils || !eventEmitter || !stateManager) {
            throw new Error("ChatHistory requires container, utils, eventEmitter, and stateManager.");
        }
        this.container = container;
        this.utils = utils;
        this.eventEmitter = eventEmitter;
        this.stateManager = stateManager;

        this.storageKey = 'parklandAI_chatSessions'; // Key for localStorage

        // Subscribe to events that might require history list update or active session save
        this.eventEmitter.on('chatSessionLoaded', () => this.renderHistoryList());
        this.eventEmitter.on('newChatStarted', () => {
            this.stateManager.set('activeSessionId', null); // Clear active session ID for a new chat
            this.renderHistoryList(); // Re-render to de-select any active item
        });

        console.log('💾 ChatHistory initialized.');
    }

    /**
     * Renders the list of chat sessions in the sidebar.
     * Highlights the active session if one is set in StateManager.
     */
    renderHistoryList() {
        this.container.innerHTML = ''; // Clear existing list
        const sessions = this._getStoredSessions();
        const activeSessionId = this.stateManager.get('activeSessionId');

        if (sessions.length === 0) {
            const emptyMessage = this.utils.createElement('p', {
                className: 'empty-history-message',
                textContent: 'No chat history yet. Start a new conversation!'
            });
            this.container.appendChild(emptyMessage);
            return;
        }

        const fragment = document.createDocumentFragment();
        sessions.sort((a, b) => b.lastUpdated - a.lastUpdated); // Show newest first

        sessions.forEach(session => {
            if (session && session.id && Array.isArray(session.messages)) {
                const itemElement = this._createHistoryItemElement(session);
                if (session.id === activeSessionId) {
                    this.utils.addClass(itemElement, 'active');
                }
                fragment.appendChild(itemElement);
            }
        });
        this.container.appendChild(fragment);
    }

    /**
     * Creates a DOM element for a single chat history session.
     * @param {Object} session - The session object { id, title, messages, lastUpdated, messageCount }.
     * @returns {HTMLElement} The created list item element.
     * @private
     */
    _createHistoryItemElement(session) {
        const title = session.title || this._generateSessionTitle(session.messages) || 'Chat Session';
        const messageCount = session.messages.length;
        const lastUpdated = this.utils.formatRelativeTime ?
                            this.utils.formatRelativeTime(new Date(session.lastUpdated)) :
                            new Date(session.lastUpdated).toLocaleDateString();

        const itemElement = this.utils.createElement('li', {
            className: 'chat-history-item fade-in-element', // fade-in-element for animation
            dataset: { sessionId: session.id },
            tabIndex: 0, // Make it focusable
            role: 'button',
            'aria-label': `Load chat session: ${title}`
        });

        const infoDiv = this.utils.createElement('div', { className: 'chat-history-info' });
        const titleDiv = this.utils.createElement('div', {
            className: 'chat-history-title',
            textContent: this.utils.truncate(title, 40) // Truncate title if too long
        });
        const metaDiv = this.utils.createElement('div', {
            className: 'chat-history-meta',
            textContent: `${messageCount} message${messageCount === 1 ? '' : 's'} - ${lastUpdated}`
        });

        infoDiv.appendChild(titleDiv);
        infoDiv.appendChild(metaDiv);

        const actionsDiv = this.utils.createElement('div', { className: 'chat-history-actions' });
        const deleteBtn = this.utils.createElement('button', {
            className: 'message-action-btn delete-history-btn', // Re-use styling from message actions
            title: 'Delete chat session',
            innerHTML: `<span class="icon">${this.utils.getIconSVG ? this.utils.getIconSVG('trash') : 'Del'}</span>`,
            dataset: { action: 'delete', sessionId: session.id }
        });

        actionsDiv.appendChild(deleteBtn);
        itemElement.appendChild(infoDiv);
        itemElement.appendChild(actionsDiv);

        // Event listeners for loading and deleting
        itemElement.addEventListener('click', (e) => {
            if (e.target.closest('.delete-history-btn')) {
                e.stopPropagation(); // Prevent load if delete is clicked
                this._handleDeleteChat(session.id, itemElement);
            } else {
                this._handleLoadChat(session.id);
            }
        });
        itemElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (e.target.closest('.delete-history-btn')) {
                     this._handleDeleteChat(session.id, itemElement);
                } else {
                    this._handleLoadChat(session.id);
                }
            }
        });

        return itemElement;
    }

    /**
     * Handles loading a selected chat session.
     * @param {string} sessionId - The ID of the session to load.
     * @private
     */
    _handleLoadChat(sessionId) {
        if (this.stateManager.get('debugMode')) {
            console.log(`Attempting to load chat session: ${sessionId}`);
        }
        this.loadChatSession(sessionId);
        if (window.parklandApp && window.parklandApp.soundEffects) {
            window.parklandApp.soundEffects.playSoundEffect('uiClick');
        }
    }

    /**
     * Handles deleting a chat session.
     * @param {string} sessionId - The ID of the session to delete.
     * @param {HTMLElement} itemElement - The DOM element of the history item to animate/remove.
     * @private
     */
    async _handleDeleteChat(sessionId, itemElement) {
        if (!confirm(`Are you sure you want to delete this chat session? This action cannot be undone.`)) {
            return;
        }

        if (this.stateManager.get('debugMode')) {
            console.log(`Attempting to delete chat session: ${sessionId}`);
        }

        this.utils.addClass(itemElement, 'is-deleting'); // Trigger CSS animation for deletion

        // Wait for animation to complete before removing from DOM and storage
        // The CSS transition for 'is-deleting' is 0.4s (opacity) + 0.5s (delay for transform/height)
        // So, a total of around 0.9s to 1s.
        // Or, listen to transitionend event, but setTimeout is simpler here.
        await this.utils.wait(900); // Matches transition and delay

        this.deleteChatSession(sessionId); // Deletes from storage and re-renders list

        if (this.stateManager.get('activeSessionId') === sessionId) {
            this.stateManager.set('activeSessionId', null);
            this.stateManager.clearChatHistory(); // Clear main chat view
            this.eventEmitter.emit('newChatStarted'); // Effectively start a new empty chat
        }
        if (window.parklandApp && window.parklandApp.soundEffects) {
            window.parklandApp.soundEffects.playSoundEffect('itemDeleted');
        }
    }

    /**
     * Adds the current chat (from StateManager) to history or updates an existing one.
     * This is typically called when a message is sent/received in an ongoing chat.
     */
    addOrUpdateCurrentSession() {
        const currentChatMessages = this.stateManager.get('chatHistory');
        if (!currentChatMessages || currentChatMessages.length === 0) return;

        let activeSessionId = this.stateManager.get('activeSessionId');
        const sessions = this._getStoredSessions();
        let sessionUpdated = false;

        if (activeSessionId) { // Update existing session
            const sessionIndex = sessions.findIndex(s => s.id === activeSessionId);
            if (sessionIndex > -1) {
                sessions[sessionIndex].messages = [...currentChatMessages]; // Update messages
                sessions[sessionIndex].lastUpdated = Date.now();
                sessions[sessionIndex].title = this._generateSessionTitle(currentChatMessages) || sessions[sessionIndex].title;
                sessionUpdated = true;
            } else { // ID was set, but session not found (e.g., deleted elsewhere); treat as new
                activeSessionId = null;
            }
        }

        if (!activeSessionId) { // Create new session
            activeSessionId = `session-${Date.now()}-${this.utils.generateId('')}`;
            this.stateManager.set('activeSessionId', activeSessionId, true); // Silently set for this new session
            sessions.push({
                id: activeSessionId,
                title: this._generateSessionTitle(currentChatMessages),
                messages: [...currentChatMessages],
                lastUpdated: Date.now()
            });
            sessionUpdated = true;
        }

        if (sessionUpdated) {
            this._storeSessions(sessions);
            this.renderHistoryList(); // Re-render to reflect changes (e.g., new title, order)
        }
    }


    /**
     * Loads a specific chat session from localStorage into the StateManager.
     * @param {string} sessionId - The ID of the session to load.
     */
    loadChatSession(sessionId) {
        const sessions = this._getStoredSessions();
        const sessionToLoad = sessions.find(s => s.id === sessionId);

        if (sessionToLoad) {
            this.stateManager.set('chatHistory', [...sessionToLoad.messages]); // Load messages
            this.stateManager.set('activeSessionId', sessionId);          // Set as active
            this.eventEmitter.emit('chatSessionLoaded', { sessionId, messages: sessionToLoad.messages });
            this.renderHistoryList(); // Re-render to highlight the newly active session
            if(window.parklandApp && window.parklandApp.ui && window.parklandApp.ui.chatInput) {
                 window.parklandApp.ui.chatInput.focus();
            }
        } else {
            console.warn(`Session with ID ${sessionId} not found.`);
            this.stateManager.set('lastError', { message: `Chat session not found.`, type: 'history' });
            // Optionally clear active session ID if it was pointing to a non-existent one
            if (this.stateManager.get('activeSessionId') === sessionId) {
                this.stateManager.set('activeSessionId', null);
                this.renderHistoryList();
            }
        }
    }

    /**
     * Deletes a chat session from localStorage.
     * @param {string} sessionId - The ID of the session to delete.
     */
    deleteChatSession(sessionId) {
        let sessions = this._getStoredSessions();
        sessions = sessions.filter(s => s.id !== sessionId);
        this._storeSessions(sessions);
        this.renderHistoryList(); // Re-render the updated list
    }

    /**
     * Retrieves all chat sessions from localStorage.
     * @returns {Array<Object>} An array of session objects.
     * @private
     */
    _getStoredSessions() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error retrieving chat sessions from localStorage:', error);
            this.stateManager.set('lastError', { message: 'Failed to load chat history.', type: 'storage', originalError: error });
            return [];
        }
    }

    /**
     * Stores all chat sessions to localStorage.
     * @param {Array<Object>} sessions - An array of session objects to store.
     * @private
     */
    _storeSessions(sessions) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(sessions));
        } catch (error) {
            console.error('Error storing chat sessions to localStorage:', error);
            this.stateManager.set('lastError', { message: 'Failed to save chat history.', type: 'storage', originalError: error });
        }
    }

    /**
     * Generates a concise title for a chat session based on its messages.
     * Typically uses the first few words of the first user message.
     * @param {Array<Object>} messages - The array of messages in the session.
     * @returns {string} A generated title string.
     * @private
     */
    _generateSessionTitle(messages) {
        if (!messages || messages.length === 0) return 'New Chat';

        const firstUserMessage = messages.find(m => m.role === 'user' && m.content);
        if (firstUserMessage) {
            // Take first ~5 words or ~30 characters
            const contentPreview = firstUserMessage.content.split(' ').slice(0, 5).join(' ');
            return this.utils.truncate(contentPreview, 30) || 'Chat';
        }
        return 'Assistant Chat'; // Fallback if no user message
    }
}

// If not using ES modules:
// window.ChatHistory = ChatHistory;
