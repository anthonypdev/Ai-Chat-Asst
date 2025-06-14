/**
 * Parkland AI - Logging Utility
 * A centralized logging system to replace console.log statements
 */

class Logger {
    constructor() {
        this.levels = {
            ERROR: 0,
            WARN: 1, 
            INFO: 2,
            DEBUG: 3
        };
        this.currentLevel = this.levels.INFO; // Default level
        this.enabledInProduction = false;
    }

    setLevel(level) {
        if (typeof level === 'string') {
            this.currentLevel = this.levels[level.toUpperCase()] || this.levels.INFO;
        } else {
            this.currentLevel = level;
        }
    }

    enableInProduction() {
        this.enabledInProduction = true;
    }

    _shouldLog(level) {
        // In production, only log if explicitly enabled
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !this.enabledInProduction) {
            return false;
        }
        return level <= this.currentLevel;
    }

    _formatMessage(level, component, message, ...args) {
        const timestamp = new Date().toISOString();
        const levelName = Object.keys(this.levels)[level] || 'UNKNOWN';
        const prefix = `[${timestamp}] ${levelName}${component ? ` [${component}]` : ''}:`;
        return [prefix, message, ...args];
    }

    error(message, component = null, ...args) {
        if (this._shouldLog(this.levels.ERROR)) {
            console.error(...this._formatMessage(this.levels.ERROR, component, message, ...args));
        }
    }

    warn(message, component = null, ...args) {
        if (this._shouldLog(this.levels.WARN)) {
            console.warn(...this._formatMessage(this.levels.WARN, component, message, ...args));
        }
    }

    info(message, component = null, ...args) {
        if (this._shouldLog(this.levels.INFO)) {
            console.info(...this._formatMessage(this.levels.INFO, component, message, ...args));
        }
    }

    debug(message, component = null, ...args) {
        if (this._shouldLog(this.levels.DEBUG)) {
            console.log(...this._formatMessage(this.levels.DEBUG, component, message, ...args));
        }
    }

    // Convenience methods for specific components
    app(message, ...args) {
        this.debug(message, 'APP', ...args);
    }

    state(message, ...args) {
        this.debug(message, 'STATE', ...args);
    }

    character(message, ...args) {
        this.debug(message, 'CHARACTER', ...args);
    }

    theme(message, ...args) {
        this.debug(message, 'THEME', ...args);
    }

    voice(message, ...args) {
        this.debug(message, 'VOICE', ...args);
    }

    api(message, ...args) {
        this.debug(message, 'API', ...args);
    }
}

// Create global logger instance
const logger = new Logger();

// Set debug level in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    logger.setLevel('DEBUG');
}

// Make logger available globally
window.logger = logger;