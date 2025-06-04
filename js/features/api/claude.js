/**
 * Parkland AI - Opus Magnum Edition
 * ClaudeAPIService
 *
 * Service for interacting with the Anthropic Claude API.
 * Handles message formatting, API requests, and response processing.
 */

class ClaudeAPIService {
    constructor(stateManager, utils) {
        if (!stateManager || !utils) {
            throw new Error("ClaudeAPIService requires StateManager and Utils instances.");
        }
        this.stateManager = stateManager;
        this.utils = utils;
        this.apiEndpoint = 'https://api.anthropic.com/v1/messages'; // Standard Claude Messages API endpoint
        this.apiVersion = '2023-06-01';

        if (this.stateManager.get('debugMode')) {
            console.log('ClaudeAPIService initialized.');
        }
    }

    /**
     * Validates the basic format of a Claude API key.
     * Claude API keys typically start with 'sk-ant-'.
     * @param {string} apiKey - The API key to validate.
     * @returns {boolean} True if the key matches the basic format, false otherwise.
     */
    validateApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }
        // Basic check, Claude keys usually start with 'sk-ant-'
        return apiKey.startsWith('sk-ant-') && apiKey.length > 40;
    }

    /**
     * Constructs the headers required for Claude API requests.
     * @returns {Headers} A Headers object with the necessary API headers.
     * @private
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
     * Ensures messages alternate between 'user' and 'assistant' roles.
     * Adds a system prompt if available.
     * @param {Array<Object>} chatHistory - The current chat history.
     * @param {string} newMessageContent - The new user message content.
     * @returns {Array<Object>} The formatted messages array for the API.
     * @private
     */
    _constructClaudeMessages(chatHistory = [], newMessageContent) {
        const claudeMessages = [];

        // Add system prompt if available from character or default
        const character = this.stateManager.get('activeCharacter');
        let systemPromptContent = "You are a helpful AI assistant. Please provide concise and informative responses."; // Default system prompt
        if (character && window.parklandApp && window.parklandApp.characterManager) { // Ensure characterManager exists
            const characterData = window.parklandApp.characterManager.getCharacterData(character);
            if (characterData && characterData.systemPrompt) {
                systemPromptContent = characterData.systemPrompt;
            }
        }
        claudeMessages.push({ role: 'system', content: systemPromptContent });


        // Add existing chat history, ensuring alternating roles
        let lastRole = 'system'; // System prompt is conceptually before the first user message
        chatHistory.forEach(msg => {
            // Skip if role is same as last, or if it's a system message (already handled)
            // Claude API requires strict user/assistant alternation after the initial system prompt.
            if (msg.role !== 'system') {
                if (msg.role !== lastRole) {
                    claudeMessages.push({ role: msg.role, content: msg.content });
                    lastRole = msg.role;
                } else {
                    // If same role, append content to the last message of that role if it exists
                    // This helps consolidate multiple user/assistant turns if they occurred without alternation
                    const lastMessageOfRole = claudeMessages.slice().reverse().find(m => m.role === msg.role);
                    if (lastMessageOfRole) {
                        lastMessageOfRole.content += `\n${msg.content}`; // Append content
                    } else {
                         // This case should ideally not happen if history is well-formed
                        claudeMessages.push({ role: msg.role, content: msg.content });
                        lastRole = msg.role;
                    }
                }
            }
        });

        // Add the new user message
        // Ensure the new user message doesn't immediately follow another user message without an assistant response.
        if (lastRole === 'user' && claudeMessages.length > 0) {
            // This implies the chat history ended on a user message.
            // Claude API usually expects user -> assistant -> user.
            // If the last message in claudeMessages (after processing history) is 'user',
            // and we are adding another 'user' message, this is fine for Claude.
            // The API itself will respond as 'assistant'.
             claudeMessages.push({ role: 'user', content: newMessageContent });
        } else if (lastRole === 'assistant' || claudeMessages.length === 0 || (claudeMessages.length === 1 && claudeMessages[0].role === 'system')) {
            // This is the expected case: after system, or after an assistant response.
            claudeMessages.push({ role: 'user', content: newMessageContent });
        } else {
            // Edge case: if somehow history processing resulted in an unexpected lastRole.
            // For safety, add the user message. The API will error out if malformed.
            console.warn("Potentially problematic message order for Claude API. Last role was:", lastRole);
            claudeMessages.push({ role: 'user', content: newMessageContent });
        }


        // Claude API constraint: "messages: Array of User and Assistant Messages. Must alternate between User and Assistant.
        // An empty array is not allowed. The first message must be a User message."
        // With a system prompt, the first non-system message must be 'user'.
        // The logic above tries to adhere to this.
        
        // Final check to remove system prompt if it's the only message and content is user
        // (Claude doesn't want *only* a system prompt if the user message is implied by 'content')
        // However, the Messages API v1 *does* allow a system prompt and then user message.
        // The current structure should be fine.

        return claudeMessages;
    }

    /**
     * Handles error responses from the Claude API.
     * @param {Response} response - The fetch Response object.
     * @param {Object} responseData - The parsed JSON error data.
     * @throws {Error} An error object with a user-friendly message.
     * @private
     */
    _handleErrorResponse(response, responseData) {
        let errorMessage = `API request failed with status ${response.status}.`;
        if (responseData && responseData.error) {
            const error = responseData.error;
            errorMessage = `Error ${error.type || response.status}: ${error.message || 'Unknown API error.'}`;
            if (error.type === 'authentication_error' || error.type === 'permission_error') {
                errorMessage += " Please check your API key.";
                // Optionally, clear the invalid API key from state
                // this.stateManager.setApiKey(null);
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
     * Sends a message to the Claude API.
     * @param {string} messageContent - The content of the user's message.
     * @param {Array<Object>} [chatHistory=[]] - The existing chat history.
     * @returns {Promise<Object>} A promise that resolves with the assistant's response object.
     */
    async sendMessage(messageContent, chatHistory = []) {
        if (!messageContent.trim()) {
            return Promise.reject(new Error("Message content cannot be empty."));
        }

        const apiKey = this.stateManager.get('apiKey');
        if (!this.validateApiKey(apiKey)) {
             this.stateManager.set('lastError', { message: 'Invalid or missing Claude API Key.', type: 'config' });
            return Promise.reject(new Error("Invalid or missing Claude API Key. Please check settings."));
        }

        const headers = this._getApiHeaders();
        const model = this.stateManager.get('modelPreferences.claude.model') || 'claude-3-haiku-20240307'; // Default model
        const maxTokens = this.stateManager.get('modelPreferences.claude.maxTokens') || 1024; // Default max tokens

        const messagesForApi = this._constructClaudeMessages(chatHistory, messageContent);

        // Remove system prompt if it's the first message and there's only one actual user message.
        // However, Claude's v1 Messages API *does* support a system message object.
        // The following check might be too aggressive or unnecessary for the new API.
        // Let's assume the system prompt is always fine to send.
        /*
        if (messagesForApi.length > 0 && messagesForApi[0].role === 'system') {
            // If system prompt is present, ensure there's at least one user message after it for valid conversation start
            if (messagesForApi.length === 1 || (messagesForApi.length > 1 && messagesForApi[1].role !== 'user')) {
                 console.warn("Claude API: System prompt found without a subsequent user message. This might be an issue. Removing system prompt for safety.");
                 messagesForApi.shift(); // Remove system prompt if it's the only thing or followed by non-user
            }
        }
        */


        const body = JSON.stringify({
            model: model,
            max_tokens: maxTokens,
            messages: messagesForApi,
            // stream: false // For non-streaming response by default
            // system: systemPrompt (handled by putting it as first message)
        });

        if (this.stateManager.get('debugMode')) {
            console.log('Claude API Request Body:', JSON.parse(body));
        }

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: headers,
                body: body
            });

            const responseData = await response.json();

            if (!response.ok) {
                this._handleErrorResponse(response, responseData); // Throws error
            }

            if (this.stateManager.get('debugMode')) {
                console.log('Claude API Response Data:', responseData);
            }

            // Extract assistant's reply
            // For non-streaming, responseData.content should be an array of content blocks.
            // We'll concatenate text blocks.
            let assistantReply = '';
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

            // The character associated with this response would typically be the active one,
            // unless the API itself dictates a character switch (which is not standard for Claude).
            const currentCharacter = this.stateManager.get('activeCharacter');

            return {
                role: 'assistant',
                content: assistantReply.trim(),
                character: currentCharacter, // Attach current character context if needed by UI
                // rawResponse: responseData // Optionally include for further processing
            };

        } catch (error) {
            console.error('Error sending message to Claude API:', error);
            // Propagate a user-friendly error or a structured error object
            const displayError = error.message.startsWith("Error") || error.message.startsWith("API request failed") ?
                error.message :
                "Failed to connect to the AI service. Please check your network or API key.";
            
            this.stateManager.set('lastError', {message: displayError, type: 'api', originalError: error});
            throw new Error(displayError);
        }
    }
}

// If not using ES modules and need it globally, ensure it's available:
// window.ClaudeAPIService = ClaudeAPIService;
