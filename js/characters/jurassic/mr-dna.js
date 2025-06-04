/**
 * Mr. DNA Character - The Animated Educational Assistant
 * Clippy-style animation system with movie-accurate personality
 */

import { BaseCharacter } from '../base-character.js';
import { EventBus } from '../../core/events.js';

export class MrDNACharacter extends BaseCharacter {
    constructor() {
        super({
            name: 'Mr. DNA',
            theme: 'jurassic',
            personality: 'educational',
            status: 'active',
            voiceConfig: {
                pitch: 1.3,
                rate: 1.1,
                volume: 0.85,
                accent: 'cartoon-enthusiastic'
            }
        });

        this.animationState = 'idle';
        this.currentFrame = 0;
        this.isAnimating = false;
        this.tourGroup = null;
        this.educationalMode = true;

        // Animation frame data
        this.animations = {
            idle: {
                frames: 12,
                duration: 2000,
                loop: true,
                sequence: ['bob', 'blink', 'tailWag', 'bob', 'blink', 'bob', 'tailWag', 'blink', 'bob', 'bob', 'blink', 'tailWag']
            },
            talking: {
                frames: 8,
                duration: 1000,
                loop: true,
                sequence: ['mouthOpen', 'gesture1', 'mouthClose', 'gesture2', 'mouthOpen', 'hop', 'mouthClose', 'gesture1']
            },
            excited: {
                frames: 6,
                duration: 800,
                loop: false,
                sequence: ['hop', 'spin', 'hop', 'gesture2', 'spin', 'bounce']
            },
            explaining: {
                frames: 10,
                duration: 1500,
                loop: true,
                sequence: ['gesture1', 'mouthOpen', 'point', 'mouthClose', 'gesture2', 'hop', 'point', 'mouthOpen', 'gesture1', 'mouthClose']
            },
            goodbye: {
                frames: 4,
                duration: 600,
                loop: false,
                sequence: ['wave', 'hop', 'wave', 'slideOut']
            }
        };

        this.phrases = {
            greetings: [
                "Hello! I'm Mr. DNA! Welcome to Jurassic Park!",
                "Hi there! I'm a DNA molecule - but you can call me Mr. DNA!",
                "Greetings, future geneticists! Ready to learn about LIFE?",
                "Well hello! I'm here to tell you all about the miracle of cloning!"
            ],
            educational: [
                "Now pay attention! This is important stuff!",
                "The key to all life is DNA - that's me!",
                "We clone dinosaurs by extracting DNA from mosquitoes trapped in amber!",
                "First, we need a complete DNA strand - 100 billion base pairs!",
                "When we find gaps in the genetic code, we fill them with frog DNA!"
            ],
            excited: [
                "Isn't that AMAZING?!",
                "The miracle of genetics at work!",
                "Science is SO exciting!",
                "Wait until you see what we can do!",
                "Life finds a way - through ME!"
            ],
            handoff: [
                "Oops! Tour group coming through! Gotta hop!",
                "New visitors! I have to go explain genetics again!",
                "Duty calls! Time for the grand tour!",
                "Sorry, but I've got some serious science to explain!"
            ],
            emergency: [
                "Oh my! Muldoon needs emergency protocols!",
                "Initiating lockdown procedures as requested!",
                "Emergency mode activated! Everyone stay calm!",
                "Following safety protocols - Muldoon's orders!"
            ]
        };

        this.educationalTopics = {
            dna: "DNA is like a twisted ladder - we call it a double helix! Each rung contains the genetic code that makes you... you!",
            cloning: "We extract DNA from dinosaur blood found in mosquitoes preserved in amber. Then we fill the gaps with frog DNA!",
            amber: "Amber is fossilized tree resin that's millions of years old. Sometimes it traps insects - with dinosaur blood in their stomachs!",
            genetics: "Genetics is the study of heredity - how traits pass from parents to offspring. It's the blueprint of life!",
            jurassic: "The Jurassic Period was 200 to 145 million years ago - when giant dinosaurs ruled the Earth!"
        };

        this.initializeAnimation();
        this.initializeEventListeners();
    }

    initializeAnimation() {
        this.createAnimationElement();
        this.startIdleAnimation();
    }

    createAnimationElement() {
        const container = document.createElement('div');
        container.className = 'mr-dna-container';
        container.innerHTML = `
            <div class="mr-dna-character" id="mrDNA">
                <div class="dna-helix-body">
                    <div class="dna-strand strand-1"></div>
                    <div class="dna-strand strand-2"></div>
                    <div class="dna-bases">
                        <div class="base base-a"></div>
                        <div class="base base-t"></div>
                        <div class="base base-g"></div>
                        <div class="base base-c"></div>
                    </div>
                </div>
                <div class="dna-face">
                    <div class="dna-eyes">
                        <div class="eye left-eye">
                            <div class="pupil"></div>
                        </div>
                        <div class="eye right-eye">
                            <div class="pupil"></div>
                        </div>
                    </div>
                    <div class="dna-mouth">
                        <div class="mouth-shape"></div>
                    </div>
                </div>
                <div class="dna-arms">
                    <div class="arm left-arm"></div>
                    <div class="arm right-arm"></div>
                </div>
                <div class="dna-particles"></div>
                <div class="speech-bubble" id="dnaSpeechBubble" style="display: none;">
                    <div class="bubble-content"></div>
                </div>
            </div>
        `;

        document.body.appendChild(container);
        this.element = container;
    }

    initializeEventListeners() {
        EventBus.on('muldoon-handoff', this.handleMuldoonHandoff.bind(this));
        EventBus.on('emergency-protocols', this.handleEmergencyProtocols.bind(this));
        EventBus.on('groups-approaching', this.handleGroupsApproaching.bind(this));
        EventBus.on('mr-dna-summon', this.handleSummon.bind(this));
    }

    async generateResponse(userInput, context = {}) {
        if (this.tourGroup && Math.random() < 0.3) {
            return await this.handleTourInterruption();
        }

        const response = this.getEducationalResponse(userInput, context);
        await this.animateResponse(response);

        return this.formatResponse(response);
    }

    async handleMuldoonHandoff(data) {
        // Muldoon has handed off to Mr. DNA
        await this.transitionToActive();

        const response = this.getEducationalResponse(data.userInput, data.context);
        await this.animateResponse(response);

        EventBus.emit('mr-dna-active', { response });

        return this.formatResponse(response);
    }

    getEducationalResponse(userInput, context) {
        const input = userInput.toLowerCase();

        // Check for educational topics
        for (const [topic, explanation] of Object.entries(this.educationalTopics)) {
            if (input.includes(topic)) {
                return this.getTopicExplanation(topic, explanation);
            }
        }

        // General help responses
        if (input.includes('help') || input.includes('how') || input.includes('what')) {
            return this.getHelpfulResponse(input);
        }

        // Technical questions
        if (input.includes('computer') || input.includes('system') || input.includes('technical')) {
            return this.getTechnicalResponse();
        }

        // Excited responses for science
        if (input.includes('amazing') || input.includes('cool') || input.includes('wow')) {
            return this.getExcitedResponse();
        }

        return this.getDefaultResponse();
    }

    getTopicExplanation(topic, explanation) {
        const intro = this.getRandomPhrase('educational');
        return `${intro} ${explanation} ${this.getRandomPhrase('excited')}`;
    }

    getHelpfulResponse(input) {
        const helpful = [
            "I'd be happy to help! I know all about genetics, cloning, and life itself!",
            "That's a great question! Let me break it down for you scientifically!",
            "Ooh, I love explaining things! Science is so fascinating!",
            "Allow me to educate you about the wonders of genetics!"
        ];

        return helpful[Math.floor(Math.random() * helpful.length)];
    }

    getTechnicalResponse() {
        return "Well, I'm more of a biology expert than a computer specialist, but life and technology aren't so different! Both use codes - mine is genetic, yours is digital!";
    }

    getExcitedResponse() {
        return this.getRandomPhrase('excited') + " " + this.getRandomPhrase('educational');
    }

    getDefaultResponse() {
        return this.getRandomPhrase('greetings');
    }

    async handleTourInterruption() {
        await this.playAnimation('goodbye');

        const farewells = [
            "Oops! New tour group arriving! Gotta dash - science waits for no one!",
            "Sorry, duty calls! Time to explain the miracle of genetics to some new visitors!",
            "Tour group approaching! I'll be right back after I blow some minds with SCIENCE!",
            "Gotta hop! Literally! New people need to learn about DNA!"
        ];

        const farewell = farewells[Math.floor(Math.random() * farewells.length)];

        // Temporarily disappear
        setTimeout(() => {
            this.element.style.display = 'none';
            setTimeout(() => {
                this.element.style.display = 'block';
                this.playAnimation('talking');
                this.speak("I'm back! Where were we? Oh yes, the wonders of genetics!");
            }, 3000 + Math.random() * 2000); // 3-5 seconds
        }, 1000);

        return {
            content: farewell,
            character: 'mr-dna',
            isInterruption: true
        };
    }

    async handleEmergencyProtocols(data) {
        await this.playAnimation('excited');

        const emergency = this.getRandomPhrase('emergency');

        await this.animateResponse(emergency);

        // Show emergency mode visually
        this.element.classList.add('emergency-mode');

        setTimeout(() => {
            this.element.classList.remove('emergency-mode');
        }, 5000);
    }

    async handleGroupsApproaching() {
        this.tourGroup = {
            id: Date.now(),
            size: Math.floor(Math.random() * 8) + 2,
            arrivalTime: Date.now()
        };

        // Increase chance of interruptions
        setTimeout(() => {
            this.tourGroup = null;
        }, 30000); // 30 seconds
    }

    async transitionToActive() {
        await this.playAnimation('talking');
        this.showSpeechBubble("Let me help with that!");
    }

    async animateResponse(response) {
        await this.playAnimation('explaining');
        this.showSpeechBubble(response);

        // Keep bubble visible during speech
        setTimeout(() => {
            this.hideSpeechBubble();
            this.playAnimation('idle');
        }, response.length * 50 + 2000); // Estimate reading time
    }

    async playAnimation(animationType) {
        if (this.isAnimating && animationType !== 'idle') {
            return; // Don't interrupt non-idle animations
        }

        this.isAnimating = true;
        this.animationState = animationType;
        this.currentFrame = 0;

        const animation = this.animations[animationType];
        const frameDelay = animation.duration / animation.frames;

        for (let i = 0; i < animation.frames; i++) {
            await this.renderFrame(animation.sequence[i]);
            await this.delay(frameDelay);
            this.currentFrame = i;
        }

        if (animation.loop && animationType === this.animationState) {
            // Continue looping if still in same animation state
            this.playAnimation(animationType);
        } else {
            this.isAnimating = false;
            if (animationType !== 'idle') {
                this.playAnimation('idle');
            }
        }
    }

    async renderFrame(frameType) {
        const character = document.getElementById('mrDNA');
        if (!character) return;

        // Remove previous frame classes
        character.className = 'mr-dna-character';

        // Add current frame class
        character.classList.add(`frame-${frameType}`);

        // Add special effects for certain frames
        switch (frameType) {
            case 'hop':
                this.createDNAParticles();
                break;
            case 'spin':
                this.spinHelixStrands();
                break;
            case 'bounce':
                this.bounceEffect();
                break;
        }
    }

    createDNAParticles() {
        const particles = document.querySelector('.dna-particles');
        if (!particles) return;

        for (let i = 0; i < 5; i++) {
            const particle = document.createElement('div');
            particle.className = 'dna-particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 0.5 + 's';
            particles.appendChild(particle);

            setTimeout(() => particle.remove(), 1000);
        }
    }

    spinHelixStrands() {
        const strands = document.querySelectorAll('.dna-strand');
        strands.forEach(strand => {
            strand.style.animation = 'helixSpin 0.5s ease-in-out';
            setTimeout(() => strand.style.animation = '', 500);
        });
    }

    bounceEffect() {
        const character = document.getElementById('mrDNA');
        if (character) {
            character.style.transform = 'translateY(-10px) scale(1.1)';
            setTimeout(() => {
                character.style.transform = '';
            }, 200);
        }
    }

    showSpeechBubble(text) {
        const bubble = document.getElementById('dnaSpeechBubble');
        const content = bubble?.querySelector('.bubble-content');

        if (bubble && content) {
            content.textContent = text;
            bubble.style.display = 'block';
            bubble.classList.add('bubble-appear');
        }
    }

    hideSpeechBubble() {
        const bubble = document.getElementById('dnaSpeechBubble');
        if (bubble) {
            bubble.classList.remove('bubble-appear');
            setTimeout(() => {
                bubble.style.display = 'none';
            }, 300);
        }
    }

    startIdleAnimation() {
        if (!this.isAnimating) {
            this.playAnimation('idle');
        }
    }

    formatResponse(content) {
        return {
            content: this.addDNAFlavor(content),
            character: 'mr-dna',
            personality: 'educational',
            voiceConfig: this.voiceConfig,
            animated: true
        };
    }

    addDNAFlavor(text) {
        let flavored = text;

        // Add enthusiastic punctuation
        flavored = flavored.replace(/\./g, '!');
        flavored = flavored.replace(/!!+/g, '!'); // Prevent double exclamation

        // Add DNA terminology
        const dnaTerms = ['genetic', 'molecular', 'cellular', 'biological'];
        if (Math.random() < 0.2) {
            const term = dnaTerms[Math.floor(Math.random() * dnaTerms.length)];
            flavored = flavored.replace(/science/gi, `${term} science`);
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
    getCurrentAnimation() {
        return this.animationState;
    }

    isOnTour() {
        return this.tourGroup !== null;
    }

    forceAnimation(type) {
        this.isAnimating = false;
        this.playAnimation(type);
    }
}
