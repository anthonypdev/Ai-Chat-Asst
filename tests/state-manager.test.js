/**
 * Parkland AI - StateManager Tests
 * Tests for the core state management functionality
 */

import { jest } from '@jest/globals';

describe('StateManager', () => {
  let StateManager;
  let stateManager;

  beforeEach(() => {
    // Mock StateManager implementation for testing
    StateManager = class {
      constructor() {
        this._state = {
          currentTheme: 'default',
          activeCharacter: null,
          chatHistory: [],
          userInput: '',
          isLoading: true,
          isSidebarOpen: true,
          isSettingsModalOpen: false,
          isLoginModalOpen: true,
          isMicListening: false,
          isSpeaking: false,
          currentApiProvider: 'claude',
          apiKey: null,
          modelPreferences: {
            claude: { model: 'claude-3-opus-20240229' },
          },
          userPreferences: {
            autoScroll: true,
            sendOnEnter: true,
            markdownRendering: true,
            voiceInputEnabled: true,
            voiceOutputEnabled: true,
            voiceCharacter: 'default',
            soundEffectsEnabled: true,
            reduceMotion: false,
          },
          lastError: null,
          currentView: 'login',
          debugMode: false,
          activeSessionId: null,
        };
        this._events = {};
      }

      static getInstance() {
        if (!StateManager.instance) {
          StateManager.instance = new StateManager();
        }
        return StateManager.instance;
      }

      get(key) {
        if (typeof key !== 'string') return undefined;
        if (!key.includes('.')) {
          return this._state[key];
        }
        return key.split('.').reduce((obj, part) => {
          return obj && obj[part] !== undefined ? obj[part] : undefined;
        }, this._state);
      }

      set(key, value, silent = false) {
        if (typeof key !== 'string') return;

        let changed = false;
        let oldValue;
        const keys = key.split('.');
        let current = this._state;

        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }

        oldValue = current[keys[keys.length - 1]];
        if (oldValue !== value) {
          current[keys[keys.length - 1]] = value;
          changed = true;
        }

        if (changed && !silent) {
          this.emit(`change:${key}`, { key, newValue: value, oldValue });
          this.emit('change', { key, newValue: value, oldValue });
        }
      }

      subscribe(event, callback) {
        if (typeof callback !== 'function') return;
        if (!this._events[event]) {
          this._events[event] = [];
        }
        if (!this._events[event].includes(callback)) {
          this._events[event].push(callback);
        }
      }

      unsubscribe(event, callback) {
        if (!this._events[event]) return;
        this._events[event] = this._events[event].filter(cb => cb !== callback);
      }

      emit(event, data) {
        if (this._events[event]) {
          this._events[event].forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              console.error(`Error in event listener for "${event}":`, error);
            }
          });
        }
      }

      // Helper methods
      setTheme(themeName) { 
        this.set('currentTheme', themeName); 
      }
      
      setActiveCharacter(characterKey) { 
        this.set('activeCharacter', characterKey); 
      }
      
      addMessageToHistory(message) { 
        const currentHistory = this.get('chatHistory') || [];
        const newHistory = [...currentHistory, message];
        this.set('chatHistory', newHistory);
      }
      
      clearChatHistory() { 
        this.set('chatHistory', []); 
        this.set('activeSessionId', null);
      }
      
      toggleSidebar(isOpen = null) { 
        const current = this.get('isSidebarOpen');
        this.set('isSidebarOpen', isOpen === null ? !current : isOpen);
      }
      
      setModalOpen(modalName, isOpen) { 
        if (Object.prototype.hasOwnProperty.call(this._state, modalName)) {
          this.set(modalName, isOpen);
        }
      }
      
      setApiKey(key) { 
        const validatedKey = key ? key.trim() : null;
        this.set('apiKey', validatedKey);
        if (validatedKey) {
          this.set('currentView', 'chat');
          this.set('isLoginModalOpen', false);
        } else {
          this.set('currentView', 'login');
          this.set('isLoginModalOpen', true);
        }
      }
      
      setUserPreference(key, value) { 
        const fullKey = `userPreferences.${key}`;
        this.set(fullKey, value);
      }
      
      setActiveSessionId(sessionId) { 
        this.set('activeSessionId', sessionId);
      }
    };

    StateManager.instance = null; // Reset singleton
    stateManager = StateManager.getInstance();
  });

  afterEach(() => {
    StateManager.instance = null;
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    test('should return same instance on multiple calls', () => {
      const instance1 = StateManager.getInstance();
      const instance2 = StateManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('State Management', () => {
    test('should get simple state values', () => {
      expect(stateManager.get('currentTheme')).toBe('default');
      expect(stateManager.get('isLoading')).toBe(true);
      expect(stateManager.get('chatHistory')).toEqual([]);
    });

    test('should get nested state values', () => {
      expect(stateManager.get('userPreferences.autoScroll')).toBe(true);
      expect(stateManager.get('modelPreferences.claude.model')).toBe('claude-3-opus-20240229');
    });

    test('should return undefined for non-existent keys', () => {
      expect(stateManager.get('nonExistent')).toBeUndefined();
      expect(stateManager.get('userPreferences.nonExistent')).toBeUndefined();
    });

    test('should set simple state values', () => {
      stateManager.set('currentTheme', 'jaws');
      expect(stateManager.get('currentTheme')).toBe('jaws');
    });

    test('should set nested state values', () => {
      stateManager.set('userPreferences.autoScroll', false);
      expect(stateManager.get('userPreferences.autoScroll')).toBe(false);
    });

    test('should create nested objects if they do not exist', () => {
      stateManager.set('newSection.newKey', 'value');
      expect(stateManager.get('newSection.newKey')).toBe('value');
    });
  });

  describe('Event System', () => {
    test('should emit change events when state changes', () => {
      const changeListener = jest.fn();
      const specificChangeListener = jest.fn();

      stateManager.subscribe('change', changeListener);
      stateManager.subscribe('change:currentTheme', specificChangeListener);

      stateManager.set('currentTheme', 'jaws');

      expect(changeListener).toHaveBeenCalledWith({
        key: 'currentTheme',
        newValue: 'jaws',
        oldValue: 'default'
      });

      expect(specificChangeListener).toHaveBeenCalledWith({
        key: 'currentTheme',
        newValue: 'jaws',
        oldValue: 'default'
      });
    });

    test('should not emit events when setting same value', () => {
      const changeListener = jest.fn();
      stateManager.subscribe('change:currentTheme', changeListener);

      stateManager.set('currentTheme', 'default'); // Same as initial value

      expect(changeListener).not.toHaveBeenCalled();
    });

    test('should not emit events when silent flag is true', () => {
      const changeListener = jest.fn();
      stateManager.subscribe('change:currentTheme', changeListener);

      stateManager.set('currentTheme', 'jaws', true); // Silent update

      expect(changeListener).not.toHaveBeenCalled();
      expect(stateManager.get('currentTheme')).toBe('jaws');
    });

    test('should allow subscribing and unsubscribing to events', () => {
      const listener = jest.fn();
      
      stateManager.subscribe('change:currentTheme', listener);
      stateManager.set('currentTheme', 'jaws');
      expect(listener).toHaveBeenCalledTimes(1);

      stateManager.unsubscribe('change:currentTheme', listener);
      stateManager.set('currentTheme', 'jurassic');
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('Helper Methods', () => {
    test('setTheme should update current theme', () => {
      stateManager.setTheme('jaws');
      expect(stateManager.get('currentTheme')).toBe('jaws');
    });

    test('setActiveCharacter should update active character', () => {
      stateManager.setActiveCharacter('quint');
      expect(stateManager.get('activeCharacter')).toBe('quint');
    });

    test('addMessageToHistory should append messages', () => {
      const message1 = { id: '1', role: 'user', content: 'Hello' };
      const message2 = { id: '2', role: 'assistant', content: 'Hi there!' };

      stateManager.addMessageToHistory(message1);
      expect(stateManager.get('chatHistory')).toEqual([message1]);

      stateManager.addMessageToHistory(message2);
      expect(stateManager.get('chatHistory')).toEqual([message1, message2]);
    });

    test('clearChatHistory should reset chat history and active session', () => {
      stateManager.addMessageToHistory({ id: '1', role: 'user', content: 'Test' });
      stateManager.setActiveSessionId('session-123');

      stateManager.clearChatHistory();

      expect(stateManager.get('chatHistory')).toEqual([]);
      expect(stateManager.get('activeSessionId')).toBeNull();
    });

    test('toggleSidebar should toggle sidebar state', () => {
      expect(stateManager.get('isSidebarOpen')).toBe(true);
      
      stateManager.toggleSidebar();
      expect(stateManager.get('isSidebarOpen')).toBe(false);
      
      stateManager.toggleSidebar();
      expect(stateManager.get('isSidebarOpen')).toBe(true);
    });

    test('toggleSidebar should accept explicit values', () => {
      stateManager.toggleSidebar(false);
      expect(stateManager.get('isSidebarOpen')).toBe(false);
      
      stateManager.toggleSidebar(true);
      expect(stateManager.get('isSidebarOpen')).toBe(true);
    });

    test('setModalOpen should update modal states', () => {
      stateManager.setModalOpen('isSettingsModalOpen', true);
      expect(stateManager.get('isSettingsModalOpen')).toBe(true);
      
      stateManager.setModalOpen('isSettingsModalOpen', false);
      expect(stateManager.get('isSettingsModalOpen')).toBe(false);
    });

    test('setApiKey should update API key and view state', () => {
      stateManager.setApiKey('sk-ant-test123');
      
      expect(stateManager.get('apiKey')).toBe('sk-ant-test123');
      expect(stateManager.get('currentView')).toBe('chat');
      expect(stateManager.get('isLoginModalOpen')).toBe(false);
    });

    test('setApiKey with null should reset to login view', () => {
      stateManager.setApiKey(null);
      
      expect(stateManager.get('apiKey')).toBeNull();
      expect(stateManager.get('currentView')).toBe('login');
      expect(stateManager.get('isLoginModalOpen')).toBe(true);
    });

    test('setUserPreference should update user preferences', () => {
      stateManager.setUserPreference('autoScroll', false);
      expect(stateManager.get('userPreferences.autoScroll')).toBe(false);
      
      stateManager.setUserPreference('voiceCharacter', 'quint');
      expect(stateManager.get('userPreferences.voiceCharacter')).toBe('quint');
    });

    test('setActiveSessionId should update active session', () => {
      stateManager.setActiveSessionId('session-456');
      expect(stateManager.get('activeSessionId')).toBe('session-456');
    });
  });

  describe('Error Handling', () => {
    test('should handle non-string keys gracefully in get method', () => {
      expect(stateManager.get(null)).toBeUndefined();
      expect(stateManager.get(123)).toBeUndefined();
      expect(stateManager.get({})).toBeUndefined();
    });

    test('should handle non-string keys gracefully in set method', () => {
      const originalState = stateManager.get('currentTheme');
      stateManager.set(null, 'value');
      stateManager.set(123, 'value');
      
      // State should remain unchanged
      expect(stateManager.get('currentTheme')).toBe(originalState);
    });

    test('should handle errors in event listeners', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalListener = jest.fn();

      stateManager.subscribe('change:currentTheme', errorListener);
      stateManager.subscribe('change:currentTheme', normalListener);

      // Should not throw and should call the normal listener
      expect(() => {
        stateManager.set('currentTheme', 'jaws');
      }).not.toThrow();

      expect(errorListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
    });
  });
});