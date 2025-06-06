/**
 * Parkland AI - Opus Magnum Edition
 * File Upload Manager
 *
 * Provides comprehensive file upload and processing capabilities
 * including image analysis, document parsing, and media handling.
 */

class FileUploadManager {
    constructor(utils, stateManager, notificationSystem = null, apiService = null) {
        if (!utils || !stateManager) {
            throw new Error("FileUploadManager requires utils and stateManager instances.");
        }
        
        this.utils = utils;
        this.stateManager = stateManager;
        this.notificationSystem = notificationSystem;
        this.apiService = apiService;
        
        // File processing configuration
        this.config = {
            maxFileSize: 50 * 1024 * 1024, // 50MB
            maxFiles: 10,
            allowedTypes: {
                images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
                documents: ['application/pdf', 'text/plain', 'text/markdown', 'application/rtf'],
                data: ['application/json', 'text/csv', 'application/xml', 'text/xml'],
                archives: ['application/zip', 'application/x-rar-compressed'],
                office: [
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                    'application/msword',
                    'application/vnd.ms-excel',
                    'application/vnd.ms-powerpoint'
                ]
            },
            thumbnailSize: { width: 200, height: 200 },
            compressionQuality: 0.8
        };
        
        // File storage
        this.uploadedFiles = new Map();
        this.processingQueue = [];
        this.maxStoredFiles = 50;
        
        // Canvas for image processing
        this.canvas = null;
        this.context = null;
        this._initializeCanvas();
        
        // Drag and drop state
        this.isDragging = false;
        this.dragCounter = 0;
        
        this._setupEventListeners();
        
        console.log('📁 FileUploadManager initialized.');
    }

    /**
     * Sets up global drag and drop event listeners
     * @private
     */
    _setupEventListeners() {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, this._preventDefaults.bind(this), false);
        });
        
        // Highlight drop zone when dragging files
        ['dragenter', 'dragover'].forEach(eventName => {
            document.addEventListener(eventName, this._handleDragEnter.bind(this), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, this._handleDragLeave.bind(this), false);
        });
        
        // Handle file drop
        document.addEventListener('drop', this._handleDrop.bind(this), false);
    }

    /**
     * Initializes canvas for image processing
     * @private
     */
    _initializeCanvas() {
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
    }

    /**
     * Creates file input element for manual file selection
     * @param {Object} options - Configuration options
     * @returns {HTMLElement} File input element
     */
    createFileInput(options = {}) {
        const config = { ...this.config, ...options };
        const acceptTypes = this._getAcceptTypes(config.allowedTypes);
        
        const input = this.utils.createElement('input', {
            type: 'file',
            multiple: config.maxFiles > 1,
            accept: acceptTypes,
            className: 'file-input-hidden'
        });
        
        input.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                this.handleFiles(Array.from(e.target.files));
            }
        });
        
        return input;
    }

    /**
     * Creates visual file upload area
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Configuration options
     * @returns {HTMLElement} Upload area element
     */
    createUploadArea(container, options = {}) {
        const config = { ...this.config, ...options };
        
        const uploadArea = this.utils.createElement('div', {
            className: 'file-upload-area',
            innerHTML: `
                <div class="upload-content">
                    <div class="upload-icon">📁</div>
                    <div class="upload-text">
                        <p class="upload-primary">Drop files here or <span class="upload-browse">browse</span></p>
                        <p class="upload-secondary">
                            Supports images, documents, and data files up to ${this._formatFileSize(config.maxFileSize)}
                        </p>
                    </div>
                </div>
                <div class="upload-progress hidden">
                    <div class="progress-bar"></div>
                    <div class="progress-text">Processing files...</div>
                </div>
            `
        });
        
        const fileInput = this.createFileInput(config);
        uploadArea.appendChild(fileInput);
        
        // Handle click to browse
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Handle drag and drop
        uploadArea.addEventListener('dragenter', (e) => {
            e.stopPropagation();
            this.utils.addClass(uploadArea, 'drag-over');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.stopPropagation();
            if (!uploadArea.contains(e.relatedTarget)) {
                this.utils.removeClass(uploadArea, 'drag-over');
            }
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.stopPropagation();
            this.utils.removeClass(uploadArea, 'drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });
        
        container.appendChild(uploadArea);
        return uploadArea;
    }

    /**
     * Handles uploaded files
     * @param {File[]} files - Array of File objects
     * @returns {Promise<Object[]>} Array of processed file objects
     */
    async handleFiles(files) {
        if (!files || files.length === 0) {
            return [];
        }
        
        // Validate files
        const validFiles = this._validateFiles(files);
        if (validFiles.length === 0) {
            return [];
        }
        
        if (this.notificationSystem) {
            this.notificationSystem.show(
                `Processing ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}...`,
                { type: 'info', duration: 3000 }
            );
        }
        
        const processedFiles = [];
        
        for (const file of validFiles) {
            try {
                const processedFile = await this._processFile(file);
                processedFiles.push(processedFile);
                this._storeFile(processedFile);
            } catch (error) {
                console.error('Error processing file:', file.name, error);
                if (this.notificationSystem) {
                    this.notificationSystem.showError(
                        `Failed to process ${file.name}: ${error.message}`
                    );
                }
            }
        }
        
        if (processedFiles.length > 0 && this.notificationSystem) {
            this.notificationSystem.showSuccess(
                `Successfully processed ${processedFiles.length} file${processedFiles.length > 1 ? 's' : ''}`
            );
        }
        
        return processedFiles;
    }

    /**
     * Processes a single file
     * @param {File} file - File to process
     * @returns {Promise<Object>} Processed file object
     * @private
     */
    async _processFile(file) {
        const fileId = this._generateFileId();
        const type = this._getFileType(file.type);
        
        const processedFile = {
            id: fileId,
            name: file.name,
            size: file.size,
            type: type,
            mimeType: file.type,
            uploadDate: Date.now(),
            data: null,
            thumbnail: null,
            metadata: {},
            analysis: null
        };
        
        // Read file data
        const fileData = await this._readFile(file);
        processedFile.data = fileData;
        
        // Process based on type
        switch (type) {
            case 'image':
                await this._processImage(processedFile, file);
                break;
            case 'document':
                await this._processDocument(processedFile, file);
                break;
            case 'data':
                await this._processDataFile(processedFile, file);
                break;
            default:
                // Basic processing for other types
                processedFile.metadata = {
                    lastModified: file.lastModified,
                    webkitRelativePath: file.webkitRelativePath || ''
                };
        }
        
        return processedFile;
    }

    /**
     * Processes image files
     * @param {Object} processedFile - File object being processed
     * @param {File} originalFile - Original File object
     * @private
     */
    async _processImage(processedFile, originalFile) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = async () => {
                try {
                    // Extract metadata
                    processedFile.metadata = {
                        width: img.width,
                        height: img.height,
                        aspectRatio: img.width / img.height,
                        fileSize: originalFile.size,
                        lastModified: originalFile.lastModified
                    };
                    
                    // Generate thumbnail
                    processedFile.thumbnail = await this._generateThumbnail(img);
                    
                    // Perform image analysis if API service is available
                    if (this.apiService && this._shouldAnalyzeImage(processedFile)) {
                        try {
                            processedFile.analysis = await this._analyzeImage(processedFile);
                        } catch (error) {
                            console.warn('Image analysis failed:', error);
                            processedFile.analysis = { error: error.message };
                        }
                    }
                    
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            img.src = processedFile.data;
        });
    }

    /**
     * Processes document files
     * @param {Object} processedFile - File object being processed
     * @param {File} originalFile - Original File object
     * @private
     */
    async _processDocument(processedFile, originalFile) {
        processedFile.metadata = {
            fileSize: originalFile.size,
            lastModified: originalFile.lastModified,
            encoding: 'utf-8'
        };
        
        // For text files, extract content preview
        if (originalFile.type.startsWith('text/')) {
            try {
                const textContent = await this._readFileAsText(originalFile);
                processedFile.metadata.preview = textContent.substring(0, 500);
                processedFile.metadata.lineCount = textContent.split('\n').length;
                processedFile.metadata.wordCount = textContent.split(/\s+/).length;
            } catch (error) {
                console.warn('Failed to read text content:', error);
            }
        }
    }

    /**
     * Processes data files (JSON, CSV, etc.)
     * @param {Object} processedFile - File object being processed
     * @param {File} originalFile - Original File object
     * @private
     */
    async _processDataFile(processedFile, originalFile) {
        processedFile.metadata = {
            fileSize: originalFile.size,
            lastModified: originalFile.lastModified
        };
        
        try {
            const textContent = await this._readFileAsText(originalFile);
            
            if (originalFile.type === 'application/json') {
                const jsonData = JSON.parse(textContent);
                processedFile.metadata.structure = this._analyzeJSONStructure(jsonData);
            } else if (originalFile.type === 'text/csv') {
                const lines = textContent.split('\n');
                processedFile.metadata.rowCount = lines.length - 1; // Excluding header
                processedFile.metadata.columns = lines[0] ? lines[0].split(',').length : 0;
                processedFile.metadata.preview = lines.slice(0, 5).join('\n');
            }
        } catch (error) {
            console.warn('Failed to analyze data file:', error);
            processedFile.metadata.error = error.message;
        }
    }

    /**
     * Analyzes JSON structure
     * @param {*} data - JSON data
     * @returns {Object} Structure analysis
     * @private
     */
    _analyzeJSONStructure(data) {
        const getType = (value) => {
            if (value === null) return 'null';
            if (Array.isArray(value)) return 'array';
            return typeof value;
        };
        
        const analyzeValue = (value, depth = 0) => {
            const type = getType(value);
            const result = { type };
            
            if (type === 'object' && depth < 3) {
                result.keys = Object.keys(value).slice(0, 10);
                result.keyCount = Object.keys(value).length;
            } else if (type === 'array' && depth < 3) {
                result.length = value.length;
                if (value.length > 0) {
                    result.elementType = getType(value[0]);
                }
            }
            
            return result;
        };
        
        return analyzeValue(data);
    }

    /**
     * Generates thumbnail for image
     * @param {HTMLImageElement} img - Image element
     * @returns {Promise<string>} Thumbnail data URL
     * @private
     */
    async _generateThumbnail(img) {
        const { width: thumbWidth, height: thumbHeight } = this.config.thumbnailSize;
        
        // Calculate dimensions maintaining aspect ratio
        let { width, height } = img;
        const aspectRatio = width / height;
        
        if (width > height) {
            width = thumbWidth;
            height = thumbWidth / aspectRatio;
        } else {
            height = thumbHeight;
            width = thumbHeight * aspectRatio;
        }
        
        // Set canvas size
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Draw image
        this.context.clearRect(0, 0, width, height);
        this.context.drawImage(img, 0, 0, width, height);
        
        // Return data URL
        return this.canvas.toDataURL('image/jpeg', this.config.compressionQuality);
    }

    /**
     * Analyzes image using AI service
     * @param {Object} processedFile - File object
     * @returns {Promise<Object>} Analysis results
     * @private
     */
    async _analyzeImage(processedFile) {
        if (!this.apiService) {
            throw new Error('API service not available for image analysis');
        }
        
        // Prepare image for analysis
        const analysisPrompt = `Please analyze this image and provide:
1. A detailed description of what you see
2. Any text content if present (OCR)
3. Notable objects, people, or scenes
4. Artistic style or technical details if relevant
5. Any potential use cases or context`;
        
        // Note: This is a placeholder implementation
        // In reality, you'd need to send the image to Claude's vision API
        // or another image analysis service
        
        const analysisResult = {
            description: 'Image analysis would require Claude Vision API or similar service',
            objects: [],
            text: '',
            colors: [],
            style: '',
            confidence: 0,
            timestamp: Date.now()
        };
        
        return analysisResult;
    }

    /**
     * Determines if image should be analyzed
     * @param {Object} processedFile - File object
     * @returns {boolean} Whether to analyze
     * @private
     */
    _shouldAnalyzeImage(processedFile) {
        // Don't analyze very large images or SVGs
        if (processedFile.size > 10 * 1024 * 1024 || processedFile.mimeType === 'image/svg+xml') {
            return false;
        }
        
        // Check user preferences
        return this.stateManager.get('userPreferences.enableImageAnalysis') !== false;
    }

    /**
     * Validates uploaded files
     * @param {File[]} files - Files to validate
     * @returns {File[]} Valid files
     * @private
     */
    _validateFiles(files) {
        const validFiles = [];
        const errors = [];
        
        for (const file of files) {
            // Check file count limit
            if (validFiles.length >= this.config.maxFiles) {
                errors.push(`Maximum ${this.config.maxFiles} files allowed`);
                break;
            }
            
            // Check file size
            if (file.size > this.config.maxFileSize) {
                errors.push(`${file.name} is too large (max ${this._formatFileSize(this.config.maxFileSize)})`);
                continue;
            }
            
            // Check file type
            if (!this._isFileTypeAllowed(file.type)) {
                errors.push(`${file.name} file type not supported`);
                continue;
            }
            
            validFiles.push(file);
        }
        
        // Show errors if any
        if (errors.length > 0 && this.notificationSystem) {
            errors.forEach(error => {
                this.notificationSystem.showWarning(error);
            });
        }
        
        return validFiles;
    }

    /**
     * Checks if file type is allowed
     * @param {string} mimeType - MIME type to check
     * @returns {boolean} Whether type is allowed
     * @private
     */
    _isFileTypeAllowed(mimeType) {
        const allAllowedTypes = Object.values(this.config.allowedTypes).flat();
        return allAllowedTypes.includes(mimeType);
    }

    /**
     * Gets file type category
     * @param {string} mimeType - MIME type
     * @returns {string} File type category
     * @private
     */
    _getFileType(mimeType) {
        for (const [category, types] of Object.entries(this.config.allowedTypes)) {
            if (types.includes(mimeType)) {
                return category.slice(0, -1); // Remove 's' from plural
            }
        }
        return 'other';
    }

    /**
     * Gets accept attribute for file input
     * @param {Object} allowedTypes - Allowed MIME types
     * @returns {string} Accept attribute value
     * @private
     */
    _getAcceptTypes(allowedTypes) {
        return Object.values(allowedTypes).flat().join(',');
    }

    /**
     * Reads file as data URL
     * @param {File} file - File to read
     * @returns {Promise<string>} Data URL
     * @private
     */
    _readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Reads file as text
     * @param {File} file - File to read
     * @returns {Promise<string>} Text content
     * @private
     */
    _readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Stores processed file
     * @param {Object} processedFile - File to store
     * @private
     */
    _storeFile(processedFile) {
        this.uploadedFiles.set(processedFile.id, processedFile);
        
        // Cleanup old files if limit exceeded
        if (this.uploadedFiles.size > this.maxStoredFiles) {
            const oldestKey = this.uploadedFiles.keys().next().value;
            this.uploadedFiles.delete(oldestKey);
        }
    }

    /**
     * Formats file size for display
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     * @private
     */
    _formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    /**
     * Generates unique file ID
     * @returns {string} File ID
     * @private
     */
    _generateFileId() {
        return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Prevents default drag behaviors
     * @param {Event} e - Event object
     * @private
     */
    _preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Handles drag enter events
     * @param {Event} e - Event object
     * @private
     */
    _handleDragEnter(e) {
        this.dragCounter++;
        if (!this.isDragging) {
            this.isDragging = true;
            document.body.classList.add('dragging-files');
        }
    }

    /**
     * Handles drag leave events
     * @param {Event} e - Event object
     * @private
     */
    _handleDragLeave(e) {
        this.dragCounter--;
        if (this.dragCounter === 0) {
            this.isDragging = false;
            document.body.classList.remove('dragging-files');
        }
    }

    /**
     * Handles file drop events
     * @param {Event} e - Event object
     * @private
     */
    _handleDrop(e) {
        this.dragCounter = 0;
        this.isDragging = false;
        document.body.classList.remove('dragging-files');
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            this.handleFiles(files);
        }
    }

    /**
     * Gets uploaded file by ID
     * @param {string} fileId - File ID
     * @returns {Object|null} File object or null
     */
    getFile(fileId) {
        return this.uploadedFiles.get(fileId) || null;
    }

    /**
     * Gets all uploaded files
     * @returns {Object[]} Array of file objects
     */
    getAllFiles() {
        return Array.from(this.uploadedFiles.values());
    }

    /**
     * Removes file by ID
     * @param {string} fileId - File ID
     * @returns {boolean} Whether file was removed
     */
    removeFile(fileId) {
        return this.uploadedFiles.delete(fileId);
    }

    /**
     * Clears all uploaded files
     */
    clearAllFiles() {
        this.uploadedFiles.clear();
    }

    /**
     * Gets upload statistics
     * @returns {Object} Upload statistics
     */
    getStatistics() {
        const files = this.getAllFiles();
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const typeCount = {};
        
        files.forEach(file => {
            typeCount[file.type] = (typeCount[file.type] || 0) + 1;
        });
        
        return {
            totalFiles: files.length,
            totalSize: totalSize,
            averageSize: files.length > 0 ? totalSize / files.length : 0,
            typeDistribution: typeCount,
            imagesWithAnalysis: files.filter(f => f.type === 'image' && f.analysis).length
        };
    }

    /**
     * Creates file preview element
     * @param {Object} file - File object
     * @returns {HTMLElement} Preview element
     */
    createFilePreview(file) {
        const preview = this.utils.createElement('div', {
            className: `file-preview file-type-${file.type}`,
            dataset: { fileId: file.id }
        });
        
        let content = '';
        
        if (file.type === 'image' && file.thumbnail) {
            content = `
                <div class="preview-image">
                    <img src="${file.thumbnail}" alt="${file.name}" />
                </div>
            `;
        } else {
            const icon = this._getFileIcon(file.type);
            content = `
                <div class="preview-icon">
                    ${icon}
                </div>
            `;
        }
        
        content += `
            <div class="preview-info">
                <div class="file-name" title="${file.name}">${this.utils.truncate(file.name, 30)}</div>
                <div class="file-size">${this._formatFileSize(file.size)}</div>
                ${file.analysis ? '<div class="file-analyzed">🔍 Analyzed</div>' : ''}
            </div>
            <div class="preview-actions">
                <button class="btn btn-xs btn-ghost" data-action="view" title="View details">👁️</button>
                <button class="btn btn-xs btn-ghost" data-action="remove" title="Remove">🗑️</button>
            </div>
        `;
        
        preview.innerHTML = content;
        
        // Add event listeners
        preview.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action === 'view') {
                this._showFileDetails(file);
            } else if (action === 'remove') {
                this.removeFile(file.id);
                preview.remove();
            }
        });
        
        return preview;
    }

    /**
     * Gets file icon for type
     * @param {string} type - File type
     * @returns {string} Icon HTML
     * @private
     */
    _getFileIcon(type) {
        const icons = {
            image: '🖼️',
            document: '📄',
            data: '📊',
            archive: '📦',
            office: '📋'
        };
        return icons[type] || '📁';
    }

    /**
     * Shows file details modal
     * @param {Object} file - File object
     * @private
     */
    _showFileDetails(file) {
        const modal = this.utils.createElement('div', {
            className: 'modal-overlay file-details-modal',
            innerHTML: `
                <div class="modal">
                    <div class="modal-header">
                        <h3>File Details</h3>
                        <button class="modal-close">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="file-details">
                            <h4>${file.name}</h4>
                            <p><strong>Type:</strong> ${file.mimeType}</p>
                            <p><strong>Size:</strong> ${this._formatFileSize(file.size)}</p>
                            <p><strong>Uploaded:</strong> ${new Date(file.uploadDate).toLocaleString()}</p>
                            
                            ${file.type === 'image' && file.metadata ? `
                                <h5>Image Details</h5>
                                <p><strong>Dimensions:</strong> ${file.metadata.width} × ${file.metadata.height}</p>
                                <p><strong>Aspect Ratio:</strong> ${file.metadata.aspectRatio.toFixed(2)}</p>
                            ` : ''}
                            
                            ${file.analysis ? `
                                <h5>AI Analysis</h5>
                                <p>${file.analysis.description || 'Analysis completed'}</p>
                            ` : ''}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-action="close">Close</button>
                    </div>
                </div>
            `
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close') || 
                e.target.dataset.action === 'close' ||
                e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }

    /**
     * Destroys the file upload manager
     */
    destroy() {
        this.clearAllFiles();
        
        // Remove global event listeners
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.removeEventListener(eventName, this._preventDefaults);
        });
        
        console.log('📁 FileUploadManager destroyed.');
    }
}

// Global instance creation pattern
if (typeof window !== 'undefined') {
    window.FileUploadManager = FileUploadManager;
}