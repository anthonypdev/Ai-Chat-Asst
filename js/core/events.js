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
        // Ensure this log happens to confirm constructor execution
        if (typeof console !== 'undefined') {
            console.log('📢 EventEmitter initialized.');
        }
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
            listenerCb => listenerCb !== listenerToRemove
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
            [...listeners].forEach(listener => { // Iterate over a copy
                try {
                    listener(...args);
                } catch (error) {
                    console.error(`Error in listener for event "${eventName}":`, error);
                    // Consider re-emitting as a specific 'emitter:error' event if robust error handling for listeners is needed
                    // this.emit('emitter:error', { sourceEvent: eventName, error: error, listener: listener.toString() });
                }
            });
        }
    }

    once(eventName, listener) {
        if (typeof listener !== 'function') {
            console.error(`EventEmitter.once: Listener for event "${eventName}" must be a function.`, { listener });
            return;
        }
        const self = this; // Correctly capture 'this' context of the EventEmitter instance
        function onceWrapper(...args) {
            self.off(eventName, onceWrapper); // Use captured 'self'
            listener(...args);
        }
        this.on(eventName, onceWrapper);
    }

    listenerCount(eventName) {
        if (typeof eventName !== 'string' || eventName.trim() === '') {
            return 0;
        }
        return this.events[eventName] ? this.events[eventName].length : 0;
    }

    removeAllListeners(eventName) {
        if (eventName && typeof eventName === 'string' && eventName.trim() !== '') {
            if (this.events[eventName]) {
                delete this.events[eventName];
            }
        } else if (eventName === undefined || eventName === null || eventName === '') { // Explicitly handle cases for removing all
            this.events = {};
        } else {
            console.error('EventEmitter.removeAllListeners: Invalid eventName provided if attempting to remove specific listeners.');
        }
    }
}

// Create and expose a global instance for the application to use
const appEventsInstance = new EventEmitter();

// Correctly expose as window.AppEvents for app.js, ensuring this runs
if (typeof window !== 'undefined') {
    window.AppEvents = appEventsInstance;
} else {
    // Fallback for non-browser environments if this script were ever used there (unlikely for this project)
    console.warn("EventEmitter: 'window' object not found. Global AppEvents instance may not be set.");
}

// If this script (events.js) executes successfully, window.AppEvents should now be defined.
// The console log in the constructor will confirm if the class instantiation happens.
