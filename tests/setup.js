/**
 * Parkland AI - Test Environment Setup
 * Configures Jest environment with DOM and custom matchers
 */

import '@testing-library/jest-dom';

// Mock Web APIs that may not be available in JSDOM
global.speechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn(() => []),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

global.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
  text,
  voice: null,
  volume: 1,
  rate: 1,
  pitch: 1,
  lang: 'en-US',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

global.webkitSpeechRecognition = jest.fn().mockImplementation(() => ({
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

global.SpeechRecognition = global.webkitSpeechRecognition;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
global.sessionStorage = localStorageMock;

// Mock navigator
Object.defineProperty(global.navigator, 'clipboard', {
  value: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('')),
  },
  writable: true,
});

// Mock Web Workers
global.Worker = jest.fn().mockImplementation((scriptURL) => ({
  postMessage: jest.fn(),
  terminate: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onmessage: null,
  onerror: null,
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// Custom Jest matchers for our application
expect.extend({
  toBeInViewport(received) {
    const rect = received.getBoundingClientRect();
    const isInViewport = 
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth;

    return {
      message: () => 
        `expected element ${isInViewport ? 'not ' : ''}to be in viewport`,
      pass: isInViewport,
    };
  },

  toHaveValidAccessibility(received) {
    const hasAriaLabel = received.hasAttribute('aria-label');
    const hasAriaLabelledBy = received.hasAttribute('aria-labelledby');
    const hasAriaDescribedBy = received.hasAttribute('aria-describedby');
    const hasRole = received.hasAttribute('role');
    const isAccessible = hasAriaLabel || hasAriaLabelledBy || hasAriaDescribedBy || hasRole;

    return {
      message: () => 
        `expected element ${isAccessible ? 'not ' : ''}to have valid accessibility attributes`,
      pass: isAccessible,
    };
  },

  toBeThemed(received, expectedTheme) {
    const dataTheme = received.dataset.theme || document.body.dataset.theme;
    const isCorrectTheme = dataTheme === expectedTheme;

    return {
      message: () => 
        `expected element to have theme "${expectedTheme}" but got "${dataTheme}"`,
      pass: isCorrectTheme,
    };
  },
});

// Global test utilities
global.TestUtils = {
  // Simulate user typing
  typeText: async (element, text, delay = 50) => {
    element.focus();
    for (const char of text) {
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    element.dispatchEvent(new Event('change', { bubbles: true }));
  },

  // Wait for animations to complete
  waitForAnimation: (duration = 500) => {
    return new Promise(resolve => setTimeout(resolve, duration));
  },

  // Mock API response
  mockAPIResponse: (data, status = 200, ok = true) => {
    global.fetch.mockResolvedValueOnce({
      ok,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    });
  },

  // Create mock state manager
  createMockStateManager: () => ({
    get: jest.fn(),
    set: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    emit: jest.fn(),
    saveState: jest.fn(),
    setTheme: jest.fn(),
    setActiveCharacter: jest.fn(),
    addMessageToHistory: jest.fn(),
    clearChatHistory: jest.fn(),
    toggleSidebar: jest.fn(),
    setModalOpen: jest.fn(),
    setApiKey: jest.fn(),
    setUserPreference: jest.fn(),
    logState: jest.fn(),
    enableDebugging: jest.fn(),
  }),

  // Create mock utils instance
  createMockUtils: () => ({
    $: jest.fn(),
    $$: jest.fn(),
    createElement: jest.fn(),
    addClass: jest.fn(),
    removeClass: jest.fn(),
    toggleClass: jest.fn(),
    hasClass: jest.fn(),
    getStyle: jest.fn(),
    setStyles: jest.fn(),
    animate: jest.fn(() => Promise.resolve()),
    fadeIn: jest.fn(() => Promise.resolve()),
    fadeOut: jest.fn(() => Promise.resolve()),
    slideDown: jest.fn(() => Promise.resolve()),
    slideUp: jest.fn(() => Promise.resolve()),
    shake: jest.fn(() => Promise.resolve()),
    debounce: jest.fn((fn) => fn),
    throttle: jest.fn((fn) => fn),
    escapeHtml: jest.fn((text) => text),
    truncate: jest.fn((text, length) => text.substring(0, length)),
    generateId: jest.fn(() => 'mock-id-123'),
    deepClone: jest.fn((obj) => JSON.parse(JSON.stringify(obj))),
    wait: jest.fn((ms) => Promise.resolve()),
  }),
};

// Console debugging for tests
beforeEach(() => {
  jest.clearAllMocks();
  // Reset localStorage before each test
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

afterEach(() => {
  // Clean up any remaining timers
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});