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
            console.error("MarkdownProcessor: Valid Utils instance with a 'wait' method is required!");
            // Provide a basic fallback for utils.wait for extreme cases, though App.js should provide it.
            this.utils = { wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)) };
        } else {
            this.utils = utils;
        }

        this.md = null;
        this.sanitizer = null;
        this.highlighter = null; // For Prism.js
        this.domPurifyConfig = {
            USE_PROFILES: { html: true },
            ADD_TAGS: ['figure', 'figcaption', 'details', 'summary', 'kbd', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
            ADD_ATTR: ['target', 'rel', 'start', 'type', 'class', 'id', 'scope', 'colspan', 'rowspan', 'alt', 'title', 'href', 'src', 'style'], // Added 'style' cautiously for specific safe inline styles if needed, but generally risky. Review if used.
            ALLOW_DATA_ATTR: true, // Allowing data attributes can be useful for some JS interactions or styling.
            ALLOW_UNKNOWN_PROTOCOLS: false
        };
        this._isInitialized = false;
        this._coreDependenciesMet = false; // Tracks if essential markdown-it and DOMPurify loaded
        // Initial log moved to end of init()
    }

    /**
     * Asynchronously initializes the MarkdownProcessor by attempting to load
     * and configure markdown-it, DOMPurify, and Prism.js from global scope.
     * @returns {Promise<boolean>} Resolves to true if core dependencies (markdown-it, DOMPurify) are properly loaded, false otherwise.
     */
    async init() {
        if (this._isInitialized) {
            // console.log("MarkdownProcessor already initialized. Core dependencies met:", this._coreDependenciesMet);
            return this._coreDependenciesMet;
        }

        const pollingAttempts = 30; // Try for 3 seconds (30 * 100ms)
        const pollingInterval = 100; // 100ms
        let markdownItLoaded = false;
        let domPurifyLoaded = false;
        let prismLoaded = false;

        // Wait for markdown-it
        for (let i = 0; i < pollingAttempts; i++) {
            if (typeof window.markdownit === 'function') {
                try {
                    this.md = window.markdownit({
                        html: true,        // Enable HTML tags in source, DOMPurify will sanitize
                        xhtmlOut: false,
                        breaks: true,
                        linkify: true,
                        typographer: true,
                        langPrefix: 'language-', // For Prism.js compatibility
                    });
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
                    markdownItLoaded = true;
                } catch (e) {
                    console.error("Error initializing markdown-it even though it was found:", e);
                    markdownItLoaded = false; // Ensure it's marked as not loaded on error
                }
                break;
            }
            await this.utils.wait(pollingInterval);
        }

        // Wait for DOMPurify
        for (let i = 0; i < pollingAttempts; i++) {
            if (typeof window.DOMPurify === 'object' && typeof window.DOMPurify.sanitize === 'function') {
                this.sanitizer = window.DOMPurify;
                domPurifyLoaded = true;
                break;
            }
            await this.utils.wait(pollingInterval);
        }

        // Check for Prism.js (syntax highlighting is progressive enhancement)
        for (let i = 0; i < pollingAttempts + 20; i++) { // Give Prism a bit longer (total 5s for Prism)
            if (typeof window.Prism === 'object' && (window.Prism.highlightAllUnder || window.Prism.highlightElement)) {
                this.highlighter = window.Prism;
                prismLoaded = true;
                break;
            }
            await this.utils.wait(pollingInterval);
        }

        // Set fallbacks if libraries weren't loaded
        if (!markdownItLoaded) {
            console.error('MarkdownProcessor Init Error: Markdown library (markdown-it) NOT FOUND after waiting. Markdown processing will be very basic.');
            this.md = {
                render: (text) => {
                    const escapedText = String(text || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
                    return `<p>${escapedText.replace(/\n/g, '<br>')}</p>`; // Basic paragraph and line break handling
                }
            };
        }
        if (!domPurifyLoaded) {
            console.error('MarkdownProcessor Init Error: DOMPurify NOT FOUND after waiting. HTML sanitization will be SKIPPED (VERY RISKY!).');
            this.sanitizer = { sanitize: (html) => html }; // Passthrough (dangerous)
        }
        if (!prismLoaded) {
            console.warn('MarkdownProcessor Init: Prism.js not found after waiting. Code syntax highlighting will not be available.');
            this.highlighter = null;
        }

        this._isInitialized = true;
        this._coreDependenciesMet = markdownItLoaded && domPurifyLoaded; // Core means markdown and sanitization

        if (this._coreDependenciesMet) {
            console.log(`📝 MarkdownProcessor initialized. markdown-it: loaded, DOMPurify: loaded, Prism.js: ${prismLoaded ? 'loaded' : 'NOT FOUND'}.`);
        } else {
            console.error(`📝 MarkdownProcessor initialized with MISSING CORE DEPENDENCIES. markdown-it: ${markdownItLoaded}, DOMPurify: ${domPurifyLoaded}. Functionality will be limited/insecure.`);
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
            const escapedText = String(rawMarkdown || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
            return `<p>${escapedText.replace(/\n/g, '<br>')}</p>`;
        }
        if (typeof rawMarkdown !== 'string') return '';

        let html = '';
        try {
            // Use this.md which is either the real markdown-it or the fallback
            html = this.md.render(rawMarkdown);
        } catch (error) {
            console.error('Error rendering Markdown with current md instance:', error);
            return `<p style="color: red;">Error rendering Markdown content.</p>`;
        }

        try {
            // Use this.sanitizer which is either real DOMPurify or the fallback
            html = this.sanitizer.sanitize(html, this.domPurifyConfig);
        } catch (error) {
            console.error('Error sanitizing HTML with current sanitizer instance:', error);
            return `<p style="color: red;">Error sanitizing content.</p>`;
        }

        if (this.highlighter && (html.includes('<pre') || html.includes('<code'))) {
            try {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                this.utils.$$('pre code[class*="language-"]', tempDiv).forEach((block) => {
                    this.highlighter.highlightElement(block);
                });
                 // Fallback for code blocks without explicit language- class if autoloader is robust
                if (this.highlighter.plugins && this.highlighter.plugins.autoloader) {
                    this.utils.$$('pre code:not([class*="language-"])', tempDiv).forEach((block) => {
                         // Autoloader might require the script tag for language, so direct highlighting is better
                         // For now, we rely on language- class being present.
                    });
                }
                html = tempDiv.innerHTML;
            } catch (error) {
                console.error('Error applying syntax highlighting during MarkdownProcessor.process:', error);
            }
        }
        return html;
    }

    /**
     * A simplified processing method that only converts markdown to HTML and sanitizes.
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
