/**
 * Parkland AI - Opus Magnum Edition
 * Enhanced ClaudeAPIService
 *
 * Advanced service for interacting with the Anthropic Claude API.
 * Features retry mechanisms, streaming, rate limiting, and comprehensive error handling.
 */

class ClaudeAPIServiceEnhanced {
    constructor(stateManager, utils, retryManager = null, notificationSystem = null) {
        if (!stateManager || !utils) {
            throw new Error("ClaudeAPIService requires StateManager and Utils instances.");
        }
        this.stateManager = stateManager;
        this.utils = utils;
        this.retryManager = retryManager;
        this.notificationSystem = notificationSystem;
        this.apiEndpoint = 'https://api.anthropic.com/v1/messages';
        this.apiVersion = '2023-06-01';
        
        // Request tracking
        this.requestHistory = [];
        this.maxHistorySize = 50;
        this.activeRequests = new Map();
        
        // Rate limiting
        this.rateLimiter = {
            tokens: 100,
            maxTokens: 100,
            refillRate: 10, // tokens per second
            lastRefill: Date.now()
        };
        
        // Response streaming support
        this.streamingSupported = true;
        
        // Initialize circuit breaker if retry manager is available
        if (this.retryManager) {
            this.retryManager.createCircuitBreaker('claude-api', {
                failureThreshold: 3,
                successThreshold: 2,
                timeout: 30000 // 30 seconds
            });
        }

        if (this.stateManager.get('debugMode')) {
            console.log('🤖 ClaudeAPIService initialized with advanced features.');
        }
    }

    /**
     * Validates the basic format of a Claude API key.
     */
    validateApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }
        return apiKey.startsWith('sk-ant-') && apiKey.length > 40;
    }

    /**
     * Constructs the headers required for Claude API requests.
     */
    _getApiHeaders() {
        const apiKey = this.stateManager.get('apiKey');
        if (!apiKey) {
            throw new Error('API key is not set. Please set it in settings.');
        }

        const headers = new Headers();
        headers.append('x-api-key', apiKey);
        headers.append('anthropic-version', this.apiVersion);
        headers.append('content-type', 'application/json');
        return headers;
    }

    /**
     * Constructs the messages array in the format expected by the Claude API.
     */
    _constructClaudeMessages(chatHistory = [], newMessageContent) {
        const claudeMessages = [];

        // Add system prompt if available from character or default
        const character = this.stateManager.get('activeCharacter');
        let systemPromptContent = "You are a helpful AI assistant. Please provide concise and informative responses.";
        if (character && window.parklandApp && window.parklandApp.characterManager) {
            const characterData = window.parklandApp.characterManager.getCharacterData(character);
            if (characterData && characterData.systemPrompt) {
                systemPromptContent = characterData.systemPrompt;
            }
        }
        claudeMessages.push({ role: 'system', content: systemPromptContent });

        // Add existing chat history, ensuring alternating roles
        let lastRole = 'system';
        chatHistory.forEach(msg => {
            if (msg.role !== 'system') {
                if (msg.role !== lastRole) {
                    claudeMessages.push({ role: msg.role, content: msg.content });
                    lastRole = msg.role;
                } else {
                    const lastMessageOfRole = claudeMessages.slice().reverse().find(m => m.role === msg.role);
                    if (lastMessageOfRole) {
                        lastMessageOfRole.content += `\n${msg.content}`;
                    } else {
                        claudeMessages.push({ role: msg.role, content: msg.content });
                        lastRole = msg.role;
                    }
                }
            }
        });

        // Add the new user message
        claudeMessages.push({ role: 'user', content: newMessageContent });

        return claudeMessages;
    }

    /**
     * Handles error responses from the Claude API.
     */
    _handleErrorResponse(response, responseData) {
        let errorMessage = `API request failed with status ${response.status}.`;
        if (responseData && responseData.error) {
            const error = responseData.error;
            errorMessage = `Error ${error.type || response.status}: ${error.message || 'Unknown API error.'}`;
            if (error.type === 'authentication_error' || error.type === 'permission_error') {
                errorMessage += " Please check your API key.";
            } else if (error.type === 'invalid_request_error') {
                errorMessage += " There might be an issue with the request format or parameters.";
                if (error.message && error.message.includes("messages: must alternate between \"user\" and \"assistant\" roles")) {
                    errorMessage = "Conversation structure error. Messages must alternate roles. Please try rephrasing or starting a new chat.";
                }
            }
        }
        console.error('Claude API Error:', responseData || response.statusText);
        throw new Error(errorMessage);
    }

    /**
     * Sends a message to the Claude API with advanced retry and streaming support.
     */
    async sendMessage(messageContent, chatHistory = [], options = {}) {
        if (!messageContent.trim()) {
            const error = new Error("Message content cannot be empty.");
            this._recordRequest(null, messageContent, false, error);
            return Promise.reject(error);
        }

        const apiKey = this.stateManager.get('apiKey');
        if (!this.validateApiKey(apiKey)) {
            const error = new Error("Invalid or missing Claude API Key. Please check settings.");
            this.stateManager.set('lastError', { message: error.message, type: 'config' });
            if (this.notificationSystem) {
                this.notificationSystem.showError('Invalid API key. Please check your settings.', {
                    actions: [{
                        text: 'Open Settings',
                        action: () => this.stateManager.setModalOpen('isSettingsModalOpen', true)
                    }]
                });
            }
            this._recordRequest(null, messageContent, false, error);
            return Promise.reject(error);
        }
        
        // Check rate limiting
        if (!this._checkRateLimit()) {
            const error = new Error('Rate limit exceeded. Please wait before sending another message.');
            if (this.notificationSystem) {
                this.notificationSystem.showWarning('Rate limit exceeded. Please wait a moment.');
            }
            return Promise.reject(error);
        }

        const requestId = this._generateRequestId();
        const headers = this._getApiHeaders();
        const model = this.stateManager.get('modelPreferences.claude.model') || 'claude-3-haiku-20240307';
        const maxTokens = this.stateManager.get('modelPreferences.claude.maxTokens') || 1024;
        const temperature = options.temperature || this.stateManager.get('modelPreferences.claude.temperature') || 0.7;
        const streaming = options.streaming || false;

        const messagesForApi = this._constructClaudeMessages(chatHistory, messageContent);
        
        this.activeRequests.set(requestId, {
            messageContent,
            startTime: Date.now(),
            abortController: new AbortController()
        });

        const body = JSON.stringify({
            model: model,
            max_tokens: maxTokens,
            temperature: temperature,
            messages: messagesForApi,
            stream: streaming
        });

        const requestOptions = {
            method: 'POST',
            headers: headers,
            body: body,
            signal: this.activeRequests.get(requestId).abortController.signal,
            timeout: options.timeout || 60000
        };
        
        try {
            let response;
            
            if (this.retryManager) {
                // Use retry manager with circuit breaker
                response = await this.retryManager.executeWithCircuitBreaker(
                    'claude-api',
                    () => this.retryManager.executeApiRequest(this.apiEndpoint, requestOptions, {
                        maxAttempts: 3,
                        baseDelay: 1000,
                        onRetry: (attempt, error) => {
                            if (this.notificationSystem) {
                                this.notificationSystem.show(
                                    `Retrying API request (attempt ${attempt})...`,
                                    { type: 'info', duration: 2000 }
                                );
                            }
                        }
                    })
                );
            } else {
                // Fallback to direct fetch
                response = await fetch(this.apiEndpoint, requestOptions);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
            let responseData;
            
            if (streaming) {
                responseData = await this._handleStreamingResponse(response, requestId, options.onChunk);
            } else {
                responseData = await response.json();
            }

            if (this.stateManager.get('debugMode')) {
                console.log('Claude API Response Data:', responseData);
            }

            let assistantReply = '';
            let usage = null;
            
            if (streaming) {
                assistantReply = responseData.content;
                usage = responseData.usage;
            } else {
                // Extract assistant's reply from non-streaming response
                if (responseData.content && Array.isArray(responseData.content)) {
                    responseData.content.forEach(block => {
                        if (block.type === 'text') {
                            assistantReply += block.text;
                        }
                    });
                } else {
                    console.warn('Unexpected Claude API response structure for content:', responseData);
                    assistantReply = "Sorry, I couldn't process the response correctly.";
                }
                usage = responseData.usage;
            }

            const currentCharacter = this.stateManager.get('activeCharacter');
            const result = {
                role: 'assistant',
                content: assistantReply.trim(),
                character: currentCharacter,
                usage: usage,
                requestId: requestId,
                model: model,
                streaming: streaming
            };
            
            this._recordRequest(requestId, messageContent, true, null, result);
            return result;

        } catch (error) {
            console.error('Error sending message to Claude API:', error);
            
            this._recordRequest(requestId, messageContent, false, error);
            
            // Enhanced error handling with user-friendly messages
            let displayError = this._getDisplayError(error);
            let notificationOptions = { category: 'api' };
            
            // Add retry action if appropriate
            if (this._shouldOfferRetry(error)) {
                notificationOptions.retryable = true;
                notificationOptions.retryAction = () => {
                    return this.sendMessage(messageContent, chatHistory, options);
                };
            }
            
            if (this.notificationSystem) {
                this.notificationSystem.showError(displayError, notificationOptions);
            }
            
            this.stateManager.set('lastError', {
                message: displayError,
                type: 'api',
                originalError: error,
                timestamp: Date.now(),
                requestId: requestId
            });
            
            throw new Error(displayError);
        } finally {
            this.activeRequests.delete(requestId);
        }
    }
    
    /**
     * Handles streaming API responses
     */
    async _handleStreamingResponse(response, requestId, onChunk) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let content = '';
        let usage = null;
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') continue;
                        
                        try {
                            const parsed = JSON.parse(data);
                            
                            if (parsed.type === 'content_block_delta') {
                                const delta = parsed.delta.text || '';
                                content += delta;
                                
                                if (onChunk) {
                                    onChunk(delta, content);
                                }
                            } else if (parsed.type === 'message_stop') {
                                usage = parsed.usage;
                            }
                        } catch (parseError) {
                            console.warn('Failed to parse streaming chunk:', parseError);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
        
        return { content, usage };
    }
    
    /**
     * Checks rate limiting
     */
    _checkRateLimit() {
        const now = Date.now();
        const timeDiff = (now - this.rateLimiter.lastRefill) / 1000;
        
        // Refill tokens
        this.rateLimiter.tokens = Math.min(
            this.rateLimiter.maxTokens,
            this.rateLimiter.tokens + (timeDiff * this.rateLimiter.refillRate)
        );
        this.rateLimiter.lastRefill = now;
        
        if (this.rateLimiter.tokens >= 1) {
            this.rateLimiter.tokens -= 1;
            return true;
        }
        
        return false;
    }
    
    /**
     * Gets user-friendly error message
     */
    _getDisplayError(error) {
        if (error.name === 'AbortError') {
            return 'Request was cancelled.';
        }
        
        if (error.message.includes('HTTP 401') || error.message.includes('authentication')) {
            return 'Invalid API key. Please check your settings.';
        }
        
        if (error.message.includes('HTTP 429') || error.message.includes('rate limit')) {
            return 'Rate limit exceeded. Please wait a moment before trying again.';
        }
        
        if (error.message.includes('HTTP 5')) {
            return 'The AI service is temporarily unavailable. Please try again in a moment.';
        }
        
        if (error.message.includes('network') || error.message.includes('fetch')) {
            return 'Network error. Please check your connection and try again.';
        }
        
        if (error.message.includes('timeout')) {
            return 'Request timed out. The AI service may be busy. Please try again.';
        }
        
        return error.message || 'An unexpected error occurred. Please try again.';
    }
    
    /**
     * Determines if retry should be offered for this error
     */
    _shouldOfferRetry(error) {
        // Don't offer retry for client errors that won't succeed
        if (error.message.includes('HTTP 400') || 
            error.message.includes('HTTP 401') ||
            error.message.includes('HTTP 403')) {
            return false;
        }
        
        // Offer retry for server errors, network errors, and timeouts
        return error.message.includes('HTTP 5') ||
               error.message.includes('network') ||
               error.message.includes('timeout') ||
               error.message.includes('HTTP 429');
    }
    
    /**
     * Records request for analytics and debugging
     */
    _recordRequest(requestId, messageContent, success, error = null, result = null) {
        const record = {
            requestId,
            messageContent: messageContent?.substring(0, 100) + (messageContent?.length > 100 ? '...' : ''),
            success,
            error: error?.message,
            timestamp: Date.now(),
            duration: null,
            model: result?.model,
            usage: result?.usage
        };
        
        if (requestId && this.activeRequests.has(requestId)) {
            record.duration = Date.now() - this.activeRequests.get(requestId).startTime;
        }
        
        this.requestHistory.unshift(record);
        
        if (this.requestHistory.length > this.maxHistorySize) {
            this.requestHistory = this.requestHistory.slice(0, this.maxHistorySize);
        }
    }
    
    /**
     * Generates unique request ID
     */
    _generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Cancels active request
     */
    cancelRequest(requestId) {
        const request = this.activeRequests.get(requestId);
        if (request) {
            request.abortController.abort();
            this.activeRequests.delete(requestId);
        }
    }
    
    /**
     * Cancels all active requests
     */
    cancelAllRequests() {
        for (const [requestId, request] of this.activeRequests) {
            request.abortController.abort();
        }
        this.activeRequests.clear();
    }
    
    /**
     * Gets API usage statistics
     */
    getUsageStatistics() {
        const recentRequests = this.requestHistory.slice(0, 20);
        const successCount = recentRequests.filter(r => r.success).length;
        const totalTokens = recentRequests.reduce((sum, r) => {
            return sum + (r.usage?.total_tokens || 0);
        }, 0);
        const avgDuration = recentRequests
            .filter(r => r.duration)
            .reduce((sum, r) => sum + r.duration, 0) / recentRequests.length;
        
        return {
            totalRequests: recentRequests.length,
            successRate: recentRequests.length > 0 ? successCount / recentRequests.length : 0,
            totalTokensUsed: totalTokens,
            averageResponseTime: avgDuration || 0,
            activeRequests: this.activeRequests.size,
            rateLimitTokens: this.rateLimiter.tokens
        };
    }
    
    /**
     * Gets request history
     */
    getRequestHistory() {
        return [...this.requestHistory];
    }
    
    /**
     * Destroys the API service
     */
    destroy() {
        this.cancelAllRequests();
        this.requestHistory = [];
        console.log('🤖 ClaudeAPIService destroyed.');
    }
}

// Global instance creation pattern
if (typeof window !== 'undefined') {
    window.ClaudeAPIServiceEnhanced = ClaudeAPIServiceEnhanced;
}