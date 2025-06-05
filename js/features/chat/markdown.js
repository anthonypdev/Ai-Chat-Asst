/**
 * Parkland AI - Opus Magnum Edition
 * Markdown Processor
 *
 * Handles conversion of Markdown text to sanitized HTML, including syntax highlighting for code blocks.
 * Relies on external libraries: markdown-it, DOMPurify, and Prism.js,
 * which are expected to be loaded globally (e.g., via <script> tags in index.html).
 */

class MarkdownProcessor {
    /**
     * @param {ParklandUtils} utils - Instance of ParklandUtils for helper functions like wait.
     */
    constructor(utils) {
        if (!utils) {
            console.error("MarkdownProcessor: Utils instance is required for initialization polling.");
            // Provide a basic fallback for utils.wait if not provided, though it's a core dependency.
            this.utils = { wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)) };
        } else {
            this.utils = utils;
        }

        this.md = null;
        this.sanitizer = null;
        this.highlighter = null; // For Prism.js
        this.domPurifyConfig = {
            USE_PROFILES: { html: true },
            ADD_TAGS: ['figure', 'figcaption', 'details', 'summary', 'kbd', 'table', 'thead', 'tbody', 'tr', 'th', 'td'], // Added table elements
            ADD_ATTR: ['target', 'rel', 'start', 'type', 'class', 'id', 'scope', 'colspan', 'rowspan'], // Added 'class' for Prism, table attributes
            // FORBID_TAGS: [], // Be explicit if needed
            // FORBID_ATTR: [], // Be explicit if needed
            ALLOW_DATA_ATTR: false, // Usually false by default, good to be explicit
        };
        this._isInitialized = false;
        // Initial log moved to end of init()
    }

    /**
     * Asynchronously initializes the MarkdownProcessor by attempting to load
     * and configure markdown-it, DOMPurify, and Prism.js from global scope.
     * @returns {Promise<boolean>} Resolves to true if core dependencies (markdown-it, DOMPurify) are loaded, false otherwise.
     */
    async init() {
        if (this._isInitialized) {
            // console.log("MarkdownProcessor already initialized.");
            return true;
        }

        const pollingAttempts = 20; // Try for 2 seconds (20 * 100ms)
        const pollingInterval = 100; // 100ms

        // Wait for markdown-it
        for (let i = 0; i < pollingAttempts; i++) {
            if (typeof window.markdownit === 'function') {
                this.md = window.markdownit({
                    html: true,        // Enable HTML tags in source
                    xhtmlOut: false,   // Use HTML5 syntax
                    breaks: true,      // Convert '\n' in paragraphs into <br>
                    linkify: true,     // Autoconvert URL-like text to links
                    typographer: true, // Enable some language-neutral replacement + quotes beautification
                    // langPrefix: 'language-', // For Prism.js compatibility if markdown-it doesn't add it by default for fences
                });
                // Example: Add table class for easier styling
                if (this.md && this.md.renderer && this.md.renderer.rules) {
                    const defaultRender = this.md.renderer.rules.table_open || function(tokens, idx, options, env, self) {
                        return self.renderToken(tokens, idx, options);
                    };
                    this.md.renderer.rules.table_open = function (tokens, idx, options, env, self) {
                        tokens[idx].attrPush(['class', 'md-table']); // Add a custom class to tables
                        return defaultRender(tokens, idx, options, env, self);
                    };
                }
                break;
            }
            await this.utils.wait(pollingInterval);
        }

        // Wait for DOMPurify
        for (let i = 0; i < pollingAttempts; i++) {
            if (typeof window.DOMPurify === 'object' && typeof window.DOMPurify.sanitize === 'function') {
                this.sanitizer = window.DOMPurify;
                break;
            }
            await this.utils.wait(pollingInterval);
        }

        // Check for Prism.js (syntax highlighting is progressive enhancement)
        if (typeof window.Prism === 'object' && typeof window.Prism.highlightAllUnder === 'function') {
            this.highlighter = window.Prism;
        } else {
            // Check again after a short delay for Prism, as its autoloader might be slower
            await this.utils.wait(500);
            if (typeof window.Prism === 'object' && (window.Prism.highlightAllUnder || window.Prism.highlightElement)) {
                 this.highlighter = window.Prism;
            } else {
                console.warn('Prism.js not found. Code syntax highlighting will not be available.');
                this.highlighter = null;
            }
        }

        if (!this.md) {
            console.error('Markdown library (markdown-it) NOT FOUND after waiting. Markdown processing will be very basic.');
            this.md = { // Basic fallback
                render: (text) => {
                    const escapedText = String(text || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
                    return escapedText.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
                }
            };
        }
        if (!this.sanitizer) {
            console.error('DOMPurify NOT FOUND after waiting. HTML sanitization will be SKIPPED (VERY RISKY!).');
            this.sanitizer = { sanitize: (html) => html }; // Passthrough (dangerous)
        }

        this._isInitialized = true;
        console.log('📝 MarkdownProcessor initialized. Markdown-it ready:', !!(this.md && this.md.render !== String.prototype.split), 'DOMPurify ready:', !!(this.sanitizer && this.sanitizer.sanitize !== Object.prototype.toString));
        return !!(this.md && this.sanitizer && this.sanitizer.sanitize !== Object.prototype.toString); // Return true if core dependencies are met
    }

    /**
     * Converts raw Markdown text to sanitized and highlighted HTML.
     * @param {string} rawMarkdown - The raw Markdown text.
     * @returns {string} The processed HTML string.
     */
    process(rawMarkdown) {
        if (!this._isInitialized) {
            console.warn("MarkdownProcessor.process() called before init() fully completed or dependencies missing. Using basic fallback.");
            const escapedText = String(rawMarkdown || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
            return `<p>${escapedText.replace(/\n/g, '<br>')}</p>`;
        }
        if (typeof rawMarkdown !== 'string') return '';

        let html = '';
        try {
            html = this.md.render(rawMarkdown);
        } catch (error) {
            console.error('Error rendering Markdown:', error);
            return `<p style="color: red;">Error rendering Markdown content.</p>`;
        }

        try {
            html = this.sanitizer.sanitize(html, this.domPurifyConfig);
        } catch (error) {
            console.error('Error sanitizing HTML:', error);
            return `<p style="color: red;">Error sanitizing content.</p>`;
        }

        // Syntax highlighting is done after insertion into DOM by ChatMessages module typically,
        // but if we want pre-highlighted HTML string (less common for Prism.js):
        if (this.highlighter && (html.includes('<pre') || html.includes('<code'))) {
            try {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                // Prism.highlightAllUnder is best for already attached DOM,
                // for strings, individual element highlighting is safer if language is known.
                // Markdown-it usually adds 'language-xxxx' class to <code> inside <pre>.
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
     * A simplified processing method that only converts markdown to HTML and sanitizes.
     * Used if syntax highlighting will be handled manually after DOM insertion.
     * @param {string} rawMarkdown - The raw Markdown text.
     * @returns {string} Sanitized HTML string.
     */
    toSanitizedHtml(rawMarkdown) {
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
        try {
            html = this.sanitizer.sanitize(html, this.domPurifyConfig);
        } catch (error) {
            console.error('Error sanitizing HTML (toSanitizedHtml):', error);
            return '<p style="color: red;">Error sanitizing content.</p>';
        }
        return html;
    }
}

// If not using ES modules:
// window.MarkdownProcessor = MarkdownProcessor;
