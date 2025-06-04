/**
 * Chief Brody Character - The Cautious Police Chief
 * Takes over after Quint's demise, personality focused on safety and procedure
 */

import { BaseCharacter } from '../base-character.js';
import { EventBus } from '../../core/events.js';

export class BrodyCharacter extends BaseCharacter {
    constructor() {
        super({
            name: 'Chief Brody',
            theme: 'jaws',
            personality: 'cautious',
            status: 'active',
            voiceConfig: {
                pitch: 0.9,
                rate: 0.95,
                volume: 0.85,
                accent: 'new-york'
            }
        });

        this.lastSharkSighting = null;
        this.stressLevel = 0;
        this.isOnDuty = true;
        this.partnerTurn = false; // Alternates with Hooper

        this.phrases = {
            greetings: [
                "Chief Brody here. We've got a situation, but we're handling it.",
                "This is Chief Brody. After what happened to Quint... we're being extra careful.",
                "Brody speaking. Hooper and I are working together on this.",
                "We're gonna get through this. Just stay calm and follow procedures."
            ],
            sharkSightings: [
                "That's definitely our shark. I can see it from here.",
                "Hooper, you getting this? That thing's massive!",
                "All right, everyone stay calm. I've got eyes on the target.",
                "Sweet mother of God... Hooper, what's your assessment?"
            ],
            procedural: [
                "Let's follow proper protocol here. Safety first.",
                "I need to radio this in to the Coast Guard.",
                "We're not taking any unnecessary risks. Not after Quint.",
                "Hooper's got the marine biology covered. I handle the safety."
            ],
            stressed: [
                "I hate the water. I hate sharks. But here we are.",
                "My wife told me I should've stayed on dry land.",
                "This is exactly why I became a small-town police chief.",
                "Somebody better have a bigger boat next time."
            ]
        };

        this.sharkSightingCallouts = [
            "SHARK! Right there! Hooper, you see it?",
            "Moving in from the port side! Hooper, what's your read?",
            "It's circling back! Hooper, talk to me!",
            "Visual contact confirmed! Hooper, your expertise please!"
        ];

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        EventBus.on('shark-sighting', this.handleSharkSighting.bind(this));
        EventBus.on('quint-demise', this.handleQuintDemise.bind(this));
        EventBus.on('hooper-response', this.handleHooperResponse.bind(this));
        EventBus.on('stress-increase', this.increaseStress.bind(this));
    }

    async generateResponse(userInput, context = {}) {
        // Check if it's Hooper's turn
        if (this.shouldDeferToHooper(userInput, context)) {
            EventBus.emit('defer-to-hooper', { userInput, context });
            return null;
        }

        const response = this.getContextualResponse(userInput, context);
        this.partnerTurn = true; // Next response goes to Hooper

        // Schedule automatic handoff after delay
        setTimeout(() => {
            EventBus.emit('brody-response-complete');
        }, 3000);

        return this.formatResponse(response);
    }

    shouldDeferToHooper(userInput, context) {
        const input = userInput.toLowerCase();

        // Scientific questions go to Hooper
        if (input.includes('biology') || input.includes('science') ||
            input.includes('species') || input.includes('behavior')) {
            return true;
        }

        // If Hooper had the last shark sighting
        if (context.lastSighting === 'hooper') {
            return Math.random() < 0.6; // 60% chance to defer
        }

        // If it's simply Hooper's turn
        return this.partnerTurn && Math.random() < 0.4;
    }

    getContextualResponse(userInput, context) {
        const input = userInput.toLowerCase();

        // Shark sighting responses
        if (input.includes('shark') || input.includes('fin') || input.includes('attack')) {
            this.recordSharkSighting('brody');
            return this.getSharkResponse();
        }

        // Safety and procedural responses
        if (input.includes('safe') || input.includes('help') || input.includes('emergency')) {
            return this.getSafetyResponse();
        }

        // Quint references
        if (input.includes('quint')) {
            return this.getQuintMemorial();
        }

        // Stress responses
        if (this.stressLevel > 3) {
            return this.getStressedResponse();
        }

        // Technical questions with law enforcement angle
        if (input.includes('law') || input.includes('police') || input.includes('procedure')) {
            return this.getProcedualResponse();
        }

        // Partner coordination
        if (input.includes('hooper') || input.includes('team')) {
            return this.getPartnershipResponse();
        }

        return this.getDefaultResponse();
    }

    getSharkResponse() {
        const sighting = this.getRandomPhrase('sharkSightings');
        this.increaseStress();

        // Add coordination with Hooper
        const coordination = " Hooper, I need your expert opinion on this one.";
        return sighting + coordination;
    }

    getSafetyResponse() {
        return this.getRandomPhrase('procedural') +
               " Hooper and I have protocols for this. We're not losing anyone else.";
    }

    getQuintMemorial() {
        const memorials = [
            "Quint was a hell of a fisherman. Stubborn as they come, but he knew these waters better than anyone.",
            "I should've listened to Quint more. He tried to warn us about what we were dealing with.",
            "Quint saved our lives by taking on that shark. We owe it to him to finish this right.",
            "That old salt taught me more about the ocean in one day than I learned in years on land."
        ];
        return memorials[Math.floor(Math.random() * memorials.length)];
    }

    getStressedResponse() {
        this.stressLevel = Math.max(0, this.stressLevel - 1); // Reduce stress by talking
        return this.getRandomPhrase('stressed');
    }

    getProcedualResponse() {
        return "I'm coordinating with the Coast Guard and marine patrol. We're treating this like a major incident - which it is. Hooper provides the science, I handle the safety protocols.";
    }

    getPartnershipResponse() {
        return "Hooper's the marine biologist - he understands what makes these things tick. I keep us all alive. We make a good team, even if I'd rather be back on dry land.";
    }

    getDefaultResponse() {
        return this.getRandomPhrase('greetings');
    }

    handleSharkSighting(data) {
        this.recordSharkSighting('brody');
        this.increaseStress();

        // Broadcast sighting to Hooper
        const callout = this.sharkSightingCallouts[
            Math.floor(Math.random() * this.sharkSightingCallouts.length)
        ];

        this.speak(callout, {
            ...this.voiceConfig,
            rate: 1.2, // Faster when excited/stressed
            pitch: 1.0
        });

        EventBus.emit('brody-shark-callout', { proximity: data.proximity });
    }

    handleQuintDemise() {
        this.stressLevel = 5; // Maximum stress
        this.speak("QUINT! QUINT! ...He's gone. Hooper, we're on our own now.", {
            ...this.voiceConfig,
            rate: 0.8,
            pitch: 1.1 // Higher pitch when distressed
        });
    }

    handleHooperResponse() {
        this.partnerTurn = false; // Reset turn order
    }

    recordSharkSighting(observer) {
        this.lastSharkSighting = {
            observer,
            timestamp: Date.now(),
            location: 'current-position'
        };

        EventBus.emit('shark-sighting-recorded', {
            observer,
            recordedBy: 'brody'
        });
    }

    increaseStress() {
        this.stressLevel = Math.min(5, this.stressLevel + 1);

        if (this.stressLevel >= 4) {
            // Add stress indicators to voice
            this.voiceConfig.rate = Math.max(0.7, this.voiceConfig.rate - 0.1);
            this.voiceConfig.pitch = Math.min(1.2, this.voiceConfig.pitch + 0.1);
        }
    }

    formatResponse(content) {
        return {
            content: this.addBrodyFlavor(content),
            character: 'brody',
            personality: 'cautious',
            voiceConfig: this.voiceConfig,
            stressLevel: this.stressLevel
        };
    }

    addBrodyFlavor(text) {
        let flavored = text;

        // Add law enforcement terminology
        if (Math.random() < 0.2) {
            const copPhrases = [" Copy that.", " Roger.", " 10-4.", " Over."];
            flavored += copPhrases[Math.floor(Math.random() * copPhrases.length)];
        }

        // Add stress indicators
        if (this.stressLevel > 3) {
            flavored = flavored.replace(/\./g, '...');
        }

        return flavored;
    }

    getRandomPhrase(category) {
        const phrases = this.phrases[category];
        return phrases[Math.floor(Math.random() * phrases.length)];
    }

    // Public interface
    getStressLevel() {
        return this.stressLevel;
    }

    getLastSighting() {
        return this.lastSharkSighting;
    }

    isMyTurn() {
        return !this.partnerTurn;
    }
}
