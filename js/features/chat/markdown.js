/**
 * Parkland AI - Opus Magnum Edition
 * Markdown Processor
 *
 * Handles conversion of Markdown text to sanitized HTML, including syntax highlighting for code blocks.
 * Relies on external libraries: markdown-it, DOMPurify, and Prism.js,
 * which are expected to be loaded globally via <script> tags in index.html.
 */

class MarkdownProcessor {
    /**
     * @param {ParklandUtils} utils - Instance of ParklandUtils for helper functions like wait.
     */
    constructor(utils) {
        if (!utils) {
            // This is a critical dependency for the init polling.
            // Fallback to a simple promise-based timeout if utils is missing, though this shouldn't happen.
            console.error("MarkdownProcessor: Utils instance is required! Using basic timeout for polling.");
            this.utils = { wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)) };
        } else {
            this.utils = utils;
        }

        this.md = null;
        this.sanitizer = null;
        this.highlighter = null; // For Prism.js
        this.domPurifyConfig = {
            USE_PROFILES: { html: true }, // Allows common HTML elements like p, b, i, ul, ol, li, pre, code, table, etc.
            ADD_TAGS: ['figure', 'figcaption', 'details', 'summary', 'kbd', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
            ADD_ATTR: ['target', 'rel', 'start', 'type', 'class', 'id', 'scope', 'colspan', 'rowspan', 'alt', 'title', 'href', 'src'], // 'class' for Prism.js, 'alt'/'title'/'href'/'src' for images/links
            // FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'], // Be explicit about dangerous tags
            // FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'], // Forbid dangerous attributes, 'style' can be risky
            ALLOW_DATA_ATTR: false, // Typically false by default, good to be explicit
            ALLOW_UNKNOWN_PROTOCOLS: false // Prevent mailto:, javascript: etc. in links unless specifically needed
        };
        this._isInitialized = false;
        this._coreDependenciesMet = false; // Tracks if markdown-it and DOMPurify loaded
        // Constructor no longer initializes md or sanitizer immediately.
    }

    /**
     * Asynchronously initializes the MarkdownProcessor by attempting to load
     * and configure markdown-it, DOMPurify, and Prism.js from global scope.
     * @returns {Promise<boolean>} Resolves to true if core dependencies (markdown-it, DOMPurify) are loaded, false otherwise.
     */
    async init() {
        if (this._isInitialized) {
            return this._coreDependenciesMet;
        }

        const pollingAttempts = 30; // Try for 3 seconds (30 * 100ms)
        const pollingInterval = 100; // 100ms

        // Wait for markdown-it
        for (let i = 0; i < pollingAttempts; i++) {
            if (typeof window.markdownit === 'function') {
                this.md = window.markdownit({
                    html: false,        // Disable HTML tags in source by default for security with markdown-it. DOMPurify will handle allowed HTML later.
                    xhtmlOut: false,
                    breaks: true,
                    linkify: true,
                    typographer: true,
                    langPrefix: 'language-', // For Prism.js compatibility
                });
                // Configure markdown-it plugins if they were also loaded via CDN
                // e.g., if (window.markdownitFootnote) { this.md.use(window.markdownitFootnote); }
                // Add custom class to tables
                if (this.md && this.md.renderer && this.md.renderer.rules) {
                    const defaultRenderTableOpen = this.md.renderer.rules.table_open || function(tokens, idx, options, env, self) {
                        return self.renderToken(tokens, idx, options);
                    };
                    this.md.renderer.rules.table_open = function (tokens, idx, options, env, self) {
                        tokens[idx].attrPush(['class', 'md-table']);
                        return defaultRenderTableOpen(tokens, idx, options, env, self);
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
        // Prism's autoloader might also take some time.
        for (let i = 0; i < pollingAttempts + 10; i++) { // Give Prism a bit longer
            if (typeof window.Prism === 'object' && (window.Prism.highlightAllUnder || window.Prism.highlightElement)) {
                this.highlighter = window.Prism;
                break;
            }
            await this.utils.wait(pollingInterval);
        }


        if (!this.md) {
            console.error('MarkdownProcessor Init Error: Markdown library (markdown-it) NOT FOUND after waiting. Markdown processing will be very basic and unsafe if HTML is present.');
            this.md = { // Basic fallback, less safe if Markdown source contains HTML
                render: (text) => {
                    const escapedText = String(text || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
                    return escapedText.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
                }
            };
        }
        if (!this.sanitizer) {
            console.error('MarkdownProcessor Init Error: DOMPurify NOT FOUND after waiting. HTML sanitization will be SKIPPED (VERY RISKY!).');
            this.sanitizer = { sanitize: (html) => html }; // Passthrough (dangerous)
        }
        if (!this.highlighter) {
            console.warn('MarkdownProcessor Init: Prism.js not found after waiting. Code syntax highlighting will not be available.');
        }

        this._isInitialized = true;
        this._coreDependenciesMet = !!(this.md && this.sanitizer && this.sanitizer.sanitize !== Object.prototype.toString && typeof this.md.render === 'function');

        if (this._coreDependenciesMet) {
            console.log('📝 MarkdownProcessor initialized successfully with markdown-it and DOMPurify.');
        } else {
            console.error('📝 MarkdownProcessor initialized with MISSING CORE DEPENDENCIES (markdown-it or DOMPurify). Functionality will be limited and potentially insecure.');
        }
        return this._coreDependenciesMet;
    }

    /**
     * Converts raw Markdown text to sanitized and highlighted HTML.
     * @param {string} rawMarkdown - The raw Markdown text.
     * @returns {string} The processed HTML string.
     */
    process(rawMarkdown) {
        if (!this._isInitialized) {
            console.warn("MarkdownProcessor.process() called before init() has completed. Using basic fallback.");
            // Fallback to ensure something is returned if called too early
            const escapedText = String(rawMarkdown || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
            return `<p>${escapedText.replace(/\n/g, '<br>')}</p>`;
        }
        if (typeof rawMarkdown !== 'string') {
            return '';
        }

        let html = '';
        try {
            html = this.md.render(rawMarkdown);
        } catch (error) {
            console.error('Error rendering Markdown with markdown-it:', error);
            return `<p style="color: red;">Error rendering Markdown content.</p>`;
        }

        try {
            // Sanitize the HTML produced by markdown-it
            html = this.sanitizer.sanitize(html, this.domPurifyConfig);
        } catch (error) {
            console.error('Error sanitizing HTML with DOMPurify:', error);
            return `<p style="color: red;">Error sanitizing content after Markdown processing.</p>`;
        }

        // Syntax Highlighting with Prism.js
        // This step is best performed *after* the sanitized HTML is inserted into the DOM
        // by the module that uses this processor (e.g., ChatMessages.js).
        // However, if pre-highlighted HTML string is strictly needed:
        if (this.highlighter && (html.includes('<pre') || html.includes('<code>'))) {
            try {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                // Prism.highlightAllUnder is more reliable when elements are in the DOM.
                // For a string, it's better to target specific elements.
                this.utils.$$('pre > code[class*="language-"]', tempDiv).forEach((block) => {
                    this.highlighter.highlightElement(block);
                });
                // If Prism Autoloader is working, this might be enough, or a more general call:
                // this.highlighter.highlightAllUnder(tempDiv);
                html = tempDiv.innerHTML;
            } catch (error) {
                console.error('Error applying syntax highlighting during MarkdownProcessor.process:', error);
                // Non-fatal, return sanitized HTML without highlighting
            }
        }
        return html;
    }

    /**
     * A simplified processing method that only converts markdown to HTML and sanitizes.
     * Useful if syntax highlighting is handled separately after DOM insertion.
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
