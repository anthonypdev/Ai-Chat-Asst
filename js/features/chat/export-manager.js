/**
 * Parkland AI - Opus Magnum Edition
 * Chat Export Manager
 *
 * Provides comprehensive chat export functionality in multiple formats
 * including JSON, Markdown, HTML, and PDF with customizable options.
 */

class ChatExportManager {
    constructor(utils, stateManager, notificationSystem = null) {
        if (!utils || !stateManager) {
            throw new Error("ChatExportManager requires utils and stateManager instances.");
        }
        
        this.utils = utils;
        this.stateManager = stateManager;
        this.notificationSystem = notificationSystem;
        
        // Export configuration
        this.defaultConfig = {
            includeTimestamps: true,
            includeCharacterInfo: true,
            includeSystemMessages: false,
            dateFormat: 'iso', // 'iso', 'locale', 'custom'
            customDateFormat: 'YYYY-MM-DD HH:mm:ss',
            theme: 'auto' // 'auto', 'light', 'dark', 'current'
        };
        
        // Supported formats
        this.supportedFormats = {
            json: { name: 'JSON', extension: '.json', mimeType: 'application/json' },
            markdown: { name: 'Markdown', extension: '.md', mimeType: 'text/markdown' },
            html: { name: 'HTML', extension: '.html', mimeType: 'text/html' },
            txt: { name: 'Plain Text', extension: '.txt', mimeType: 'text/plain' },
            csv: { name: 'CSV', extension: '.csv', mimeType: 'text/csv' }
        };
        
        // PDF support check
        this.pdfSupported = this._checkPDFSupport();
        if (this.pdfSupported) {
            this.supportedFormats.pdf = { 
                name: 'PDF', 
                extension: '.pdf', 
                mimeType: 'application/pdf' 
            };
        }
        
        console.log('📤 ChatExportManager initialized.');
    }

    /**
     * Exports chat history in the specified format
     * @param {string} format - Export format (json, markdown, html, txt, csv, pdf)
     * @param {Object} options - Export options
     * @returns {Promise<Blob>} Exported data as blob
     */
    async exportChat(format, options = {}) {
        const config = { ...this.defaultConfig, ...options };
        const chatHistory = options.chatHistory || this.stateManager.get('chatHistory');
        const sessionId = options.sessionId || this.stateManager.get('activeSessionId');
        
        if (!chatHistory || chatHistory.length === 0) {
            throw new Error('No chat history to export');
        }
        
        if (!this.supportedFormats[format]) {
            throw new Error(`Unsupported export format: ${format}`);
        }
        
        try {
            let exportData;
            const metadata = this._generateMetadata(chatHistory, sessionId, config);
            
            switch (format) {
                case 'json':
                    exportData = this._exportAsJSON(chatHistory, metadata, config);
                    break;
                case 'markdown':
                    exportData = this._exportAsMarkdown(chatHistory, metadata, config);
                    break;
                case 'html':
                    exportData = this._exportAsHTML(chatHistory, metadata, config);
                    break;
                case 'txt':
                    exportData = this._exportAsText(chatHistory, metadata, config);
                    break;
                case 'csv':
                    exportData = this._exportAsCSV(chatHistory, metadata, config);
                    break;
                case 'pdf':
                    exportData = await this._exportAsPDF(chatHistory, metadata, config);
                    break;
                default:
                    throw new Error(`Export format not implemented: ${format}`);
            }
            
            if (this.notificationSystem) {
                this.notificationSystem.showSuccess(`Chat exported as ${format.toUpperCase()}`);
            }
            
            return new Blob([exportData], { 
                type: this.supportedFormats[format].mimeType 
            });
            
        } catch (error) {
            console.error('Export failed:', error);
            if (this.notificationSystem) {
                this.notificationSystem.showError(`Export failed: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Downloads exported chat data
     * @param {Blob} blob - Exported data blob
     * @param {string} format - Export format
     * @param {Object} options - Download options
     */
    downloadExport(blob, format, options = {}) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const sessionId = options.sessionId || this.stateManager.get('activeSessionId');
        const sessionTitle = options.title || this._getSessionTitle();
        
        const filename = options.filename || 
            `parkland-ai-chat-${sessionTitle}-${timestamp}${this.supportedFormats[format].extension}`;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        if (this.notificationSystem) {
            this.notificationSystem.showSuccess(`Download started: ${filename}`);
        }
    }

    /**
     * Exports and downloads chat in one operation
     * @param {string} format - Export format
     * @param {Object} options - Export and download options
     */
    async exportAndDownload(format, options = {}) {
        try {
            const blob = await this.exportChat(format, options);
            this.downloadExport(blob, format, options);
        } catch (error) {
            console.error('Export and download failed:', error);
            throw error;
        }
    }

    /**
     * Exports chat as JSON
     * @private
     */
    _exportAsJSON(chatHistory, metadata, config) {
        const exportData = {
            metadata,
            messages: chatHistory.map(msg => this._processMessage(msg, config)),
            exportConfig: config,
            version: '2.0.0'
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Exports chat as Markdown
     * @private
     */
    _exportAsMarkdown(chatHistory, metadata, config) {
        let content = '';
        
        // Header
        content += `# ${metadata.title}\n\n`;
        content += `**Exported from:** Parkland AI - Opus Magnum Edition  \n`;
        content += `**Date:** ${metadata.exportDate}  \n`;
        content += `**Messages:** ${metadata.messageCount}  \n`;
        if (metadata.sessionId) {
            content += `**Session ID:** ${metadata.sessionId}  \n`;
        }
        content += '\n---\n\n';
        
        // Messages
        chatHistory.forEach((msg, index) => {
            if (!config.includeSystemMessages && msg.role === 'system') return;
            
            const processedMsg = this._processMessage(msg, config);
            const role = this._formatRole(processedMsg.role, processedMsg.character);
            
            content += `## ${role}\n\n`;
            
            if (config.includeTimestamps && processedMsg.timestamp) {
                content += `*${processedMsg.formattedTimestamp}*\n\n`;
            }
            
            content += `${processedMsg.content}\n\n`;
            
            if (index < chatHistory.length - 1) {
                content += '---\n\n';
            }
        });
        
        return content;
    }

    /**
     * Exports chat as HTML
     * @private
     */
    _exportAsHTML(chatHistory, metadata, config) {
        const theme = this._getThemeStyles(config.theme);
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metadata.title}</title>
    <style>
        ${theme.css}
        .chat-export {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .metadata {
            background: var(--bg-secondary, #f5f5f5);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .message {
            margin-bottom: 20px;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid var(--primary, #007bff);
        }
        .message.user {
            background: var(--user-bg, #e3f2fd);
            border-left-color: var(--user-color, #2196f3);
        }
        .message.assistant {
            background: var(--assistant-bg, #f3e5f5);
            border-left-color: var(--assistant-color, #9c27b0);
        }
        .message-header {
            font-weight: bold;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .message-timestamp {
            font-size: 0.85em;
            color: var(--text-secondary, #666);
        }
        .message-content {
            line-height: 1.6;
            white-space: pre-wrap;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: var(--text-secondary, #666);
            font-size: 0.9em;
        }
    </style>
</head>
<body class="${theme.class}">
    <div class="chat-export">
        <div class="metadata">
            <h1>${metadata.title}</h1>
            <p><strong>Exported from:</strong> Parkland AI - Opus Magnum Edition</p>
            <p><strong>Date:</strong> ${metadata.exportDate}</p>
            <p><strong>Messages:</strong> ${metadata.messageCount}</p>
            ${metadata.sessionId ? `<p><strong>Session ID:</strong> ${metadata.sessionId}</p>` : ''}
        </div>
        
        <div class="messages">`;
        
        chatHistory.forEach(msg => {
            if (!config.includeSystemMessages && msg.role === 'system') return;
            
            const processedMsg = this._processMessage(msg, config);
            const role = this._formatRole(processedMsg.role, processedMsg.character);
            
            html += `
            <div class="message ${processedMsg.role}">
                <div class="message-header">
                    <span class="message-role">${role}</span>
                    ${config.includeTimestamps && processedMsg.timestamp ? 
                        `<span class="message-timestamp">${processedMsg.formattedTimestamp}</span>` : ''}
                </div>
                <div class="message-content">${this.utils.escapeHtml(processedMsg.content)}</div>
            </div>`;
        });
        
        html += `
        </div>
        
        <div class="footer">
            <p>Generated by Parkland AI - Opus Magnum Edition</p>
            <p>Export Date: ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;
        
        return html;
    }

    /**
     * Exports chat as plain text
     * @private
     */
    _exportAsText(chatHistory, metadata, config) {
        let content = '';
        
        // Header
        content += `${metadata.title}\n`;
        content += '='.repeat(metadata.title.length) + '\n\n';
        content += `Exported from: Parkland AI - Opus Magnum Edition\n`;
        content += `Date: ${metadata.exportDate}\n`;
        content += `Messages: ${metadata.messageCount}\n`;
        if (metadata.sessionId) {
            content += `Session ID: ${metadata.sessionId}\n`;
        }
        content += '\n' + '-'.repeat(50) + '\n\n';
        
        // Messages
        chatHistory.forEach((msg, index) => {
            if (!config.includeSystemMessages && msg.role === 'system') return;
            
            const processedMsg = this._processMessage(msg, config);
            const role = this._formatRole(processedMsg.role, processedMsg.character);
            
            content += `${role}:\n`;
            
            if (config.includeTimestamps && processedMsg.timestamp) {
                content += `(${processedMsg.formattedTimestamp})\n`;
            }
            
            content += `${processedMsg.content}\n\n`;
        });
        
        return content;
    }

    /**
     * Exports chat as CSV
     * @private
     */
    _exportAsCSV(chatHistory, metadata, config) {
        const headers = ['Role', 'Content'];
        
        if (config.includeTimestamps) {
            headers.unshift('Timestamp');
        }
        
        if (config.includeCharacterInfo) {
            headers.push('Character');
        }
        
        let csv = headers.join(',') + '\n';
        
        chatHistory.forEach(msg => {
            if (!config.includeSystemMessages && msg.role === 'system') return;
            
            const processedMsg = this._processMessage(msg, config);
            const row = [];
            
            if (config.includeTimestamps) {
                row.push(`"${processedMsg.formattedTimestamp || ''}"`);
            }
            
            row.push(`"${processedMsg.role}"`);
            row.push(`"${processedMsg.content.replace(/"/g, '""')}"`);
            
            if (config.includeCharacterInfo) {
                row.push(`"${processedMsg.character || ''}"`);
            }
            
            csv += row.join(',') + '\n';
        });
        
        return csv;
    }

    /**
     * Exports chat as PDF (requires jsPDF)
     * @private
     */
    async _exportAsPDF(chatHistory, metadata, config) {
        if (!window.jsPDF) {
            throw new Error('PDF export requires jsPDF library. Please load it first.');
        }
        
        const { jsPDF } = window;
        const doc = new jsPDF();
        
        let yPosition = 20;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        const lineHeight = 7;
        
        // Helper function to add text with wrapping
        const addText = (text, x, y, maxWidth, fontSize = 12) => {
            doc.setFontSize(fontSize);
            const lines = doc.splitTextToSize(text, maxWidth);
            
            lines.forEach((line, index) => {
                if (y + (index * lineHeight) > pageHeight - margin) {
                    doc.addPage();
                    y = margin;
                }
                doc.text(line, x, y + (index * lineHeight));
            });
            
            return y + (lines.length * lineHeight);
        };
        
        // Title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        yPosition = addText(metadata.title, margin, yPosition, 170, 20);
        yPosition += 10;
        
        // Metadata
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        yPosition = addText(`Exported from: Parkland AI - Opus Magnum Edition`, margin, yPosition, 170, 10);
        yPosition = addText(`Date: ${metadata.exportDate}`, margin, yPosition, 170, 10);
        yPosition = addText(`Messages: ${metadata.messageCount}`, margin, yPosition, 170, 10);
        
        if (metadata.sessionId) {
            yPosition = addText(`Session ID: ${metadata.sessionId}`, margin, yPosition, 170, 10);
        }
        
        yPosition += 20;
        
        // Messages
        chatHistory.forEach((msg, index) => {
            if (!config.includeSystemMessages && msg.role === 'system') return;
            
            const processedMsg = this._processMessage(msg, config);
            const role = this._formatRole(processedMsg.role, processedMsg.character);
            
            // Check if we need a new page
            if (yPosition > pageHeight - 60) {
                doc.addPage();
                yPosition = margin;
            }
            
            // Role header
            doc.setFont('helvetica', 'bold');
            yPosition = addText(`${role}:`, margin, yPosition, 170, 12);
            
            // Timestamp
            if (config.includeTimestamps && processedMsg.timestamp) {
                doc.setFont('helvetica', 'italic');
                yPosition = addText(`(${processedMsg.formattedTimestamp})`, margin, yPosition, 170, 9);
            }
            
            // Content
            doc.setFont('helvetica', 'normal');
            yPosition = addText(processedMsg.content, margin, yPosition, 170, 11);
            yPosition += 10;
        });
        
        return doc.output('blob');
    }

    /**
     * Processes a message for export
     * @private
     */
    _processMessage(message, config) {
        const processed = {
            role: message.role,
            content: message.content,
            character: message.character,
            timestamp: message.timestamp
        };
        
        if (config.includeTimestamps && message.timestamp) {
            processed.formattedTimestamp = this._formatTimestamp(message.timestamp, config.dateFormat);
        }
        
        return processed;
    }

    /**
     * Formats a timestamp according to config
     * @private
     */
    _formatTimestamp(timestamp, format) {
        const date = new Date(timestamp);
        
        switch (format) {
            case 'iso':
                return date.toISOString();
            case 'locale':
                return date.toLocaleString();
            case 'custom':
                // This would require a date formatting library like moment.js or date-fns
                return date.toLocaleString();
            default:
                return date.toLocaleString();
        }
    }

    /**
     * Formats role display name
     * @private
     */
    _formatRole(role, character) {
        if (role === 'user') {
            return 'User';
        } else if (role === 'assistant') {
            if (character && window.parklandApp?.characterManager) {
                const characterData = window.parklandApp.characterManager.getCharacterData(character);
                return characterData?.name || 'Assistant';
            }
            return 'Assistant';
        } else if (role === 'system') {
            return 'System';
        }
        return role.charAt(0).toUpperCase() + role.slice(1);
    }

    /**
     * Generates export metadata
     * @private
     */
    _generateMetadata(chatHistory, sessionId, config) {
        const sessionTitle = this._getSessionTitle();
        
        return {
            title: sessionTitle,
            sessionId: sessionId,
            exportDate: new Date().toISOString(),
            messageCount: chatHistory.length,
            userMessageCount: chatHistory.filter(m => m.role === 'user').length,
            assistantMessageCount: chatHistory.filter(m => m.role === 'assistant').length,
            systemMessageCount: chatHistory.filter(m => m.role === 'system').length,
            firstMessageDate: chatHistory[0]?.timestamp ? new Date(chatHistory[0].timestamp).toISOString() : null,
            lastMessageDate: chatHistory[chatHistory.length - 1]?.timestamp ? 
                new Date(chatHistory[chatHistory.length - 1].timestamp).toISOString() : null,
            theme: this.stateManager.get('currentTheme'),
            exportVersion: '2.0.0'
        };
    }

    /**
     * Gets current session title
     * @private
     */
    _getSessionTitle() {
        const activeSessionId = this.stateManager.get('activeSessionId');
        const chatHistory = this.stateManager.get('chatHistory');
        
        if (activeSessionId && window.parklandApp?.chatHistory) {
            const sessions = window.parklandApp.chatHistory._getStoredSessions();
            const currentSession = sessions.find(s => s.id === activeSessionId);
            if (currentSession?.title) {
                return currentSession.title;
            }
        }
        
        // Generate title from first user message
        const firstUserMessage = chatHistory?.find(m => m.role === 'user');
        if (firstUserMessage) {
            return this.utils.truncate(firstUserMessage.content, 50) || 'Chat Export';
        }
        
        return 'Chat Export';
    }

    /**
     * Gets theme styles for HTML export
     * @private
     */
    _getThemeStyles(themeMode) {
        const currentTheme = this.stateManager.get('currentTheme');
        let theme = themeMode === 'auto' ? currentTheme : themeMode;
        
        const styles = {
            light: {
                class: 'light-theme',
                css: `
                    :root {
                        --primary: #007bff;
                        --bg-primary: #ffffff;
                        --bg-secondary: #f8f9fa;
                        --text-primary: #212529;
                        --text-secondary: #6c757d;
                        --user-bg: #e3f2fd;
                        --user-color: #2196f3;
                        --assistant-bg: #f3e5f5;
                        --assistant-color: #9c27b0;
                    }
                `
            },
            dark: {
                class: 'dark-theme',
                css: `
                    :root {
                        --primary: #0d6efd;
                        --bg-primary: #212529;
                        --bg-secondary: #343a40;
                        --text-primary: #ffffff;
                        --text-secondary: #adb5bd;
                        --user-bg: #1e3a8a;
                        --user-color: #60a5fa;
                        --assistant-bg: #7c2d12;
                        --assistant-color: #f97316;
                    }
                    body { background: var(--bg-primary); color: var(--text-primary); }
                `
            }
        };
        
        return styles[theme] || styles.light;
    }

    /**
     * Checks if PDF support is available
     * @private
     */
    _checkPDFSupport() {
        return typeof window !== 'undefined' && window.jsPDF;
    }

    /**
     * Gets available export formats
     * @returns {Object} Available formats
     */
    getAvailableFormats() {
        return { ...this.supportedFormats };
    }

    /**
     * Creates export options dialog
     * @param {Function} onExport - Callback for export action
     * @returns {HTMLElement} Options dialog element
     */
    createExportDialog(onExport) {
        const dialog = this.utils.createElement('div', {
            className: 'export-dialog modal-overlay',
            innerHTML: `
                <div class="modal export-modal">
                    <div class="modal-header">
                        <h3>Export Chat</h3>
                        <button class="modal-close" aria-label="Close">×</button>
                    </div>
                    <div class="modal-body">
                        <form class="export-form">
                            <div class="form-group">
                                <label>Export Format:</label>
                                <select name="format" class="form-select">
                                    ${Object.entries(this.supportedFormats).map(([key, format]) => 
                                        `<option value="${key}">${format.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" name="includeTimestamps" checked>
                                    Include timestamps
                                </label>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" name="includeCharacterInfo" checked>
                                    Include character information
                                </label>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" name="includeSystemMessages">
                                    Include system messages
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-action="cancel">Cancel</button>
                        <button class="btn btn-primary" data-action="export">Export</button>
                    </div>
                </div>
            `
        });
        
        // Event handlers
        dialog.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close') || 
                e.target.dataset.action === 'cancel' ||
                e.target === dialog) {
                dialog.remove();
            } else if (e.target.dataset.action === 'export') {
                const form = dialog.querySelector('.export-form');
                const formData = new FormData(form);
                
                const options = {
                    includeTimestamps: formData.has('includeTimestamps'),
                    includeCharacterInfo: formData.has('includeCharacterInfo'),
                    includeSystemMessages: formData.has('includeSystemMessages')
                };
                
                onExport(formData.get('format'), options);
                dialog.remove();
            }
        });
        
        return dialog;
    }

    /**
     * Destroys the export manager
     */
    destroy() {
        console.log('📤 ChatExportManager destroyed.');
    }
}

// Global instance creation pattern
if (typeof window !== 'undefined') {
    window.ChatExportManager = ChatExportManager;
}