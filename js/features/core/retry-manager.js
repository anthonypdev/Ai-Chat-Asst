/**
 * Parkland AI - Opus Magnum Edition
 * Advanced Retry Manager
 *
 * Provides intelligent retry mechanisms with exponential backoff,
 * circuit breaker patterns, and sophisticated failure handling.
 */

class RetryManager {
    constructor(utils, stateManager, eventEmitter) {
        if (!utils || !stateManager || !eventEmitter) {
            throw new Error("RetryManager requires utils, stateManager, and eventEmitter instances.");
        }
        
        this.utils = utils;
        this.stateManager = stateManager;
        this.eventEmitter = eventEmitter;
        
        // Retry configurations
        this.defaultConfig = {
            maxAttempts: 3,
            baseDelay: 1000, // 1 second
            maxDelay: 30000, // 30 seconds
            backoffMultiplier: 2,
            jitter: true,
            retryCondition: this._defaultRetryCondition.bind(this),
            onRetry: null,
            onSuccess: null,
            onFailure: null
        };
        
        // Circuit breaker state
        this.circuitBreakers = new Map();
        this.defaultCircuitConfig = {
            failureThreshold: 5,
            successThreshold: 3,
            timeout: 60000, // 1 minute
            monitoringPeriod: 300000 // 5 minutes
        };
        
        // Active retry operations
        this.activeRetries = new Map();
        this.retryHistory = [];
        this.maxHistorySize = 100;
        
        // Network status monitoring
        this.isOnline = navigator.onLine;
        this._setupNetworkMonitoring();
        
        console.log('🔄 RetryManager initialized.');
    }

    /**
     * Executes an operation with retry logic
     * @param {Function} operation - The operation to execute
     * @param {Object} config - Retry configuration
     * @returns {Promise} Promise that resolves with operation result
     */
    async execute(operation, config = {}) {
        const finalConfig = { ...this.defaultConfig, ...config };
        const operationId = this._generateOperationId();
        
        this.activeRetries.set(operationId, {
            operation,
            config: finalConfig,
            attempts: 0,
            startTime: Date.now(),
            lastAttemptTime: null
        });

        try {
            const result = await this._executeWithRetry(operationId, operation, finalConfig);
            this._recordSuccess(operationId, finalConfig);
            return result;
        } catch (error) {
            this._recordFailure(operationId, error, finalConfig);
            throw error;
        } finally {
            this.activeRetries.delete(operationId);
        }
    }

    /**
     * Executes an API request with retry logic
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @param {Object} retryConfig - Retry configuration
     * @returns {Promise} Promise that resolves with response
     */
    async executeApiRequest(url, options = {}, retryConfig = {}) {
        const operation = async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);
            
            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        };

        const config = {
            ...retryConfig,
            retryCondition: this._apiRetryCondition.bind(this),
            onRetry: (attempt, error) => {
                this.eventEmitter.emit('apiRequest:retry', { url, attempt, error });
                if (retryConfig.onRetry) retryConfig.onRetry(attempt, error);
            }
        };

        return this.execute(operation, config);
    }

    /**
     * Creates a circuit breaker for a specific service
     * @param {string} serviceId - Unique service identifier
     * @param {Object} config - Circuit breaker configuration
     */
    createCircuitBreaker(serviceId, config = {}) {
        const finalConfig = { ...this.defaultCircuitConfig, ...config };
        
        this.circuitBreakers.set(serviceId, {
            ...finalConfig,
            state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
            failures: 0,
            successes: 0,
            lastFailureTime: null,
            nextAttemptTime: null
        });
    }

    /**
     * Executes an operation through a circuit breaker
     * @param {string} serviceId - Service identifier
     * @param {Function} operation - Operation to execute
     * @param {Object} config - Additional configuration
     * @returns {Promise} Promise that resolves with operation result
     */
    async executeWithCircuitBreaker(serviceId, operation, config = {}) {
        const circuitBreaker = this.circuitBreakers.get(serviceId);
        
        if (!circuitBreaker) {
            throw new Error(`Circuit breaker not found for service: ${serviceId}`);
        }

        // Check circuit state
        const currentTime = Date.now();
        
        if (circuitBreaker.state === 'OPEN') {
            if (currentTime < circuitBreaker.nextAttemptTime) {
                throw new Error(`Circuit breaker is OPEN for service: ${serviceId}`);
            } else {
                // Transition to HALF_OPEN
                circuitBreaker.state = 'HALF_OPEN';
                circuitBreaker.successes = 0;
            }
        }

        try {
            const result = await this.execute(operation, config);
            this._recordCircuitSuccess(serviceId);
            return result;
        } catch (error) {
            this._recordCircuitFailure(serviceId);
            throw error;
        }
    }

    /**
     * Main retry execution logic
     * @param {string} operationId - Operation identifier
     * @param {Function} operation - Operation to execute
     * @param {Object} config - Retry configuration
     * @returns {Promise} Promise that resolves with operation result
     * @private
     */
    async _executeWithRetry(operationId, operation, config) {
        const retryState = this.activeRetries.get(operationId);
        let lastError;

        for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
            retryState.attempts = attempt;
            retryState.lastAttemptTime = Date.now();

            try {
                const result = await operation();
                
                if (config.onSuccess) {
                    config.onSuccess(result, attempt);
                }
                
                return result;
            } catch (error) {
                lastError = error;
                
                // Check if we should retry
                if (attempt < config.maxAttempts && config.retryCondition(error, attempt)) {
                    const delay = this._calculateDelay(attempt, config);
                    
                    if (config.onRetry) {
                        config.onRetry(attempt, error);
                    }
                    
                    this.eventEmitter.emit('retry:attempt', {
                        operationId,
                        attempt,
                        error,
                        nextDelay: delay
                    });
                    
                    await this.utils.wait(delay);
                    
                    // Check if we're still online (for network operations)
                    if (!this.isOnline && this._isNetworkError(error)) {
                        throw new Error('Network unavailable');
                    }
                } else {
                    break;
                }
            }
        }

        // All attempts failed
        if (config.onFailure) {
            config.onFailure(lastError, retryState.attempts);
        }
        
        this.eventEmitter.emit('retry:failed', {
            operationId,
            attempts: retryState.attempts,
            error: lastError
        });
        
        throw lastError;
    }

    /**
     * Calculates delay for next retry attempt
     * @param {number} attempt - Current attempt number
     * @param {Object} config - Retry configuration
     * @returns {number} Delay in milliseconds
     * @private
     */
    _calculateDelay(attempt, config) {
        const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
        let delay = Math.min(exponentialDelay, config.maxDelay);
        
        // Add jitter to prevent thundering herd
        if (config.jitter) {
            delay = delay * (0.5 + Math.random() * 0.5);
        }
        
        return Math.floor(delay);
    }

    /**
     * Default retry condition
     * @param {Error} error - Error that occurred
     * @param {number} attempt - Current attempt number
     * @returns {boolean} Whether to retry
     * @private
     */
    _defaultRetryCondition(error, attempt) {
        // Don't retry for certain error types
        if (error.name === 'AbortError' || error.name === 'TypeError') {
            return false;
        }
        
        // Don't retry if offline for network errors
        if (!this.isOnline && this._isNetworkError(error)) {
            return false;
        }
        
        return true;
    }

    /**
     * API-specific retry condition
     * @param {Error} error - Error that occurred
     * @param {number} attempt - Current attempt number
     * @returns {boolean} Whether to retry
     * @private
     */
    _apiRetryCondition(error, attempt) {
        // Don't retry client errors (4xx) except for specific cases
        if (error.message.includes('HTTP 4')) {
            const status = parseInt(error.message.match(/HTTP (\d+)/)?.[1]);
            
            // Retry on rate limiting and certain client errors
            if (status === 429 || status === 408 || status === 409) {
                return true;
            }
            
            return false;
        }
        
        // Retry on server errors (5xx) and network errors
        if (error.message.includes('HTTP 5') || this._isNetworkError(error)) {
            return true;
        }
        
        return this._defaultRetryCondition(error, attempt);
    }

    /**
     * Checks if error is network-related
     * @param {Error} error - Error to check
     * @returns {boolean} Whether error is network-related
     * @private
     */
    _isNetworkError(error) {
        const networkErrorMessages = [
            'fetch', 'network', 'timeout', 'connection',
            'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'
        ];
        
        const errorMessage = error.message.toLowerCase();
        return networkErrorMessages.some(msg => errorMessage.includes(msg));
    }

    /**
     * Records successful operation
     * @param {string} operationId - Operation identifier
     * @param {Object} config - Operation configuration
     * @private
     */
    _recordSuccess(operationId, config) {
        const retryState = this.activeRetries.get(operationId);
        
        this._addToHistory({
            operationId,
            success: true,
            attempts: retryState.attempts,
            duration: Date.now() - retryState.startTime,
            timestamp: Date.now()
        });
        
        this.eventEmitter.emit('retry:success', {
            operationId,
            attempts: retryState.attempts,
            duration: Date.now() - retryState.startTime
        });
    }

    /**
     * Records failed operation
     * @param {string} operationId - Operation identifier
     * @param {Error} error - Final error
     * @param {Object} config - Operation configuration
     * @private
     */
    _recordFailure(operationId, error, config) {
        const retryState = this.activeRetries.get(operationId);
        
        this._addToHistory({
            operationId,
            success: false,
            attempts: retryState.attempts,
            error: error.message,
            duration: Date.now() - retryState.startTime,
            timestamp: Date.now()
        });
        
        this.eventEmitter.emit('retry:failure', {
            operationId,
            attempts: retryState.attempts,
            error,
            duration: Date.now() - retryState.startTime
        });
    }

    /**
     * Records circuit breaker success
     * @param {string} serviceId - Service identifier
     * @private
     */
    _recordCircuitSuccess(serviceId) {
        const circuitBreaker = this.circuitBreakers.get(serviceId);
        if (!circuitBreaker) return;

        circuitBreaker.successes++;
        circuitBreaker.failures = 0;

        if (circuitBreaker.state === 'HALF_OPEN' && 
            circuitBreaker.successes >= circuitBreaker.successThreshold) {
            circuitBreaker.state = 'CLOSED';
        }
    }

    /**
     * Records circuit breaker failure
     * @param {string} serviceId - Service identifier
     * @private
     */
    _recordCircuitFailure(serviceId) {
        const circuitBreaker = this.circuitBreakers.get(serviceId);
        if (!circuitBreaker) return;

        circuitBreaker.failures++;
        circuitBreaker.successes = 0;
        circuitBreaker.lastFailureTime = Date.now();

        if (circuitBreaker.failures >= circuitBreaker.failureThreshold) {
            circuitBreaker.state = 'OPEN';
            circuitBreaker.nextAttemptTime = Date.now() + circuitBreaker.timeout;
            
            this.eventEmitter.emit('circuitBreaker:opened', { serviceId });
        }
    }

    /**
     * Sets up network monitoring
     * @private
     */
    _setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.eventEmitter.emit('connection:restored');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.eventEmitter.emit('connection:lost');
        });
    }

    /**
     * Adds operation to history
     * @param {Object} record - History record
     * @private
     */
    _addToHistory(record) {
        this.retryHistory.unshift(record);
        
        if (this.retryHistory.length > this.maxHistorySize) {
            this.retryHistory = this.retryHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * Generates unique operation ID
     * @returns {string} Operation ID
     * @private
     */
    _generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Gets retry statistics
     * @returns {Object} Retry statistics
     */
    getStatistics() {
        const recentHistory = this.retryHistory.slice(0, 50);
        const successCount = recentHistory.filter(r => r.success).length;
        const failureCount = recentHistory.filter(r => !r.success).length;
        const avgAttempts = recentHistory.reduce((sum, r) => sum + r.attempts, 0) / recentHistory.length;
        
        return {
            totalOperations: recentHistory.length,
            successRate: recentHistory.length > 0 ? successCount / recentHistory.length : 0,
            failureRate: recentHistory.length > 0 ? failureCount / recentHistory.length : 0,
            averageAttempts: avgAttempts || 0,
            activeRetries: this.activeRetries.size,
            circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([id, cb]) => ({
                serviceId: id,
                state: cb.state,
                failures: cb.failures,
                successes: cb.successes
            }))
        };
    }

    /**
     * Gets operation history
     * @returns {Array} Operation history
     */
    getHistory() {
        return [...this.retryHistory];
    }

    /**
     * Cancels all active retry operations
     */
    cancelAllRetries() {
        for (const [operationId] of this.activeRetries) {
            this.eventEmitter.emit('retry:cancelled', { operationId });
        }
        this.activeRetries.clear();
    }

    /**
     * Resets circuit breaker state
     * @param {string} serviceId - Service identifier
     */
    resetCircuitBreaker(serviceId) {
        const circuitBreaker = this.circuitBreakers.get(serviceId);
        if (circuitBreaker) {
            circuitBreaker.state = 'CLOSED';
            circuitBreaker.failures = 0;
            circuitBreaker.successes = 0;
            circuitBreaker.lastFailureTime = null;
            circuitBreaker.nextAttemptTime = null;
        }
    }

    /**
     * Destroys the retry manager
     */
    destroy() {
        this.cancelAllRetries();
        this.circuitBreakers.clear();
        this.retryHistory = [];
        
        window.removeEventListener('online', this._handleOnline);
        window.removeEventListener('offline', this._handleOffline);
        
        console.log('🔄 RetryManager destroyed.');
    }
}

// Global instance creation pattern
if (typeof window !== 'undefined') {
    window.RetryManager = RetryManager;
}