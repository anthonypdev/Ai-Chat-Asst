/**
 * Markdown Renderer - Converts markdown to HTML with security
 * Handles code highlighting and themed styling
 */

export class MarkdownRenderer {
    constructor() {
        this.codeBlockCounter = 0;
        this.inlineCodePattern = /(?<!`)`([^`]+?)`(?!`)/g;
        this.codeBlockPattern = /```(\w*)\n([\s\S]*?)```/gm;
        this.boldPattern = /(?<!\\)\*\*(.*?)(?<!\\)\*\*/g;
        this.italicPattern = /(?<![\w*])\*(.*?)(?<![\w*])\*(?![\w*])/g;
        this.strikethroughPattern = /~~(.*?)~~/g;
        this.listItemPattern = /^(\s*([-*+]|\d+\.)\s+)(.*)/gm;
        this.headingPattern = /^(#{1,6})\s+(.+)$/gm;
        this.linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
        this.urlPattern = /https?:\/\/[^\s<>"]+/g;
    }

    render(content) {
        if (typeof content !== 'string') {
            content = String(content || '');
        }

        let processed = content;

        // 1. Escape HTML first
        processed = this.escapeHtml(processed);

        // 2. Handle code blocks (preserve them from other processing)
        const codeBlocks = [];
        processed = processed.replace(this.codeBlockPattern, (match, lang, code) => {
            const placeholder = `___CODEBLOCK_${codeBlocks.length}___`;
            codeBlocks.push({
                lang: lang || 'plaintext',
                code: code.trim()
            });
            return placeholder;
        });

        // 3. Handle inline code (preserve from other processing)
        const inlineCodes = [];
        processed = processed.replace(this.inlineCodePattern, (match, code) => {
            const placeholder = `___INLINECODE_${inlineCodes.length}___`;
            inlineCodes.push(code);
            return placeholder;
        });

        // 4. Process other markdown elements
        processed = this.processHeadings(processed);
        processed = this.processTextFormatting(processed);
        processed = this.processLinks(processed);
        processed = this.processLists(processed);
        processed = this.processLineBreaks(processed);

        // 5. Restore code blocks with syntax highlighting
        processed = processed.replace(/___CODEBLOCK_(\d+)___/g, (match, index) => {
            const block = codeBlocks[parseInt(index)];
            return this.renderCodeBlock(block.code, block.lang);
        });

        // 6. Restore inline code
        processed = processed.replace(/___INLINECODE_(\d+)___/g, (match, index) => {
            const code = inlineCodes[parseInt(index)];
            return this.renderInlineCode(code);
        });

        return processed;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    processHeadings(text) {
        return text.replace(this.headingPattern, (match, hashes, content) => {
            const level = hashes.length;
            const tag = `h${Math.min(level, 6)}`;
            return `<${tag} class="message-heading">${content.trim()}</${tag}>`;
        });
    }

    processTextFormatting(text) {
        // Bold
        text = text.replace(this.boldPattern, '<strong>$1</strong>');

        // Italic (more careful to avoid conflicts with emphasis)
        text = text.replace(this.italicPattern, '<em>$1</em>');

        // Strikethrough
        text = text.replace(this.strikethroughPattern, '<del>$1</del>');

        return text;
    }

    processLinks(text) {
        // Markdown links
        text = text.replace(this.linkPattern, (match, linkText, url) => {
            const href = this.sanitizeUrl(url);
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="message-link">${linkText}</a>`;
        });

        // Auto-link URLs
        text = text.replace(this.urlPattern, (url) => {
            const href = this.sanitizeUrl(url);
            const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="message-link auto-link">${displayUrl}</a>`;
        });

        return text;
    }

    processLists(text) {
        const lines = text.split('\n');
        const processedLines = [];
        let inList = false;
        let listType = null;
        let listLevel = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const listMatch = line.match(this.listItemPattern);

            if (listMatch) {
                const [, prefix, marker, content] = listMatch;
                const currentLevel = Math.floor(prefix.length / 2);
                const isOrdered = /^\d+\./.test(marker.trim());
                const currentListType = isOrdered ? 'ol' : 'ul';

                if (!inList) {
                    // Start new list
                    processedLines.push(`<${currentListType} class="message-list">`);
                    inList = true;
                    listType = currentListType;
                    listLevel = currentLevel;
                } else if (currentLevel > listLevel) {
                    // Nested list
                    processedLines.push(`<${currentListType} class="message-list nested">`);
                    listLevel = currentLevel;
                } else if (currentLevel < listLevel || currentListType !== listType) {
                    // Close nested lists or change type
                    while (listLevel > currentLevel) {
                        processedLines.push(`</${listType}>`);
                        listLevel--;
                    }
                    if (currentListType !== listType) {
                        processedLines.push(`</${listType}>`);
                        processedLines.push(`<${currentListType} class="message-list">`);
                        listType = currentListType;
                    }
                }

                processedLines.push(`<li class="message-list-item">${content.trim()}</li>`);
            } else {
                // Not a list item
                if (inList) {
                    // Close all open lists
                    while (listLevel >= 0) {
                        processedLines.push(`</${listType}>`);
                        listLevel--;
                    }
                    inList = false;
                    listType = null;
                    listLevel = 0;
                }
                processedLines.push(line);
            }
        }

        // Close any remaining open lists
        if (inList) {
            while (listLevel >= 0) {
                processedLines.push(`</${listType}>`);
                listLevel--;
            }
        }

        return processedLines.join('\n');
    }

    processLineBreaks(text) {
        // Convert double line breaks to paragraphs
        const paragraphs = text.split(/\n\s*\n/);

        return paragraphs.map(paragraph => {
            const trimmed = paragraph.trim();
            if (!trimmed) return '';

            // Don't wrap if already wrapped in block elements
            if (trimmed.match(/^<(h[1-6]|ul|ol|pre|blockquote|div)/i)) {
                return trimmed;
            }

            // Convert single line breaks to <br> within paragraphs
            const withBreaks = trimmed.replace(/\n/g, '<br>');
            return `<p class="message-paragraph">${withBreaks}</p>`;
        }).filter(p => p).join('\n');
    }

    renderCodeBlock(code, language) {
        const escapedCode = this.escapeHtml(code);
        const lang = this.sanitizeLanguage(language);

        return `
            <div class="code-block-container">
                <div class="code-block-header">
                    <span class="code-block-language">${lang}</span>
                    <button class="code-copy-btn" onclick="this.copyCodeBlock(this)" title="Copy code">
                        <svg class="icon icon-xs" viewBox="0 0 24 24">
                            <use href="#icon-copy"/>
                        </svg>
                    </button>
                </div>
                <pre class="code-block"><code class="language-${lang}">${escapedCode}</code></pre>
            </div>
        `;
    }

    renderInlineCode(code) {
        const escapedCode = this.escapeHtml(code);
        return `<code class="inline-code">${escapedCode}</code>`;
    }

    sanitizeUrl(url) {
        // Basic URL sanitization
        const trimmed = url.trim();

        // Allow http, https, mailto, and relative URLs
        if (trimmed.match(/^(https?:\/\/|mailto:|\/|\.\/|#)/i)) {
            return trimmed;
        }

        // Prepend https:// for URLs that look like domains
        if (trimmed.match(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}(\/.*)?$/)) {
            return `https://${trimmed}`;
        }

        // Default to anchor link for safety
        return `#${encodeURIComponent(trimmed)}`;
    }

    sanitizeLanguage(lang) {
        if (!lang || typeof lang !== 'string') {
            return 'plaintext';
        }

        // Allow only alphanumeric characters, hyphens, and underscores
        const sanitized = lang.toLowerCase().replace(/[^a-z0-9_-]/g, '');
        return sanitized || 'plaintext';
    }

    // Code block copy functionality (attached to window for onclick)
    static copyCodeBlock(button) {
        const codeBlock = button.closest('.code-block-container').querySelector('code');
        const text = codeBlock.textContent;

        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = button.innerHTML;
            button.innerHTML = `
                <svg class="icon icon-xs" viewBox="0 0 24 24">
                    <use href="#icon-check-simple"/>
                </svg>
            `;
            button.title = 'Copied!';

            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.title = 'Copy code';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy code:', err);
        });
    }

    // Enhanced table processing (for future use)
    processTable(text) {
        const tablePattern = /^\|(.+)\|\s*\n\|[\s\-:|]+\|\s*\n((?:\|.+\|\s*\n)*)/gm;

        return text.replace(tablePattern, (match, header, rows) => {
            const headerCells = header.split('|').map(cell =>
                `<th class="table-header">${cell.trim()}</th>`
            ).join('');

            const bodyRows = rows.trim().split('\n').map(row => {
                const cells = row.split('|').map(cell =>
                    `<td class="table-cell">${cell.trim()}</td>`
                ).join('');
                return `<tr class="table-row">${cells}</tr>`;
            }).join('');

            return `
                <div class="table-container">
                    <table class="message-table">
                        <thead><tr class="table-header-row">${headerCells}</tr></thead>
                        <tbody>${bodyRows}</tbody>
                    </table>
                </div>
            `;
        });
    }
}

// Attach copy function to window for onclick handlers
if (typeof window !== 'undefined') {
    window.copyCodeBlock = MarkdownRenderer.copyCodeBlock;
}
