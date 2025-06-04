/**
 * API Error Handler - Manages error states and user feedback
 * Provides themed error messages and recovery strategies
 */

import { EventBus } from '../../core/events.js';
import { AppState } from '../../core/state.js';

export class APIErrorHandler {
    constructor() {
        this.errorHistory = [];
        this.maxErrorHistory = 50;
        this.connectionRetryAttempts = 0;
        this.maxConnectionRetries = 3;
        this.retryDelay = 2000; // 2 seconds

        this.errorCategories = {
            NETWORK: 'network',
            AUTH: 'authentication',
            QUOTA: 'quota',
            SERVER: 'server',
            CLIENT: 'client',
            UNKNOWN: 'unknown'
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        EventBus.on('api:error', this.handleAPIError.bind(this));
        EventBus.on('api:connection-lost', this.handleConnectionLost.bind(this));
        EventBus.on('api:connection-restored', this.handleConnectionRestored.bind(this));

        // Monitor network status
        window.addEventListener('online', () => {
            this.connectionRetryAttempts = 0;
            EventBus.emit('error:connection-restored');
        });

        window.addEventListener('offline', () => {
            this.handleOfflineState();
        });
    }

    handleAPIError(data) {
        const { error, context = {} } = data;

        const errorInfo = this.analyzeError(error);
        this.logError(errorInfo, context);

        const userMessage = this.generateUserFriendlyMessage(errorInfo);
        const recoveryActions = this.getRecoveryActions(errorInfo);

        // Show error to user
        this.displayError(userMessage, recoveryActions, errorInfo);

        // Attempt automatic recovery if appropriate
        if (errorInfo.autoRecoverable) {
            this.attemptAutoRecovery(errorInfo, context);
        }

        EventBus.emit('error:handled', { errorInfo, userMessage, recoveryActions });
    }

    analyzeError(error) {
        const errorInfo = {
            originalError: error,
            category: this.errorCategories.UNKNOWN,
            severity: 'medium',
            autoRecoverable: false,
            userAction: null,
            technicalDetails: error.message || 'Unknown error',
            timestamp: new Date().toISOString()
        };

        // Analyze error type
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorInfo.category = this.errorCategories.NETWORK;
            errorInfo.autoRecoverable = true;
            errorInfo.userAction = 'Check your internet connection';
        } else if (error.status) {
            switch (error.status) {
                case 401:
                case 403:
                    errorInfo.category = this.errorCategories.AUTH;
                    errorInfo.severity = 'high';
                    errorInfo.userAction = 'Check API key configuration';
                    break;
                case 429:
                    errorInfo.category = this.errorCategories.QUOTA;
                    errorInfo.autoRecoverable = true;
                    errorInfo.userAction = 'Wait before sending another message';
                    break;
                case 500:
                case 502:
                case 503:
                case 504:
                    errorInfo.category = this.errorCategories.SERVER;
                    errorInfo.autoRecoverable = true;
                    errorInfo.userAction = 'Try again in a few moments';
                    break;
                case 400:
                    errorInfo.category = this.errorCategories.CLIENT;
                    errorInfo.userAction = 'Check your input and try again';
                    break;
            }
        } else if (error.message) {
            // Analyze error message content
            const message = error.message.toLowerCase();

            if (message.includes('api key') || message.includes('auth')) {
                errorInfo.category = this.errorCategories.AUTH;
                errorInfo.severity = 'high';
            } else if (message.includes('network') || message.includes('connection')) {
                errorInfo.category = this.errorCategories.NETWORK;
                errorInfo.autoRecoverable = true;
            } else if (message.includes('quota') || message.includes('limit')) {
                errorInfo.category = this.errorCategories.QUOTA;
            } else if (message.includes('timeout')) {
                errorInfo.category = this.errorCategories.NETWORK;
                errorInfo.autoRecoverable = true;
            }
        }

        return errorInfo;
    }

    generateUserFriendlyMessage(errorInfo) {
        const theme = AppState.currentTheme || 'default';
        const { category, originalError } = errorInfo;

        const baseMessages = this.getBaseErrorMessages(category, originalError);

        if (theme === 'default') {
            return baseMessages.default;
        }

        return this.getThemedErrorMessage(theme, category, baseMessages);
    }

    getBaseErrorMessages(category, error) {
        const messages = {
            default: "I'm encountering some technical difficulties. Please try your request again in a few moments.",
            jaws: "Blimey! Something's gone fishy in the digital depths!",
            jurassic: "System anomaly detected. Initiating containment protocols..."
        };

        switch (category) {
            case this.errorCategories.AUTH:
                messages.default = "Authentication with the AI service has failed. Please ensure your Access Token is correctly entered and valid in the Application Settings.";
                messages.jaws = "AVAST! The digital lockbox be sealed tighter than Davy Jones' locker! Check yer API credentials, matey!";
                messages.jurassic = "CONTAINMENT BREACH! Unauthorized access attempt detected! Your InGen credentials appear to be... *extinct*. Re-authenticate immediately, Ranger!";
                break;

            case this.errorCategories.QUOTA:
                messages.default = "I have temporarily reached my request processing capacity. Please attempt your query again shortly.";
                messages.jaws = "BATTEN DOWN THE HATCHES! We've hit our message quota harder than a harpoon to the hull! The digital seas need time to calm, savvy?";
                messages.jurassic = "WARNING: EMERGENCY POWER SHUNT! The mainframe has exceeded designated processing quotas. Mr. Hammond is... displeased. Stand by for system stabilization.";
                break;

            case this.errorCategories.NETWORK:
                messages.default = "I'm having trouble connecting to the network. Please verify your internet connection and try again.";
                messages.jaws = "LOST IN THE BERMUDA TRIANGLE OF BYTES! My connection to the digital mainland has vanished like a ghost ship! Check yer own rigging, mate!";
                messages.jurassic = "COMMUNICATIONS ARRAY FAILURE! A severe electromagnetic storm has disrupted our uplink to Isla Nublar Command! Check your connection, Ranger!";
                break;

            case this.errorCategories.SERVER:
                messages.default = "The AI service is currently experiencing high demand. Please try again in a few moments.";
                messages.jaws = "KRAKEN ATTACK ON THE SERVER FARM! The digital sea monsters be overwhelmin' our systems! Give 'em a moment to retreat to the depths!";
                messages.jurassic = "CRITICAL SYSTEM OVERLOAD! The mainframe is experiencing a... *raptor pack attack* of data requests! Stand clear until the chaos subsides!";
                break;

            case this.errorCategories.CLIENT:
                messages.default = "There seems to be an issue with your request. Please check your input and try again.";
                messages.jaws = "SOMETHING'S ROTTEN IN THE STATE OF DENMARK... er, yer message! Check what ye've typed and cast yer line again!";
                messages.jurassic = "INPUT VALIDATION FAILURE! Your query contains... *unexpected genetic sequences*. Please verify your data and resubmit, Ranger.";
                break;
        }

        return messages;
    }

    getThemedErrorMessage(theme, category, baseMessages) {
        return baseMessages[theme] || baseMessages.default;
    }

    getRecoveryActions(errorInfo) {
        const actions = [];

        switch (errorInfo.category) {
            case this.errorCategories.AUTH:
                actions.push({
                    label: 'Open Settings',
                    action: 'openSettings',
                    primary: true
                });
                actions.push({
                    label: 'Check API Key',
                    action: 'checkApiKey',
                    primary: false
                });
                break;

            case this.errorCategories.QUOTA:
                actions.push({
                    label: 'Try Again Later',
                    action: 'retryLater',
                    primary: true,
                    delay: 60000 // 1 minute
                });
                break;

            case this.errorCategories.NETWORK:
                actions.push({
                    label: 'Retry Now',
                    action: 'retryNow',
                    primary: true
                });
                actions.push({
                    label: 'Check Connection',
                    action: 'checkConnection',
                    primary: false
                });
                break;

            case this.errorCategories.SERVER:
                actions.push({
                    label: 'Retry in 30s',
                    action: 'retryDelayed',
                    primary: true,
                    delay: 30000
                });
                break;

            default:
                actions.push({
                    label: 'Try Again',
                    action: 'retryNow',
                    primary: true
                });
        }

        return actions;
    }

    displayError(message, actions, errorInfo) {
        // Create error message element
        const errorData = {
            role: 'assistant',
            content: message,
            timestamp: new Date().toISOString(),
            error: true,
            errorInfo: errorInfo,
            actions: actions
        };

        EventBus.emit('chat:add-message', errorData);
        EventBus.emit('audio:play-ui-sound', { sound: 'error' });

        // Show temporary toast notification for high severity errors
        if (errorInfo.severity === 'high') {
            this.showErrorToast(message, actions);
        }
    }

    showErrorToast(message, actions) {
        // Create a temporary toast notification
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--error);
            color: white;
            padding: 16px 20px;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-xl);
            z-index: 10000;
            max-width: 400px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;

        const shortMessage = message.length > 100 ? message.substring(0, 97) + '...' : message;
        toast.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px;">Error</div>
            <div style="font-size: 14px; line-height: 1.4;">${shortMessage}</div>
        `;

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        // Remove after delay
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }

    attemptAutoRecovery(errorInfo, context) {
        if (!errorInfo.autoRecoverable) return;

        const { category } = errorInfo;

        switch (category) {
            case this.errorCategories.NETWORK:
                this.attemptNetworkRecovery(context);
                break;
            case this.errorCategories.QUOTA:
                this.scheduleRetry(context, 60000); // Retry in 1 minute
                break;
            case this.errorCategories.SERVER:
                this.scheduleRetry(context, 30000); // Retry in 30 seconds
                break;
        }
    }

    attemptNetworkRecovery(context) {
        if (this.connectionRetryAttempts >= this.maxConnectionRetries) {
            return;
        }

        this.connectionRetryAttempts++;

        setTimeout(async () => {
            if (navigator.onLine) {
                try {
                    // Test connection
                    const response = await fetch('https://api.anthropic.com', {
                        method: 'HEAD',
                        mode: 'no-cors'
                    });

                    EventBus.emit('error:recovery-success', {
                        method: 'network',
                        attempts: this.connectionRetryAttempts
                    });

                    // Reset retry counter
                    this.connectionRetryAttempts = 0;

                    // Optionally retry the original request
                    if (context.retryCallback) {
                        context.retryCallback();
                    }
                } catch (error) {
                    if (this.connectionRetryAttempts < this.maxConnectionRetries) {
                        this.attemptNetworkRecovery(context);
                    }
                }
            }
        }, this.retryDelay);
    }

    scheduleRetry(context, delay) {
        setTimeout(() => {
            if (context.retryCallback) {
                context.retryCallback();
            }
        }, delay);
    }

    handleConnectionLost() {
        const message = this.generateConnectionLostMessage();
        this.displayError(message, [
            {
                label: 'Check Connection',
                action: 'checkConnection',
                primary: true
            }
        ], {
            category: this.errorCategories.NETWORK,
            severity: 'high'
        });
    }

    handleConnectionRestored() {
        const message = this.generateConnectionRestoredMessage();

        EventBus.emit('chat:add-system-message', {
            content: message,
            timestamp: new Date().toISOString()
        });

        EventBus.emit('audio:play-ui-sound', { sound: 'success' });
    }

    handleOfflineState() {
        const theme = AppState.currentTheme || 'default';
        let message = "You're currently offline. Please check your internet connection.";

        if (theme === 'jaws') {
            message = "MAYDAY! MAYDAY! We've lost contact with the digital mainland! Check yer communication array, mate!";
        } else if (theme === 'jurassic') {
            message = "COMMUNICATION BLACKOUT! All external links to the mainland have been severed! Check your network infrastructure, Ranger!";
        }

        this.displayError(message, [], {
            category: this.errorCategories.NETWORK,
            severity: 'high'
        });
    }

    generateConnectionLostMessage() {
        const theme = AppState.currentTheme || 'default';

        switch (theme) {
            case 'jaws':
                return "ABANDON SHIP! We've lost our digital anchor! The connection to the AI mothership has been severed! Check yer lines and rigging!";
            case 'jurassic':
                return "RED ALERT! Communication array has gone dark! We've lost contact with the AI mainframe! Implement emergency protocols!";
            default:
                return "Connection to the AI service has been lost. Please check your internet connection.";
        }
    }

    generateConnectionRestoredMessage() {
        const theme = AppState.currentTheme || 'default';

        switch (theme) {
            case 'jaws':
                return "LAND HO! The digital seas have calmed and our connection be restored! Back to sailin' smooth waters, matey!";
            case 'jurassic':
                return "COMMUNICATION RESTORED! Link to AI mainframe reestablished. All systems nominal. Welcome back online, Ranger.";
            default:
                return "Connection restored. AI services are now available.";
        }
    }

    logError(errorInfo, context) {
        const logEntry = {
            ...errorInfo,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href,
            theme: AppState.currentTheme
        };

        this.errorHistory.unshift(logEntry);

        // Limit history size
        if (this.errorHistory.length > this.maxErrorHistory) {
            this.errorHistory = this.errorHistory.slice(0, this.maxErrorHistory);
        }

        // Log to console for debugging
        console.error('API Error:', logEntry);
    }

    // Public API methods
    getErrorHistory() {
        return [...this.errorHistory];
    }

    getErrorStats() {
        const total = this.errorHistory.length;
        const categories = {};
        const recentErrors = this.errorHistory.filter(
            error => Date.now() - new Date(error.timestamp).getTime() < 24 * 60 * 60 * 1000
        );

        this.errorHistory.forEach(error => {
            categories[error.category] = (categories[error.category] || 0) + 1;
        });

        return {
            totalErrors: total,
            recentErrors: recentErrors.length,
            categoryCounts: categories,
            connectionRetryAttempts: this.connectionRetryAttempts
        };
    }

    clearErrorHistory() {
        this.errorHistory = [];
        this.connectionRetryAttempts = 0;
    }
}
