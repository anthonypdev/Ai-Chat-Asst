/**
 * Parkland AI - Opus Magnum Edition
 * Audio Processor Worker (workers/audio-processor.js)
 *
 * This Web Worker handles playback of predefined sound effects off the main thread.
 * It receives messages to play sounds and uses HTMLAudioElement for playback.
 */

// Predefined mapping of sound effect names to their audio file paths
// IMPORTANT: These paths are assumed and need to exist in the project structure (e.g., a 'sounds/' directory).
const soundEffectsMap = {
    // UI Sounds
    messageSent: 'sounds/ui_message_sent.mp3', // Example path
    messageReceived: 'sounds/ui_message_received.mp3',
    uiClick: 'sounds/ui_click_soft.wav',
    uiHover: 'sounds/ui_hover_gentle.wav', // Might be too frequent for a worker
    actionSuccess: 'sounds/ui_success_chime.mp3',
    actionInitiated: 'sounds/ui_action_start.wav',
    itemDeleted: 'sounds/ui_deleted.wav',
    settingsSaved: 'sounds/ui_settings_saved.mp3',
    appReady: 'sounds/ui_app_ready_pling.mp3',

    // Notifications & Alerts
    notification: 'sounds/notification_simple.mp3',
    error: 'sounds/alert_error.wav',
    warning: 'sounds/alert_warning.wav',

    // Theme specific sounds (examples)
    jaws_theme_change_sting: 'sounds/jaws_sting.mp3',
    jaws_sonar_ping: 'sounds/jaws_sonar_ping.wav',
    jaws_bubble_pop: 'sounds/jaws_bubble.wav',
    quint_entrance: 'sounds/jaws_quint_intro_effect.mp3',
    harpoon_throw: 'sounds/jaws_harpoon.wav',
    quint_shanty: 'sounds/jaws_quint_shanty_short.mp3', // Needs actual audio file
    quint_grunt: 'sounds/jaws_quint_grunt.wav',
    brody_sigh: 'sounds/jaws_brody_sigh.wav',
    alarm_urgent: 'sounds/jaws_alarm.wav',
    hooper_excited_hmm: 'sounds/jaws_hooper_hmm.wav',
    metal_clank_subtle: 'sounds/jaws_metal_clank.wav',
    hooper_discovery_chime: 'sounds/jaws_discovery_chime.wav',


    jurassic_theme_change_roar: 'sounds/jurassic_roar_short.mp3',
    jurassic_gate_creak_open: 'sounds/jurassic_gate_open.mp3',
    jurassic_gate_creak_close: 'sounds/jurassic_gate_close.mp3',
    jurassic_gate_rumble_heavy: 'sounds/jurassic_gate_rumble.mp3',
    jurassic_electric_fence_crackle: 'sounds/jurassic_electric_spark.wav',
    jurassic_pterodactyl_screech: 'sounds/jurassic_pterodactyl.wav',
    jurassic_raptor_call: 'sounds/jurassic_raptor_call.wav',
    jurassic_ambience_start: 'sounds/jurassic_jungle_ambience.mp3', // For looping
    jurassic_ambience_stop: 'sounds/jurassic_jungle_ambience_stop_placeholder.mp3', // Not a real stop, main thread handles stopping loops
    walkie_crackle_on: 'sounds/jurassic_walkie_on.wav',
    walkie_static_short_start: 'sounds/jurassic_walkie_static_start.wav',
    walkie_static_short_end: 'sounds/jurassic_walkie_static_end.wav',
    walkie_alert_start: 'sounds/jurassic_walkie_alert.wav',
    walkie_talk_press: 'sounds/jurassic_walkie_press.wav',
    walkie_talk_release: 'sounds/jurassic_walkie_release.wav',
    mr_dna_hello: 'sounds/jurassic_mr_dna_hello.mp3',
    dna_reveal_sparkle: 'sounds/jurassic_dna_sparkle.wav',


    // Voice recognition sounds
    mic_on: 'sounds/mic_on.wav',
    mic_off: 'sounds/mic_off.wav',
    recognition_success: 'sounds/recognition_success.wav',

    // Add more sound effects here as needed by the application
};

const activeAudioInstances = new Set(); // Keep track of playing audio for potential control

/**
 * Main message handler for the worker.
 * Listens for 'PLAY_SOUND' messages from the main thread.
 */
self.onmessage = function(event) {
    const data = event.data;

    if (typeof self.console === 'undefined') { // Basic logging if full console isn't available
        self.postMessage({ type: 'WORKER_LOG', payload: `AudioWorker received: ${data.type}` });
    } else {
        console.log('Audio Worker: Message received from main thread:', data);
    }

    if (data && data.type === 'PLAY_SOUND' && data.payload) {
        playSoundEffect(data.payload.effectName, data.payload.volume, data.payload.loop || false, data.payload.soundId);
    } else if (data && data.type === 'STOP_SOUND' && data.payload && data.payload.soundId) {
        stopSoundEffect(data.payload.soundId);
    } else if (data && data.type === 'PRELOAD_SOUNDS' && Array.isArray(data.payload.effectNames)) {
        preloadSoundEffects(data.payload.effectNames);
    }
};

/**
 * Plays a sound effect.
 * @param {string} effectName - The name of the sound effect (key in soundEffectsMap).
 * @param {number} [volume=1.0] - Volume level (0.0 to 1.0).
 * @param {boolean} [loop=false] - Whether the sound should loop.
 * @param {string} [soundId=null] - An optional ID to control this specific sound instance (e.g., for stopping).
 */
function playSoundEffect(effectName, volume = 1.0, loop = false, soundId = null) {
    const filePath = soundEffectsMap[effectName];

    if (!filePath) {
        console.warn(`Audio Worker: Sound effect "${effectName}" not found in map.`);
        self.postMessage({ type: 'SOUND_ERROR', payload: { effectName, error: 'Not found' } });
        return;
    }

    try {
        const audio = new Audio(filePath);
        audio.volume = Math.max(0, Math.min(1, volume)); // Clamp volume between 0 and 1
        audio.loop = loop;
        if (soundId) {
            audio.dataset.soundId = soundId; // Tag audio element with ID
            activeAudioInstances.add(audio);
        }

        audio.play()
            .then(() => {
                if (self.console) console.log(`Audio Worker: Playing "${effectName}" (Path: ${filePath})`);
                self.postMessage({ type: 'SOUND_PLAYING', payload: { effectName, soundId } });
            })
            .catch(error => {
                console.error(`Audio Worker: Error playing sound "${effectName}":`, error);
                self.postMessage({ type: 'SOUND_ERROR', payload: { effectName, error: error.message, soundId } });
                if(soundId) activeAudioInstances.delete(audio);
            });

        audio.onended = () => {
            if (self.console) console.log(`Audio Worker: Finished playing "${effectName}"`);
            self.postMessage({ type: 'SOUND_ENDED', payload: { effectName, soundId } });
            if(soundId) activeAudioInstances.delete(audio);
        };

        audio.onerror = (e) => { // More specific error handling for audio element
            console.error(`Audio Worker: HTMLAudioElement error for "${effectName}":`, e);
            self.postMessage({ type: 'SOUND_ERROR', payload: { effectName, error: 'Audio element playback error', soundId } });
            if(soundId) activeAudioInstances.delete(audio);
        };

    } catch (error) {
        console.error(`Audio Worker: General error creating or playing sound "${effectName}":`, error);
        self.postMessage({ type: 'SOUND_ERROR', payload: { effectName, error: error.message, soundId } });
    }
}

/**
 * Stops a specific sound effect instance if it's playing.
 * @param {string} soundId - The ID of the sound instance to stop.
 */
function stopSoundEffect(soundId) {
    if (!soundId) return;
    let found = false;
    activeAudioInstances.forEach(audio => {
        if (audio.dataset.soundId === soundId) {
            audio.pause();
            audio.currentTime = 0; // Reset
            audio.loop = false; // Ensure loop is stopped
            activeAudioInstances.delete(audio);
            found = true;
            if (self.console) console.log(`Audio Worker: Stopped sound with ID "${soundId}"`);
            self.postMessage({ type: 'SOUND_STOPPED_ACK', payload: { soundId } });
        }
    });
    if (!found && self.console) {
        console.warn(`Audio Worker: No active sound found with ID "${soundId}" to stop.`);
    }
}

/**
 * Preloads a list of sound effects.
 * This can help reduce playback delay for frequently used sounds.
 * @param {string[]} effectNames - Array of effect names to preload.
 */
function preloadSoundEffects(effectNames) {
    if (!Array.isArray(effectNames)) return;
    let loadedCount = 0;
    effectNames.forEach(name => {
        const filePath = soundEffectsMap[name];
        if (filePath) {
            const audio = new Audio();
            audio.src = filePath;
            audio.preload = 'auto'; // Hint to browser to load metadata or full file
            audio.load(); // Explicitly start loading
            audio.oncanplaythrough = () => {
                loadedCount++;
                if (loadedCount === effectNames.length) {
                     if (self.console) console.log('Audio Worker: All requested sounds preloaded.');
                     self.postMessage({ type: 'SOUNDS_PRELOADED', payload: { count: loadedCount } });
                }
            };
            audio.onerror = () => {
                 if (self.console) console.warn(`Audio Worker: Error preloading ${name} at ${filePath}`);
                // Still count it as processed for promise resolution
                loadedCount++;
                 if (loadedCount === effectNames.length) {
                     if (self.console) console.log('Audio Worker: Preloading attempt finished (with some errors).');
                     self.postMessage({ type: 'SOUNDS_PRELOADED', payload: { count: loadedCount, errors: true } });
                }
            }
        }
    });
     if (self.console) console.log(`Audio Worker: Initiated preloading for ${effectNames.length} sounds.`);
}


// Worker error handling
self.onerror = function(errorEvent) {
    if (self.console) {
        console.error('Audio Worker: Unhandled error:', errorEvent.message, errorEvent);
    }
    self.postMessage({
        type: 'WORKER_ERROR',
        payload: { message: errorEvent.message, filename: errorEvent.filename, lineno: errorEvent.lineno }
    });
};

// Signal that the worker is ready
if (typeof self.console !== 'undefined') {
    console.log('Audio Worker: Script loaded and ready.');
} else {
    self.postMessage({ type: 'WORKER_READY', payload: { status: 'Audio worker script loaded.' }});
}
