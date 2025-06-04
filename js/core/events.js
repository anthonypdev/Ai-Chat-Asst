/**
 * Parkland AI - Opus Magnum Edition
 * Core Event Emitter
 *
 * Provides a simple and efficient publish-subscribe mechanism for application-wide event handling.
 * This allows different parts of the application to communicate without direct dependencies.
 */

class EventEmitter {
    constructor() {
        this.events = {}; // Stores event listeners: { eventName: [listener1, listener2, ...] }
        if (EventEmitter.instance) {
            // Enforce singleton pattern for a global app event bus if desired,
            // though the original code creates a global instance without strict singleton enforcement.
            // For this regeneration, we'll stick to the original pattern of direct instantiation.
        }
        // EventEmitter.instance = this; // Uncomment for strict singleton on the class itself.
        console.log('📢 EventEmitter initialized.');
    }

    /**
     * Subscribes a listener function to a specific event.
     * @param {string} eventName - The name of the event to subscribe to.
     * @param {Function} listener - The callback function to execute when the event is emitted.
     */
    on(eventName, listener) {
        if (typeof eventName !== 'string' || eventName.trim() === '') {
            console.error('EventEmitter.on: eventName must be a non-empty string.', { eventName, listener });
            return;
        }
        if (typeof listener !== 'function') {
            console.error(`EventEmitter.on: Listener for event "${eventName}" must be a function.`, { listener });
            return;
        }

        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }

        // Avoid adding the same listener multiple times for the same event
        if (!this.events[eventName].includes(listener)) {
            this.events[eventName].push(listener);
        }
    }

    /**
     * Unsubscribes a listener function from a specific event.
     * @param {string} eventName - The name of the event to unsubscribe from.
     * @param {Function} listenerToRemove - The specific listener function to remove.
     */
    off(eventName, listenerToRemove) {
        if (typeof eventName !== 'string' || eventName.trim() === '') {
            console.error('EventEmitter.off: eventName must be a non-empty string.', { eventName, listenerToRemove });
            return;
        }
        if (typeof listenerToRemove !== 'function') {
            console.error(`EventEmitter.off: Listener for event "${eventName}" must be a function to remove.`, { listenerToRemove });
            return;
        }

        if (!this.events[eventName]) {
            // console.warn(`EventEmitter.off: No event named "${eventName}" to unsubscribe from.`);
            return;
        }

        this.events[eventName] = this.events[eventName].filter(
            listener => listener !== listenerToRemove
        );

        // Clean up the event array if no listeners remain
        if (this.events[eventName].length === 0) {
            delete this.events[eventName];
        }
    }

    /**
     * Emits an event, calling all subscribed listeners with the provided arguments.
     * @param {string} eventName - The name of the event to emit.
     * @param {...*} args - Arguments to pass to the listener functions.
     */
    emit(eventName, ...args) {
        if (typeof eventName !== 'string' || eventName.trim() === '') {
            console.error('EventEmitter.emit: eventName must be a non-empty string.', { eventName, args });
            return;
        }

        const listeners = this.events[eventName];
        if (listeners && listeners.length > 0) {
            // Iterate over a copy of the listeners array in case a listener
            // modifies the original array (e.g., by calling off() within the listener)
            [...listeners].forEach(listener => {
                try {
                    listener(...args);
                } catch (error) {
                    console.error(`Error in listener for event "${eventName}":`, error);
                    // Optionally, re-emit as a specific error event
                    this.emit('error', {
                        type: 'ListenerError',
                        eventName: eventName,
                        originalError: error,
                        listenerSource: listener.toString().substring(0, 100) + '...' // Log part of the listener
                    });
                }
            });
        }
    }

    /**
     * Subscribes a listener that will be called only once for the specified event.
     * @param {string} eventName - The name of the event.
     * @param {Function} listener - The callback function.
     */
    once(eventName, listener) {
        if (typeof listener !== 'function') {
            console.error(`EventEmitter.once: Listener for event "${eventName}" must be a function.`, { listener });
            return;
        }
        const self = this; // Preserve 'this' context for the EventEmitter instance
        function onceWrapper(...args) {
            self.off(eventName, onceWrapper); // Use self.off
            listener(...args);
        }
        this.on(eventName, onceWrapper); // Use this.on
    }

    /**
     * Gets the number of listeners for a specific event.
     * @param {string} eventName - The name of the event.
     * @returns {number} The number of listeners.
     */
    listenerCount(eventName) {
        return this.events[eventName] ? this.events[eventName].length : 0;
    }

    /**
     * Removes all listeners for a specific event, or all listeners for all events if no eventName is provided.
     * @param {string} [eventName] - The name of the event. If not provided, all listeners for all events are removed.
     */
    removeAllListeners(eventName) {
        if (eventName && typeof eventName === 'string' && eventName.trim() !== '') {
            if (this.events[eventName]) {
                delete this.events[eventName];
            }
        } else if (!eventName) { // If eventName is null, undefined, or empty string (after trim check), remove all
            this.events = {};
        } else {
            console.error('EventEmitter.removeAllListeners: Invalid eventName provided if trying to remove specific listeners.');
        }
    }
}

// Create and export a global instance for the application to use
// This pattern makes it easy to access the same event bus throughout the application.
const appEvents = new EventEmitter();

// Optionally attach to window for easy debugging during development,
// but direct import/export is preferred for module-based architectures.
if (typeof window !== 'undefined') {
    window.appEvents = appEvents;
}

// If this were part of an ES module system, you would typically:
// export default appEvents;
// or
// export { EventEmitter, appEvents };
