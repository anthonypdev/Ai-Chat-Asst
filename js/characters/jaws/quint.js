/**
 * Quint Character - The Gruff Shark Hunter
 * Implements the iconic character from Jaws with authentic personality
 * Features dramatic "shark attack" demise sequence
 */

import { BaseCharacter } from '../base-character.js';
import { EventBus } from '../../core/events.js';
import { AudioManager } from '../../features/voice/synthesis.js';

export class QuintCharacter extends BaseCharacter {
    constructor() {
        super({
            name: 'Quint',
            theme: 'jaws',
            personality: 'gruff',
            status: 'alive',
            voiceConfig: {
                pitch: 0.7,
                rate: 0.85,
                volume: 0.9,
                accent: 'new-england'
            }
        });

        this.sharkEncounters = 0;
        this.isInDanger = false;
        this.lastSpeechTime = 0;
        this.demiseTriggered = false;

        // Quint's iconic phrases and personality
        this.phrases = {
            greetings: [
                "Hooper drives the boat, Chief. I'll handle the shark.",
                "We're gonna need a bigger boat... but this'll do for now.",
                "Y'all know me. Know how I earn a livin'. I'll catch this shark for you.",
                "Here's to swimmin' with bow-legged women!"
            ],
            responses: [
                "That shark, he's a real beauty. Twenty-five footer, three tons of 'em.",
                "I got the scar to prove it. Wanna see?",
                "The thing about a shark, he's got lifeless eyes, black eyes, like a doll's eyes.",
                "Anyway, we delivered the bomb... and the shark took the rest.",
                "This shark's like a machine, eating everything in sight."
            ],
            danger: [
                "He's comin' around! Watch yourselves!",
                "That's some bad hat, Harry...",
                "Barrel's comin' loose! Hold on!",
                "We're gonna need a bigger boat—"
            ]
        };

        this.demiseSequence = [
            "We're gonna need a bigger boa—",
            "*VIOLENT SPLASH*",
            "*RADIO STATIC*",
            "*SILENCE*"
        ];

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        EventBus.on('shark-sighting', this.handleSharkSighting.bind(this));
        EventBus.on('user-message', this.handleUserMessage.bind(this));
        EventBus.on('theme-changed', this.handleThemeChange.bind(this));
        EventBus.on('danger-level-increase', this.handleDangerIncrease.bind(this));
    }

    async generateResponse(userInput, context = {}) {
        if (this.status === 'deceased') {
            return this.getPostMortemResponse();
        }

        if (this.shouldTriggerDemise(userInput, context)) {
            return await this.triggerDemise();
        }

        const response = this.getContextualResponse(userInput, context);
        return this.formatResponse(response);
    }

    shouldTriggerDemise(userInput, context) {
        if (this.demiseTriggered) return false;

        // Trigger conditions
        const dangerKeywords = ['shark', 'attack', 'bigger boat', 'help', 'emergency'];
        const hasDangerKeyword = dangerKeywords.some(keyword =>
            userInput.toLowerCase().includes(keyword)
        );

        const timeCondition = Date.now() - this.lastSpeechTime > 30000; // 30 seconds
        const encounterCondition = this.sharkEncounters >= 3;
        const randomChance = Math.random() < 0.15; // 15% chance after conditions met

        return (hasDangerKeyword && encounterCondition) ||
               (timeCondition && randomChance) ||
               userInput.toLowerCase().includes('quint');
    }

    async triggerDemise() {
        this.demiseTriggered = true;
        this.status = 'being-attacked';

        // Play dramatic sequence
        for (let i = 0; i < this.demiseSequence.length; i++) {
            const line = this.demiseSequence[i];

            if (line.includes('*')) {
                await this.playSoundEffect(this.getSoundEffectType(line));
                await this.delay(800);
            } else {
                await this.speak(line, {
                    ...this.voiceConfig,
                    rate: i === 0 ? 0.9 : 0.7, // Slower as he gets attacked
                    pitch: i === 0 ? 0.7 : 0.5
                });
                await this.delay(1200);
            }
        }

        this.status = 'deceased';

        // Trigger character handoff
        EventBus.emit('character-demise', {
            character: 'quint',
            handoffTo: ['brody', 'hooper'],
            dramatic: true
        });

        // Final message after delay
        await this.delay(2000);
        return {
            content: "*Radio crackles with static... Quint's voice is gone.*\n\n**Chief Brody:** QUINT! QUINT! ...He's gone. Hooper and I will take it from here.",
            isSystemMessage: true,
            character: 'system-handoff'
        };
    }

    getSoundEffectType(line) {
        if (line.includes('SPLASH')) return 'violent-splash';
        if (line.includes('STATIC')) return 'radio-static';
        return 'ocean-ambience';
    }

    getContextualResponse(userInput, context) {
        const input = userInput.toLowerCase();

        // Shark-related responses
        if (input.includes('shark')) {
            this.sharkEncounters++;
            return this.getRandomPhrase('responses');
        }

        // Boat/equipment related
        if (input.includes('boat') || input.includes('bigger')) {
            return "This old rust bucket's got plenty of fight left in her. Built her myself.";
        }

        // Indianapolis story trigger
        if (input.includes('scar') || input.includes('story') || input.includes('indianapolis')) {
            return this.getIndianapolisStory();
        }

        // Technical questions
        if (input.includes('how') || input.includes('technical') || input.includes('computer')) {
            return "I hunt sharks, not screens. But I'll tell ya what I know about stayin' alive out here.";
        }

        // Default personality response
        return this.getRandomPhrase('responses');
    }

    getIndianapolisStory() {
        return `Japanese submarine slammed two torpedoes into our side, Chief. We was comin' back from the island of Tinian to Leyte, just delivered the bomb. The Hiroshima bomb. Eleven hundred men went into the water. Vessel went down in twelve minutes. Didn't see the first shark for about a half hour. Tiger. Thirteen footer. You know how you know that when you're in the water, Chief? You tell by lookin' from the dorsal to the tail...

*takes a long pause*

Anyway, we delivered the bomb. But the shark... he took the rest.`;
    }

    handleSharkSighting(data) {
        this.sharkEncounters++;
        this.isInDanger = data.proximity < 50;

        if (this.isInDanger) {
            this.speak(this.getRandomPhrase('danger'), {
                ...this.voiceConfig,
                rate: 1.1, // Faster when in danger
                pitch: 0.8
            });
        }
    }

    handleUserMessage(message) {
        this.lastSpeechTime = Date.now();
    }

    handleDangerIncrease() {
        this.isInDanger = true;
    }

    getPostMortemResponse() {
        return {
            content: "*Quint's spirit echoes across the waves...* \n\nYou're on your own now. Brody and Hooper will have to finish this.",
            isSystemMessage: true,
            character: 'quint-spirit'
        };
    }

    formatResponse(content) {
        return {
            content: this.addQuintFlavor(content),
            character: 'quint',
            personality: 'gruff',
            voiceConfig: this.voiceConfig
        };
    }

    addQuintFlavor(text) {
        // Add Quint's characteristic speech patterns
        let flavored = text;

        // Replace some words with Quint's style
        flavored = flavored.replace(/\byou\b/gi, "ya");
        flavored = flavored.replace(/\bthem\b/gi, "'em");
        flavored = flavored.replace(/\bgoing to\b/gi, "gonna");

        // Add occasional nautical terms
        if (Math.random() < 0.3) {
            const nauticalPhrases = [" Chief.", " Mate.", " Skipper."];
            flavored += nauticalPhrases[Math.floor(Math.random() * nauticalPhrases.length)];
        }

        return flavored;
    }

    getRandomPhrase(category) {
        const phrases = this.phrases[category];
        return phrases[Math.floor(Math.random() * phrases.length)];
    }

    async playSoundEffect(type) {
        // Implementation would play sound effects
        // For now, just log the effect
        console.log(`Playing sound effect: ${type}`);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public interface methods
    isAlive() {
        return this.status === 'alive';
    }

    isDangerous() {
        return this.isInDanger;
    }

    getSharkEncounters() {
        return this.sharkEncounters;
    }
}
