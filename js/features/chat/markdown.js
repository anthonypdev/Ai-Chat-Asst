/**
 * Parkland AI - Opus Magnum Edition
 * Markdown Processor
 *
 * Handles conversion of Markdown text to sanitized HTML, including syntax highlighting for code blocks.
 * Relies on external libraries: markdown-it (or similar), DOMPurify, and Prism.js,
 * which are expected to be loaded globally (e.g., via <script> tags in index.html).
 */

class MarkdownProcessor {
    constructor() {
        // Initialize markdown-it (or a similar library like 'marked')
        // Assuming markdown-it is loaded globally as window.markdownit
        if (typeof window.markdownit === 'function') {
            this.md = window.markdownit({
                html: true, // Enable HTML tags in source
                linkify: true, // Autoconvert URL-like text to links
                typographer: true, // Enable some language-neutral replacement + quotes beautification
                breaks: true, // Convert '\n' in paragraphs into <br>
            });
            // Optional: Add markdown-it plugins if needed and available globally
            // e.g., if (window.markdownitFootnote) { this.md.use(window.markdownitFootnote); }
        } else {
            console.error('Markdown library (markdown-it) not found. Markdown processing will be basic.');
            // Fallback to a very simple paragraph-based renderer or just escaping HTML
            this.md = {
                render: (text) => {
                    // Basic fallback: escape HTML and wrap paragraphs roughly
                    const escapedText = text
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;");
                    return escapedText.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
                }
            };
        }

        // DOMPurify is expected to be loaded globally
        if (typeof window.DOMPurify !== 'object' || typeof window.DOMPurify.sanitize !== 'function') {
            console.error('DOMPurify not found. HTML sanitization will be skipped (RISKY!).');
            this.sanitizer = {
                sanitize: (html) => html // Passthrough if DOMPurify is not available (not recommended for production)
            };
        } else {
            this.sanitizer = window.DOMPurify;
            // Configure DOMPurify - allow elements and attributes necessary for formatted markdown
            // This configuration allows common formatting, code blocks, tables, lists, links, images.
            this.domPurifyConfig = {
                USE_PROFILES: { html: true }, // Allow common HTML elements
                ADD_TAGS: ['figure', 'figcaption', 'details', 'summary', 'kbd'], // Add tags if needed
                ADD_ATTR: ['target', 'rel', 'start', 'type'], // Allow 'target' and 'rel' for links, 'start'/'type' for lists
                // Allow specific classes for syntax highlighting if Prism.js adds them directly
                // FORBID_TAGS: [], FORBID_ATTR: [] // Could be used to be more restrictive
                // ALLOW_DATA_ATTR: false, // By default, data attributes are not allowed unless explicitly added
            };
        }

        // Prism.js is expected to be loaded globally for syntax highlighting
        if (typeof window.Prism !== 'object' || typeof window.Prism.highlightAllUnder !== 'function') {
            console.warn('Prism.js not found. Code syntax highlighting will not be available.');
            this.highlighter = null;
        } else {
            this.highlighter = window.Prism;
        }
        console.log('📝 MarkdownProcessor initialized.');
    }

    /**
     * Converts raw Markdown text to sanitized and highlighted HTML.
     * @param {string} rawMarkdown - The raw Markdown text.
     * @returns {string} The processed HTML string.
     */
    process(rawMarkdown) {
        if (typeof rawMarkdown !== 'string') {
            console.warn('MarkdownProcessor.process: Input is not a string. Returning empty string.');
            return '';
        }

        let html = '';
        try {
            // 1. Convert Markdown to HTML
            html = this.md.render(rawMarkdown);
        } catch (error) {
            console.error('Error rendering Markdown:', error);
            html = `<p style="color: red;">Error rendering Markdown content.</p>`; // Basic error display
        }

        // 2. Sanitize HTML (critical security step)
        try {
            // If using DOMPurify via this.sanitizer
            if (this.sanitizer && typeof this.sanitizer.sanitize === 'function') {
                 html = this.sanitizer.sanitize(html, this.domPurifyConfig);
            } else {
                // Fallback or warning if DOMPurify is missing (already logged in constructor)
            }
        } catch (error) {
            console.error('Error sanitizing HTML:', error);
            html = `<p style="color: red;">Error sanitizing content after Markdown processing.</p>`;
        }


        // 3. Apply Syntax Highlighting (if Prism.js is available)
        // Prism.js typically works by finding <pre><code> blocks and highlighting them.
        // It's often better to call Prism.highlightAll() or highlightElement()
        // *after* the content has been inserted into the DOM.
        // However, if we need to return an HTML string that includes Prism's classes,
        // we need to simulate DOM insertion and highlighting.

        if (this.highlighter && html.includes('<pre') && html.includes('<code')) {
            try {
                // Create a temporary, disconnected DOM element to process HTML for Prism
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;

                // Instruct Prism to highlight all code blocks within this temporary element
                this.highlighter.highlightAllUnder(tempDiv);

                // Get the HTML back with Prism's classes
                html = tempDiv.innerHTML;
            } catch (error) {
                console.error('Error applying syntax highlighting with Prism.js:', error);
                // HTML without highlighting will be returned, which is acceptable.
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
        if (typeof rawMarkdown !== 'string') return '';
        let html = '';
        try {
            html = this.md.render(rawMarkdown);
        } catch (error) {
            console.error('Error rendering Markdown (toSanitizedHtml):', error);
            return '<p style="color: red;">Error rendering content.</p>';
        }

        try {
            if (this.sanitizer && typeof this.sanitizer.sanitize === 'function') {
                html = this.sanitizer.sanitize(html, this.domPurifyConfig);
            }
        } catch (error) {
            console.error('Error sanitizing HTML (toSanitizedHtml):', error);
            return '<p style="color: red;">Error sanitizing content.</p>';
        }
        return html;
    }
}

// Create a global instance if not already present (e.g. for modules that might re-import)
// However, typically this would be instantiated by App.js or a similar controller.
// For this setup, App.js will create an instance.
// if (!window.markdownProcessorInstance) {
//     window.markdownProcessorInstance = new MarkdownProcessor();
// }
// window.markdownProcessor = window.markdownProcessorInstance;
