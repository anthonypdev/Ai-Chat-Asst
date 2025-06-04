/**
 * Parkland AI - Opus Magnum Edition
 * Custom API Error Classes
 *
 * Defines a set of custom error classes to provide more specific information
 * about errors encountered during API interactions.
 */

/**
 * Base class for all API-related errors.
 */
class APIError extends Error {
    /**
     * @param {string} message - The error message.
     * @param {number} [status] - The HTTP status code, if applicable.
     * @param {string} [type] - A specific error type string (e.g., 'authentication_error').
     * @param {Error} [originalError] - The original error object, if any.
     */
    constructor(message, status, type, originalError) {
        super(message);
        this.name = this.constructor.name; // Set the error name to the class name
        this.status = status; // HTTP status code
        this.type = type;     // Specific error type (e.g., from API response)
        this.originalError = originalError; // Store the underlying error

        // Maintain proper stack trace (if available)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * Error for authentication issues (e.g., invalid API key).
 * Typically corresponds to HTTP 401 or 403.
 */
class AuthenticationError extends APIError {
    constructor(message = 'Authentication failed. Please check your API key.', status = 401, originalError) {
        super(message, status, 'authentication_error', originalError);
    }
}

/**
 * Error for rate limiting issues (e.g., too many requests).
 * Typically corresponds to HTTP 429.
 */
class RateLimitError extends APIError {
    constructor(message = 'API rate limit exceeded. Please try again later.', status = 429, originalError) {
        super(message, status, 'rate_limit_error', originalError);
    }
}

/**
 * Error for server-side issues on the API provider's end.
 * Typically corresponds to HTTP 5xx status codes.
 */
class ServerError extends APIError {
    constructor(message = 'The API server encountered an error. Please try again later.', status = 500, originalError) {
        super(message, status, 'server_error', originalError);
    }
}

/**
 * Error for invalid requests (e.g., malformed parameters, validation errors).
 * Typically corresponds to HTTP 400.
 */
class InvalidRequestError extends APIError {
    constructor(message = 'The request was invalid or malformed.', status = 400, originalError) {
        super(message, status, 'invalid_request_error', originalError);
    }
}

/**
 * Error for when a requested resource is not found.
 * Typically corresponds to HTTP 404.
 */
class NotFoundError extends APIError {
    constructor(message = 'The requested API resource was not found.', status = 404, originalError) {
        super(message, status, 'not_found_error', originalError);
    }
}

/**
 * Error for request timeouts.
 * Not directly tied to an HTTP status, but represents a client-side timeout.
 */
class TimeoutError extends APIError {
    constructor(message = 'The API request timed out.', status, originalError) { // Status might not be relevant here
        super(message, status, 'timeout_error', originalError);
    }
}

/**
 * General network error (e.g., DNS resolution failure, connection refused).
 * Not directly tied to an HTTP status from the API server itself.
 */
class NetworkError extends APIError {
    constructor(message = 'A network error occurred. Please check your connection.', status, originalError) {
        super(message, status, 'network_error', originalError);
    }
}

/**
 * Error when the API request is aborted, e.g., by an AbortController.
 */
class AbortError extends APIError {
    constructor(message = 'The API request was aborted.', status, originalError) {
        super(message, status, 'abort_error', originalError);
    }
}


/**
 * Helper function to create and throw an appropriate API error based on
 * an HTTP response object and potentially parsed response data.
 * This function can be used within API service classes.
 *
 * @param {Response} response - The Fetch API Response object.
 * @param {Object} [responseData] - Optional parsed JSON data from the response body.
 * @param {Error} [originalFetchError] - Optional error object from the fetch call itself (e.g., network error).
 * @throws {APIError} Throws an instance of a custom API error.
 */
function createApiErrorFromResponse(response, responseData, originalFetchError) {
    const status = response ? response.status : (originalFetchError ? undefined : 500);
    let message = `API request failed with status ${status}.`;
    let type = 'unknown_error';
    let errorDetails = responseData && responseData.error ? responseData.error : null;

    if (originalFetchError) { // If it's a network error before getting a response
        if (originalFetchError.name === 'AbortError') {
            throw new AbortError(originalFetchError.message || 'Request aborted by client.', undefined, originalFetchError);
        }
        throw new NetworkError(originalFetchError.message || 'Network error during API request.', undefined, originalFetchError);
    }

    if (errorDetails) {
        message = `Error ${errorDetails.type || status}: ${errorDetails.message || 'Unknown API error.'}`;
        type = errorDetails.type || type;
    } else if (responseData && typeof responseData.detail === 'string') { // Some APIs put error in detail
        message = `Error ${status}: ${responseData.detail}`;
        type = 'detail_error';
    } else if (response && response.statusText) {
        message = `API Error ${status}: ${response.statusText}`;
    }

    switch (status) {
        case 400:
            throw new InvalidRequestError(message, status, errorDetails || responseData);
        case 401:
        case 403: // Often permission issues are also 403
            throw new AuthenticationError(message, status, errorDetails || responseData);
        case 404:
            throw new NotFoundError(message, status, errorDetails || responseData);
        case 429:
            throw new RateLimitError(message, status, errorDetails || responseData);
        default:
            if (status >= 500 && status < 600) {
                throw new ServerError(message, status, errorDetails || responseData);
            }
            // For other 4xx errors or unhandled cases
            throw new APIError(message, status, type, errorDetails || responseData);
    }
}


// Exporting the classes for use in other modules
// If not using ES modules, they would be available globally or attached to a namespace.
// export {
//     APIError,
//     AuthenticationError,
//     RateLimitError,
//     ServerError,
//     InvalidRequestError,
//     NotFoundError,
//     TimeoutError,
//     NetworkError,
//     AbortError,
//     createApiErrorFromResponse
// };

// For non-module environments, attach to a global namespace if needed:
if (typeof window !== 'undefined') {
    window.ParklandApiErrors = {
        APIError,
        AuthenticationError,
        RateLimitError,
        ServerError,
        InvalidRequestError,
        NotFoundError,
        TimeoutError,
        NetworkError,
        AbortError,
        createApiErrorFromResponse
    };
}
