/**
 * Parkland AI Opus Magnum - Event Bus System
 * Advanced event management for complex theme and character interactions
 * Industry-leading event handling with performance optimization
 */

class EventBus {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
        this.wildcardListeners = new Set();
        this.eventHistory = [];
        this.maxHistorySize = 100;
        this.debugMode = false;
        this.eventQueue = [];
        this.isProcessingQueue = false;
        this.priorities = new Map();
        this.middleware = [];

        // Performance tracking
        this.metrics = {
            eventsEmitted: 0,
            eventsProcessed: 0,
            averageProcessingTime: 0,
            slowEvents: []
        };

        // Initialize error handling
        this.setupErrorHandling();
    }

    /**
     * Register an event listener with optional priority and namespace
     */
    on(event, handler, options = {}) {
        const {
            priority = 0,
            namespace = null,
            once = false,
            passive = false,
            condition = null
        } = options;

        if (typeof handler !== 'function') {
            throw new Error(`EventBus: Handler for '${event}' must be a function`);
        }

        const listenerMap = once ? this.onceListeners : this.listeners;

        if (!listenerMap.has(event)) {
            listenerMap.set(event, []);
        }

        const listener = {
            handler,
            priority,
            namespace,
            passive,
            condition,
            id: this.generateListenerId(),
            registeredAt: Date.now()
        };

        const listeners = listenerMap.get(event);
        listeners.push(listener);

        // Sort by priority (higher priority first)
        listeners.sort((a, b) => b.priority - a.priority);

        if (this.debugMode) {
            console.log(`EventBus: Registered ${once ? 'once' : 'on'} listener for '${event}'`, {
                priority,
                namespace,
                listenerId: listener.id
            });
        }

        return listener.id;
    }

    /**
     * Register a one-time event listener
     */
    once(event, handler, options = {}) {
        return this.on(event, handler, { ...options, once: true });
    }

    /**
     * Remove event listener(s)
     */
    off(event, handlerOrId) {
        if (typeof handlerOrId === 'string') {
            // Remove by listener ID
            return this.removeListenerById(event, handlerOrId);
        }

        if (typeof handlerOrId === 'function') {
            // Remove by handler function
            return this.removeListenerByHandler(event, handlerOrId);
        }

        if (handlerOrId === undefined) {
            // Remove all listeners for event
            this.listeners.delete(event);
            this.onceListeners.delete(event);
            return true;
        }

        return false;
    }

    /**
     * Remove listeners by namespace
     */
    offNamespace(namespace) {
        let removedCount = 0;

        for (const [event, listeners] of this.listeners) {
            const filtered = listeners.filter(l => l.namespace !== namespace);
            removedCount += listeners.length - filtered.length;
            this.listeners.set(event, filtered);
        }

        for (const [event, listeners] of this.onceListeners) {
            const filtered = listeners.filter(l => l.namespace !== namespace);
            removedCount += listeners.length - filtered.length;
            this.onceListeners.set(event, filtered);
        }

        if (this.debugMode) {
            console.log(`EventBus: Removed ${removedCount} listeners with namespace '${namespace}'`);
        }

        return removedCount;
    }

    /**
     * Emit an event with data and options
     */
    async emit(event, data = null, options = {}) {
        const startTime = performance.now();
        const {
            async = false,
            bubbles = true,
            cancelable = true,
            priority = false
        } = options;

        const eventObj = {
            type: event,
            data,
            timestamp: Date.now(),
            id: this.generateEventId(),
            bubbles,
            cancelable,
            defaultPrevented: false,
            propagationStopped: false,
            target: this
        };

        // Add to history
        this.addToHistory(eventObj);
        this.metrics.eventsEmitted++;

        // Process middleware
        for (const middleware of this.middleware) {
            try {
                await middleware(eventObj);
                if (eventObj.defaultPrevented) break;
            } catch (error) {
                console.error('EventBus: Middleware error:', error);
            }
        }

        if (eventObj.defaultPrevented) {
            return false;
        }

        if (priority) {
            // High priority events bypass queue
            return await this.processEvent(eventObj, async);
        }

        if (async || this.isProcessingQueue) {
            // Queue the event for async processing
            this.eventQueue.push({ eventObj, async });
            this.processQueue();
            return true;
        }

        const result = await this.processEvent(eventObj, false);

        // Track performance
        const processingTime = performance.now() - startTime;
        this.updateMetrics(event, processingTime);

        return result;
    }

    /**
     * Process a single event
     */
    async processEvent(eventObj, isAsync) {
        const { type: event } = eventObj;
        let hasListeners = false;

        try {
            // Process regular listeners
            if (this.listeners.has(event)) {
                hasListeners = true;
                await this.executeListeners(this.listeners.get(event), eventObj, isAsync);
            }

            // Process once listeners
            if (this.onceListeners.has(event)) {
                hasListeners = true;
                const onceListeners = this.onceListeners.get(event);
                await this.executeListeners(onceListeners, eventObj, isAsync);
                this.onceListeners.delete(event); // Remove after execution
            }

            // Process wildcard listeners
            for (const listener of this.wildcardListeners) {
                if (this.matchesWildcard(listener.pattern, event)) {
                    hasListeners = true;
                    await this.executeListener(listener, eventObj, isAsync);
                }
            }

            this.metrics.eventsProcessed++;

            if (this.debugMode && !hasListeners) {
                console.warn(`EventBus: No listeners for event '${event}'`);
            }

        } catch (error) {
            console.error(`EventBus: Error processing event '${event}':`, error);
            this.emit('error', { originalEvent: event, error }, { priority: true });
        }

        return !eventObj.defaultPrevented;
    }

    /**
     * Execute listeners for an event
     */
    async executeListeners(listeners, eventObj, isAsync) {
        for (const listener of listeners) {
            if (eventObj.propagationStopped) break;

            // Check condition if present
            if (listener.condition && !listener.condition(eventObj)) {
                continue;
            }

            await this.executeListener(listener, eventObj, isAsync);
        }
    }

    /**
     * Execute a single listener
     */
    async executeListener(listener, eventObj, isAsync) {
        try {
            if (isAsync && !listener.passive) {
                await listener.handler(eventObj);
            } else {
                const result = listener.handler(eventObj);
                if (result instanceof Promise && !listener.passive) {
                    await result;
                }
            }
        } catch (error) {
            console.error('EventBus: Listener error:', error);
            if (!listener.passive) {
                throw error;
            }
        }
    }

    /**
     * Process queued events
     */
    async processQueue() {
        if (this.isProcessingQueue || this.eventQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.eventQueue.length > 0) {
            const { eventObj, async } = this.eventQueue.shift();
            await this.processEvent(eventObj, async);
        }

        this.isProcessingQueue = false;
    }

    /**
     * Add middleware for event processing
     */
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new Error('EventBus: Middleware must be a function');
        }
        this.middleware.push(middleware);
    }

    /**
     * Register wildcard listener
     */
    onWildcard(pattern, handler, options = {}) {
        const listener = {
            pattern,
            handler,
            ...options,
            id: this.generateListenerId()
        };

        this.wildcardListeners.add(listener);
        return listener.id;
    }

    /**
     * Get event metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Clear event history
     */
    clearHistory() {
        this.eventHistory = [];
    }

    /**
     * Get recent events
     */
    getHistory(limit = 50) {
        return this.eventHistory.slice(-limit);
    }

    /**
     * Enable/disable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        if (enabled) {
            console.log('EventBus: Debug mode enabled');
        }
    }

    /**
     * Utility methods
     */
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateListenerId() {
        return `lst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    removeListenerById(event, id) {
        const removeFromMap = (map) => {
            if (!map.has(event)) return false;
            const listeners = map.get(event);
            const index = listeners.findIndex(l => l.id === id);
            if (index !== -1) {
                listeners.splice(index, 1);
                return true;
            }
            return false;
        };

        return removeFromMap(this.listeners) || removeFromMap(this.onceListeners);
    }

    removeListenerByHandler(event, handler) {
        const removeFromMap = (map) => {
            if (!map.has(event)) return false;
            const listeners = map.get(event);
            const index = listeners.findIndex(l => l.handler === handler);
            if (index !== -1) {
                listeners.splice(index, 1);
                return true;
            }
            return false;
        };

        return removeFromMap(this.listeners) || removeFromMap(this.onceListeners);
    }

    matchesWildcard(pattern, event) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(event);
    }

    addToHistory(eventObj) {
        this.eventHistory.push({
            ...eventObj,
            data: this.cloneEventData(eventObj.data)
        });

        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    cloneEventData(data) {
        try {
            return JSON.parse(JSON.stringify(data));
        } catch {
            return '[Unserializable Data]';
        }
    }

    updateMetrics(event, processingTime) {
        this.metrics.averageProcessingTime =
            (this.metrics.averageProcessingTime * (this.metrics.eventsProcessed - 1) + processingTime)
            / this.metrics.eventsProcessed;

        if (processingTime > 16) { // Longer than one frame
            this.metrics.slowEvents.push({
                event,
                processingTime,
                timestamp: Date.now()
            });

            // Keep only recent slow events
            if (this.metrics.slowEvents.length > 20) {
                this.metrics.slowEvents.shift();
            }
        }
    }

    setupErrorHandling() {
        this.on('error', (eventObj) => {
            console.error('EventBus: Unhandled event error:', eventObj.data);
        }, { namespace: 'eventbus:core', priority: 1000 });
    }

    /**
     * Destroy the event bus and clean up
     */
    destroy() {
        this.listeners.clear();
        this.onceListeners.clear();
        this.wildcardListeners.clear();
        this.eventHistory = [];
        this.eventQueue = [];
        this.middleware = [];
        this.metrics = {
            eventsEmitted: 0,
            eventsProcessed: 0,
            averageProcessingTime: 0,
            slowEvents: []
        };
    }
}

/**
 * Global event bus instance
 */
const eventBus = new EventBus();

/**
 * Predefined event types for type safety and documentation
 */
const EventTypes = {
    // Application lifecycle
    APP_INITIALIZED: 'app:initialized',
    APP_READY: 'app:ready',
    APP_ERROR: 'app:error',

    // Theme system
    THEME_CHANGE_START: 'theme:change:start',
    THEME_CHANGE_COMPLETE: 'theme:change:complete',
    THEME_TRANSITION_START: 'theme:transition:start',
    THEME_TRANSITION_COMPLETE: 'theme:transition:complete',

    // Character system
    CHARACTER_SPEAK_START: 'character:speak:start',
    CHARACTER_SPEAK_END: 'character:speak:end',
    CHARACTER_SWITCH: 'character:switch',
    CHARACTER_ACTION: 'character:action',

    // Chat system
    MESSAGE_SEND: 'chat:message:send',
    MESSAGE_RECEIVE: 'chat:message:receive',
    MESSAGE_ERROR: 'chat:message:error',
    CHAT_CLEAR: 'chat:clear',
    CHAT_HISTORY_LOAD: 'chat:history:load',

    // Voice system
    VOICE_START: 'voice:start',
    VOICE_END: 'voice:end',
    VOICE_ERROR: 'voice:error',
    SPEECH_START: 'speech:start',
    SPEECH_END: 'speech:end',

    // UI interactions
    SIDEBAR_TOGGLE: 'ui:sidebar:toggle',
    MODAL_OPEN: 'ui:modal:open',
    MODAL_CLOSE: 'ui:modal:close',
    BUTTON_CLICK: 'ui:button:click',

    // Animation system
    ANIMATION_START: 'animation:start',
    ANIMATION_COMPLETE: 'animation:complete',
    ANIMATION_CANCEL: 'animation:cancel',

    // API events
    API_REQUEST_START: 'api:request:start',
    API_REQUEST_SUCCESS: 'api:request:success',
    API_REQUEST_ERROR: 'api:request:error',

    // Audio events
    AUDIO_PLAY: 'audio:play',
    AUDIO_STOP: 'audio:stop',
    AUDIO_ERROR: 'audio:error'
};

/**
 * Event helpers for common patterns
 */
const EventHelpers = {
    /**
     * Emit a series of events in sequence
     */
    async emitSequence(events, delay = 0) {
        for (const event of events) {
            await eventBus.emit(event.type, event.data, event.options);
            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    },

    /**
     * Wait for a specific event
     */
    waitFor(eventType, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                eventBus.off(eventType, handler);
                reject(new Error(`Timeout waiting for event: ${eventType}`));
            }, timeout);

            const handler = (eventObj) => {
                clearTimeout(timeoutId);
                resolve(eventObj);
            };

            eventBus.once(eventType, handler);
        });
    },

    /**
     * Create a scoped event bus for a namespace
     */
    createScope(namespace) {
        return {
            on: (event, handler, options = {}) =>
                eventBus.on(event, handler, { ...options, namespace }),

            off: (event, handler) => eventBus.off(event, handler),

            emit: (event, data, options = {}) =>
                eventBus.emit(`${namespace}:${event}`, data, options),

            destroy: () => eventBus.offNamespace(namespace)
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventBus, eventBus, EventTypes, EventHelpers };
} else if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
    window.eventBus = eventBus;
    window.EventTypes = EventTypes;
    window.EventHelpers = EventHelpers;
}
