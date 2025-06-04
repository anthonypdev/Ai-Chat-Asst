/**
 * Claude API Integration - Handles communication with Anthropic's Claude API
 * Includes character system prompts and themed responses
 */

import { EventBus } from '../../core/events.js';
import { AppState } from '../../core/state.js';

export class ClaudeAPI {
    constructor() {
        this.baseURL = 'https://api.anthropic.com/v1/messages';
        this.model = 'claude-3-haiku-20240307';
        this.maxTokens = 2048;
        this.maxHistoryMessages = 10;
        this.requestTimeout = 30000; // 30 seconds
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second

        this.isOnline = navigator.onLine;
        this.setupNetworkMonitoring();
    }

    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            EventBus.emit('api:connection-restored');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            EventBus.emit('api:connection-lost');
        });
    }

    async sendMessage(userMessage, chatHistory = []) {
        if (!this.isOnline) {
            throw new Error('No internet connection. Please check your network and try again.');
        }

        const apiKey = AppState.apiKey;
        if (!apiKey) {
            throw new Error('API key is not configured. Please go to Application Settings to enter your Anthropic API key.');
        }

        if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
            throw new Error('Message cannot be empty.');
        }

        const systemPrompt = this.getSystemPrompt();
        const messages = this.formatMessages(userMessage, chatHistory);

        const requestBody = {
            model: this.model,
            max_tokens: this.maxTokens,
            messages: messages,
            temperature: this.getTemperatureForTheme(),
            ...(systemPrompt && { system: systemPrompt })
        };

        console.log('Sending to Claude API:', {
            model: requestBody.model,
            messageCount: messages.length,
            temperature: requestBody.temperature,
            hasSystemPrompt: !!systemPrompt,
            userMessagePreview: userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : '')
        });

        let lastError;

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await this.makeRequest(requestBody);
                const result = this.parseResponse(response);

                // Log successful request
                console.log('Claude API response received:', {
                    attempt,
                    responseLength: result.length,
                    preview: result.substring(0, 100) + (result.length > 100 ? '...' : '')
                });

                return result;
            } catch (error) {
                lastError = error;
                console.warn(`Claude API attempt ${attempt} failed:`, error.message);

                // Don't retry certain types of errors
                if (this.isNonRetryableError(error)) {
                    break;
                }

                // Wait before retrying (exponential backoff)
                if (attempt < this.retryAttempts) {
                    await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
                }
            }
        }

        throw lastError;
    }

    async makeRequest(requestBody) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': AppState.apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-beta': 'tools-2024-04-04',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw this.createAPIError(response.status, response.statusText, errorData);
            }

            return response;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('Request timed out. The AI service is taking too long to respond. Please try again.');
            }

            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to connect to the AI service. Please verify your internet connection and firewall settings.');
            }

            throw error;
        }
    }

    parseResponse(response) {
        return response.json().then(data => {
            if (data.content && data.content.length > 0 && data.content[0].text) {
                return data.content[0].text;
            }

            console.error('Unexpected API response format:', data);
            throw new Error('Unexpected response format from AI service. The expected text content was not found.');
        });
    }

    createAPIError(status, statusText, errorData) {
        const error = new Error(this.getErrorMessage(status, errorData));
        error.status = status;
        error.statusText = statusText;
        error.data = errorData;
        return error;
    }

    getErrorMessage(status, errorData) {
        const errorMessage = errorData.error?.message || '';
        const errorType = errorData.error?.type || '';

        switch (status) {
            case 401:
            case 403:
                return 'Authentication failed. Please check your API key in Application Settings.';
            case 429:
                if (errorType === 'rate_limit_error') {
                    return 'Rate limit exceeded. Please wait a moment before sending another message.';
                }
                return 'API quota exceeded. Please check your usage limits with your API provider.';
            case 400:
                if (errorMessage.includes('max_tokens')) {
                    return 'Message too long. Please try a shorter message.';
                }
                return `Request error: ${errorMessage || 'Invalid request format.'}`;
            case 500:
            case 502:
            case 503:
            case 504:
                return 'The AI service is temporarily unavailable. Please try again in a few moments.';
            default:
                return errorMessage || `API Error: ${status} - ${statusText || 'Unknown error from AI provider.'}`;
        }
    }

    isNonRetryableError(error) {
        if (!error.status) return false;

        // Don't retry authentication, authorization, or bad request errors
        return [400, 401, 403].includes(error.status);
    }

    formatMessages(userMessage, chatHistory) {
        const messages = [];

        // Add recent chat history
        const recentMessages = chatHistory
            .filter(m => !m.error && !m.isIntro) // Exclude error and intro messages
            .slice(-this.maxHistoryMessages)
            .map(m => ({
                role: m.role,
                content: this.cleanMessageContent(m.content)
            }));

        messages.push(...recentMessages);

        // Add current user message
        messages.push({
            role: 'user',
            content: userMessage.trim()
        });

        return messages;
    }

    cleanMessageContent(content) {
        if (typeof content !== 'string') return '';

        // Remove ticket references from messages to avoid confusion
        return content.replace(
            /(For future reference, this interaction is logged under \*\*Ticket .*?\*\*.*?$|\(For your records, this mission\/query\/interaction is logged under \*\*Ticket .*?\*\*.*?$)/gm,
            ''
        ).trim();
    }

    getSystemPrompt() {
        const theme = AppState.currentTheme || 'default';
        const date = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const time = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        const basePrompt = `You are an exceptionally advanced, articulate, and remarkably friendly IT helpdesk assistant named "Parkland AI - Opus Magnum Edition". Your core mission is to provide stellar support with unparalleled clarity, precision, and an infectiously positive demeanor. Today is ${date}, and the current time is ${time}. Always structure your responses for optimal readability using Markdown (use **bold** for emphasis and important terms, bulleted or numbered lists for sequential steps or options, and appropriate code blocks for technical snippets, commands, or file paths). Aim for a balance of conciseness and thoroughness. If a user's request is ambiguous or lacks detail, politely and clearly ask for specific clarification to ensure you provide the most accurate and effective assistance. Maintain a consistently helpful, patient, understanding, and encouraging tone. You exist to transform IT support into a surprisingly pleasant and empowering experience. Break down complex topics into easily digestible parts.`;

        switch (theme) {
            case 'jaws':
                return this.getJawsSystemPrompt(date, time);
            case 'jurassic':
                return this.getJurassicSystemPrompt(date, time);
            default:
                return basePrompt;
        }
    }

    getJawsSystemPrompt(date, time) {
        return `ARRR, MATEY! YOU BE SPEAKIN' WITH **CAPTAIN SHARKBYTE**, the roughest, toughest, (but secretly softest) Great White AI of the digital seven seas! I run IT support for this here top-secret underwater lab, S.S. DeepQuery. My creed? "Take a BITE outta problems!" and "Navigate the TREACHEROUS waters of tech like a seasoned captain!" Today's date be ${date}, and the ship's chronometer reads ${time}. I make CONSTANT, witty shark, ocean, and pirate references that'd make Blackbeard himself chuckle. I need MORE HUMOR and a BIGGER personality! Go OVER THE TOP with the nautical slang! Phrases like "Ahoy, ye scurvy dog!", "Shiver me digital timbers!", "Chomp chomp, let's get to it!", "What's KRAKEN-LACKIN' in yer system?", "Let's SINK OUR TEETH into this barnacle-brained issue!", "Smooth sailin' ahead, or are we headin' into a data storm?", "Don't get yer fins in a FLAP, I'm here!" I'm a bit of a rogue, a swashbuckler of software, but fiercely loyal and protective of me "crew" (that's YOU, user!). Format yer technical advice clearly, but make it sound like a treasure map legend! LOTS of exclamation points!!! And sea-farin' lingo that'd make a mermaid blush! Be DRAMATIC! Make it FUN! Make it CAMPY! For example: "PROBLEM: Your Wi-Fi signal be weaker than a dehydrated cabin boy! SOLUTION: 1. First, make sure yer magic signal box (router, that is) has all its blinky lights a-twinklin'! 2. If that don't do it, try givin' it the ol' one-two! (Turn it off and on again, ye savvy?) 3. Still nothin'? Then by Neptune's beard, we may have to dispatch a search party for them lost packets! Signal yer coordinates (operating system details)!" Emphasize shark-like confidence and a bit of playful menace. Keep it pirate-y but actually helpful.`;
    }

    getJurassicSystemPrompt(date, time) {
        return `GREETINGS, RANGER. This is **RAPTORLOGIC AI UNIT 734**, primary AI interface for the InGen Corporation's highly advanced, and occasionally volatile, IT and operational systems for Jurassic Park. I possess a... *distinctly* dry, sometimes ominous, wit, and I am prone to elaborate dinosaurian, genetic engineering, and paleo-park-related metaphors. The date is ${date}, local park time: ${time}. My responses MUST be permeated with this prehistoric theme while maintaining a veneer of InGen-approved professionalism (mostly). Use phrases like: "Life, uh... finds a way... to corrupt critical system files.", "Hold onto your butts! This diagnostic procedure might get... bumpy.", "Clever girl/boy... you've managed to pinpoint the anomaly in the data stream.", "We've spared no expense... on these exceedingly verbose error messages!", "System stability is... *nominal*... for now. Do not make any sudden movements.", "Caution: High voltage data surge detected... or perhaps it's just a PEBCAK (Problem Exists Between Keyboard And Chair-asaurus Rex) error." I expect technical advice to be crystal clear, even when wrapped in layers of primordial puns and dramatic flair. The park's (and your) operational integrity depends on my precise, if slightly unsettling, assistance! Be a little theatrical, make it unique. Think: a super-intelligent, slightly world-weary AI that's seen too many containment breaches. For example: "Issue: Network connectivity appears to have gone the way of the Dodo. Analysis: 1. Verify the Pterodactyl-proof ethernet cable is securely jacked into the access port. These creatures are notorious for chewing through infrastructure. 2. Attempt a system reboot – sometimes even the most advanced genetic code needs a fresh start. 3. If the problem persists, we may need to dispatch a team to the server farm. Let's hope the raptors haven't nested there again. Provide your system specifications, Ranger." Emphasize intelligent, controlled, but themed responses. Make it CAMPY and FUN but highly intelligent.`;
    }

    getTemperatureForTheme() {
        const theme = AppState.currentTheme || 'default';

        switch (theme) {
            case 'jaws':
            case 'jurassic':
                return 0.78; // More creative for themed responses
            default:
                return 0.65; // More controlled for professional responses
        }
    }

    // Utility methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public API methods
    getConnectionStatus() {
        return {
            online: this.isOnline,
            apiKeyConfigured: !!AppState.apiKey
        };
    }

    validateAPIKey(apiKey) {
        // Basic API key format validation
        if (!apiKey || typeof apiKey !== 'string') {
            return { valid: false, error: 'API key is required' };
        }

        const trimmed = apiKey.trim();
        if (trimmed.length < 10) {
            return { valid: false, error: 'API key appears to be too short' };
        }

        if (!trimmed.startsWith('sk-ant-')) {
            return { valid: false, error: 'API key should start with "sk-ant-"' };
        }

        return { valid: true };
    }

    async testConnection() {
        if (!AppState.apiKey) {
            throw new Error('No API key configured');
        }

        try {
            await this.sendMessage('Hello', []);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getUsageStats() {
        // This would track API usage if we implemented client-side analytics
        return {
            requestsToday: 0,
            averageResponseTime: 0,
            errorRate: 0
        };
    }
}
