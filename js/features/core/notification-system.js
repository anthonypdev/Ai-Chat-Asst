/**
 * Parkland AI - Opus Magnum Edition
 * Advanced Notification System
 *
 * Provides comprehensive user feedback through toasts, modals, and inline notifications
 * with retry mechanisms, undo actions, and accessibility support.
 */

class NotificationSystem {
    constructor(utils, stateManager, eventEmitter) {
        if (!utils || !stateManager || !eventEmitter) {
            throw new Error("NotificationSystem requires utils, stateManager, and eventEmitter instances.");
        }
        
        this.utils = utils;
        this.stateManager = stateManager;
        this.eventEmitter = eventEmitter;
        
        this.notifications = new Map(); // Active notifications
        this.notificationHistory = []; // History for debugging/analytics
        this.maxHistorySize = 100;
        this.defaultDuration = 5000; // 5 seconds
        
        this.container = null;
        this.retryQueue = new Map(); // Queue for retry operations
        
        this._setupNotificationContainer();
        this._bindEvents();
        
        console.log('🔔 NotificationSystem initialized.');
    }

    /**
     * Creates the main notification container if it doesn't exist
     * @private
     */
    _setupNotificationContainer() {
        this.container = this.utils.$('#notification-container');
        if (!this.container) {
            this.container = this.utils.createElement('div', {
                id: 'notification-container',
                className: 'notification-container',
                'aria-live': 'polite',
                'aria-label': 'Notifications'
            });
            document.body.appendChild(this.container);
        }
    }

    /**
     * Binds event listeners for the notification system
     * @private
     */
    _bindEvents() {
        // Listen for global error events
        this.eventEmitter.on('errorDisplay', this.showError.bind(this));
        this.eventEmitter.on('notificationDisplay', this.show.bind(this));
        
        // Listen for app events that might need notifications
        this.eventEmitter.on('apiRequest:failed', this._handleApiFailure.bind(this));
        this.eventEmitter.on('apiRequest:retry', this._handleApiRetry.bind(this));
        this.eventEmitter.on('connection:lost', this._handleConnectionLoss.bind(this));
        this.eventEmitter.on('connection:restored', this._handleConnectionRestore.bind(this));
        
        // Handle retry queue processing
        this.eventEmitter.on('app:visible', this._processRetryQueue.bind(this));
    }

    /**
     * Shows a notification with specified type and options
     * @param {string} message - The notification message
     * @param {Object} options - Configuration options
     * @returns {string} Notification ID
     */
    show(message, options = {}) {
        const config = {
            type: 'info', // info, success, warning, error
            duration: this.defaultDuration,
            persistent: false,
            closable: true,
            actions: [],
            priority: 'normal', // low, normal, high, critical
            category: 'general',
            retryable: false,
            retryAction: null,
            undoable: false,
            undoAction: null,
            ...options
        };

        const id = this._generateNotificationId();
        const notification = this._createNotificationElement(id, message, config);
        
        this._addToContainer(notification, config.priority);
        this._addToMap(id, { message, config, element: notification, timestamp: Date.now() });
        this._addToHistory(id, message, config);
        
        // Auto-dismiss unless persistent
        if (!config.persistent && config.duration > 0) {
            setTimeout(() => this.dismiss(id), config.duration);
        }

        // Emit event for analytics/logging
        this.eventEmitter.emit('notification:shown', { id, message, config });
        
        return id;
    }

    /**
     * Shows a success notification
     * @param {string} message - Success message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    showSuccess(message, options = {}) {
        return this.show(message, { 
            type: 'success', 
            duration: 3000,
            ...options 
        });
    }

    /**
     * Shows a warning notification
     * @param {string} message - Warning message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    showWarning(message, options = {}) {
        return this.show(message, { 
            type: 'warning', 
            duration: 6000,
            ...options 
        });
    }

    /**
     * Shows an error notification with retry capability
     * @param {string} message - Error message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    showError(message, options = {}) {
        return this.show(message, { 
            type: 'error', 
            duration: 8000,
            persistent: options.critical || false,
            retryable: !!options.retryAction,
            ...options 
        });
    }

    /**
     * Shows a critical notification that requires user action
     * @param {string} message - Critical message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    showCritical(message, options = {}) {
        return this.show(message, { 
            type: 'error', 
            priority: 'critical',
            persistent: true,
            closable: false,
            ...options 
        });
    }

    /**
     * Shows a notification with undo capability
     * @param {string} message - Message describing the action
     * @param {Function} undoAction - Function to execute when undo is clicked
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    showUndoable(message, undoAction, options = {}) {
        return this.show(message, {
            type: 'success',
            duration: 8000,
            undoable: true,
            undoAction,
            actions: [
                {
                    text: 'Undo',
                    className: 'btn-undo',
                    action: () => {
                        if (typeof undoAction === 'function') {
                            undoAction();
                            this.showSuccess('Action undone');
                        }
                    }
                }
            ],
            ...options
        });
    }

    /**
     * Dismisses a notification by ID
     * @param {string} id - Notification ID
     * @param {boolean} animate - Whether to animate the dismissal
     */
    dismiss(id, animate = true) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        if (animate) {
            this.utils.addClass(notification.element, 'notification-dismissing');
            setTimeout(() => this._removeNotification(id), 300);
        } else {
            this._removeNotification(id);
        }

        this.eventEmitter.emit('notification:dismissed', { id });
    }

    /**
     * Dismisses all notifications of a specific type
     * @param {string} type - Notification type to dismiss
     */
    dismissType(type) {
        for (const [id, notification] of this.notifications) {
            if (notification.config.type === type) {
                this.dismiss(id);
            }
        }
    }

    /**
     * Dismisses all notifications
     */
    dismissAll() {
        for (const [id] of this.notifications) {
            this.dismiss(id, false);
        }
    }

    /**
     * Creates the DOM element for a notification
     * @param {string} id - Notification ID
     * @param {string} message - Notification message
     * @param {Object} config - Notification configuration
     * @returns {HTMLElement} Notification element
     * @private
     */
    _createNotificationElement(id, message, config) {
        const notification = this.utils.createElement('div', {
            className: `notification notification-${config.type} notification-${config.priority}`,
            id: `notification-${id}`,
            role: config.type === 'error' ? 'alert' : 'status',
            'aria-live': config.priority === 'critical' ? 'assertive' : 'polite'
        });

        // Icon
        const icon = this._getNotificationIcon(config.type);
        const iconElement = this.utils.createElement('div', {
            className: 'notification-icon',
            innerHTML: icon
        });

        // Content
        const content = this.utils.createElement('div', {
            className: 'notification-content'
        });

        const messageElement = this.utils.createElement('div', {
            className: 'notification-message',
            textContent: message
        });
        content.appendChild(messageElement);

        // Actions
        if (config.actions && config.actions.length > 0) {
            const actionsContainer = this.utils.createElement('div', {
                className: 'notification-actions'
            });

            config.actions.forEach(action => {
                const button = this.utils.createElement('button', {
                    className: `notification-action ${action.className || ''}`,
                    textContent: action.text
                });
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof action.action === 'function') {
                        action.action();
                    }
                    if (action.dismissOnClick !== false) {
                        this.dismiss(id);
                    }
                });
                actionsContainer.appendChild(button);
            });

            content.appendChild(actionsContainer);
        }

        // Retry button for retryable notifications
        if (config.retryable && config.retryAction) {
            const retryButton = this.utils.createElement('button', {
                className: 'notification-retry',
                textContent: 'Retry',
                title: 'Retry the failed operation'
            });
            retryButton.addEventListener('click', () => this._handleRetry(id, config));
            content.appendChild(retryButton);
        }

        // Close button
        if (config.closable) {
            const closeButton = this.utils.createElement('button', {
                className: 'notification-close',
                innerHTML: this.utils.getIconSVG ? this.utils.getIconSVG('close') : '×',
                title: 'Close notification',
                'aria-label': 'Close notification'
            });
            closeButton.addEventListener('click', () => this.dismiss(id));
            notification.appendChild(closeButton);
        }

        // Progress bar for timed notifications
        if (!config.persistent && config.duration > 0) {
            const progressBar = this.utils.createElement('div', {
                className: 'notification-progress'
            });
            progressBar.style.animationDuration = `${config.duration}ms`;
            notification.appendChild(progressBar);
        }

        notification.appendChild(iconElement);
        notification.appendChild(content);

        return notification;
    }

    /**
     * Adds notification to container with proper positioning based on priority
     * @param {HTMLElement} notification - Notification element
     * @param {string} priority - Notification priority
     * @private
     */
    _addToContainer(notification, priority) {
        if (priority === 'critical') {
            // Critical notifications go to the top
            this.container.insertBefore(notification, this.container.firstChild);
        } else {
            // Other notifications are appended
            this.container.appendChild(notification);
        }

        // Animate in
        this.utils.requestFrame(() => {
            this.utils.addClass(notification, 'notification-visible');
        });
    }

    /**
     * Removes notification from DOM and internal tracking
     * @param {string} id - Notification ID
     * @private
     */
    _removeNotification(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        if (this.container.contains(notification.element)) {
            this.container.removeChild(notification.element);
        }
        this.notifications.delete(id);
    }

    /**
     * Adds notification to internal tracking map
     * @param {string} id - Notification ID
     * @param {Object} data - Notification data
     * @private
     */
    _addToMap(id, data) {
        this.notifications.set(id, data);
    }

    /**
     * Adds notification to history for debugging/analytics
     * @param {string} id - Notification ID
     * @param {string} message - Notification message
     * @param {Object} config - Notification configuration
     * @private
     */
    _addToHistory(id, message, config) {
        this.notificationHistory.unshift({
            id,
            message,
            type: config.type,
            category: config.category,
            timestamp: Date.now(),
            dismissed: false
        });

        // Trim history if too large
        if (this.notificationHistory.length > this.maxHistorySize) {
            this.notificationHistory = this.notificationHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * Generates a unique notification ID
     * @returns {string} Unique ID
     * @private
     */
    _generateNotificationId() {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Gets the appropriate icon for notification type
     * @param {string} type - Notification type
     * @returns {string} Icon HTML
     * @private
     */
    _getNotificationIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        return icons[type] || icons.info;
    }

    /**
     * Handles retry action for a notification
     * @param {string} id - Notification ID
     * @param {Object} config - Notification configuration
     * @private
     */
    _handleRetry(id, config) {
        if (config.retryAction && typeof config.retryAction === 'function') {
            this.dismiss(id);
            this.show('Retrying...', { type: 'info', duration: 2000 });
            
            try {
                config.retryAction();
            } catch (error) {
                this.showError('Retry failed: ' + error.message);
            }
        }
    }

    /**
     * Handles API failure events
     * @param {Object} event - API failure event data
     * @private
     */
    _handleApiFailure(event) {
        const { error, retryAction, attempt = 1 } = event;
        
        if (attempt === 1) {
            this.showError(`API request failed: ${error.message}`, {
                retryable: !!retryAction,
                retryAction,
                category: 'api'
            });
        }
    }

    /**
     * Handles API retry events
     * @param {Object} event - API retry event data
     * @private
     */
    _handleApiRetry(event) {
        const { attempt } = event;
        this.show(`Retrying API request (attempt ${attempt})...`, {
            type: 'info',
            duration: 3000,
            category: 'api'
        });
    }

    /**
     * Handles connection loss
     * @private
     */
    _handleConnectionLoss() {
        this.showCritical('Connection lost. Please check your internet connection.', {
            category: 'connection',
            actions: [
                {
                    text: 'Retry Connection',
                    action: () => {
                        this.eventEmitter.emit('connection:retry');
                    }
                }
            ]
        });
    }

    /**
     * Handles connection restoration
     * @private
     */
    _handleConnectionRestore() {
        this.dismissType('error'); // Dismiss connection error notifications
        this.showSuccess('Connection restored!', {
            category: 'connection',
            duration: 3000
        });
    }

    /**
     * Processes the retry queue when app becomes visible
     * @private
     */
    _processRetryQueue() {
        if (this.retryQueue.size > 0) {
            this.show(`Processing ${this.retryQueue.size} queued operations...`, {
                type: 'info',
                duration: 3000
            });
            
            // Process queue items
            for (const [id, operation] of this.retryQueue) {
                try {
                    operation();
                    this.retryQueue.delete(id);
                } catch (error) {
                    console.error('Failed to process queued operation:', error);
                }
            }
        }
    }

    /**
     * Gets notification history for debugging/analytics
     * @returns {Array} Notification history
     */
    getHistory() {
        return [...this.notificationHistory];
    }

    /**
     * Gets active notifications count by type
     * @returns {Object} Count by type
     */
    getActiveCount() {
        const counts = { info: 0, success: 0, warning: 0, error: 0 };
        for (const [, notification] of this.notifications) {
            counts[notification.config.type] = (counts[notification.config.type] || 0) + 1;
        }
        return counts;
    }

    /**
     * Destroys the notification system
     */
    destroy() {
        this.dismissAll();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.notifications.clear();
        this.retryQueue.clear();
        this.notificationHistory = [];
        console.log('🔔 NotificationSystem destroyed.');
    }
}

// Global instance creation pattern
if (typeof window !== 'undefined') {
    window.NotificationSystem = NotificationSystem;
}