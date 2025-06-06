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
        
        // UI elements
        this.searchUI = null;
        this.searchInput = null;
        this.searchContainer = null;
        this.resultsContainer = null;
        
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
     * Creates search UI elements
     * @private
     */
    _createSearchUI() {
        this.searchContainer = this.utils.createElement('div', {
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
            chatContainer.insertBefore(this.searchContainer, chatContainer.firstChild);
        }
        
        // Cache UI elements
        this.searchInput = this.searchContainer.querySelector('.search-input');
        this.resultsContainer = this.searchContainer.querySelector('.results-list');
        this.resultsCount = this.searchContainer.querySelector('.search-results-count');
        
        this._populateCharacterFilter();
    }
    
    /**
     * Sets up event listeners
     * @private
     */
    _setupEventListeners() {
        // Search input events
        this.searchInput.addEventListener('input', (e) => {
            this.currentQuery = e.target.value;
            if (this.currentQuery.length >= this.config.minQueryLength) {
                this.debouncedSearch();
            } else {
                this._clearSearch();
            }
        });
        
        this.searchInput.addEventListener('keydown', (e) => {
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
        
        // Navigation buttons
        const prevBtn = this.searchContainer.querySelector('.search-prev-btn');
        const nextBtn = this.searchContainer.querySelector('.search-next-btn');
        const clearBtn = this.searchContainer.querySelector('.search-clear-btn');
        const optionsBtn = this.searchContainer.querySelector('.search-options-btn');
        
        prevBtn.addEventListener('click', () => this.navigateToPrevious());
        nextBtn.addEventListener('click', () => this.navigateToNext());
        clearBtn.addEventListener('click', () => this._clearSearch());
        optionsBtn.addEventListener('click', () => this._toggleOptions());
        
        // Filter events
        this.searchContainer.querySelectorAll('.filter-select, .filter-input, .filter-attachments, .filter-errors').forEach(element => {
            element.addEventListener('change', () => {
                this._updateFilters();
                this._applyFilters();
            });
        });
        
        // Search options events
        this.searchContainer.querySelectorAll('.option-checkbox input').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this._updateSearchOptions();
                if (this.currentQuery.length >= this.config.minQueryLength) {
                    this._performSearch();
                }
            });
        });
        
        // Custom date range toggle
        const dateFilter = this.searchContainer.querySelector('.date-filter');
        const customDateRange = this.searchContainer.querySelector('.custom-date-range');
        dateFilter.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                this.utils.removeClass(customDateRange, 'hidden');
            } else {
                this.utils.addClass(customDateRange, 'hidden');
            }
        });
        
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
        const characterFilter = this.searchContainer.querySelector('.character-filter');
        if (!characterFilter) return;
        
        // Clear existing options except "All Characters"
        const allOption = characterFilter.querySelector('option[value="all"]');
        characterFilter.innerHTML = '';
        characterFilter.appendChild(allOption);
        
        // Add characters from character manager
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
        this.isSearchActive = true;
        this.utils.removeClass(this.searchContainer, 'hidden');
        this.searchInput.focus();
        
        // Add search mode class to body for styling
        document.body.classList.add('search-mode');
        
        this.eventEmitter.emit('search:opened');
    }
    
    /**
     * Closes search interface
     */
    closeSearch() {
        this.isSearchActive = false;
        this.utils.addClass(this.searchContainer, 'hidden');
        this._clearHighlights();
        this._clearSearch();
        
        // Remove search mode class
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
    
    /**
     * Searches messages for query
     * @param {Array} messages - Messages to search
     * @param {string} query - Search query
     * @returns {Array} Search results
     * @private
     */
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
        
        // Sort by relevance score (highest first)
        return results.sort((a, b) => b.score - a.score);
    }
    
    /**
     * Finds matches in a message
     * @param {Object} message - Message object
     * @param {string} query - Search query
     * @returns {Array} Array of matches
     * @private
     */
    _findMatches(message, query) {
        const matches = [];
        const searchFields = ['content'];
        
        if (this.config.searchInMetadata) {
            searchFields.push('character', 'role');
        }
        
        searchFields.forEach(field => {
            const text = message[field] || '';
            const fieldMatches = this._findMatchesInText(text, query, field);
            matches.push(...fieldMatches);
        });
        
        return matches;
    }
    
    /**
     * Finds matches in text
     * @param {string} text - Text to search
     * @param {string} query - Search query
     * @param {string} field - Field name
     * @returns {Array} Array of matches
     * @private
     */
    _findMatchesInText(text, query, field) {
        if (!text) return [];
        
        let searchText = text;
        let searchQuery = query;
        
        if (!this.config.caseSensitive) {
            searchText = text.toLowerCase();
            searchQuery = query.toLowerCase();
        }
        
        const matches = [];
        
        if (this.config.useRegex) {
            try {
                const flags = this.config.caseSensitive ? 'g' : 'gi';
                const regex = new RegExp(searchQuery, flags);
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
            } catch (error) {
                console.warn('Invalid regex pattern:', error);
                return [];
            }
        } else if (this.config.wholeWordsOnly) {
            const wordRegex = new RegExp(`\\b${this._escapeRegex(searchQuery)}\\b`, this.config.caseSensitive ? 'g' : 'gi');
            let match;
            while ((match = wordRegex.exec(text)) !== null) {
                matches.push({
                    field,
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                    context: this._getContext(text, match.index, match[0].length)
                });
            }
        } else {
            let startIndex = 0;
            let index;
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
    
    /**
     * Gets context around a match
     * @param {string} text - Full text
     * @param {number} start - Match start index
     * @param {number} length - Match length
     * @returns {string} Context string
     * @private
     */
    _getContext(text, start, length) {
        const contextLength = 50;
        const beforeStart = Math.max(0, start - contextLength);
        const afterEnd = Math.min(text.length, start + length + contextLength);
        
        let context = text.substring(beforeStart, afterEnd);
        
        if (beforeStart > 0) context = '...' + context;
        if (afterEnd < text.length) context = context + '...';
        
        return context;
    }
    
    /**
     * Calculates relevance score for a search result
     * @param {Object} message - Message object
     * @param {Array} matches - Array of matches
     * @returns {number} Relevance score
     * @private
     */
    _calculateRelevanceScore(message, matches) {
        let score = 0;
        
        matches.forEach(match => {
            // Base score for any match
            score += 10;
            
            // Bonus for content matches vs metadata
            if (match.field === 'content') {
                score += 20;
            }
            
            // Bonus for exact case matches
            if (this.config.caseSensitive && match.text === this.currentQuery) {
                score += 15;
            }
            
            // Bonus for matches at beginning of field
            if (match.start === 0) {
                score += 5;
            }
        });
        
        // Recency bonus (more recent messages score higher)
        const messageAge = Date.now() - (message.timestamp || 0);
        const dayInMs = 24 * 60 * 60 * 1000;
        const recencyBonus = Math.max(0, 10 - (messageAge / dayInMs));
        score += recencyBonus;
        
        return score;
    }
    
    /**
     * Applies filters to search results
     * @private
     */
    _applyFilters() {
        this.filteredResults = this.searchResults.filter(result => {
            const message = result.message;
            
            // Role filter
            if (this.filters.role !== 'all' && message.role !== this.filters.role) {
                return false;
            }
            
            // Character filter
            if (this.filters.character !== 'all' && message.character !== this.filters.character) {
                return false;
            }
            
            // Date filter
            if (!this._passesDateFilter(message)) {
                return false;
            }
            
            // Attachments filter
            if (this.filters.hasAttachments && !message.attachments?.length) {
                return false;
            }
            
            // Error filter
            if (this.filters.hasErrors && !message.isError) {
                return false;
            }
            
            // Message length filter
            if (!this._passesLengthFilter(message)) {
                return false;
            }
            
            return true;
        });
        
        this.currentResultIndex = this.filteredResults.length > 0 ? 0 : -1;
    }
    
    /**
     * Checks if message passes date filter
     * @param {Object} message - Message object
     * @returns {boolean} Whether message passes filter
     * @private
     */
    _passesDateFilter(message) {
        if (this.filters.dateRange === 'all') return true;
        
        const messageDate = new Date(message.timestamp || 0);
        const now = new Date();
        
        switch (this.filters.dateRange) {
            case 'today':
                return messageDate.toDateString() === now.toDateString();
            
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return messageDate >= weekAgo;
            
            case 'month':
                const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                return messageDate >= monthAgo;
            
            case 'custom':
                if (this.filters.customDateStart && messageDate < new Date(this.filters.customDateStart)) {
                    return false;
                }
                if (this.filters.customDateEnd && messageDate > new Date(this.filters.customDateEnd)) {
                    return false;
                }
                return true;
            
            default:
                return true;
        }
    }
    
    /**
     * Checks if message passes length filter
     * @param {Object} message - Message object
     * @returns {boolean} Whether message passes filter
     * @private
     */
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
    
    /**
     * Updates UI with search results
     * @private
     */
    _updateUI() {
        // Update results count
        this.resultsCount.textContent = `${this.filteredResults.length} result${this.filteredResults.length !== 1 ? 's' : ''}`;
        
        // Update navigation buttons
        const prevBtn = this.searchContainer.querySelector('.search-prev-btn');
        const nextBtn = this.searchContainer.querySelector('.search-next-btn');
        
        const hasResults = this.filteredResults.length > 0;
        prevBtn.disabled = !hasResults;
        nextBtn.disabled = !hasResults;
        
        // Clear previous highlights
        this._clearHighlights();
        
        // Highlight current result
        if (this.currentResultIndex >= 0 && this.currentResultIndex < this.filteredResults.length) {
            this._highlightResult(this.filteredResults[this.currentResultIndex]);
            this._scrollToResult(this.filteredResults[this.currentResultIndex]);
        }
        
        // Highlight all matches
        this._highlightAllMatches();
    }
    
    /**
     * Highlights all search matches in visible messages
     * @private
     */
    _highlightAllMatches() {
        this.filteredResults.forEach(result => {
            const messageElement = this._findMessageElement(result.message);
            if (messageElement) {
                this._highlightMatchesInElement(messageElement, result.matches);
            }
        });
    }
    
    /**
     * Highlights matches in a specific element
     * @param {HTMLElement} element - Element to highlight in
     * @param {Array} matches - Array of matches
     * @private
     */
    _highlightMatchesInElement(element, matches) {
        const contentElement = element.querySelector('.message-content');
        if (!contentElement) return;
        
        matches.forEach(match => {
            if (match.field === 'content') {
                this._highlightTextInElement(contentElement, match.text);
            }
        });
    }
    
    /**
     * Highlights text in element
     * @param {HTMLElement} element - Element to highlight in
     * @param {string} text - Text to highlight
     * @private
     */
    _highlightTextInElement(element, text) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
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
                const before = content.substring(0, index);
                const match = content.substring(index, index + text.length);
                const after = content.substring(index + text.length);
                
                const fragment = document.createDocumentFragment();
                
                if (before) {
                    fragment.appendChild(document.createTextNode(before));
                }
                
                const highlight = this.utils.createElement('mark', {
                    className: this.config.highlightClassName,
                    textContent: match
                });
                fragment.appendChild(highlight);
                
                if (after) {
                    fragment.appendChild(document.createTextNode(after));
                }
                
                textNode.parentNode.replaceChild(fragment, textNode);
            }
        });
    }
    
    /**
     * Highlights specific search result
     * @param {Object} result - Search result
     * @private
     */
    _highlightResult(result) {
        const messageElement = this._findMessageElement(result.message);
        if (messageElement) {
            messageElement.classList.add('search-result-active');
            
            // Find and highlight the active match
            const highlights = messageElement.querySelectorAll(`.${this.config.highlightClassName}`);
            if (highlights.length > 0) {
                highlights[0].classList.add(this.config.activeHighlightClassName);
            }
        }
    }
    
    /**
     * Scrolls to search result
     * @param {Object} result - Search result
     * @private
     */
    _scrollToResult(result) {
        const messageElement = this._findMessageElement(result.message);
        if (messageElement) {
            messageElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }
    
    /**
     * Finds message element in DOM
     * @param {Object} message - Message object
     * @returns {HTMLElement|null} Message element
     * @private
     */
    _findMessageElement(message) {
        return this.utils.$(`[data-message-id="${message.id}"]`);
    }
    
    /**
     * Clears all search highlights
     * @private
     */
    _clearHighlights() {
        // Remove highlight classes from messages
        this.utils.$$('.search-result-active').forEach(element => {
            element.classList.remove('search-result-active');
        });
        
        // Remove highlight marks
        this.utils.$$(`.${this.config.highlightClassName}`).forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
    }
    
    /**
     * Navigates to next search result
     */
    navigateToNext() {
        if (this.filteredResults.length === 0) return;
        
        this.currentResultIndex = (this.currentResultIndex + 1) % this.filteredResults.length;
        this._updateUI();
    }
    
    /**
     * Navigates to previous search result
     */
    navigateToPrevious() {
        if (this.filteredResults.length === 0) return;
        
        this.currentResultIndex = this.currentResultIndex <= 0 ? 
            this.filteredResults.length - 1 : 
            this.currentResultIndex - 1;
        this._updateUI();
    }
    
    /**
     * Clears search
     * @private
     */
    _clearSearch() {
        this.currentQuery = '';
        this.searchResults = [];
        this.filteredResults = [];
        this.currentResultIndex = -1;
        
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        
        this._clearHighlights();
        this._updateUI();
    }
    
    /**
     * Updates filters from UI
     * @private
     */
    _updateFilters() {
        const container = this.searchContainer;
        
        this.filters.role = container.querySelector('.role-filter').value;
        this.filters.character = container.querySelector('.character-filter').value;
        this.filters.dateRange = container.querySelector('.date-filter').value;
        this.filters.hasAttachments = container.querySelector('.filter-attachments').checked;
        this.filters.hasErrors = container.querySelector('.filter-errors').checked;
        this.filters.messageLength = container.querySelector('.length-filter').value;
        
        if (this.filters.dateRange === 'custom') {
            this.filters.customDateStart = container.querySelector('.date-start').value;
            this.filters.customDateEnd = container.querySelector('.date-end').value;
        }
    }
    
    /**
     * Updates search options from UI
     * @private
     */
    _updateSearchOptions() {
        const container = this.searchContainer;
        
        this.config.caseSensitive = container.querySelector('.option-case-sensitive').checked;
        this.config.wholeWordsOnly = container.querySelector('.option-whole-words').checked;
        this.config.useRegex = container.querySelector('.option-regex').checked;
        this.config.searchInMetadata = container.querySelector('.option-metadata').checked;
    }
    
    /**
     * Toggles search options panel
     * @private
     */
    _toggleOptions() {
        const filtersPanel = this.searchContainer.querySelector('.search-filters');
        const optionsPanel = this.searchContainer.querySelector('.search-options');
        
        this.utils.toggleClass(filtersPanel, 'hidden');
        this.utils.toggleClass(optionsPanel, 'hidden');
    }
    
    /**
     * Handles global keyboard shortcuts
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    _handleGlobalKeyDown(event) {
        // Ctrl+F or Cmd+F to open search
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            this.openSearch();
        }
        
        // Escape to close search
        if (event.key === 'Escape' && this.isSearchActive) {
            event.preventDefault();
            this.closeSearch();
        }
    }
    
    /**
     * Adds query to search history
     * @param {string} query - Search query
     * @private
     */
    _addToSearchHistory(query) {
        if (!query || this.searchHistory.includes(query)) return;
        
        this.searchHistory.unshift(query);
        
        if (this.searchHistory.length > this.config.maxSearchHistory) {
            this.searchHistory = this.searchHistory.slice(0, this.config.maxSearchHistory);
        }
        
        this._saveSearchHistory();
    }
    
    /**
     * Loads search history from storage
     * @private
     */
    _loadSearchHistory() {
        try {
            const saved = localStorage.getItem('parkland_search_history');
            if (saved) {
                this.searchHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load search history:', error);
            this.searchHistory = [];
        }
    }
    
    /**
     * Saves search history to storage
     * @private
     */
    _saveSearchHistory() {
        try {
            localStorage.setItem('parkland_search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('Failed to save search history:', error);
        }
    }
    
    /**
     * Escapes regex special characters
     * @param {string} string - String to escape
     * @returns {string} Escaped string
     * @private
     */
    _escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Gets search statistics
     * @returns {Object} Search statistics
     */
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
    
    /**
     * Exports search results
     * @param {string} format - Export format (json, csv)
     * @returns {string} Exported data
     */
    exportResults(format = 'json') {
        const results = this.filteredResults.map(result => ({
            messageId: result.message.id,
            role: result.message.role,
            content: result.message.content,
            character: result.message.character,
            timestamp: result.message.timestamp,
            matches: result.matches,
            score: result.score
        }));
        
        if (format === 'csv') {
            const headers = ['Message ID', 'Role', 'Content', 'Character', 'Timestamp', 'Score'];
            const rows = results.map(result => [
                result.messageId,
                result.role,
                `"${result.content.replace(/"/g, '""')}"`,
                result.character || '',
                new Date(result.timestamp).toISOString(),
                result.score
            ]);
            
            return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        }
        
        return JSON.stringify(results, null, 2);
    }
    
    /**
     * Destroys search manager
     */
    destroy() {
        this._clearHighlights();
        this._saveSearchHistory();
        
        if (this.searchContainer && this.searchContainer.parentNode) {
            this.searchContainer.parentNode.removeChild(this.searchContainer);
        }
        
        document.body.classList.remove('search-mode');
        
        console.log('🔍 ChatSearchManager destroyed.');
    }
}

// Global instance creation pattern
if (typeof window !== 'undefined') {
    window.ChatSearchManager = ChatSearchManager;
}