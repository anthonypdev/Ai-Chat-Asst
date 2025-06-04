/**
 * Theme Manager - Orchestrates theme switching with cinematic transitions
 * Handles theme state, character management, and environmental changes
 */

import { TransitionController } from './transitions.js';
import { ThemePersistence } from './persistence.js';
import { EventBus } from '../../core/events.js';
import { AppState } from '../../core/state.js';

export class ThemeManager {
    constructor() {
        this.currentTheme = 'default';
        this.availableThemes = ['default', 'jaws', 'jurassic'];
        this.isTransitioning = false;
        this.transitionController = new TransitionController();
        this.persistence = new ThemePersistence();

        this.themeConfigs = {
            default: {
                name: 'Parkland AI',
                brandIcon: 'parkland-default-brand-icon-path',
                emptyTitle: 'Parkland AI Assistant',
                emptySubtitle: 'Welcome to the Parkland AI Opus Magnum Edition. Your advanced digital assistant is primed and ready. How may I elevate your experience today?',
                loginTitle: 'Parkland AI',
                loginSubtitle: 'Sign in to Your Personal AI Concierge',
                characters: [],
                environmentalEffects: false,
                backgroundAudio: null
            },
            jaws: {
                name: 'SharkByte AI',
                brandIcon: 'jaws-brand-fin-def',
                emptyTitle: 'ABYSSAL OPS CENTER',
                emptySubtitle: 'Captain SharkByte at your command! Spill the beans, or walk the plank... of technical solutions!',
                loginTitle: 'SharkByte AI',
                loginSubtitle: 'Dangerously Smart. Wickedly Helpful. Totally Not Going To Eat Your Data.',
                characters: ['quint', 'brody', 'hooper'],
                environmentalEffects: true,
                backgroundAudio: 'ocean-ambience'
            },
            jurassic: {
                name: 'RaptorLogic AI',
                brandIcon: 'jurassic-brand-amber-def',
                emptyTitle: 'INGEN GENETICS LAB',
                emptySubtitle: 'RaptorLogic systems online. All park assets are... accounted for. Mostly. State your query, and try not to tap on the glass. It agitates the code.',
                loginTitle: 'RaptorLogic AI',
                loginSubtitle: 'Intelligence. Evolved. Sometimes Escapes. Use With Caution.',
                characters: ['muldoon', 'mr-dna'],
                environmentalEffects: true,
                backgroundAudio: 'jungle-ambience'
            }
        };

        this.init();
    }

    async init() {
        // Load saved theme or default
        const savedTheme = this.persistence.getTheme();
        if (savedTheme && this.availableThemes.includes(savedTheme)) {
            await this.setTheme(savedTheme, true); // Silent initial load
        }

        // Set up event listeners
        this.setupEventListeners();

        // Initialize UI state
        this.updateThemeSelectors();
    }

    setupEventListeners() {
        // Theme selection events
        document.addEventListener('click', (e) => {
            if (e.target.hasAttribute('data-theme-control')) {
                const themeName = e.target.getAttribute('data-theme-control');
                this.switchTheme(themeName);
            }
        });

        // Keyboard shortcuts for theme switching
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey) {
                switch (e.code) {
                    case 'Digit1':
                        e.preventDefault();
                        this.switchTheme('default');
                        break;
                    case 'Digit2':
                        e.preventDefault();
                        this.switchTheme('jaws');
                        break;
                    case 'Digit3':
                        e.preventDefault();
                        this.switchTheme('jurassic');
                        break;
                }
            }
        });

        // Listen for character events
        EventBus.on('character:speak', this.handleCharacterSpeak.bind(this));
        EventBus.on('theme:transition:complete', this.onTransitionComplete.bind(this));
    }

    async switchTheme(themeName) {
        if (themeName === this.currentTheme || this.isTransitioning) {
            return false;
        }

        if (!this.availableThemes.includes(themeName)) {
            console.error(`Theme "${themeName}" not available`);
            return false;
        }

        try {
            this.isTransitioning = true;
            EventBus.emit('theme:switch:start', { from: this.currentTheme, to: themeName });

            // Execute transition animation
            await this.transitionController.execute(this.currentTheme, themeName);

            // Apply theme changes
            await this.setTheme(themeName);

            // Save preference
            this.persistence.setTheme(themeName);

            EventBus.emit('theme:switch:complete', { from: this.currentTheme, to: themeName });

            return true;
        } catch (error) {
            console.error('Theme switch failed:', error);
            EventBus.emit('theme:switch:error', { theme: themeName, error });
            return false;
        } finally {
            this.isTransitioning = false;
        }
    }

    async setTheme(themeName, isInitial = false) {
        const previousTheme = this.currentTheme;
        this.currentTheme = themeName;
        const config = this.themeConfigs[themeName];

        // Update CSS data attribute
        document.documentElement.setAttribute('data-theme', themeName);

        // Update brand elements
        this.updateBrandElements(config);

        // Update empty state
        this.updateEmptyState(config);

        // Update login screen
        this.updateLoginScreen(config);

        // Handle character transitions
        if (!isInitial) {
            await this.handleCharacterTransition(previousTheme, themeName);
        }

        // Update environmental effects
        this.updateEnvironmentalEffects(config);

        // Play sound effect if not initial load
        if (!isInitial) {
            this.playThemeSound(themeName);
        }

        // Update theme selector UI
        this.updateThemeSelectors();

        EventBus.emit('theme:changed', { theme: themeName, config });
    }

    updateBrandElements(config) {
        const brandIcon = document.getElementById('brandIcon');
        const brandName = document.getElementById('brandName');

        if (brandIcon && config.brandIcon) {
            const viewBox = config.brandIcon.includes('amber') ? '0 0 100 100' : '0 0 100 100';
            brandIcon.innerHTML = `<svg width="30" height="30" viewBox="${viewBox}" aria-hidden="true"><use href="#${config.brandIcon}"/></svg>`;
        }

        if (brandName) {
            brandName.textContent = config.name;
        }
    }

    updateEmptyState(config) {
        const emptyIcon = document.getElementById('emptyIcon');
        const emptyTitle = document.getElementById('emptyTitle');
        const emptySubtitle = document.getElementById('emptySubtitle');

        if (emptyIcon && config.brandIcon) {
            const size = config.brandIcon.includes('fin') ? '70" height="50' : '65" height="65';
            emptyIcon.innerHTML = `<svg width="${size}" fill="currentColor" aria-hidden="true"><use href="#${config.brandIcon}"/></svg>`;
        }

        if (emptyTitle) {
            emptyTitle.textContent = config.emptyTitle;
        }

        if (emptySubtitle) {
            emptySubtitle.textContent = config.emptySubtitle;
        }
    }

    updateLoginScreen(config) {
        const loginLogo = document.getElementById('loginScreenLogo');
        const loginTitle = document.getElementById('loginScreenTitle');
        const loginSubtitle = document.getElementById('loginScreenSubtitle');

        if (loginLogo) {
            if (config.brandIcon === 'parkland-default-brand-icon-path') {
                loginLogo.innerHTML = 'P';
            } else if (config.brandIcon === 'jaws-brand-fin-def') {
                loginLogo.innerHTML = '<svg width="55" height="45" fill="var(--text-inverse)"><use href="#jaws-brand-fin-def"/></svg>';
            } else if (config.brandIcon === 'jurassic-brand-amber-def') {
                loginLogo.innerHTML = '<svg width="60" height="60"><use href="#jurassic-brand-amber-def"/></svg>';
            }
        }

        if (loginTitle) {
            loginTitle.textContent = config.loginTitle;
        }

        if (loginSubtitle) {
            loginSubtitle.textContent = config.loginSubtitle;
        }
    }

    async handleCharacterTransition(fromTheme, toTheme) {
        const fromConfig = this.themeConfigs[fromTheme];
        const toConfig = this.themeConfigs[toTheme];

        // Dismiss old characters
        if (fromConfig.characters && fromConfig.characters.length > 0) {
            EventBus.emit('characters:dismiss', { theme: fromTheme });
        }

        // Introduce new characters with themed intro
        if (toConfig.characters && toConfig.characters.length > 0) {
            setTimeout(() => {
                EventBus.emit('characters:introduce', {
                    theme: toTheme,
                    characters: toConfig.characters
                });
            }, 500); // Brief delay for transition to settle
        }

        // Add themed intro message to current chat
        const introMessage = this.getThemeIntroMessage(toTheme);
        if (introMessage && AppState.currentChatId) {
            EventBus.emit('chat:add-system-message', {
                content: introMessage,
                isIntro: true,
                timestamp: new Date().toISOString()
            });
        }
    }

    getThemeIntroMessage(themeName) {
        switch (themeName) {
            case 'jaws':
                return "AHOY THERE, SCALLYWAG! Welcome to the S.S. Problem Solver! Captain SharkByte reporting for duty! What digital kraken are we wrangling today? Lay it on me, and let's make some waves!";
            case 'jurassic':
                return "ACCESS GRANTED: RaptorLogic Mainframe. Ranger, welcome to the digital jungle. I trust your query doesn't involve... *unauthorized asset relocation*. Proceed. And remember... clever girl.";
            case 'default':
                return "Reverting to standard Parkland AI protocols. Efficiency, precision, and unparalleled service are now engaged. How may I be of assistance?";
            default:
                return null;
        }
    }

    updateEnvironmentalEffects(config) {
        if (config.environmentalEffects) {
            this.enableEnvironmentalEffects(this.currentTheme);
        } else {
            this.disableEnvironmentalEffects();
        }
    }

    enableEnvironmentalEffects(theme) {
        const chatArea = document.querySelector('.chat-area');
        if (!chatArea) return;

        // Add theme-specific environmental classes
        chatArea.classList.add(`env-${theme}`);

        // Start background audio if available
        if (this.themeConfigs[theme].backgroundAudio) {
            EventBus.emit('audio:start-ambient', {
                track: this.themeConfigs[theme].backgroundAudio,
                theme: theme
            });
        }
    }

    disableEnvironmentalEffects() {
        const chatArea = document.querySelector('.chat-area');
        if (!chatArea) return;

        // Remove all environmental classes
        chatArea.classList.remove('env-jaws', 'env-jurassic');

        // Stop background audio
        EventBus.emit('audio:stop-ambient');
    }

    updateThemeSelectors() {
        document.querySelectorAll('[data-theme-control]').forEach(selector => {
            const themeName = selector.getAttribute('data-theme-control');
            selector.setAttribute('aria-checked', String(themeName === this.currentTheme));
        });
    }

    playThemeSound(themeName) {
        if (!AppState.soundEnabled) return;

        const soundMap = {
            default: 'success',
            jaws: 'jawsChomp',
            jurassic: 'foliageRustle'
        };

        const soundName = soundMap[themeName] || 'click';
        EventBus.emit('audio:play-ui-sound', { sound: soundName });
    }

    handleCharacterSpeak(data) {
        // Coordinate with voice synthesis for character-specific voices
        EventBus.emit('voice:speak-as-character', {
            text: data.text,
            character: data.character,
            theme: this.currentTheme
        });
    }

    onTransitionComplete(data) {
        // Post-transition cleanup and effects
        document.body.classList.remove('theme-transitioning');

        // Trigger any post-transition animations
        setTimeout(() => {
            EventBus.emit('ui:refresh-animations');
        }, 100);
    }

    // Public API methods
    getCurrentTheme() {
        return this.currentTheme;
    }

    getThemeConfig(themeName = this.currentTheme) {
        return this.themeConfigs[themeName];
    }

    isThemeTransitioning() {
        return this.isTransitioning;
    }

    getAvailableThemes() {
        return [...this.availableThemes];
    }
}
