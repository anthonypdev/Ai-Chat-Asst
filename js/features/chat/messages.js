/**
 * Message Handler - Manages chat messages with theming and characters
 * Handles rendering, animations, and character integration
 */

import { EventBus } from '../../core/events.js';
import { AppState } from '../../core/state.js';
import { MarkdownRenderer } from './markdown.js';

export class MessageHandler {
    constructor() {
        this.markdownRenderer = new MarkdownRenderer();
        this.messageContainer = null;
        this.messagesInner = null;
        this.typingIndicator = null;
        this.messageQueue = [];
        this.isProcessingQueue = false;

        this.animationConfig = {
            messageAppear: { duration: 500, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
            messageExit: { duration: 300, easing: 'cubic-bezier(0.6, 0, 0.4, 1)' },
            typingBounce: { duration: 1500, easing: 'ease-in-out' }
        };

        this.init();
    }

    init() {
        this.messageContainer = document.getElementById('messagesContainer');
        this.messagesInner = document.getElementById('messagesInner');

        if (!this.messageContainer || !this.messagesInner) {
            console.error('Message container elements not found');
            return;
        }

        this.setupEventListeners();
        this.setupIntersectionObserver();
    }

    setupEventListeners() {
        EventBus.on('chat:add-message', this.addMessage.bind(this));
        EventBus.on('chat:add-system-message', this.addSystemMessage.bind(this));
        EventBus.on('chat:show-typing', this.showTypingIndicator.bind(this));
        EventBus.on('chat:hide-typing', this.hideTypingIndicator.bind(this));
        EventBus.on('chat:clear-messages', this.clearMessages.bind(this));
        EventBus.on('theme:changed', this.updateThemeElements.bind(this));
        EventBus.on('character:message', this.handleCharacterMessage.bind(this));
    }

    setupIntersectionObserver() {
        // Observe messages for animations and read status
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const message = entry.target;
                    message.classList.add('visible');

                    // Trigger character reactions for themed messages
                    const role = message.classList.contains('assistant') ? 'assistant' : 'user';
                    if (role === 'user') {
                        this.triggerCharacterReaction(message);
                    }
                }
            });
        }, { threshold: 0.3 });
    }

    async addMessage(data) {
        const { role, content, timestamp, ticketId, isIntro, error } = data;

        this.messageQueue.push({
            role,
            content,
            timestamp: timestamp || new Date().toISOString(),
            ticketId,
            isIntro: isIntro || false,
            error: error || false
        });

        if (!this.isProcessingQueue) {
            await this.processMessageQueue();
        }
    }

    async addSystemMessage(data) {
        await this.addMessage({
            ...data,
            role: 'assistant',
            isSystem: true
        });
    }

    async processMessageQueue() {
        if (this.messageQueue.length === 0) return;

        this.isProcessingQueue = true;

        while (this.messageQueue.length > 0) {
            const messageData = this.messageQueue.shift();
            await this.renderMessage(messageData);

            // Small delay between messages for natural feel
            if (this.messageQueue.length > 0) {
                await this.delay(150);
            }
        }

        this.isProcessingQueue = false;
    }

    async renderMessage(messageData) {
        const messageEl = this.createMessageElement(messageData);

        // Hide empty state if visible
        const emptyState = document.getElementById('emptyState');
        if (emptyState && emptyState.style.display !== 'none') {
            emptyState.style.display = 'none';
        }

        // Add to DOM with initial hidden state
        messageEl.style.opacity = '0';
        messageEl.style.transform = 'translateY(20px) scale(0.95)';
        this.messagesInner.appendChild(messageEl);

        // Set up intersection observer
        this.observer.observe(messageEl);

        // Animate in
        await this.animateMessageIn(messageEl);

        // Scroll to show new message
        this.scrollToBottom();

        // Trigger any post-render effects
        this.handlePostRenderEffects(messageEl, messageData);

        EventBus.emit('message:rendered', { element: messageEl, data: messageData });
    }

    createMessageElement(messageData) {
        const { role, content, timestamp, ticketId, isIntro, error, isSystem } = messageData;

        const messageEl = document.createElement('div');
        messageEl.className = this.getMessageClasses(role, isIntro, error, isSystem);
        messageEl.setAttribute('role', 'article');
        messageEl.setAttribute('aria-roledescription', `chat message from ${role}`);

        const time = new Date(timestamp).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        // Create avatar
        const avatarEl = this.createMessageAvatar(role);

        // Create content with markdown rendering
        const contentEl = this.createMessageContent(content, error);

        // Create metadata
        const metaEl = this.createMessageMeta(time, ticketId, role);

        // Assemble message structure
        const wrapperEl = document.createElement('div');
        wrapperEl.className = 'message-wrapper';

        wrapperEl.appendChild(avatarEl);

        const contentContainer = document.createElement('div');
        contentContainer.className = 'message-content';
        contentContainer.appendChild(contentEl);
        contentContainer.appendChild(metaEl);

        wrapperEl.appendChild(contentContainer);
        messageEl.appendChild(wrapperEl);

        // Store raw content for copy functionality
        messageEl.dataset.rawContent = content;

        return messageEl;
    }

    getMessageClasses(role, isIntro, error, isSystem) {
        const classes = ['message', role];

        if (isIntro) classes.push('message-intro');
        if (error) classes.push('message-error');
        if (isSystem) classes.push('message-system');

        return classes.join(' ');
    }

    createMessageAvatar(role) {
        const avatarEl = document.createElement('div');
        avatarEl.className = `message-avatar ${role}`;
        avatarEl.setAttribute('aria-hidden', 'true');

        if (role === 'user') {
            avatarEl.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="currentColor" style="width:1.2em; height:1.2em;">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
                </svg>
            `;
        } else {
            // Get current theme's brand icon
            const theme = AppState.currentTheme || 'default';
            const iconMap = {
                default: 'parkland-default-brand-icon-path',
                jaws: 'jaws-brand-fin-def',
                jurassic: 'jurassic-brand-amber-def'
            };

            const iconId = iconMap[theme];
            avatarEl.innerHTML = `
                <svg width="26" height="26" viewBox="0 0 100 100" fill="currentColor">
                    <use href="#${iconId}"/>
                </svg>
            `;
        }

        return avatarEl;
    }

    createMessageContent(content, isError) {
        const bubbleEl = document.createElement('div');
        bubbleEl.className = `message-bubble ${isError ? 'error-bubble' : ''}`;

        if (content && content.trim()) {
            const renderedContent = this.markdownRenderer.render(content);
            bubbleEl.innerHTML = renderedContent;
        } else {
            bubbleEl.innerHTML = '<span class="empty-bubble-placeholder"> </span>';
        }

        return bubbleEl;
    }

    createMessageMeta(time, ticketId, role) {
        const metaEl = document.createElement('div');
        metaEl.className = 'message-meta';

        const timeSpan = document.createElement('span');
        timeSpan.textContent = time;
        metaEl.appendChild(timeSpan);

        // Add ticket ID if present
        if (ticketId && role === 'assistant') {
            const ticketEl = document.createElement('span');
            ticketEl.className = 'message-ticket';
            ticketEl.title = `Support Ticket ID ${ticketId}`;
            ticketEl.innerHTML = `
                <svg class="icon icon-xs" viewBox="0 0 24 24">
                    <use href="#icon-ticket"/>
                </svg>
                ${ticketId}
            `;
            metaEl.appendChild(ticketEl);
        }

        // Add action buttons
        const actionsEl = this.createMessageActions();
        metaEl.appendChild(actionsEl);

        return metaEl;
    }

    createMessageActions() {
        const actionsEl = document.createElement('div');
        actionsEl.className = 'message-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'message-action-btn';
        copyBtn.setAttribute('data-no-sound', 'true');
        copyBtn.title = 'Copy Message Text';
        copyBtn.setAttribute('aria-label', 'Copy message to clipboard');
        copyBtn.innerHTML = `
            <svg class="icon icon-xs" viewBox="0 0 24 24">
                <use href="#icon-copy"/>
            </svg>
        `;

        copyBtn.addEventListener('click', (e) => {
            this.copyMessageContent(e.target.closest('.message-action-btn'));
        });

        actionsEl.appendChild(copyBtn);
        return actionsEl;
    }

    async animateMessageIn(messageEl) {
        const animation = messageEl.animate([
            {
                opacity: 0,
                transform: 'translateY(20px) scale(0.95)'
            },
            {
                opacity: 1,
                transform: 'translateY(0px) scale(1)'
            }
        ], this.animationConfig.messageAppear);

        await new Promise(resolve => {
            animation.addEventListener('finish', resolve);
        });
    }

    async showTypingIndicator() {
        if (this.typingIndicator) {
            return; // Already showing
        }

        this.typingIndicator = this.createTypingIndicator();
        this.messagesInner.appendChild(this.typingIndicator);

        // Animate in
        await this.animateMessageIn(this.typingIndicator);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        if (!this.typingIndicator) return;

        const indicator = this.typingIndicator;
        this.typingIndicator = null;

        // Animate out
        const animation = indicator.animate([
            { opacity: 1, transform: 'scale(1)' },
            { opacity: 0, transform: 'scale(0.8)' }
        ], this.animationConfig.messageExit);

        animation.addEventListener('finish', () => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        });
    }

    createTypingIndicator() {
        const theme = AppState.currentTheme || 'default';
        const iconMap = {
            default: 'parkland-default-brand-icon-path',
            jaws: 'jaws-brand-fin-def',
            jurassic: 'jurassic-brand-amber-def'
        };

        const indicatorEl = document.createElement('div');
        indicatorEl.className = 'message assistant typing-indicator-wrapper fade-in-element';

        indicatorEl.innerHTML = `
            <div class="message-wrapper">
                <div class="message-avatar assistant">
                    <svg width="26" height="26" viewBox="0 0 100 100">
                        <use href="#${iconMap[theme]}"/>
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

        return indicatorEl;
    }

    clearMessages() {
        if (!this.messagesInner) return;

        // Animate out all messages
        const messages = this.messagesInner.querySelectorAll('.message');
        const animations = Array.from(messages).map(message => {
            return message.animate([
                { opacity: 1, transform: 'scale(1)' },
                { opacity: 0, transform: 'scale(0.9) translateY(-10px)' }
            ], { duration: 200, easing: 'ease-in' });
        });

        Promise.all(animations.map(anim =>
            new Promise(resolve => anim.addEventListener('finish', resolve))
        )).then(() => {
            this.messagesInner.innerHTML = '';

            // Show empty state
            const emptyState = document.getElementById('emptyState');
            if (emptyState) {
                emptyState.style.display = 'flex';
            }
        });
    }

    copyMessageContent(buttonElement) {
        EventBus.emit('audio:play-ui-sound', { sound: 'click' });

        const messageEl = buttonElement.closest('.message');
        if (messageEl && messageEl.dataset.rawContent) {
            navigator.clipboard.writeText(messageEl.dataset.rawContent).then(() => {
                this.showCopyFeedback(buttonElement);
            }).catch(err => {
                console.error('Failed to copy message content:', err);
                EventBus.emit('audio:play-ui-sound', { sound: 'error' });
                alert('Could not copy text to clipboard. Your browser might not support this feature.');
            });
        }
    }

    showCopyFeedback(buttonElement) {
        const originalTitle = buttonElement.title;
        buttonElement.title = 'Copied!';
        buttonElement.classList.add('copied-feedback');

        const iconEl = buttonElement.querySelector('svg use');
        if (iconEl) {
            iconEl.setAttribute('href', '#icon-check-simple');
        }

        setTimeout(() => {
            buttonElement.title = originalTitle;
            buttonElement.classList.remove('copied-feedback');
            if (iconEl) {
                iconEl.setAttribute('href', '#icon-copy');
            }
        }, 1500);
    }

    scrollToBottom() {
        if (!this.messageContainer) return;

        this.messageContainer.scrollTo({
            top: this.messageContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    updateThemeElements(data) {
        // Update existing message avatars with new theme
        const assistantAvatars = this.messagesInner.querySelectorAll('.message.assistant .message-avatar svg use');
        const iconMap = {
            default: 'parkland-default-brand-icon-path',
            jaws: 'jaws-brand-fin-def',
            jurassic: 'jurassic-brand-amber-def'
        };

        const newIconId = iconMap[data.theme];
        assistantAvatars.forEach(use => {
            use.setAttribute('href', `#${newIconId}`);
        });
    }

    triggerCharacterReaction(messageEl) {
        const theme = AppState.currentTheme;
        if (!theme || theme === 'default') return;

        const content = messageEl.dataset.rawContent?.toLowerCase() || '';

        // Theme-specific reaction triggers
        if (theme === 'jaws') {
            if (content.includes('shark') || content.includes('bigger boat')) {
                EventBus.emit('character:trigger-reaction', {
                    type: 'shark-mention',
                    theme: 'jaws'
                });
            }
        } else if (theme === 'jurassic') {
            if (content.includes('raptor') || content.includes('clever girl')) {
                EventBus.emit('character:trigger-reaction', {
                    type: 'raptor-mention',
                    theme: 'jurassic'
                });
            }
        }
    }

    handleCharacterMessage(data) {
        // Handle messages from characters with special styling
        this.addMessage({
            role: 'assistant',
            content: data.content,
            timestamp: data.timestamp,
            character: data.character
        });
    }

    handlePostRenderEffects(messageEl, messageData) {
        // Add theme-specific visual effects after message renders
        const theme = AppState.currentTheme;

        if (theme === 'jaws' && messageData.role === 'assistant') {
            // Add subtle wave effect to assistant messages
            messageEl.style.animation = 'subtleWave 3s ease-in-out infinite';
        } else if (theme === 'jurassic' && messageData.role === 'assistant') {
            // Add amber glow effect
            messageEl.style.filter = 'drop-shadow(0 0 5px rgba(212, 172, 90, 0.3))';
        }
    }

    // Utility methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getMessageCount() {
        return this.messagesInner.querySelectorAll('.message').length;
    }

    getLastMessage() {
        const messages = this.messagesInner.querySelectorAll('.message');
        return messages[messages.length - 1] || null;
    }
}
