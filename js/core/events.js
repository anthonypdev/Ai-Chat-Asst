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
        // No console log here, App.js will log after all core utils are confirmed loaded.
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
            return;
        }

        this.events[eventName] = this.events[eventName].filter(
            listener => listener !== listenerToRemove
        );

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
            [...listeners].forEach(listener => {
                try {
                    listener(...args);
                } catch (error) {
                    console.error(`Error in listener for event "${eventName}":`, error);
                    // Avoid emitting 'error' event from here if StateManager isn't guaranteed yet
                    // This could be a very early error.
                }
            });
        }
    }

    once(eventName, listener) {
        if (typeof listener !== 'function') {
            console.error(`EventEmitter.once: Listener for event "${eventName}" must be a function.`, { listener });
            return;
        }
        const self = this;
        function onceWrapper(...args) {
            self.off(eventName, onceWrapper);
            listener(...args);
        }
        // Bind the wrapper's 'this' to the listener's original context if it's a method
        // For simplicity, assuming listeners are standalone functions or bound methods.
        this.on(eventName, onceWrapper);
    }

    listenerCount(eventName) {
        return this.events[eventName] ? this.events[eventName].length : 0;
    }

    removeAllListeners(eventName) {
        if (eventName && typeof eventName === 'string' && eventName.trim() !== '') {
            if (this.events[eventName]) {
                delete this.events[eventName];
            }
        } else if (!eventName) {
            this.events = {};
        } else {
            console.error('EventEmitter.removeAllListeners: Invalid eventName provided.');
        }
    }
}

// Create and expose a global instance for the application to use
const appEventsInstance = new EventEmitter();

// Correctly expose as window.AppEvents for app.js
if (typeof window !== 'undefined') {
    window.AppEvents = appEventsInstance;
}

// If this were part of an ES module system, you would typically:
// export default appEventsInstance;
// or
// export { EventEmitter, appEventsInstance as AppEvents };
