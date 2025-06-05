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
        if (!utils || typeof utils.wait !== 'function') {
            console.error("MarkdownProcessor: Utils instance with a 'wait' method is required!");
            this.utils = { wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)) };
        } else {
            this.utils = utils;
        }

        this.md = null;
        this.sanitizer = null;
        this.highlighter = null;
        this.domPurifyConfig = {
            USE_PROFILES: { html: true },
            ADD_TAGS: ['figure', 'figcaption', 'details', 'summary', 'kbd', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
            ADD_ATTR: ['target', 'rel', 'start', 'type', 'class', 'id', 'scope', 'colspan', 'rowspan', 'alt', 'title', 'href', 'src', 'style'],
            ALLOW_DATA_ATTR: true,
            ALLOW_UNKNOWN_PROTOCOLS: false
        };
        this._isInitialized = false;
        this._markdownItLoaded = false;
        this._domPurifyLoaded = false;
        this._prismLoaded = false;
    }

    /**
     * Asynchronously initializes the MarkdownProcessor by attempting to load
     * and configure markdown-it, DOMPurify, and Prism.js from global scope.
     * @returns {Promise<boolean>} Resolves to true if core dependencies (markdown-it, DOMPurify) are properly loaded, false otherwise.
     */
    async init() {
        if (this._isInitialized) {
            return this._markdownItLoaded && this._domPurifyLoaded;
        }

        const pollingAttemptsMarkdown = 30; // Try for 3 seconds (30 * 100ms)
        const pollingAttemptsDOMPurify = 40; // Try for 4 seconds for DOMPurify (40 * 100ms)
        const pollingAttemptsPrism = 30;    // Try for 3 seconds for Prism
        const pollingInterval = 100;

        // Wait for markdown-it
        for (let i = 0; i < pollingAttemptsMarkdown; i++) {
            if (typeof window.markdownit === 'function') {
                try {
                    this.md = window.markdownit({
                        html: true, xhtmlOut: false, breaks: true,
                        linkify: true, typographer: true, langPrefix: 'language-',
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

        // Wait for DOMPurify
        for (let i = 0; i < pollingAttemptsDOMPurify; i++) {
            if (typeof window.DOMPurify === 'object' && typeof window.DOMPurify.sanitize === 'function') {
                this.sanitizer = window.DOMPurify;
                this._domPurifyLoaded = true;
                break;
            }
            await this.utils.wait(pollingInterval);
        }

        // Check for Prism.js
        for (let i = 0; i < pollingAttemptsPrism; i++) {
            if (typeof window.Prism === 'object' && (window.Prism.highlightAllUnder || window.Prism.highlightElement)) {
                this.highlighter = window.Prism;
                this._prismLoaded = true;
                break;
            }
            await this.utils.wait(pollingInterval);
        }

        // Set fallbacks if libraries weren't loaded
        if (!this._markdownItLoaded) {
            console.error('MarkdownProcessor Init Error: Markdown library (markdown-it) NOT FOUND after waiting. Markdown processing will be very basic.');
            this.md = {
                render: (text) => {
                    const escapedText = String(text || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
                    return `<p>${escapedText.replace(/\n/g, '<br>')}</p>`;
                }
            };
        }
        if (!this._domPurifyLoaded) {
            console.error('MarkdownProcessor Init Error: DOMPurify NOT FOUND after waiting. HTML sanitization will be SKIPPED (VERY RISKY!).');
            this.sanitizer = { sanitize: (html) => html }; // Passthrough (dangerous)
        }
        if (!this._prismLoaded) {
            console.warn('MarkdownProcessor Init: Prism.js not found after waiting. Code syntax highlighting will not be available.');
            this.highlighter = null;
        }

        this._isInitialized = true;
        
        // Corrected logging
        if (this._markdownItLoaded && this._domPurifyLoaded) {
            console.log(`📝 MarkdownProcessor initialized. markdown-it: loaded, DOMPurify: loaded, Prism.js: ${this._prismLoaded ? 'loaded' : 'NOT FOUND'}.`);
        } else {
            console.error(`📝 MarkdownProcessor initialized with MISSING CORE DEPENDENCIES. markdown-it: ${this._markdownItLoaded}, DOMPurify: ${this._domPurifyLoaded}. Functionality will be limited/insecure.`);
        }
        return this._markdownItLoaded && this._domPurifyLoaded;
    }

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

        try {
            html = this.sanitizer.sanitize(html, this.domPurifyConfig);
        } catch (error) {
            console.error('Error sanitizing HTML with DOMPurify instance:', error);
            return `<p style="color: red;">Error sanitizing content.</p>`;
        }

        if (this.highlighter && (html.includes('<pre') || html.includes('<code'))) {
            try {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                this.utils.$$('pre code[class*="language-"]', tempDiv).forEach((block) => {
                    this.highlighter.highlightElement(block);
                });
                // Attempt to highlight blocks even without language- prefix if autoloader might handle it
                // but this usually needs Prism.js Autoloader script tag and languages available.
                // For now, explicit language class is more reliable for highlightElement.
                this.utils.$$('pre code:not([class*="language-"])', tempDiv).forEach((block) => {
                    // To make Prism guess, we might need to wrap its content or use highlightAllUnder
                    // For simplicity, only highlighting if language- class is present.
                    // To try and force highlighting:
                    // const language = 'clike'; // Default or try to guess
                    // const grammar = this.highlighter.languages[language];
                    // if (grammar) {
                    //    block.innerHTML = this.highlighter.highlight(block.textContent, grammar, language);
                    //    this.utils.addClass(block, `language-${language}`);
                    // }
                });
                html = tempDiv.innerHTML;
            } catch (error) {
                console.error('Error applying syntax highlighting during MarkdownProcessor.process:', error);
            }
        }
        return html;
    }

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
