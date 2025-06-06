/**
 * Parkland AI - Opus Magnum Edition
 * Chat Search Manager
 *
 * Provides comprehensive search and filtering capabilities for chat messages
 * including full-text search, advanced filters, and result highlighting.
 */

class ChatSearchManager {
    constructor(utils, stateManager, eventEmitter) {
        if (!utils || !stateManager || !eventEmitter) {
            throw new Error("ChatSearchManager requires utils, stateManager, and eventEmitter instances.");
        }
        
        this.utils = utils;
        this.stateManager = stateManager;
        this.eventEmitter = eventEmitter;
        
        // Search state
        this.isSearchActive = false;
        this.currentQuery = '';
        this.searchResults = [];
        this.filteredResults = [];
        this.currentResultIndex = -1;
        this.searchHistory = [];
        
        // Search configuration
        this.config = {
            minQueryLength: 2,
            maxSearchHistory: 50,
            highlightClassName: 'search-highlight',
            activeHighlightClassName: 'search-highlight-active',
            searchDebounceDelay: 300,
            caseSensitive: false,
            wholeWordsOnly: false,
            useRegex: false,
            searchInMetadata: true
        };
        
        // Filter options
        this.filters = {
            role: 'all', // 'all', 'user', 'assistant', 'system'
            character: 'all', // 'all' or specific character
            dateRange: 'all', // 'all', 'today', 'week', 'month', 'custom'
            customDateStart: null,
            customDateEnd: null,
            hasAttachments: false,
            hasErrors: false,
            messageLength: 'all' // 'all', 'short', 'medium', 'long'
        };
        
        // UI elements are cached here
        this.ui = {};
        
        // Debounced search function
        this.debouncedSearch = this.utils.debounce(this._performSearch.bind(this), this.config.searchDebounceDelay);
        
        this._initialize();
        console.log('🔍 ChatSearchManager initialized.');
    }
    
    /**
     * Initializes search manager
     * @private
     */
    _initialize() {
        this._createSearchUI();
        this._setupEventListeners();
        this._loadSearchHistory();
    }
    
    /**
     * Creates search UI elements and caches them.
     * @private
     */
    _createSearchUI() {
        this.ui.searchContainer = this.utils.createElement('div', {
            className: 'chat-search-container hidden',
            innerHTML: `
                <div class="search-header">
                    <div class="search-input-container">
                        <input type="text" 
                               class="search-input" 
                               placeholder="Search messages..." 
                               autocomplete="off"
                               autocorrect="off"
                               spellcheck="false">
                        <div class="search-input-actions">
                            <button class="btn btn-xs btn-ghost search-options-btn" title="Search options">
                                <span class="icon">⚙️</span>
                            </button>
                            <button class="btn btn-xs btn-ghost search-clear-btn" title="Clear search">
                                <span class="icon">✕</span>
                            </button>
                        </div>
                    </div>
                    <div class="search-navigation">
                        <span class="search-results-count">0 results</span>
                        <div class="search-nav-controls">
                            <button class="btn btn-xs btn-ghost search-prev-btn" title="Previous result" disabled>
                                <span class="icon">↑</span>
                            </button>
                            <button class="btn btn-xs btn-ghost search-next-btn" title="Next result" disabled>
                                <span class="icon">↓</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="search-filters hidden">
                    <div class="filter-group">
                        <label class="filter-label">Role:</label>
                        <select class="filter-select role-filter">
                            <option value="all">All</option>
                            <option value="user">User</option>
                            <option value="assistant">Assistant</option>
                            <option value="system">System</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label">Character:</label>
                        <select class="filter-select character-filter">
                            <option value="all">All Characters</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label">Date:</label>
                        <select class="filter-select date-filter">
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>
                    
                    <div class="filter-group custom-date-range hidden">
                        <input type="date" class="filter-input date-start" placeholder="Start date">
                        <input type="date" class="filter-input date-end" placeholder="End date">
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-checkbox">
                            <input type="checkbox" class="filter-attachments">
                            <span class="checkbox-label">Has attachments</span>
                        </label>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-checkbox">
                            <input type="checkbox" class="filter-errors">
                            <span class="checkbox-label">Has errors</span>
                        </label>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label">Length:</label>
                        <select class="filter-select length-filter">
                            <option value="all">Any Length</option>
                            <option value="short">Short (&lt; 100 chars)</option>
                            <option value="medium">Medium (100-500 chars)</option>
                            <option value="long">Long (&gt; 500 chars)</option>
                        </select>
                    </div>
                </div>
                
                <div class="search-options hidden">
                    <div class="option-group">
                        <label class="option-checkbox">
                            <input type="checkbox" class="option-case-sensitive">
                            <span class="checkbox-label">Case sensitive</span>
                        </label>
                    </div>
                    
                    <div class="option-group">
                        <label class="option-checkbox">
                            <input type="checkbox" class="option-whole-words">
                            <span class="checkbox-label">Whole words only</span>
                        </label>
                    </div>
                    
                    <div class="option-group">
                        <label class="option-checkbox">
                            <input type="checkbox" class="option-regex">
                            <span class="checkbox-label">Use regex</span>
                        </label>
                    </div>
                    
                    <div class="option-group">
                        <label class="option-checkbox">
                            <input type="checkbox" class="option-metadata" checked>
                            <span class="checkbox-label">Search in metadata</span>
                        </label>
                    </div>
                </div>
                
                <div class="search-results">
                    <div class="results-list"></div>
                </div>
            `
        });
        
        // Find chat container and insert search UI
        const chatContainer = this.utils.$('.chat-container, .messages-container');
        if (chatContainer) {
            chatContainer.insertBefore(this.ui.searchContainer, chatContainer.firstChild);
        } else {
            console.error("Chat container not found. Search UI could not be initialized.");
            return;
        }
        
        // Cache all UI elements
        this.ui.searchInput = this.ui.searchContainer.querySelector('.search-input');
        this.ui.resultsContainer = this.ui.searchContainer.querySelector('.results-list');
        this.ui.resultsCount = this.ui.searchContainer.querySelector('.search-results-count');
        this.ui.prevBtn = this.ui.searchContainer.querySelector('.search-prev-btn');
        this.ui.nextBtn = this.ui.searchContainer.querySelector('.search-next-btn');
        this.ui.clearBtn = this.ui.searchContainer.querySelector('.search-clear-btn');
        this.ui.optionsBtn = this.ui.searchContainer.querySelector('.search-options-btn');
        this.ui.filtersPanel = this.ui.searchContainer.querySelector('.search-filters');
        this.ui.optionsPanel = this.ui.searchContainer.querySelector('.search-options');
        this.ui.dateFilter = this.ui.searchContainer.querySelector('.date-filter');
        this.ui.customDateRange = this.ui.searchContainer.querySelector('.custom-date-range');
        this.ui.filterSelects = this.ui.searchContainer.querySelectorAll('.filter-select, .filter-input, .filter-attachments, .filter-errors');
        this.ui.optionCheckboxes = this.ui.searchContainer.querySelectorAll('.option-checkbox input');
        
        this._populateCharacterFilter();
    }
    
    /**
     * Sets up event listeners safely.
     * @private
     */
    _setupEventListeners() {
        // Search input events
        if (this.ui.searchInput) {
            this.ui.searchInput.addEventListener('input', (e) => {
                this.currentQuery = e.target.value;
                if (this.currentQuery.length >= this.config.minQueryLength) {
                    this.debouncedSearch();
                } else {
                    this._clearSearch();
                }
            });
            
            this.ui.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.navigateToPrevious();
                    } else {
                        this.navigateToNext();
                    }
                } else if (e.key === 'Escape') {
                    this.closeSearch();
                }
            });
        }
        
        // Navigation buttons
        if(this.ui.prevBtn) this.ui.prevBtn.addEventListener('click', () => this.navigateToPrevious());
        if(this.ui.nextBtn) this.ui.nextBtn.addEventListener('click', () => this.navigateToNext());
        if(this.ui.clearBtn) this.ui.clearBtn.addEventListener('click', () => this._clearSearch());
        if(this.ui.optionsBtn) this.ui.optionsBtn.addEventListener('click', () => this._toggleOptions());
        
        // Filter events
        if (this.ui.filterSelects) {
            this.ui.filterSelects.forEach(element => {
                element.addEventListener('change', () => {
                    this._updateFilters();
                    this._applyFilters();
                });
            });
        }
        
        // Search options events
        if (this.ui.optionCheckboxes) {
            this.ui.optionCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    this._updateSearchOptions();
                    if (this.currentQuery.length >= this.config.minQueryLength) {
                        this._performSearch();
                    }
                });
            });
        }
        
        // Custom date range toggle
        if (this.ui.dateFilter && this.ui.customDateRange) {
            this.ui.dateFilter.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    this.utils.removeClass(this.ui.customDateRange, 'hidden');
                } else {
                    this.utils.addClass(this.ui.customDateRange, 'hidden');
                }
            });
        }
        
        // Global keyboard shortcuts
        this.eventEmitter.on('keydown:global', this._handleGlobalKeyDown.bind(this));
        
        // Chat history changes
        this.stateManager.subscribe('change:chatHistory', () => {
            if (this.isSearchActive) {
                this._performSearch();
            }
        });
        
        // Character changes
        this.stateManager.subscribe('change:activeCharacter', () => {
            this._populateCharacterFilter();
        });
    }
    
    /**
     * Populates character filter dropdown
     * @private
     */
    _populateCharacterFilter() {
        const characterFilter = this.ui.searchContainer?.querySelector('.character-filter');
        if (!characterFilter) return;
        
        const allOption = characterFilter.querySelector('option[value="all"]');
        characterFilter.innerHTML = '';
        if (allOption) {
            characterFilter.appendChild(allOption);
        }
        
        if (window.parklandApp?.characterManager) {
            const characters = window.parklandApp.characterManager.getAvailableCharacters();
            Object.entries(characters).forEach(([key, character]) => {
                const option = this.utils.createElement('option', {
                    value: key,
                    textContent: character.name
                });
                characterFilter.appendChild(option);
            });
        }
    }
    
    /**
     * Opens search interface
     */
    openSearch() {
        if (!this.ui.searchContainer) return;
        this.isSearchActive = true;
        this.utils.removeClass(this.ui.searchContainer, 'hidden');
        if (this.ui.searchInput) {
            this.ui.searchInput.focus();
        }
        document.body.classList.add('search-mode');
        this.eventEmitter.emit('search:opened');
    }
    
    /**
     * Closes search interface
     */
    closeSearch() {
        if (!this.ui.searchContainer) return;
        this.isSearchActive = false;
        this.utils.addClass(this.ui.searchContainer, 'hidden');
        this._clearHighlights();
        this._clearSearch();
        document.body.classList.remove('search-mode');
        this.eventEmitter.emit('search:closed');
    }
    
    /**
     * Toggles search interface
     */
    toggleSearch() {
        if (this.isSearchActive) {
            this.closeSearch();
        } else {
            this.openSearch();
        }
    }
    
    /**
     * Performs search with current query and filters
     * @private
     */
    _performSearch() {
        if (!this.currentQuery || this.currentQuery.length < this.config.minQueryLength) {
            this._clearSearch();
            return;
        }
        
        const chatHistory = this.stateManager.get('chatHistory') || [];
        this.searchResults = this._searchMessages(chatHistory, this.currentQuery);
        this._applyFilters();
        this._updateUI();
        this._addToSearchHistory(this.currentQuery);
        
        this.eventEmitter.emit('search:performed', {
            query: this.currentQuery,
            results: this.filteredResults.length
        });
    }

    _searchMessages(messages, query) {
        const results = [];
        messages.forEach((message, index) => {
            const matches = this._findMatches(message, query);
            if (matches.length > 0) {
                results.push({
                    message,
                    messageIndex: index,
                    matches,
                    score: this._calculateRelevanceScore(message, matches)
                });
            }
        });
        return results.sort((a, b) => b.score - a.score);
    }

    _findMatches(message, query) {
        const matches = [];
        const searchFields = ['content'];
        if (this.config.searchInMetadata) {
            searchFields.push('character', 'role');
        }
        searchFields.forEach(field => {
            const text = message[field] || '';
            matches.push(...this._findMatchesInText(text, query, field));
        });
        return matches;
    }

    _findMatchesInText(text, query, field) {
        if (!text) return [];
        let searchText = this.config.caseSensitive ? text : text.toLowerCase();
        let searchQuery = this.config.caseSensitive ? query : query.toLowerCase();
        const matches = [];

        if (this.config.useRegex) {
            try {
                const regex = new RegExp(searchQuery, this.config.caseSensitive ? 'g' : 'gi');
                let match;
                while ((match = regex.exec(text)) !== null) {
                    matches.push({
                        field,
                        start: match.index,
                        end: match.index + match[0].length,
                        text: match[0],
                        context: this._getContext(text, match.index, match[0].length)
                    });
                    if (!regex.global) break;
                }
            } catch (e) {
                console.warn("Invalid regex", e);
                return [];
            }
        } else if (this.config.wholeWordsOnly) {
            const wordRegex = new RegExp(`\\b${this._escapeRegex(searchQuery)}\\b`, this.config.caseSensitive ? 'g' : 'gi');
            let match;
            while ((match = wordRegex.exec(text)) !== null) {
                matches.push({ field, start: match.index, end: match.index + match[0].length, text: match[0], context: this._getContext(text, match.index, match[0].length) });
            }
        } else {
            let startIndex = 0, index;
            while ((index = searchText.indexOf(searchQuery, startIndex)) !== -1) {
                matches.push({
                    field,
                    start: index,
                    end: index + searchQuery.length,
                    text: text.substring(index, index + searchQuery.length),
                    context: this._getContext(text, index, searchQuery.length)
                });
                startIndex = index + 1;
            }
        }
        return matches;
    }

    _getContext(text, start, length) {
        const contextLength = 50;
        const beforeStart = Math.max(0, start - contextLength);
        const afterEnd = Math.min(text.length, start + length + contextLength);
        let context = text.substring(beforeStart, afterEnd);
        if (beforeStart > 0) context = '...' + context;
        if (afterEnd < text.length) context = context + '...';
        return context;
    }

    _calculateRelevanceScore(message, matches) {
        let score = 0;
        matches.forEach(match => {
            score += 10;
            if (match.field === 'content') score += 20;
            if (this.config.caseSensitive && match.text === this.currentQuery) score += 15;
            if (match.start === 0) score += 5;
        });
        const messageAge = Date.now() - (message.timestamp || 0);
        const recencyBonus = Math.max(0, 10 - (messageAge / (24 * 60 * 60 * 1000)));
        score += recencyBonus;
        return score;
    }

    _applyFilters() {
        this.filteredResults = this.searchResults.filter(result => {
            const message = result.message;
            if (this.filters.role !== 'all' && message.role !== this.filters.role) return false;
            if (this.filters.character !== 'all' && message.character !== this.filters.character) return false;
            if (!this._passesDateFilter(message)) return false;
            if (this.filters.hasAttachments && !message.attachments?.length) return false;
            if (this.filters.hasErrors && !message.isError) return false;
            if (!this._passesLengthFilter(message)) return false;
            return true;
        });
        this.currentResultIndex = this.filteredResults.length > 0 ? 0 : -1;
    }

    _passesDateFilter(message) {
        if (this.filters.dateRange === 'all') return true;
        const messageDate = new Date(message.timestamp || 0);
        const now = new Date();
        switch (this.filters.dateRange) {
            case 'today':
                return messageDate.toDateString() === now.toDateString();
            case 'week':
                return messageDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case 'month':
                return messageDate >= new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            case 'custom':
                if (this.filters.customDateStart && messageDate < new Date(this.filters.customDateStart)) return false;
                if (this.filters.customDateEnd && messageDate > new Date(this.filters.customDateEnd)) return false;
                return true;
            default:
                return true;
        }
    }

    _passesLengthFilter(message) {
        if (this.filters.messageLength === 'all') return true;
        const length = (message.content || '').length;
        switch (this.filters.messageLength) {
            case 'short':
                return length < 100;
            case 'medium':
                return length >= 100 && length <= 500;
            case 'long':
                return length > 500;
            default:
                return true;
        }
    }

    _updateUI() {
        if (!this.ui.resultsCount || !this.ui.prevBtn || !this.ui.nextBtn) return;
        this.ui.resultsCount.textContent = `${this.filteredResults.length} result${this.filteredResults.length !== 1 ? 's' : ''}`;
        const hasResults = this.filteredResults.length > 0;
        this.ui.prevBtn.disabled = !hasResults;
        this.ui.nextBtn.disabled = !hasResults;
        this._clearHighlights();
        if (this.currentResultIndex >= 0 && this.currentResultIndex < this.filteredResults.length) {
            const result = this.filteredResults[this.currentResultIndex];
            this._highlightResult(result);
            this._scrollToResult(result);
        }
        this._highlightAllMatches();
    }

    _highlightAllMatches() {
        this.filteredResults.forEach(result => {
            const messageElement = this._findMessageElement(result.message);
            if (messageElement) {
                this._highlightMatchesInElement(messageElement, result.matches);
            }
        });
    }

    _highlightMatchesInElement(element, matches) {
        const contentElement = element.querySelector('.message-content');
        if (!contentElement) return;
        matches.forEach(match => {
            if (match.field === 'content') {
                this._highlightTextInElement(contentElement, match.text);
            }
        });
    }

    _highlightTextInElement(element, text) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        textNodes.forEach(textNode => {
            const content = textNode.textContent;
            const searchText = this.config.caseSensitive ? content : content.toLowerCase();
            const searchQuery = this.config.caseSensitive ? text : text.toLowerCase();
            let index = searchText.indexOf(searchQuery);
            if (index !== -1) {
                const fragment = document.createDocumentFragment();
                const before = content.substring(0, index);
                if (before) fragment.appendChild(document.createTextNode(before));
                const highlight = this.utils.createElement('mark', {
                    className: this.config.highlightClassName,
                    textContent: content.substring(index, index + text.length)
                });
                fragment.appendChild(highlight);
                const after = content.substring(index + text.length);
                if (after) fragment.appendChild(document.createTextNode(after));
                if (textNode.parentNode) {
                   textNode.parentNode.replaceChild(fragment, textNode);
                }
            }
        });
    }

    _highlightResult(result) {
        const messageElement = this._findMessageElement(result.message);
        if (messageElement) {
            messageElement.classList.add('search-result-active');
            const highlights = messageElement.querySelectorAll(`.${this.config.highlightClassName}`);
            if (highlights.length > 0) {
                highlights[0].classList.add(this.config.activeHighlightClassName);
            }
        }
    }

    _scrollToResult(result) {
        const messageElement = this._findMessageElement(result.message);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    _findMessageElement(message) {
        return this.utils.$(`[data-message-id="${message.id}"]`);
    }

    _clearHighlights() {
        this.utils.$$('.search-result-active').forEach(el => el.classList.remove('search-result-active'));
        this.utils.$$(`.${this.config.highlightClassName}`).forEach(mark => {
            const parent = mark.parentNode;
            if (parent) {
                parent.replaceChild(document.createTextNode(mark.textContent), mark);
                parent.normalize();
            }
        });
    }

    navigateToNext() {
        if (this.filteredResults.length === 0) return;
        this.currentResultIndex = (this.currentResultIndex + 1) % this.filteredResults.length;
        this._updateUI();
    }

    navigateToPrevious() {
        if (this.filteredResults.length === 0) return;
        this.currentResultIndex = (this.currentResultIndex - 1 + this.filteredResults.length) % this.filteredResults.length;
        this._updateUI();
    }

    _clearSearch() {
        this.currentQuery = '';
        this.searchResults = [];
        this.filteredResults = [];
        this.currentResultIndex = -1;
        if (this.ui.searchInput) {
            this.ui.searchInput.value = '';
        }
        this._clearHighlights();
        this._updateUI();
    }

    _updateFilters() {
        const c = this.ui.searchContainer;
        if (!c) return;
        this.filters.role = c.querySelector('.role-filter')?.value || 'all';
        this.filters.character = c.querySelector('.character-filter')?.value || 'all';
        this.filters.dateRange = c.querySelector('.date-filter')?.value || 'all';
        this.filters.hasAttachments = c.querySelector('.filter-attachments')?.checked || false;
        this.filters.hasErrors = c.querySelector('.filter-errors')?.checked || false;
        this.filters.messageLength = c.querySelector('.length-filter')?.value || 'all';
        if (this.filters.dateRange === 'custom') {
            this.filters.customDateStart = c.querySelector('.date-start')?.value;
            this.filters.customDateEnd = c.querySelector('.date-end')?.value;
        }
    }

    _updateSearchOptions() {
        const c = this.ui.searchContainer;
        if (!c) return;
        this.config.caseSensitive = c.querySelector('.option-case-sensitive')?.checked || false;
        this.config.wholeWordsOnly = c.querySelector('.option-whole-words')?.checked || false;
        this.config.useRegex = c.querySelector('.option-regex')?.checked || false;
        this.config.searchInMetadata = c.querySelector('.option-metadata')?.checked || false;
    }

    _toggleOptions() {
        if (this.ui.filtersPanel) this.utils.toggleClass(this.ui.filtersPanel, 'hidden');
        if (this.ui.optionsPanel) this.utils.toggleClass(this.ui.optionsPanel, 'hidden');
    }

    _handleGlobalKeyDown(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            this.openSearch();
        }
        if (event.key === 'Escape' && this.isSearchActive) {
            event.preventDefault();
            this.closeSearch();
        }
    }

    _addToSearchHistory(query) {
        if (!query || this.searchHistory.includes(query)) return;
        this.searchHistory.unshift(query);
        if (this.searchHistory.length > this.config.maxSearchHistory) this.searchHistory.pop();
        this._saveSearchHistory();
    }

    _loadSearchHistory() {
        try {
            const saved = localStorage.getItem('parkland_search_history');
            if (saved) this.searchHistory = JSON.parse(saved);
        } catch (e) {
            console.warn("Failed to load search history", e);
            this.searchHistory = [];
        }
    }

    _saveSearchHistory() {
        try {
            localStorage.setItem('parkland_search_history', JSON.stringify(this.searchHistory));
        } catch (e) {
            console.warn("Failed to save search history", e);
        }
    }

    _escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    getSearchStats() {
        return {
            isActive: this.isSearchActive,
            currentQuery: this.currentQuery,
            totalResults: this.searchResults.length,
            filteredResults: this.filteredResults.length,
            currentIndex: this.currentResultIndex,
            historyCount: this.searchHistory.length
        };
    }

    exportResults(format = 'json') {
        const results = this.filteredResults.map(r => ({
            messageId: r.message.id,
            role: r.message.role,
            content: r.message.content,
            character: r.message.character,
            timestamp: r.message.timestamp,
            matches: r.matches,
            score: r.score
        }));
        if (format === 'csv') {
            const headers = ['Message ID', 'Role', 'Content', 'Character', 'Timestamp', 'Score'];
            const rows = results.map(r => [
                r.messageId,
                r.role,
                `"${(r.content || '').replace(/"/g, '""')}"`,
                r.character || '',
                new Date(r.timestamp).toISOString(),
                r.score
            ]);
            return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        }
        return JSON.stringify(results, null, 2);
    }

    destroy() {
        this._clearHighlights();
        this._saveSearchHistory();
        if (this.ui.searchContainer?.parentNode) {
            this.ui.searchContainer.parentNode.removeChild(this.ui.searchContainer);
        }
        document.body.classList.remove('search-mode');
        console.log('🔍 ChatSearchManager destroyed.');
    }
}

// Global instance creation pattern
if (typeof window !== 'undefined') {
    window.ChatSearchManager = ChatSearchManager;
}
