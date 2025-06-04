/**
 * Chat History Manager - Handles chat persistence and management
 * Manages multiple conversations with search and organization
 */

import { EventBus } from '../../core/events.js';
import { AppState } from '../../core/state.js';

export class ChatHistoryManager {
    constructor() {
        this.storageKey = 'parkland_chats_opus_final_v3';
        this.currentChatKey = 'parkland_current_chat_opus_final_v3';
        this.ticketCounterKey = 'parkland_ticket_counter_opus_final_v3';

        this.chats = {};
        this.currentChatId = null;
        this.ticketCounter = 1001;
        this.maxChats = 100; // Limit to prevent storage bloat
        this.maxMessagesPerChat = 500;

        this.searchIndex = new Map();
        this.init();
    }

    async init() {
        await this.loadChats();
        await this.loadCurrentChat();
        this.loadTicketCounter();
        this.setupEventListeners();
        this.rebuildSearchIndex();
    }

    setupEventListeners() {
        EventBus.on('chat:create-new', this.createNewChat.bind(this));
        EventBus.on('chat:load', this.loadChat.bind(this));
        EventBus.on('chat:delete', this.deleteChat.bind(this));
        EventBus.on('chat:message-added', this.onMessageAdded.bind(this));
        EventBus.on('chat:search', this.searchChats.bind(this));
        EventBus.on('theme:changed', this.updateChatTitles.bind(this));

        // Auto-save periodically
        setInterval(() => this.saveChats(), 30000); // Every 30 seconds
    }

    async createNewChat(data = {}) {
        const { title, isInitialSetup = false } = data;

        const id = this.generateChatId();
        const now = new Date().toISOString();

        // Generate contextual title
        const chatTitle = title || this.generateChatTitle();

        const newChat = {
            id,
            title: chatTitle,
            messages: [],
            ticketId: null,
            created: now,
            updated: now,
            theme: AppState.currentTheme || 'default',
            messageCount: 0,
            lastActivity: now
        };

        // Add themed intro message for non-default themes
        if (!isInitialSetup) {
            const introMessage = this.getThemedIntroMessage();
            if (introMessage) {
                newChat.messages.push({
                    role: 'assistant',
                    content: introMessage,
                    timestamp: new Date(Date.parse(now) + 10).toISOString(),
                    isIntro: true
                });
                newChat.messageCount = 1;
            }
        }

        this.chats[id] = newChat;
        this.currentChatId = id;

        await this.saveChats();
        await this.saveCurrentChat();

        this.updateSearchIndex(newChat);
        this.renderChatHistory();

        EventBus.emit('chat:created', { chatId: id, chat: newChat });

        if (!isInitialSetup) {
            EventBus.emit('audio:play-ui-sound', { sound: 'newMessage' });
        }

        return newChat;
    }

    async loadChat(data) {
        const { chatId, isInitialSetup = false } = data;

        if (!chatId || !this.chats[chatId]) {
            console.warn(`Chat ${chatId} not found`);
            return null;
        }

        const previousChatId = this.currentChatId;
        this.currentChatId = chatId;

        const chat = this.chats[chatId];
        chat.lastActivity = new Date().toISOString();

        await this.saveCurrentChat();
        await this.saveChats();

        // Clear current messages and load chat messages
        EventBus.emit('chat:clear-messages');

        if (chat.messages && chat.messages.length > 0) {
            for (const [index, message] of chat.messages.entries()) {
                setTimeout(() => {
                    EventBus.emit('chat:add-message', message);
                }, index * (isInitialSetup ? 10 : 50));
            }
        }

        this.renderChatHistory();

        EventBus.emit('chat:loaded', {
            chatId,
            chat,
            previousChatId,
            isInitialSetup
        });

        if (!isInitialSetup) {
            EventBus.emit('audio:play-ui-sound', { sound: 'click' });
        }

        return chat;
    }

    async deleteChat(data) {
        const { chatId, skipConfirmation = false } = data;

        if (!chatId || !this.chats[chatId]) {
            return false;
        }

        const chat = this.chats[chatId];

        if (!skipConfirmation) {
            const confirmed = confirm(
                `Are you ABSOLUTELY sure you want to PERMANENTLY ERASE this conversation (${chat.title})? This action is IRREVERSIBLE!`
            );

            if (!confirmed) {
                EventBus.emit('audio:play-ui-sound', { sound: 'click' });
                return false;
            }
        }

        // Remove from search index
        this.searchIndex.delete(chatId);

        // Delete the chat
        delete this.chats[chatId];

        // Handle current chat deletion
        if (this.currentChatId === chatId) {
            const latestChatId = this.getLatestChatId();
            if (latestChatId) {
                await this.loadChat({ chatId: latestChatId });
            } else {
                this.currentChatId = null;
                await this.saveCurrentChat();
                await this.createNewChat({ isInitialSetup: true });
            }
        }

        await this.saveChats();
        this.renderChatHistory();

        EventBus.emit('chat:deleted', { chatId, chat });
        EventBus.emit('audio:play-ui-sound', { sound: 'click' });

        return true;
    }

    onMessageAdded(data) {
        if (!this.currentChatId || !this.chats[this.currentChatId]) {
            return;
        }

        const chat = this.chats[this.currentChatId];

        // Add message to chat
        const message = {
            role: data.role,
            content: data.content,
            timestamp: data.timestamp || new Date().toISOString(),
            ticketId: data.ticketId,
            isIntro: data.isIntro || false,
            error: data.error || false
        };

        chat.messages.push(message);
        chat.messageCount = chat.messages.length;
        chat.updated = new Date().toISOString();
        chat.lastActivity = chat.updated;

        // Generate ticket ID for first real assistant message
        if (!chat.ticketId && data.role === 'assistant' && !data.isIntro && !data.error) {
            chat.ticketId = this.generateTicketId();
            message.ticketId = chat.ticketId;

            // Update chat title with ticket ID
            const titleBase = this.getTitleBaseForTheme(chat.theme);
            chat.title = `${titleBase}: ${chat.ticketId}`;
        }

        // Limit messages per chat
        if (chat.messages.length > this.maxMessagesPerChat) {
            chat.messages = chat.messages.slice(-this.maxMessagesPerChat);
            chat.messageCount = chat.messages.length;
        }

        this.updateSearchIndex(chat);
        this.saveChats();
        this.renderChatHistory();
    }

    searchChats(data) {
        const { query, limit = 20 } = data;

        if (!query || query.trim().length < 2) {
            return [];
        }

        const searchTerm = query.toLowerCase().trim();
        const results = [];

        for (const [chatId, chat] of Object.entries(this.chats)) {
            let score = 0;
            const matches = [];

            // Search in title
            if (chat.title.toLowerCase().includes(searchTerm)) {
                score += 10;
                matches.push('title');
            }

            // Search in messages
            for (const message of chat.messages) {
                if (message.content.toLowerCase().includes(searchTerm)) {
                    score += 1;
                    matches.push('message');
                }
            }

            // Search in ticket ID
            if (chat.ticketId && chat.ticketId.toLowerCase().includes(searchTerm)) {
                score += 5;
                matches.push('ticket');
            }

            if (score > 0) {
                results.push({
                    chatId,
                    chat,
                    score,
                    matches,
                    relevantMessages: this.getRelevantMessages(chat, searchTerm)
                });
            }
        }

        // Sort by score and recency
        results.sort((a, b) => {
            if (a.score !== b.score) {
                return b.score - a.score;
            }
            return new Date(b.chat.updated) - new Date(a.chat.updated);
        });

        return results.slice(0, limit);
    }

    renderChatHistory() {
        const container = document.getElementById('chatHistory');
        if (!container) return;

        container.innerHTML = '';

        const chatArray = Object.values(this.chats)
            .sort((a, b) => new Date(b.updated) - new Date(a.updated));

        if (chatArray.length === 0) {
            container.innerHTML = `
                <p class="empty-history-message fade-in-element">
                    No previous conversations found. Dive in, start your expedition, or simply begin typing!
                </p>
            `;
            return;
        }

        chatArray.forEach((chat, index) => {
            const item = this.createChatHistoryItem(chat, index);
            container.appendChild(item);
        });
    }

    createChatHistoryItem(chat, index) {
        const item = document.createElement('div');
        item.className = `chat-history-item ${chat.id === this.currentChatId ? 'active' : ''}`;
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.dataset.chatId = chat.id;
        item.style.animationDelay = `${index * 0.05}s`;
        item.classList.add('fade-in-element');

        // Event handlers
        item.onclick = (e) => {
            e.stopPropagation();
            EventBus.emit('chat:load', { chatId: chat.id });
        };

        item.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                EventBus.emit('chat:load', { chatId: chat.id });
            }
        };

        // Format dates
        const date = new Date(chat.created);
        const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const dateStr = date.toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() === new Date().getFullYear() ? undefined : '2-digit'
        });

        // Count real messages (excluding intro messages)
        const messageCount = chat.messages.filter(m => !m.isIntro).length;
        const displayTitle = chat.ticketId ? `Log ${chat.ticketId}` : (chat.title || `Chat from ${dateStr}`);

        item.innerHTML = `
            <div class="chat-history-info">
                <div class="chat-history-title" title="${displayTitle}">${displayTitle}</div>
                <div class="chat-history-meta">${messageCount} interaction${messageCount === 1 ? '' : 's'} • ${dateStr}, ${timeStr}</div>
            </div>
            <div class="chat-history-actions">
                <button class="message-action-btn" data-no-sound="true"
                        onclick="event.stopPropagation(); window.triggerDeleteChat('${chat.id}')"
                        title="Delete Chat"
                        aria-label="Delete chat titled ${displayTitle}">
                    <svg class="icon icon-xs" viewBox="0 0 24 24">
                        <use href="#icon-trash"/>
                    </svg>
                </button>
            </div>
        `;

        return item;
    }

    // Storage methods
    async loadChats() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.chats = JSON.parse(stored);
                this.validateAndCleanChats();
            }
        } catch (error) {
            console.error('Failed to load chats:', error);
            this.chats = {};
        }
    }

    async saveChats() {
        try {
            // Cleanup old chats if we exceed the limit
            this.cleanupOldChats();
            localStorage.setItem(this.storageKey, JSON.stringify(this.chats));
        } catch (error) {
            console.error('Failed to save chats:', error);
            // Try to free up space by removing oldest chats
            this.emergencyCleanup();
        }
    }

    async loadCurrentChat() {
        try {
            const stored = localStorage.getItem(this.currentChatKey);
            if (stored && this.chats[stored]) {
                this.currentChatId = stored;
            } else {
                this.currentChatId = this.getLatestChatId();
            }
        } catch (error) {
            console.error('Failed to load current chat:', error);
            this.currentChatId = null;
        }
    }

    async saveCurrentChat() {
        try {
            if (this.currentChatId) {
                localStorage.setItem(this.currentChatKey, this.currentChatId);
            } else {
                localStorage.removeItem(this.currentChatKey);
            }
        } catch (error) {
            console.error('Failed to save current chat:', error);
        }
    }

    // Utility methods
    generateChatId() {
        return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateChatTitle() {
        const theme = AppState.currentTheme || 'default';
        let maxSessionNum = 0;

        Object.values(this.chats).forEach(chat => {
            const match = chat.title.match(/^Session #(\d+)/);
            if (match && parseInt(match[1]) > maxSessionNum) {
                maxSessionNum = parseInt(match[1]);
            }
        });

        const sessionNum = maxSessionNum + 1;
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `Session #${sessionNum} (${time})`;
    }

    generateTicketId() {
        this.ticketCounter++;
        localStorage.setItem(this.ticketCounterKey, String(this.ticketCounter));
        return `OPMGNM-${String(Date.now()).slice(-6)}${String(this.ticketCounter).padStart(4, '0')}`;
    }

    loadTicketCounter() {
        try {
            const stored = localStorage.getItem(this.ticketCounterKey);
            if (stored) {
                this.ticketCounter = parseInt(stored) || 1001;
            }
        } catch (error) {
            console.error('Failed to load ticket counter:', error);
        }
    }

    getLatestChatId() {
        const chatIds = Object.keys(this.chats);
        if (chatIds.length === 0) return null;

        return chatIds.sort((a, b) => {
            const dateA = this.chats[a] ? new Date(this.chats[a].updated) : 0;
            const dateB = this.chats[b] ? new Date(this.chats[b].updated) : 0;
            return dateB - dateA;
        })[0];
    }

    getThemedIntroMessage() {
        const theme = AppState.currentTheme || 'default';
        const existingChatCount = Object.keys(this.chats).length;

        switch (theme) {
            case 'jaws':
                return existingChatCount > 0
                    ? "Alrighty, new log on deck! Captain SharkByte here, ready to chomp into this new mystery! What be the current, matey? Let's chart a course!"
                    : "AHOY THERE, SCALLYWAG! Welcome to the S.S. Problem Solver! Captain SharkByte reporting for duty! What digital kraken are we wrangling today? Lay it on me, and let's make some waves!";
            case 'jurassic':
                return existingChatCount > 0
                    ? "New expedition log initiated: RaptorLogic systems standing by. What anomaly or... *intriguing* data point requires our attention this cycle, Ranger?"
                    : "ACCESS GRANTED: RaptorLogic Mainframe. Ranger, welcome to the digital jungle. I trust your query doesn't involve... *unauthorized asset relocation*. Proceed. And remember... clever girl.";
            case 'default':
                return existingChatCount > 0
                    ? "Commencing new dialogue. Parkland AI is ready for your next query. How may I be of service?"
                    : null;
            default:
                return null;
        }
    }

    getTitleBaseForTheme(theme) {
        switch (theme) {
            case 'jaws': return "Captain's Log";
            case 'jurassic': return "Field Report";
            default: return "Support Log";
        }
    }

    updateChatTitles(data) {
        // Update titles when theme changes for consistency
        const { theme } = data;
        const titleBase = this.getTitleBaseForTheme(theme);

        Object.values(this.chats).forEach(chat => {
            if (chat.ticketId) {
                chat.title = `${titleBase}: ${chat.ticketId}`;
            }
        });

        this.saveChats();
        this.renderChatHistory();
    }

    validateAndCleanChats() {
        for (const [chatId, chat] of Object.entries(this.chats)) {
            if (!chat || typeof chat !== 'object' || !chat.id || !chat.created) {
                delete this.chats[chatId];
                continue;
            }

            // Ensure required properties
            chat.messages = chat.messages || [];
            chat.updated = chat.updated || chat.created;
            chat.lastActivity = chat.lastActivity || chat.updated;
            chat.messageCount = chat.messages.length;
            chat.theme = chat.theme || 'default';
        }
    }

    cleanupOldChats() {
        const chatArray = Object.values(this.chats)
            .sort((a, b) => new Date(b.updated) - new Date(a.updated));

        if (chatArray.length > this.maxChats) {
            const toDelete = chatArray.slice(this.maxChats);
            toDelete.forEach(chat => {
                delete this.chats[chat.id];
                this.searchIndex.delete(chat.id);
            });
        }
    }

    emergencyCleanup() {
        // Remove half of the oldest chats
        const chatArray = Object.values(this.chats)
            .sort((a, b) => new Date(a.updated) - new Date(b.updated));

        const toDelete = chatArray.slice(0, Math.floor(chatArray.length / 2));
        toDelete.forEach(chat => {
            delete this.chats[chat.id];
            this.searchIndex.delete(chat.id);
        });

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.chats));
        } catch (error) {
            console.error('Emergency cleanup failed:', error);
        }
    }

    // Search index methods
    rebuildSearchIndex() {
        this.searchIndex.clear();
        Object.values(this.chats).forEach(chat => {
            this.updateSearchIndex(chat);
        });
    }

    updateSearchIndex(chat) {
        const searchableText = [
            chat.title,
            chat.ticketId || '',
            ...chat.messages.map(m => m.content)
        ].join(' ').toLowerCase();

        this.searchIndex.set(chat.id, searchableText);
    }

    getRelevantMessages(chat, searchTerm) {
        return chat.messages
            .filter(message => message.content.toLowerCase().includes(searchTerm))
            .slice(0, 3) // Limit to 3 most relevant
            .map(message => ({
                role: message.role,
                content: message.content.length > 100
                    ? message.content.substring(0, 97) + '...'
                    : message.content,
                timestamp: message.timestamp
            }));
    }

    // Public API
    getCurrentChat() {
        return this.currentChatId ? this.chats[this.currentChatId] : null;
    }

    getChatCount() {
        return Object.keys(this.chats).length;
    }

    getTotalMessageCount() {
        return Object.values(this.chats).reduce((total, chat) => total + chat.messageCount, 0);
    }

    exportChatHistory() {
        return JSON.stringify({
            chats: this.chats,
            currentChatId: this.currentChatId,
            ticketCounter: this.ticketCounter,
            exportDate: new Date().toISOString()
        }, null, 2);
    }

    importChatHistory(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.chats && typeof data.chats === 'object') {
                this.chats = { ...this.chats, ...data.chats };
                this.validateAndCleanChats();
                this.rebuildSearchIndex();
                this.saveChats();
                this.renderChatHistory();
                return true;
            }
        } catch (error) {
            console.error('Failed to import chat history:', error);
        }
        return false;
    }
}

// Global function for delete button onclick
if (typeof window !== 'undefined') {
    window.triggerDeleteChat = (chatId) => {
        EventBus.emit('chat:delete', { chatId });
    };
}
