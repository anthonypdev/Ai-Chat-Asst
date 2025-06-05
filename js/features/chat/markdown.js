/**
 * Parkland AI - Opus Magnum Edition
 * Markdown Processor
 *
 * Handles conversion of Markdown text to HTML.
 * HTML sanitization with DOMPurify has been REMOVED as per user directive to ensure app loads.
 * This means any HTML in AI responses will be rendered as-is (SECURITY RISK).
 * Relies on markdown-it and Prism.js (if available) loaded globally.
 */

class MarkdownProcessor {
    /**
     * @param {ParklandUtils} utils - Instance of ParklandUtils for helper functions like wait.
     */
    constructor(utils) {
        if (!utils || typeof utils.wait !== 'function') {
            console.error("MarkdownProcessor: Utils instance with a 'wait' method is required!");
            this.utils = { wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)) };
        } else {
            this.utils = utils;
        }

        this.md = null;
        // DOMPurify is intentionally removed. Sanitizer will be a passthrough.
        this.sanitizer = {
            sanitize: (html) => {
                // This is a passthrough, no actual sanitization.
                // console.warn("DOMPurify not loaded; HTML sanitization is being SKIPPED. This is a security risk.");
                return html;
            }
        };
        this.highlighter = null; // For Prism.js
        // domPurifyConfig is no longer used by this passthrough sanitizer.
        // this.domPurifyConfig = { /* ... */ };

        this._isInitialized = false;
        this._markdownItLoaded = false;
        this._domPurifyLoaded = false; // Will remain false
        this._prismLoaded = false;
    }

    /**
     * Asynchronously initializes the MarkdownProcessor by attempting to load
     * markdown-it and Prism.js from global scope. DOMPurify is no longer waited for.
     * @returns {Promise<boolean>} Resolves to true if markdown-it is loaded, false otherwise.
     */
    async init() {
        if (this._isInitialized) {
            return this._markdownItLoaded;
        }

        const pollingAttemptsMarkdown = 30; // Try for 3 seconds
        const pollingAttemptsPrism = 30;    // Try for 3 seconds
        const pollingInterval = 100;

        // Wait for markdown-it
        for (let i = 0; i < pollingAttemptsMarkdown; i++) {
            if (typeof window.markdownit === 'function') {
                try {
                    this.md = window.markdownit({
                        html: true,        // Enable HTML tags in source
                        xhtmlOut: false,
                        breaks: true,
                        linkify: true,
                        typographer: true,
                        langPrefix: 'language-',
                    });
                    const defaultRenderTableOpen = this.md.renderer.rules.table_open || function(tokens, idx, options, env, self) {
                        return self.renderToken(tokens, idx, options);
                    };
                    this.md.renderer.rules.table_open = function (tokens, idx, options, env, self) {
                        tokens[idx].attrPush(['class', 'md-table']);
                        return defaultRenderTableOpen(tokens, idx, options, env, self);
                    };
                    this._markdownItLoaded = true;
                } catch (e) {
                    console.error("Error initializing markdown-it even though it was found:", e);
                    this._markdownItLoaded = false;
                }
                break;
            }
            await this.utils.wait(pollingInterval);
        }

        // DOMPurify is intentionally skipped.
        this._domPurifyLoaded = false; // Explicitly false
        console.warn('MarkdownProcessor Init: DOMPurify dependency has been REMOVED. HTML sanitization will NOT occur. This is a security risk.');


        // Check for Prism.js
        for (let i = 0; i < pollingAttemptsPrism; i++) {
            if (typeof window.Prism === 'object' && (window.Prism.highlightAllUnder || window.Prism.highlightElement)) {
                this.highlighter = window.Prism;
                this._prismLoaded = true;
                break;
            }
            await this.utils.wait(pollingInterval);
        }

        if (!this._markdownItLoaded) {
            console.error('MarkdownProcessor Init Error: Markdown library (markdown-it) NOT FOUND after waiting. Markdown processing will be very basic.');
            this.md = {
                render: (text) => {
                    const escapedText = String(text || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
                    return `<p>${escapedText.replace(/\n/g, '<br>')}</p>`;
                }
            };
        }
        if (!this._prismLoaded) {
            console.warn('MarkdownProcessor Init: Prism.js not found after waiting. Code syntax highlighting will not be available.');
            this.highlighter = null;
        }

        this._isInitialized = true;
        
        if (this._markdownItLoaded) {
            console.log(`📝 MarkdownProcessor initialized. markdown-it: loaded, DOMPurify: SKIPPED (SECURITY RISK), Prism.js: ${this._prismLoaded ? 'loaded' : 'NOT FOUND'}.`);
        } else {
            console.error(`📝 MarkdownProcessor initialized with MISSING markdown-it. DOMPurify: SKIPPED. Functionality severely limited.`);
        }
        return this._markdownItLoaded; // Success now only depends on markdown-it for basic processing
    }

    /**
     * Converts raw Markdown text to HTML (unsanitized) and highlights code.
     * @param {string} rawMarkdown - The raw Markdown text.
     * @returns {string} The processed HTML string.
     */
    process(rawMarkdown) {
        if (!this._isInitialized) {
            console.warn("MarkdownProcessor.process() called before init() has completed. Using basic fallback.");
            const escapedText = String(rawMarkdown || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
            return `<p>${escapedText.replace(/\n/g, '<br>')}</p>`;
        }
        if (typeof rawMarkdown !== 'string') return '';

        let html = '';
        try {
            html = this.md.render(rawMarkdown);
        } catch (error) {
            console.error('Error rendering Markdown with markdown-it instance:', error);
            return `<p style="color: red;">Error rendering Markdown content.</p>`;
        }

        // HTML Sanitization is SKIPPED
        // html = this.sanitizer.sanitize(html, this.domPurifyConfig); 

        if (this.highlighter && (html.includes('<pre') || html.includes('<code'))) {
            try {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                this.utils.$$('pre code[class*="language-"]', tempDiv).forEach((block) => {
                    this.highlighter.highlightElement(block);
                });
                html = tempDiv.innerHTML;
            } catch (error) {
                console.error('Error applying syntax highlighting during MarkdownProcessor.process:', error);
            }
        }
        return html;
    }

    /**
     * A simplified processing method that only converts markdown to HTML (unsanitized).
     * @param {string} rawMarkdown - The raw Markdown text.
     * @returns {string} HTML string (unsanitized).
     */
    toSanitizedHtml(rawMarkdown) { // Method name is now a misnomer, but kept for API compatibility
        if (!this._isInitialized) {
             console.warn("MarkdownProcessor.toSanitizedHtml() called before init() or dependencies missing. Using basic fallback.");
            const escapedText = String(rawMarkdown || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
            return `<p>${escapedText.replace(/\n/g, '<br>')}</p>`;
        }
        if (typeof rawMarkdown !== 'string') return '';
        let html = '';
        try {
            html = this.md.render(rawMarkdown);
        } catch (error) {
            console.error('Error rendering Markdown (toSanitizedHtml):', error);
            return '<p style="color: red;">Error rendering content.</p>';
        }
        // HTML Sanitization is SKIPPED
        // html = this.sanitizer.sanitize(html, this.domPurifyConfig);
        return html;
    }
}

// If not using ES modules:
// window.MarkdownProcessor = MarkdownProcessor;
