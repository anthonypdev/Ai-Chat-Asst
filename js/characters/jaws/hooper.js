/**
 * Matt Hooper Character - The Marine Biologist
 * Scientific expertise, enthusiastic about sharks, partners with Brody
 */

import { BaseCharacter } from '../base-character.js';
import { EventBus } from '../../core/events.js';

export class HooperCharacter extends BaseCharacter {
    constructor() {
        super({
            name: 'Matt Hooper',
            theme: 'jaws',
            personality: 'scientific',
            status: 'active',
            voiceConfig: {
                pitch: 1.1,
                rate: 1.05,
                volume: 0.8,
                accent: 'educated-east-coast'
            }
        });

        this.lastSharkSighting = null;
        this.excitementLevel = 0;
        this.scientificObservations = [];
        this.partnerTurn = false;

        this.phrases = {
            greetings: [
                "Hooper here. Marine biology is my specialty - particularly large predatory species.",
                "This is Matt Hooper. What we're dealing with is a perfect predatory machine.",
                "Hooper speaking. I've been studying sharks for years, but this one's extraordinary.",
                "From a scientific standpoint, this is absolutely fascinating. And terrifying."
            ],
            scientific: [
                "Based on bite radius, I'd estimate we're looking at a 20-footer, possibly 25.",
                "The attack pattern suggests this is a rogue Great White, probably male.",
                "These creatures are perfectly evolved killing machines - 400 million years of evolution.",
                "The feeding behavior indicates this shark has lost its fear of humans.",
                "Neurologically, sharks are incredibly sophisticated. This one's learning."
            ],
            excited: [
                "Incredible! Look at the size of that dorsal fin!",
                "This is extraordinary! The musculature on this specimen!",
                "Magnificent! I've never seen a Great White this large in the wild!",
                "The power in those jaws... absolutely incredible!"
            ],
            coordinating: [
                "Brody, I'm getting readings that suggest it's circling back!",
                "Chief, based on current patterns, I predict it'll surface in about thirty seconds!",
                "Brody! The behavior is changing - it's becoming more aggressive!",
                "Chief, my instruments are picking up massive sonar signatures!"
            ],
            technical: [
                "I can help troubleshoot that. Marine equipment is similar to research gear I use.",
                "From an engineering perspective, that makes sense given the marine environment.",
                "I've worked with similar systems on research vessels. Let me walk you through it.",
                "The salt water can corrode connections. Here's what I'd check first."
            ]
        };

        this.sharkFacts = [
            "Great Whites can detect electrical fields as weak as 5 billionths of a volt.",
            "Their bite force can reach up to 4,000 pounds per square inch.",
            "They have multiple rows of teeth that constantly regenerate.",
            "Their lateral line system can detect vibrations from hundreds of meters away.",
            "They're ambush predators that can breach completely out of the water."
        ];

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        EventBus.on('defer-to-hooper', this.handleDeferral.bind(this));
        EventBus.on('brody-shark-callout', this.handleBrodyCallout.bind(this));
        EventBus.on('shark-sighting', this.handleSharkSighting.bind(this));
        EventBus.on('brody-response-complete', this.handleBrodyComplete.bind(this));
    }

    async generateResponse(userInput, context = {}) {
        // Check if it's Brody's turn for safety/procedural stuff
        if (this.shouldDeferToBrody(userInput, context)) {
            EventBus.emit('defer-to-brody', { userInput, context });
            return null;
        }

        const response = this.getContextualResponse(userInput, context);
        this.partnerTurn = true; // Next response goes to Brody

        return this.formatResponse(response);
    }

    async handleDeferral(data) {
        // Hooper responds when Brody defers to him
        const response = this.getContextualResponse(data.userInput, data.context);

        // Add a brief delay for natural conversation flow
        setTimeout(async () => {
            await this.speak(response, this.voiceConfig);
            EventBus.emit('hooper-response', { response });
        }, 800);
    }

    shouldDeferToBrody(userInput, context) {
        const input = userInput.toLowerCase();

        // Safety and emergency situations go to Brody
        if (input.includes('emergency') || input.includes('help') ||
            input.includes('danger') || input.includes('safety')) {
            return true;
        }

        // Law enforcement questions
        if (input.includes('police') || input.includes('law') || input.includes('procedure')) {
            return true;
        }

        // If Brody had the last shark sighting
        if (context.lastSighting === 'brody') {
            return Math.random() < 0.4; // 40% chance to defer
        }

        return this.partnerTurn && Math.random() < 0.3;
    }

    getContextualResponse(userInput, context) {
        const input = userInput.toLowerCase();

        // Scientific questions - Hooper's specialty
        if (input.includes('biology') || input.includes('behavior') ||
            input.includes('species') || input.includes('scientific')) {
            return this.getScientificResponse(input);
        }

        // Shark observations
        if (input.includes('shark') || input.includes('fin') || input.includes('attack')) {
            this.recordSharkSighting('hooper');
            return this.getSharkObservation();
        }

        // Technical/equipment questions
        if (input.includes('equipment') || input.includes('technical') ||
            input.includes('computer') || input.includes('system')) {
            return this.getTechnicalResponse();
        }

        // Size and measurement questions
        if (input.includes('big') || input.includes('size') || input.includes('large')) {
            return this.getSizeEstimate();
        }

        // Excitement responses
        if (this.excitementLevel > 3) {
            return this.getExcitedResponse();
        }

        return this.getDefaultResponse();
    }

    getScientificResponse(input) {
        this.increaseExcitement();

        let response = this.getRandomPhrase('scientific');

        // Add a random shark fact
        if (Math.random() < 0.4) {
            const fact = this.sharkFacts[Math.floor(Math.random() * this.sharkFacts.length)];
            response += ` Here's something fascinating: ${fact}`;
        }

        return response;
    }

    getSharkObservation() {
        this.increaseExcitement();

        const observation = {
            timestamp: Date.now(),
            observer: 'hooper',
            details: this.generateObservationDetails()
        };

        this.scientificObservations.push(observation);

        let response = this.getRandomPhrase('excited');
        response += ` ${observation.details}`;

        // Coordinate with Brody
        if (Math.random() < 0.6) {
            response += " Brody, are you getting this on your instruments?";
        }

        return response;
    }

    generateObservationDetails() {
        const details = [
            "The caudal fin span suggests a specimen of extraordinary size.",
            "Notice the scarring pattern - this shark has been in territorial disputes.",
            "The swimming pattern indicates heightened aggression levels.",
            "Based on dorsal fin height, I estimate 22-24 feet in length.",
            "The coloration suggests this is an adult male in prime condition."
        ];

        return details[Math.floor(Math.random() * details.length)];
    }

    getTechnicalResponse() {
        return this.getRandomPhrase('technical') +
               " The marine environment presents unique challenges, but the principles are similar.";
    }

    getSizeEstimate() {
        const estimates = [
            "Conservative estimate? Twenty-two feet, minimum. Could be larger.",
            "Based on the dorsal fin alone, we're looking at a 25-footer.",
            "The proportions suggest this is one of the largest Great Whites on record.",
            "From a scientific perspective, this specimen is truly exceptional in size."
        ];

        return estimates[Math.floor(Math.random() * estimates.length)];
    }

    getExcitedResponse() {
        this.excitementLevel = Math.max(0, this.excitementLevel - 1);
        return this.getRandomPhrase('excited');
    }

    getDefaultResponse() {
        return this.getRandomPhrase('greetings');
    }

    handleSharkSighting(data) {
        this.recordSharkSighting('hooper');
        this.increaseExcitement();

        // Scientific analysis of the sighting
        const analysis = this.analyzeSharkBehavior(data);

        this.speak(`Fascinating! ${analysis}`, {
            ...this.voiceConfig,
            rate: 1.2, // Faster when excited
            pitch: 1.2
        });
    }

    handleBrodyCallout(data) {
        // Respond to Brody's shark callouts with scientific analysis
        const responses = [
            "I see it, Chief! Magnificent specimen!",
            "Getting it on sonar now, Brody! It's enormous!",
            "Confirmed visual, Chief! This is incredible!",
            "Roger that, Brody! I'm tracking its movement patterns!"
        ];

        const response = responses[Math.floor(Math.random() * responses.length)];

        setTimeout(() => {
            this.speak(response, this.voiceConfig);
        }, 500);
    }

    handleBrodyComplete() {
        this.partnerTurn = false; // Reset turn order
    }

    analyzeSharkBehavior(data) {
        const behaviors = [
            "The approach pattern suggests hunting behavior.",
            "Based on depth changes, it's testing our responses.",
            "The circling pattern indicates territorial assessment.",
            "Speed variations suggest it's calculating attack vectors.",
            "The proximity suggests it's lost its natural fear response."
        ];

        return behaviors[Math.floor(Math.random() * behaviors.length)];
    }

    recordSharkSighting(observer) {
        this.lastSharkSighting = {
            observer,
            timestamp: Date.now(),
            scientificNotes: this.generateObservationDetails()
        };

        EventBus.emit('shark-sighting-recorded', {
            observer,
            recordedBy: 'hooper',
            scientificData: true
        });
    }

    increaseExcitement() {
        this.excitementLevel = Math.min(5, this.excitementLevel + 1);

        if (this.excitementLevel >= 4) {
            // More energetic voice when excited
            this.voiceConfig.rate = Math.min(1.3, this.voiceConfig.rate + 0.1);
            this.voiceConfig.pitch = Math.min(1.3, this.voiceConfig.pitch + 0.05);
        }
    }

    formatResponse(content) {
        return {
            content: this.addHooperFlavor(content),
            character: 'hooper',
            personality: 'scientific',
            voiceConfig: this.voiceConfig,
            excitementLevel: this.excitementLevel
        };
    }

    addHooperFlavor(text) {
        let flavored = text;

        // Add scientific terminology
        const scientificTerms = [
            'fascinating', 'extraordinary', 'remarkable', 'incredible',
            'based on my observations', 'from a scientific perspective'
        ];

        // Occasionally add enthusiasm
        if (this.excitementLevel > 3 && Math.random() < 0.3) {
            flavored = `${flavored}!`;
        }

        return flavored;
    }

    getRandomPhrase(category) {
        const phrases = this.phrases[category];
        return phrases[Math.floor(Math.random() * phrases.length)];
    }

    // Public interface
    getExcitementLevel() {
        return this.excitementLevel;
    }

    getObservations() {
        return this.scientificObservations;
    }

    getLastSighting() {
        return this.lastSharkSighting;
    }

    isMyTurn() {
        return !this.partnerTurn;
    }
}
