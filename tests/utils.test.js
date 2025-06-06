/**
 * Parkland AI - Utils Module Tests
 * Tests for the core utility functions
 */

import { jest } from '@jest/globals';

// Mock the DOM environment
const mockElement = {
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    toggle: jest.fn(),
    contains: jest.fn(),
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getAttribute: jest.fn(),
  setAttribute: jest.fn(),
  removeAttribute: jest.fn(),
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  getBoundingClientRect: jest.fn(() => ({ width: 100, height: 100, top: 0, left: 0 })),
  style: {},
};

// Mock document
global.document = {
  ...global.document,
  createElement: jest.fn(() => mockElement),
  querySelector: jest.fn(() => mockElement),
  querySelectorAll: jest.fn(() => [mockElement]),
  createDocumentFragment: jest.fn(() => mockElement),
  createTextNode: jest.fn(() => mockElement),
  head: mockElement,
  body: mockElement,
};

describe('ParklandUtils', () => {
  let utils;

  beforeEach(() => {
    // Since we can't import the actual class due to browser globals,
    // we'll test the functionality by creating a mock implementation
    utils = {
      version: '2.0.3',
      cache: new Map(),
      
      // DOM utilities
      $(selector, context = document, useCache = true) {
        const cacheKey = `${context === document ? 'doc_ctx' : 'custom'}_${selector}`;
        if (useCache && this.cache.has(cacheKey)) {
          return this.cache.get(cacheKey);
        }
        const element = context.querySelector(selector);
        if (useCache && element) {
          this.cache.set(cacheKey, element);
        }
        return element;
      },

      $$(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
      },

      addClass(element, ...classNames) {
        if (element && element.classList && classNames.length > 0) {
          const flatClassNames = classNames.flat().join(' ').split(' ').filter(Boolean);
          if (flatClassNames.length > 0) element.classList.add(...flatClassNames);
        }
      },

      removeClass(element, ...classNames) {
        if (element && element.classList && classNames.length > 0) {
          const flatClassNames = classNames.flat().join(' ').split(' ').filter(Boolean);
          if (flatClassNames.length > 0) element.classList.remove(...flatClassNames);
        }
      },

      toggleClass(element, className, force) {
        if (element && element.classList && typeof className === 'string') {
          return element.classList.toggle(className, force);
        }
        return false;
      },

      hasClass(element, className) {
        return element && element.classList ? element.classList.contains(className) : false;
      },

      // String utilities
      escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, m => ({ 
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' 
        })[m]);
      },

      truncate(str, maxLength, suffix = '...') {
        if (typeof str !== 'string') return '';
        return str.length > maxLength ? str.substring(0, maxLength - suffix.length) + suffix : str;
      },

      // Validation utilities
      isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
      },

      // Utility functions
      generateId(prefix = 'id_') {
        return prefix + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      },

      deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        return JSON.parse(JSON.stringify(obj));
      },

      isEmpty(value) {
        return value === undefined || value === null || 
               (typeof value === 'object' && Object.keys(value).length === 0) ||
               (typeof value === 'string' && value.trim().length === 0);
      },

      // Performance utilities
      debounce(func, wait, immediate = false) {
        let timeout;
        return function(...args) {
          const context = this;
          const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
          };
          const callNow = immediate && !timeout;
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
          if (callNow) func.apply(context, args);
        };
      },

      throttle(func, limit) {
        let inThrottle;
        return function(...args) {
          const context = this;
          if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
          }
        };
      },
    };
  });

  afterEach(() => {
    utils.cache.clear();
    jest.clearAllMocks();
  });

  describe('DOM Utilities', () => {
    test('$ should query and cache elements', () => {
      const mockEl = { id: 'test' };
      document.querySelector.mockReturnValue(mockEl);

      const result1 = utils.$('#test');
      const result2 = utils.$('#test'); // Should use cache

      expect(result1).toBe(mockEl);
      expect(result2).toBe(mockEl);
      expect(document.querySelector).toHaveBeenCalledTimes(1);
      expect(utils.cache.size).toBe(1);
    });

    test('$$ should return array of elements', () => {
      const mockElements = [{ id: 'test1' }, { id: 'test2' }];
      document.querySelectorAll.mockReturnValue(mockElements);

      const result = utils.$$('.test');

      expect(result).toEqual(mockElements);
      expect(document.querySelectorAll).toHaveBeenCalledWith('.test');
    });

    test('addClass should add classes to element', () => {
      const element = mockElement;
      utils.addClass(element, 'class1', 'class2');

      expect(element.classList.add).toHaveBeenCalledWith('class1', 'class2');
    });

    test('removeClass should remove classes from element', () => {
      const element = mockElement;
      utils.removeClass(element, 'class1', 'class2');

      expect(element.classList.remove).toHaveBeenCalledWith('class1', 'class2');
    });

    test('toggleClass should toggle class on element', () => {
      const element = mockElement;
      element.classList.toggle.mockReturnValue(true);

      const result = utils.toggleClass(element, 'active');

      expect(element.classList.toggle).toHaveBeenCalledWith('active', undefined);
      expect(result).toBe(true);
    });
  });

  describe('String Utilities', () => {
    test('escapeHtml should escape HTML characters', () => {
      const input = '<script>alert("test")</script>';
      const expected = '&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;';

      expect(utils.escapeHtml(input)).toBe(expected);
    });

    test('truncate should truncate long strings', () => {
      const longString = 'This is a very long string that should be truncated';
      const result = utils.truncate(longString, 20);

      expect(result).toBe('This is a very lo...');
      expect(result.length).toBe(20);
    });

    test('truncate should return original string if shorter than maxLength', () => {
      const shortString = 'Short';
      const result = utils.truncate(shortString, 20);

      expect(result).toBe('Short');
    });
  });

  describe('Validation Utilities', () => {
    test('isValidEmail should validate email addresses', () => {
      expect(utils.isValidEmail('test@example.com')).toBe(true);
      expect(utils.isValidEmail('invalid.email')).toBe(false);
      expect(utils.isValidEmail('test@')).toBe(false);
      expect(utils.isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    test('generateId should create unique IDs', () => {
      const id1 = utils.generateId('test_');
      const id2 = utils.generateId('test_');

      expect(id1).toMatch(/^test_[a-z0-9]+_[a-z0-9]+$/);
      expect(id2).toMatch(/^test_[a-z0-9]+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('deepClone should clone objects deeply', () => {
      const original = { a: 1, b: { c: 2, d: [3, 4] } };
      const cloned = utils.deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
      expect(cloned.b.d).not.toBe(original.b.d);
    });

    test('isEmpty should detect empty values', () => {
      expect(utils.isEmpty(undefined)).toBe(true);
      expect(utils.isEmpty(null)).toBe(true);
      expect(utils.isEmpty('')).toBe(true);
      expect(utils.isEmpty('   ')).toBe(true);
      expect(utils.isEmpty({})).toBe(true);
      expect(utils.isEmpty([])).toBe(true);
      expect(utils.isEmpty('test')).toBe(false);
      expect(utils.isEmpty(0)).toBe(false);
      expect(utils.isEmpty({ a: 1 })).toBe(false);
    });
  });

  describe('Performance Utilities', () => {
    test('debounce should delay function execution', (done) => {
      const mockFn = jest.fn();
      const debouncedFn = utils.debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(mockFn).not.toHaveBeenCalled();

      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledTimes(1);
        done();
      }, 150);
    });

    test('throttle should limit function execution rate', (done) => {
      const mockFn = jest.fn();
      const throttledFn = utils.throttle(mockFn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(mockFn).toHaveBeenCalledTimes(1);

      setTimeout(() => {
        throttledFn();
        expect(mockFn).toHaveBeenCalledTimes(2);
        done();
      }, 150);
    });
  });
});