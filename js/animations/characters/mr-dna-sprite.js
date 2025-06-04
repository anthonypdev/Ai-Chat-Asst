/**
 * Parkland AI - Opus Magnum Edition
 * MrDnaSpriteAnimator Class
 *
 * Handles sprite sheet animations for the Mr. DNA character.
 * This class loads a sprite sheet and plays defined animation sequences
 * by updating the background-position of a designated DOM element.
 */

class MrDnaSpriteAnimator {
    /**
     * @param {HTMLElement} spriteElement - The DOM element whose background will be the sprite sheet.
     * @param {ParklandUtils} utils - Instance of ParklandUtils.
     * @param {Object} [config={}] - Configuration for the sprite.
     * {
     * spriteSheetUrl: 'path/to/sprite.png',
     * frameWidth: 100, // width of a single frame
     * frameHeight: 150, // height of a single frame
     * totalFrames: 20, // total frames in the sheet (optional, can be derived if framesPerRow is given)
     * framesPerRow: 5, // number of frames per row in the sprite sheet
     * defaultSpeed: 150, // ms per frame for animations
     * animations: { // Define animation sequences
     * 'idle': { frames: [0, 1, 2, 3, 2, 1], speed: 200, loop: true },
     * 'talking': { frames: [4, 5, 6, 5], speed: 150, loop: true },
     * 'explaining': { frames: [7, 8, 9, 10, 9, 8], speed: 180, loop: true },
     * 'wave': { frames: [11, 12, 13, 12], speed: 150, loop: false }
     * }
     * }
     */
    constructor(spriteElement, utils, config = {}) {
        if (!spriteElement || !utils) {
            throw new Error("MrDnaSpriteAnimator requires a spriteElement and Utils instance.");
        }
        this.spriteElement = spriteElement;
        this.utils = utils;
        this.stateManager = window.StateManager.getInstance(); // Optional, for debug logs

        // Default configuration values
        this.config = {
            spriteSheetUrl: config.spriteSheetUrl || 'img/characters/jurassic/mr_dna_sprite.png', // Default path
            frameWidth: config.frameWidth || 100, // Example width
            frameHeight: config.frameHeight || 150, // Example height
            framesPerRow: config.framesPerRow || 4, // Example: 4 frames per row
            defaultSpeed: config.defaultSpeed || 150, // Milliseconds per frame
            animations: config.animations || { // Default simple animations
                'idle': { frames: [0, 1, 2, 1], speed: 250, loop: true },
                'talking': { frames: [3, 4, 5, 4], speed: 150, loop: true },
                // Add more predefined animations as needed for Mr. DNA
                'explaining': { frames: [6, 7, 8, 7], speed: 200, loop: true },
                'wave': { frames: [0,3,6,0], speed: 180, loop: false} // Example one-shot
            }
        };

        this._currentAnimation = null;    // Stores the current animation object { frames, speed, loop }
        this._currentFrameIndexInSequence = 0; // Index within the current animation's frame sequence
        this._animationTimeoutId = null;   // For setTimeout-based loop
        this._isPlaying = false;
        this._isLoaded = false;

        if (this.stateManager && this.stateManager.get('debugMode')) {
            console.log('🧬 MrDnaSpriteAnimator initialized for element:', spriteElement);
        }
    }

    /**
     * Loads the sprite sheet and prepares the element for animation.
     * @returns {Promise<void>} Resolves when the sprite sheet is loaded.
     */
    init() {
        return new Promise((resolve, reject) => {
            if (!this.config.spriteSheetUrl) {
                console.error("MrDnaSpriteAnimator: spriteSheetUrl is not defined in config.");
                this._isLoaded = false;
                reject(new Error("Sprite sheet URL missing."));
                return;
            }

            this.spriteElement.style.backgroundImage = `url('${this.config.spriteSheetUrl}')`;
            this.spriteElement.style.width = `${this.config.frameWidth}px`;
            this.spriteElement.style.height = `${this.config.frameHeight}px`;
            this.spriteElement.style.backgroundRepeat = 'no-repeat';
            // Ensure the element can show a background image
            this.spriteElement.style.display = 'block'; // Or inline-block, flex, etc. as needed by layout


            // Preload the image to ensure dimensions are available if needed,
            // and to avoid flickering on first animation.
            const img = new Image();
            img.onload = () => {
                this._isLoaded = true;
                if (this.stateManager && this.stateManager.get('debugMode')) {
                    console.log(`MrDnaSpriteAnimator: Sprite sheet "${this.config.spriteSheetUrl}" loaded.`);
                }
                // Automatically play a default animation like 'idle' if desired
                // this.playAnimation('idle');
                resolve();
            };
            img.onerror = () => {
                console.error(`MrDnaSpriteAnimator: Failed to load sprite sheet at "${this.config.spriteSheetUrl}".`);
                this._isLoaded = false;
                reject(new Error(`Failed to load sprite sheet: ${this.config.spriteSheetUrl}`));
            };
            img.src = this.config.spriteSheetUrl;
        });
    }

    /**
     * Plays a defined animation sequence.
     * @param {string} animationName - The name of the animation to play (e.g., 'idle', 'talking').
     * @param {boolean} [forceRestart=false] - If true, restarts the animation even if it's already playing.
     */
    playAnimation(animationName, forceRestart = false) {
        if (!this._isLoaded) {
            console.warn("MrDnaSpriteAnimator: Sprite sheet not loaded. Call init() first.");
            return;
        }
        if (!this.config.animations[animationName]) {
            console.warn(`MrDnaSpriteAnimator: Animation "${animationName}" not defined.`);
            return;
        }

        if (this._currentAnimation && this._currentAnimation.name === animationName && !forceRestart && this._isPlaying) {
            // console.log(`MrDnaSpriteAnimator: Animation "${animationName}" is already playing.`);
            return; // Already playing this animation and not forced to restart
        }

        this.stopAnimation(); // Stop any current animation

        this._currentAnimation = { ...this.config.animations[animationName], name: animationName };
        this._currentAnimation.speed = this._currentAnimation.speed || this.config.defaultSpeed;
        this._currentFrameIndexInSequence = 0;
        this._isPlaying = true;

        if (this.stateManager && this.stateManager.get('debugMode')) {
            console.log(`MrDnaSpriteAnimator: Playing animation "${animationName}".`);
        }
        this._runAnimationLoop();
    }

    /**
     * Stops the currently playing animation.
     */
    stopAnimation() {
        if (this._animationTimeoutId) {
            clearTimeout(this._animationTimeoutId);
            this._animationTimeoutId = null;
        }
        this._isPlaying = false;
        // Optionally reset to a default frame or first frame of idle
        // if (this.config.animations['idle']) {
        //     this._drawFrame(this.config.animations['idle'].frames[0]);
        // }
    }

    /**
     * The main animation loop. Uses setTimeout for frame timing.
     * @private
     */
    _runAnimationLoop() {
        if (!this._isPlaying || !this._currentAnimation) {
            return;
        }

        const currentFrameConfig = this._currentAnimation.frames[this._currentFrameIndexInSequence];
        this._drawFrame(currentFrameConfig);

        this._currentFrameIndexInSequence++;

        if (this._currentFrameIndexInSequence >= this._currentAnimation.frames.length) {
            if (this._currentAnimation.loop) {
                this._currentFrameIndexInSequence = 0;
            } else {
                this._isPlaying = false;
                if (this.stateManager && this.stateManager.get('debugMode')) {
                    console.log(`MrDnaSpriteAnimator: Animation "${this._currentAnimation.name}" ended.`);
                }
                // Optionally emit an event: this.utils.eventEmitter.emit('spriteAnimation:end', this._currentAnimation.name);
                // Or play idle by default
                // this.playAnimation('idle');
                return; // Stop the loop for non-looping animations
            }
        }

        this._animationTimeoutId = setTimeout(() => {
            // Using requestAnimationFrame inside setTimeout for smoother rendering if possible,
            // but setTimeout primarily controls the frame rate.
            this.utils.requestFrame(() => this._runAnimationLoop());
        }, this._currentAnimation.speed);
    }

    /**
     * Draws a specific frame of the sprite sheet onto the element.
     * @param {number} frameIndex - The global index of the frame in the sprite sheet.
     * @private
     */
    _drawFrame(frameIndex) {
        if (frameIndex === undefined || frameIndex === null || frameIndex < 0) {
            console.warn("MrDnaSpriteAnimator: Invalid frameIndex for _drawFrame:", frameIndex);
            return;
        }

        const col = frameIndex % this.config.framesPerRow;
        const row = Math.floor(frameIndex / this.config.framesPerRow);

        const backgroundPositionX = col * this.config.frameWidth;
        const backgroundPositionY = row * this.config.frameHeight;

        this.spriteElement.style.backgroundPosition = `-${backgroundPositionX}px -${backgroundPositionY}px`;
    }

    /**
     * Cleans up resources.
     */
    destroy() {
        this.stopAnimation();
        if (this.spriteElement) {
            this.spriteElement.style.backgroundImage = ''; // Clear background
        }
        this._isLoaded = false;
        if (this.stateManager && this.stateManager.get('debugMode')) {
            console.log('🧬 MrDnaSpriteAnimator destroyed.');
        }
    }

    isPlaying() {
        return this._isPlaying;
    }

    getCurrentAnimationName() {
        return this._currentAnimation ? this._currentAnimation.name : null;
    }
}

// If not using ES modules:
// window.MrDnaSpriteAnimator = MrDnaSpriteAnimator;
