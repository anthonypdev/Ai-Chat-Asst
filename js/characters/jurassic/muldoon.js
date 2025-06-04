/**
 * Robert Muldoon Character - The Game Warden
 * Speaks through walkie-talkie, hunts raptors, coordinates with Mr. DNA
 */

import { BaseCharacter } from '../base-character.js';
import { EventBus } from '../../core/events.js';

export class MuldoonCharacter extends BaseCharacter {
    constructor() {
        super({
            name: 'Robert Muldoon',
            theme: 'jurassic',
            personality: 'tactical',
            status: 'active',
            voiceConfig: {
                pitch: 0.8,
                rate: 0.9,
                volume: 0.9,
                accent: 'british-military'
            }
        });

        this.huntingState = 'patrol'; // patrol, tracking, hiding, engaging
        this.raptorSightings = 0;
        this.suspicionLevel = 0;
        this.walkieTalkieActive = false;
        this.lastTransmission = 0;

        // Walkie-talkie component state
        this.walkieTalkie = {
            element: null,
            ledState: 'black', // black, amber, red
            staticLevel: 0.1,
            batteryLevel: 100
        };

        this.phrases = {
            greetings: [
                "*Static crackles* Muldoon here. Game Warden reporting. All assets accounted for... mostly.",
                "*Radio buzz* This is Muldoon. Perimeter patrol in progress. Stay alert out there.",
                "*Transmission begins* Robert Muldoon, InGen Security. Current status: hunting clever girls.",
                "*Static* Muldoon to base. All quiet on the western front. For now."
            ],
            hunting: [
                "*Whispers into radio* They're moving in herds... they do move in herds.",
                "*Low voice* Quiet now. She's close. I can feel her watching.",
                "*Hushed tones* The point is... you're alive when they start to eat you.",
                "*Barely audible* Clever girl... Mr. DNA, take over. I've got movement."
            ],
            tactical: [
                "We need locking mechanisms on the vehicle doors. They remember.",
                "Shoot her! SHOOT HER! *rifle blast*",
                "They should all be destroyed. Every last one of them.",
                "I've hunted most things that can hunt you, but the way they move..."
            ],
            suspicious: [
                "*Static increases* Something's not right. Too quiet.",
                "*Tense whisper* They're testing the fences. Systematically.",
                "*Alert tone* Movement in sector 7. Could be nothing. Could be everything.",
                "*Radio crackles* They remember... they're learning."
            ]
        };

        this.raptorCallouts = [
            "*URGENT* Raptor breach in sector 4! Mr. DNA, emergency protocols!",
            "*ALERT* Pack movement detected! Mr. DNA, initiate lockdown procedures!",
            "*WARNING* They're in the trees! Mr. DNA, divert the groups!",
            "*EMERGENCY* Clever girls flanking from the east! Mr. DNA, now!"
        ];

        this.radioEffects = {
            staticBursts: ['*bzzt*', '*crackle*', '*static*', '*interference*'],
            transmissionStarts: ['*Radio on*', '*Transmission*', '*Static clears*'],
            transmissionEnds: ['*Over*', '*Out*', '*Radio off*', '*Static resumes*']
        };

        this.initializeWalkieTalkie();
        this.initializeEventListeners();
    }

    initializeWalkieTalkie() {
        // Create walkie-talkie UI element
        this.createWalkieTalkieElement();
        this.startAmbientStatic();
    }

    createWalkieTalkieElement() {
        const walkieTalkie = document.createElement('div');
        walkieTalkie.className = 'walkie-talkie-container';
        walkieTalkie.innerHTML = `
            <div class="walkie-talkie">
                <div class="walkie-antenna"></div>
                <div class="walkie-body">
                    <div class="walkie-speaker">
                        <div class="speaker-grille"></div>
                        <div class="static-indicator"></div>
                    </div>
                    <div class="walkie-led" id="walkieLed"></div>
                    <div class="walkie-label">MOTOROLA</div>
                    <div class="battery-indicator">
                        <div class="battery-level"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(walkieTalkie);
        this.walkieTalkie.element = walkieTalkie;
    }

    initializeEventListeners() {
        EventBus.on('raptor-sighting', this.handleRaptorSighting.bind(this));
        EventBus.on('mr-dna-busy', this.handleDNABusy.bind(this));
        EventBus.on('groups-approaching', this.handleGroupsApproaching.bind(this));
        EventBus.on('suspicious-activity', this.increaseSuspicion.bind(this));
    }

    async generateResponse(userInput, context = {}) {
        // Check if we should hand off to Mr. DNA
        if (this.shouldHandoffToDNA(userInput, context)) {
            return await this.handoffToMrDNA(userInput, context);
        }

        const response = this.getContextualResponse(userInput, context);
        await this.transmitResponse(response);

        return this.formatResponse(response);
    }

    shouldHandoffToDNA(userInput, context) {
        const input = userInput.toLowerCase();

        // Educational/explanatory questions go to DNA
        if (input.includes('how') || input.includes('what') ||
            input.includes('explain') || input.includes('help')) {
            return Math.random() < 0.7; // 70% chance
        }

        // If we hear raptor activity
        if (this.suspicionLevel > 3) {
            return Math.random() < 0.8; // 80% chance when suspicious
        }

        // Genetic/scientific questions
        if (input.includes('dna') || input.includes('genetic') ||
            input.includes('science') || input.includes('biology')) {
            return true;
        }

        return false;
    }

    async handoffToMrDNA(userInput, context) {
        const handoffPhrases = [
            "*Whispers* Quiet... she's close. Mr. DNA, take over.",
            "*Static* Movement detected. Mr. DNA, you're up.",
            "*Low voice* They're testing the perimeter. Mr. DNA, handle this one.",
            "*Radio crackles* Got activity here. Mr. DNA, field this question."
        ];

        const handoff = handoffPhrases[Math.floor(Math.random() * handoffPhrases.length)];

        await this.transmitResponse(handoff);

        // Signal Mr. DNA to take over
        EventBus.emit('muldoon-handoff', {
            userInput,
            context,
            reason: 'raptor-activity'
        });

        return {
            content: handoff,
            character: 'muldoon',
            handoffTo: 'mr-dna'
        };
    }

    getContextualResponse(userInput, context) {
        const input = userInput.toLowerCase();

        // Raptor-related responses
        if (input.includes('raptor') || input.includes('dinosaur') || input.includes('velociraptor')) {
            this.raptorSightings++;
            this.increaseSuspicion();
            return this.getRaptorResponse();
        }

        // Security/tactical responses
        if (input.includes('security') || input.includes('safe') || input.includes('protect')) {
            return this.getTacticalResponse();
        }

        // Park systems
        if (input.includes('fence') || input.includes('system') || input.includes('power')) {
            return this.getSystemResponse();
        }

        // Hunting/tracking
        if (input.includes('hunt') || input.includes('track') || input.includes('find')) {
            return this.getHuntingResponse();
        }

        // Suspicious activity
        if (this.suspicionLevel > 2) {
            return this.getSuspiciousResponse();
        }

        return this.getDefaultResponse();
    }

    getRaptorResponse() {
        this.huntingState = 'tracking';

        const responses = [
            "Velociraptors. Pack hunters. Eight feet long, four feet tall, razor-sharp claws...",
            "They're lethal at eight months. And I do mean lethal.",
            "The point is... you're alive when they start to eat you.",
            "They're moving in herds... they do move in herds. Wait, that's not right...",
            "Clever girls. They remember everything. Every fence, every lock, every weakness."
        ];

        return responses[Math.floor(Math.random() * responses.length)];
    }

    getTacticalResponse() {
        return this.getRandomPhrase('tactical') +
               " *Radio crackles* We've got contingency plans for every scenario. Mostly.";
    }

    getSystemResponse() {
        return "Park systems are... operational. Mostly. Mr. DNA knows the technical details. I just keep things from eating the tourists.";
    }

    getHuntingResponse() {
        this.huntingState = 'hunting';
        return this.getRandomPhrase('hunting');
    }

    getSuspiciousResponse() {
        return this.getRandomPhrase('suspicious');
    }

    getDefaultResponse() {
        return this.getRandomPhrase('greetings');
    }

    async transmitResponse(response) {
        await this.startTransmission();
        await this.speak(this.addRadioEffects(response), this.getRadioVoiceConfig());
        await this.endTransmission();
    }

    async startTransmission() {
        this.walkieTalkieActive = true;
        this.setLEDState('amber');
        this.increaseStatic(0.3);

        // Play transmission start sound
        await this.playRadioEffect('transmission-start');

        // Brief delay for realism
        await this.delay(200);
    }

    async endTransmission() {
        await this.delay(300);

        // Add "Over" or "Out"
        const endings = ['Over.', 'Out.', 'Muldoon out.', 'Standing by.'];
        const ending = endings[Math.floor(Math.random() * endings.length)];

        await this.speak(ending, this.getRadioVoiceConfig());

        this.setLEDState('black');
        this.decreaseStatic(0.1);
        this.walkieTalkieActive = false;

        await this.playRadioEffect('transmission-end');
    }

    addRadioEffects(text) {
        // Add radio static and interference
        const staticBurst = this.radioEffects.staticBursts[
            Math.floor(Math.random() * this.radioEffects.staticBursts.length)
        ];

        let enhanced = text;

        // Add occasional static bursts
        if (Math.random() < 0.3) {
            enhanced = `${staticBurst} ${enhanced}`;
        }

        if (Math.random() < 0.2) {
            enhanced = `${enhanced} ${staticBurst}`;
        }

        return enhanced;
    }

    getRadioVoiceConfig() {
        return {
            ...this.voiceConfig,
            // Radio compression effects
            pitch: this.voiceConfig.pitch * 0.95,
            rate: this.voiceConfig.rate * 0.9,
            volume: this.voiceConfig.volume * 0.85,
            // Add radio distortion (would be implemented in audio processing)
            filter: 'radio-compression'
        };
    }

    handleRaptorSighting(data) {
        this.raptorSightings++;
        this.suspicionLevel = 5; // Maximum alert
        this.huntingState = 'engaging';

        const callout = this.raptorCallouts[Math.floor(Math.random() * this.raptorCallouts.length)];

        // Emergency transmission
        this.emergencyTransmission(callout);

        // Signal Mr. DNA for emergency protocols
        EventBus.emit('emergency-protocols', {
            type: 'raptor-breach',
            severity: 'critical'
        });
    }

    async emergencyTransmission(message) {
        this.setLEDState('red');
        this.increaseStatic(0.5);

        await this.speak(message, {
            ...this.getRadioVoiceConfig(),
            rate: 1.2, // Faster when urgent
            pitch: 0.9
        });

        this.setLEDState('amber');
    }

    handleGroupsApproaching() {
        // When tour groups approach, become more cautious
        this.huntingState = 'patrol';
        this.suspicionLevel = Math.max(1, this.suspicionLevel);

        const warning = "*Static* New arrivals on site. Maintain vigilance. These animals are dangerous.";
        this.transmitResponse(warning);
    }

    increaseSuspicion() {
        this.suspicionLevel = Math.min(5, this.suspicionLevel + 1);

        if (this.suspicionLevel >= 4) {
            this.huntingState = 'hiding';
        }
    }

    setLEDState(state) {
        this.walkieTalkie.ledState = state;
        const led = document.getElementById('walkieLed');
        if (led) {
            led.className = `walkie-led ${state}`;
        }
    }

    increaseStatic(level) {
        this.walkieTalkie.staticLevel = Math.min(1.0, level);
        this.updateStaticIndicator();
    }

    decreaseStatic(level) {
        this.walkieTalkie.staticLevel = Math.max(0.1, level);
        this.updateStaticIndicator();
    }

    updateStaticIndicator() {
        const indicator = document.querySelector('.static-indicator');
        if (indicator) {
            indicator.style.opacity = this.walkieTalkie.staticLevel;
        }
    }

    startAmbientStatic() {
        // Subtle ambient radio static
        setInterval(() => {
            if (!this.walkieTalkieActive && Math.random() < 0.1) {
                this.playRadioEffect('ambient-static');
            }
        }, 5000);
    }

    async playRadioEffect(type) {
        // Would implement actual audio playback
        console.log(`Playing radio effect: ${type}`);
    }

    formatResponse(content) {
        return {
            content: this.addMuldoonFlavor(content),
            character: 'muldoon',
            personality: 'tactical',
            voiceConfig: this.getRadioVoiceConfig(),
            huntingState: this.huntingState,
            suspicionLevel: this.suspicionLevel
        };
    }

    addMuldoonFlavor(text) {
        let flavored = text;

        // Add British military inflection
        flavored = flavored.replace(/\bcan't\b/gi, "cannot");
        flavored = flavored.replace(/\bwon't\b/gi, "will not");

        // Add tactical terminology
        if (Math.random() < 0.2) {
            const tactical = [" Roger that.", " Acknowledged.", " Understood.", " Copy."];
            flavored += tactical[Math.floor(Math.random() * tactical.length)];
        }

        return flavored;
    }

    getRandomPhrase(category) {
        const phrases = this.phrases[category];
        return phrases[Math.floor(Math.random() * phrases.length)];
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public interface
    getHuntingState() {
        return this.huntingState;
    }

    getSuspicionLevel() {
        return this.suspicionLevel;
    }

    isTransmitting() {
        return this.walkieTalkieActive;
    }

    getRaptorSightings() {
        return this.raptorSightings;
    }
}
