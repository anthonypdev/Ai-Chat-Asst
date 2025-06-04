/**
 * Parkland AI - Opus Magnum Edition
 * Core Utility Functions
 *
 * Comprehensive utility library for DOM manipulation, animations, audio,
 * performance optimization, and theme-specific functionality
 */

class ParklandUtils {
    constructor() {
        this.version = '2.0.0';
        this.cache = new Map();
        this.animationFrameCallbacks = new Set();
        this.isAnimating = false;

        // Initialize performance monitoring
        this.performanceMetrics = {
            frameCount: 0,
            lastFrameTime: performance.now(),
            averageFPS: 60
        };

        this.init();
    }

    init() {
        this.setupPerformanceMonitoring();
        this.setupGlobalErrorHandling();
        console.log('🛠️ ParklandUtils initialized');
    }

    // ===========================================
    // DOM UTILITIES
    // ===========================================

    /**
     * Enhanced query selector with caching
     */
    $(selector, context = document, useCache = true) {
        const cacheKey = `${selector}_${context === document ? 'doc' : 'ctx'}`;

        if (useCache && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const element = context.querySelector(selector);

        if (useCache && element) {
            this.cache.set(cacheKey, element);
        }

        return element;
    }

    /**
     * Query all with enhanced features
     */
    $$(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    }

    /**
     * Create element with attributes and children
     */
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);

        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, value);
            } else if (key.startsWith('aria-')) {
                element.setAttribute(key, value);
            } else {
                element[key] = value;
            }
        });

        // Add children
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });

        return element;
    }

    /**
     * Add class with animation support
     */
    addClass(element, className, animated = false) {
        if (!element) return;

        if (animated) {
            element.style.transition = 'all 0.3s ease';
            requestAnimationFrame(() => {
                element.classList.add(className);
            });
        } else {
            element.classList.add(className);
        }
    }

    /**
     * Remove class with animation support
     */
    removeClass(element, className, animated = false) {
        if (!element) return;

        if (animated) {
            element.addEventListener('transitionend', function handler() {
                element.removeEventListener('transitionend', handler);
                element.style.transition = '';
            });
        }

        element.classList.remove(className);
    }

    /**
     * Toggle class with enhanced options
     */
    toggleClass(element, className, force = null, animated = false) {
        if (!element) return;

        const hasClass = element.classList.contains(className);
        const shouldAdd = force !== null ? force : !hasClass;

        if (shouldAdd && !hasClass) {
            this.addClass(element, className, animated);
        } else if (!shouldAdd && hasClass) {
            this.removeClass(element, className, animated);
        }

        return shouldAdd;
    }

    /**
     * Get computed style property
     */
    getStyle(element, property) {
        if (!element) return null;
        return window.getComputedStyle(element).getPropertyValue(property);
    }

    /**
     * Set multiple CSS properties
     */
    setStyles(element, styles) {
        if (!element || !styles) return;

        Object.entries(styles).forEach(([property, value]) => {
            element.style[property] = value;
        });
    }

    /**
     * Get element dimensions and position
     */
    getElementMetrics(element) {
        if (!element) return null;

        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);

        return {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2,
            marginTop: parseInt(computedStyle.marginTop, 10),
            marginLeft: parseInt(computedStyle.marginLeft, 10),
            marginBottom: parseInt(computedStyle.marginBottom, 10),
            marginRight: parseInt(computedStyle.marginRight, 10)
        };
    }

    /**
     * Smooth scroll to element
     */
    scrollToElement(element, options = {}) {
        if (!element) return;

        const {
            behavior = 'smooth',
            block = 'nearest',
            inline = 'nearest',
            offset = 0
        } = options;

        const elementTop = element.offsetTop - offset;

        if (behavior === 'smooth') {
            element.scrollIntoView({ behavior, block, inline });
        } else {
            window.scrollTo(0, elementTop);
        }
    }

    // ===========================================
    // ANIMATION UTILITIES
    // ===========================================

    /**
     * Request animation frame with fallback
     */
    requestFrame(callback) {
        const frameId = requestAnimationFrame(callback);
        this.animationFrameCallbacks.add(frameId);
        return frameId;
    }

    /**
     * Cancel animation frame
     */
    cancelFrame(frameId) {
        cancelAnimationFrame(frameId);
        this.animationFrameCallbacks.delete(frameId);
    }

    /**
     * Animate element with CSS transitions
     */
    animate(element, properties, options = {}) {
        return new Promise((resolve) => {
            if (!element) {
                resolve();
                return;
            }

            const {
                duration = 300,
                easing = 'ease',
                delay = 0
            } = options;

            // Set transition
            element.style.transition = `all ${duration}ms ${easing} ${delay}ms`;

            // Apply properties
            Object.entries(properties).forEach(([prop, value]) => {
                element.style[prop] = value;
            });

            // Clean up after animation
            const cleanup = () => {
                element.removeEventListener('transitionend', cleanup);
                element.style.transition = '';
                resolve();
            };

            element.addEventListener('transitionend', cleanup);

            // Fallback timeout
            setTimeout(cleanup, duration + delay + 50);
        });
    }

    /**
     * Fade in element
     */
    fadeIn(element, duration = 300) {
        if (!element) return Promise.resolve();

        element.style.opacity = '0';
        element.style.display = 'block';

        return this.animate(element, { opacity: '1' }, { duration });
    }

    /**
     * Fade out element
     */
    fadeOut(element, duration = 300) {
        if (!element) return Promise.resolve();

        return this.animate(element, { opacity: '0' }, { duration })
            .then(() => {
                element.style.display = 'none';
            });
    }

    /**
     * Slide down element
     */
    slideDown(element, duration = 300) {
        if (!element) return Promise.resolve();

        element.style.height = '0';
        element.style.overflow = 'hidden';
        element.style.display = 'block';

        const targetHeight = element.scrollHeight + 'px';

        return this.animate(element, { height: targetHeight }, { duration })
            .then(() => {
                element.style.height = '';
                element.style.overflow = '';
            });
    }

    /**
     * Slide up element
     */
    slideUp(element, duration = 300) {
        if (!element) return Promise.resolve();

        const currentHeight = element.offsetHeight + 'px';
        element.style.height = currentHeight;
        element.style.overflow = 'hidden';

        return this.animate(element, { height: '0' }, { duration })
            .then(() => {
                element.style.display = 'none';
                element.style.height = '';
                element.style.overflow = '';
            });
    }

    /**
     * Shake animation
     */
    shake(element, intensity = 10, duration = 500) {
        if (!element) return Promise.resolve();

        const originalTransform = element.style.transform;
        const steps = 10;
        const stepDuration = duration / steps;

        return new Promise((resolve) => {
            let step = 0;
            const animate = () => {
                if (step >= steps) {
                    element.style.transform = originalTransform;
                    resolve();
                    return;
                }

                const offset = Math.sin(step * 0.5) * intensity * (1 - step / steps);
                element.style.transform = `${originalTransform} translateX(${offset}px)`;

                step++;
                setTimeout(animate, stepDuration);
            };

            animate();
        });
    }

    /**
     * Pulse animation
     */
    pulse(element, scale = 1.1, duration = 300) {
        if (!element) return Promise.resolve();

        const originalTransform = element.style.transform;

        return this.animate(element, { transform: `${originalTransform} scale(${scale})` }, { duration: duration / 2 })
            .then(() => this.animate(element, { transform: originalTransform }, { duration: duration / 2 }));
    }

    /**
     * Performance-optimized animation loop
     */
    startAnimationLoop(callback) {
        if (this.isAnimating) return;

        this.isAnimating = true;

        const loop = (timestamp) => {
            if (!this.isAnimating) return;

            // Update performance metrics
            this.updatePerformanceMetrics(timestamp);

            // Execute callback
            if (callback) callback(timestamp);

            // Continue loop
            this.requestFrame(loop);
        };

        this.requestFrame(loop);
    }

    /**
     * Stop animation loop
     */
    stopAnimationLoop() {
        this.isAnimating = false;
        this.animationFrameCallbacks.forEach(frameId => {
            this.cancelFrame(frameId);
        });
        this.animationFrameCallbacks.clear();
    }

    // ===========================================
    // AUDIO UTILITIES
    // ===========================================

    /**
     * Create audio context with fallbacks
     */
    createAudioContext() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        return AudioContext ? new AudioContext() : null;
    }

    /**
     * Play sound with volume and fade options
     */
    playSound(audioElement, options = {}) {
        if (!audioElement) return Promise.resolve();

        const {
            volume = 1,
            fadeIn = false,
            fadeInDuration = 300,
            loop = false
        } = options;

        return new Promise((resolve, reject) => {
            audioElement.loop = loop;

            if (fadeIn) {
                audioElement.volume = 0;
                audioElement.play()
                    .then(() => {
                        this.fadeAudioIn(audioElement, volume, fadeInDuration);
                        resolve();
                    })
                    .catch(reject);
            } else {
                audioElement.volume = volume;
                audioElement.play()
                    .then(resolve)
                    .catch(reject);
            }
        });
    }

    /**
     * Stop sound with fade out option
     */
    stopSound(audioElement, options = {}) {
        if (!audioElement) return Promise.resolve();

        const {
            fadeOut = false,
            fadeOutDuration = 300
        } = options;

        if (fadeOut) {
            return this.fadeAudioOut(audioElement, fadeOutDuration)
                .then(() => {
                    audioElement.pause();
                    audioElement.currentTime = 0;
                });
        } else {
            audioElement.pause();
            audioElement.currentTime = 0;
            return Promise.resolve();
        }
    }

    /**
     * Fade audio in
     */
    fadeAudioIn(audioElement, targetVolume, duration) {
        if (!audioElement) return Promise.resolve();

        const steps = 60;
        const stepDuration = duration / steps;
        const volumeStep = targetVolume / steps;

        return new Promise((resolve) => {
            let currentStep = 0;
            const fade = () => {
                if (currentStep >= steps) {
                    audioElement.volume = targetVolume;
                    resolve();
                    return;
                }

                audioElement.volume = currentStep * volumeStep;
                currentStep++;
                setTimeout(fade, stepDuration);
            };

            fade();
        });
    }

    /**
     * Fade audio out
     */
    fadeAudioOut(audioElement, duration) {
        if (!audioElement) return Promise.resolve();

        const startVolume = audioElement.volume;
        const steps = 60;
        const stepDuration = duration / steps;
        const volumeStep = startVolume / steps;

        return new Promise((resolve) => {
            let currentStep = 0;
            const fade = () => {
                if (currentStep >= steps) {
                    audioElement.volume = 0;
                    resolve();
                    return;
                }

                audioElement.volume = startVolume - (currentStep * volumeStep);
                currentStep++;
                setTimeout(fade, stepDuration);
            };

            fade();
        });
    }

    // ===========================================
    // STRING UTILITIES
    // ===========================================

    /**
     * Escape HTML entities
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Strip HTML tags
     */
    stripHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    /**
     * Truncate text with ellipsis
     */
    truncate(text, length, ellipsis = '...') {
        if (!text || text.length <= length) return text;
        return text.substring(0, length - ellipsis.length) + ellipsis;
    }

    /**
     * Slugify string for URLs
     */
    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * Capitalize first letter
     */
    capitalize(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    /**
     * Convert camelCase to kebab-case
     */
    camelToKebab(text) {
        return text.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    }

    /**
     * Convert kebab-case to camelCase
     */
    kebabToCamel(text) {
        return text.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }

    // ===========================================
    // VALIDATION UTILITIES
    // ===========================================

    /**
     * Validate email address
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate URL
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate API key format (Anthropic)
     */
    isValidApiKey(key) {
        if (!key || typeof key !== 'string') return false;
        return key.startsWith('sk-ant-') && key.length > 20;
    }

    /**
     * Sanitize input for XSS prevention
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;

        return input
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .trim();
    }

    // ===========================================
    // DATE/TIME UTILITIES
    // ===========================================

    /**
     * Format date relative to now
     */
    formatRelativeTime(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;

        return new Date(date).toLocaleDateString();
    }

    /**
     * Format duration in milliseconds
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        }
        return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }

    /**
     * Get timestamp for logging
     */
    getTimestamp() {
        return new Date().toISOString();
    }

    // ===========================================
    // PERFORMANCE UTILITIES
    // ===========================================

    /**
     * Debounce function calls
     */
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    }

    /**
     * Throttle function calls
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Measure function execution time
     */
    measurePerformance(func, name = 'operation') {
        return function (...args) {
            const start = performance.now();
            const result = func.apply(this, args);
            const end = performance.now();
            console.log(`${name} took ${end - start} milliseconds`);
            return result;
        };
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        const measureFPS = () => {
            this.performanceMetrics.frameCount++;
            const currentTime = performance.now();
            const deltaTime = currentTime - this.performanceMetrics.lastFrameTime;

            if (deltaTime >= 1000) {
                const fps = Math.round((this.performanceMetrics.frameCount * 1000) / deltaTime);
                this.performanceMetrics.averageFPS = (this.performanceMetrics.averageFPS * 0.9) + (fps * 0.1);
                this.performanceMetrics.frameCount = 0;
                this.performanceMetrics.lastFrameTime = currentTime;
            }

            requestAnimationFrame(measureFPS);
        };

        requestAnimationFrame(measureFPS);
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(timestamp) {
        this.performanceMetrics.frameCount++;

        if (timestamp - this.performanceMetrics.lastFrameTime >= 1000) {
            const fps = Math.round((this.performanceMetrics.frameCount * 1000) / (timestamp - this.performanceMetrics.lastFrameTime));
            this.performanceMetrics.averageFPS = fps;
            this.performanceMetrics.frameCount = 0;
            this.performanceMetrics.lastFrameTime = timestamp;
        }
    }

    /**
     * Get current FPS
     */
    getCurrentFPS() {
        return Math.round(this.performanceMetrics.averageFPS);
    }

    // ===========================================
    // COLOR UTILITIES
    // ===========================================

    /**
     * Convert hex to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * Convert RGB to hex
     */
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    /**
     * Lighten color by percentage
     */
    lightenColor(color, percent) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;

        const factor = 1 + (percent / 100);
        const newR = Math.min(255, Math.round(rgb.r * factor));
        const newG = Math.min(255, Math.round(rgb.g * factor));
        const newB = Math.min(255, Math.round(rgb.b * factor));

        return this.rgbToHex(newR, newG, newB);
    }

    /**
     * Darken color by percentage
     */
    darkenColor(color, percent) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;

        const factor = 1 - (percent / 100);
        const newR = Math.max(0, Math.round(rgb.r * factor));
        const newG = Math.max(0, Math.round(rgb.g * factor));
        const newB = Math.max(0, Math.round(rgb.b * factor));

        return this.rgbToHex(newR, newG, newB);
    }

    // ===========================================
    // DEVICE UTILITIES
    // ===========================================

    /**
     * Detect device type
     */
    getDeviceType() {
        const width = window.innerWidth;

        if (width < 768) return 'mobile';
        if (width < 1024) return 'tablet';
        return 'desktop';
    }

    /**
     * Detect if device supports touch
     */
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /**
     * Detect if device is in landscape mode
     */
    isLandscape() {
        return window.innerWidth > window.innerHeight;
    }

    /**
     * Get viewport dimensions
     */
    getViewportSize() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    // ===========================================
    // STORAGE UTILITIES
    // ===========================================

    /**
     * Safe localStorage operations
     */
    setStorageItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('Storage set failed:', error);
            return false;
        }
    }

    /**
     * Safe localStorage retrieval
     */
    getStorageItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Storage get failed:', error);
            return defaultValue;
        }
    }

    /**
     * Remove storage item safely
     */
    removeStorageItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Storage remove failed:', error);
            return false;
        }
    }

    /**
     * Clear storage with prefix
     */
    clearStoragePrefix(prefix) {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.warn('Storage clear failed:', error);
            return false;
        }
    }

    // ===========================================
    // ERROR HANDLING
    // ===========================================

    /**
     * Setup global error handling
     */
    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
        });
    }

    /**
     * Safe function execution with error handling
     */
    safeExecute(func, context = null, ...args) {
        try {
            return func.apply(context, args);
        } catch (error) {
            console.error('Safe execute failed:', error);
            return null;
        }
    }

    /**
     * Async safe execution
     */
    async safeExecuteAsync(func, context = null, ...args) {
        try {
            return await func.apply(context, args);
        } catch (error) {
            console.error('Async safe execute failed:', error);
            return null;
        }
    }

    // ===========================================
    // UTILITY HELPERS
    // ===========================================

    /**
     * Generate unique ID
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Deep clone object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            Object.keys(obj).forEach(key => {
                clonedObj[key] = this.deepClone(obj[key]);
            });
            return clonedObj;
        }
    }

    /**
     * Deep merge objects
     */
    deepMerge(target, source) {
        const result = { ...target };

        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        });

        return result;
    }

    /**
     * Check if object is empty
     */
    isEmpty(obj) {
        if (obj == null) return true;
        if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
        return Object.keys(obj).length === 0;
    }

    /**
     * Wait for specified time
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopAnimationLoop();
        this.cache.clear();
        console.log('🛠️ ParklandUtils destroyed');
    }
}

// Create global instance
window.ParklandUtils = ParklandUtils;
window.utils = new ParklandUtils();

console.log('🔧 Utility System loaded successfully');
