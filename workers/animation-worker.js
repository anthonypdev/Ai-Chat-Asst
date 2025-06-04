/**
 * Parkland AI - Opus Magnum Edition
 * Animation Worker (workers/animation-worker.js)
 *
 * This Web Worker is designed to offload computationally intensive animation logic
 * from the main browser thread to improve UI responsiveness and prevent jank.
 *
 * It communicates with the main thread via `postMessage` and `onmessage`.
 */

// 'self' refers to the global scope of the worker (WorkerGlobalScope)
self.onmessage = function(event) {
    const data = event.data;

    if (typeof self.console !== 'undefined') { // console might not be available in all worker contexts by default
        console.log('Animation Worker: Message received from main thread:', data);
    }

    // Process messages based on their type or command
    switch (data.type) {
        case 'START_ANIMATION':
            // Example: Start a complex, long-running animation calculation
            // const animationId = data.payload.id;
            // const params = data.payload.params;
            // startOrUpdateTrackedAnimation(animationId, params);
            self.postMessage({
                type: 'ANIMATION_STARTED',
                payload: { id: data.payload.id, status: 'Animation setup acknowledged by worker.' }
            });
            break;

        case 'STOP_ANIMATION':
            // Example: Stop a specific animation calculation
            // stopTrackedAnimation(data.payload.id);
            self.postMessage({
                type: 'ANIMATION_STOPPED',
                payload: { id: data.payload.id, status: 'Animation stop acknowledged by worker.' }
            });
            break;

        case 'PERFORM_CALCULATION':
            // Example of a one-off heavy calculation
            // const calculationInput = data.payload.input;
            // const result = performComplexAnimationCalculation(calculationInput);
            // self.postMessage({
            //     type: 'CALCULATION_COMPLETE',
            //     payload: { id: data.payload.id, result: result }
            // });
            self.postMessage({
                type: 'CALCULATION_ACKNOWLEDGED',
                payload: { id: data.payload.id, status: 'Calculation task received by worker (placeholder).' }
            });
            break;
        
        case 'UPDATE_PARAMETERS':
            // Example: Update parameters for an ongoing animation
            // updateTrackedAnimationParameters(data.payload.id, data.payload.params);
            self.postMessage({
                type: 'PARAMETERS_UPDATED_ACK',
                payload: { id: data.payload.id, status: 'Parameter update acknowledged by worker.' }
            });
            break;

        default:
            if (typeof self.console !== 'undefined') {
                console.warn('Animation Worker: Unknown message type received:', data.type);
            }
            self.postMessage({
                type: 'UNKNOWN_MESSAGE_TYPE',
                payload: { receivedType: data.type }
            });
            break;
    }
};

/**
 * Placeholder function for complex animation calculations.
 * In a real scenario, this would contain the logic to be offloaded.
 * @param {any} data - Input data for the calculation.
 * @returns {any} The result of the calculation.
 */
function performComplexAnimationCalculation(data) {
    // Simulate heavy work
    let sum = 0;
    for (let i = 0; i < 1e7; i++) { // Adjust loop count for desired "heaviness"
        sum += Math.sqrt(i) * Math.sin(i / 1000);
    }
    return { inputReceived: data, calculatedValue: sum, timestamp: Date.now() };
}

// Example of how an internal animation loop might look if the worker manages ongoing animations
// let activeAnimations = {};
// let animationLoopId = null;

// function startOrUpdateTrackedAnimation(id, params) {
//     activeAnimations[id] = { params: params, lastUpdate: performance.now(), state: {} /* initial state */ };
//     if (!animationLoopId) {
//         runWorkerAnimationLoop();
//     }
// }

// function stopTrackedAnimation(id) {
//     delete activeAnimations[id];
//     if (Object.keys(activeAnimations).length === 0 && animationLoopId) {
//         if (typeof cancelAnimationFrame === 'function') { // Check if rAF is available in worker
//             cancelAnimationFrame(animationLoopId);
//         } else {
//             clearTimeout(animationLoopId); // Fallback for setTimeout
//         }
//         animationLoopId = null;
//     }
// }

// function runWorkerAnimationLoop() {
//     const now = performance.now();
//     Object.keys(activeAnimations).forEach(id => {
//         const anim = activeAnimations[id];
//         const deltaTime = now - anim.lastUpdate;
//         anim.lastUpdate = now;

//         // Perform incremental update to anim.state based on anim.params and deltaTime
//         // e.g., anim.state.x += anim.params.velocityX * (deltaTime / 1000);

//         // Post updated state back to main thread
//         self.postMessage({ type: 'ANIMATION_FRAME', payload: { id: id, state: anim.state } });
//     });

//     if (Object.keys(activeAnimations).length > 0) {
//         if (typeof requestAnimationFrame === 'function') {
//            animationLoopId = requestAnimationFrame(runWorkerAnimationLoop);
//         } else {
//            animationLoopId = setTimeout(runWorkerAnimationLoop, 16); // Fallback to ~60fps
//         }
//     } else {
//         animationLoopId = null;
//     }
// }

// Error handling within the worker
self.onerror = function(errorEvent) {
    if (typeof self.console !== 'undefined') {
        console.error('Animation Worker: Error occurred:', errorEvent.message, errorEvent);
    }
    // Optionally, post a message back to the main thread about the error
    self.postMessage({
        type: 'WORKER_ERROR',
        payload: {
            message: errorEvent.message,
            filename: errorEvent.filename,
            lineno: errorEvent.lineno
        }
    });
    // Workers don't automatically stop on unhandled errors, but you might want to implement logic
    // for the main thread to decide whether to terminate/restart the worker.
};

if (typeof self.console !== 'undefined') {
    console.log('Animation Worker: Script loaded and ready for messages.');
} else {
    // If console is not available, this indicates a very restricted worker environment.
    // Main thread communication is the primary way to confirm worker status.
    self.postMessage({ type: 'WORKER_READY', payload: { status: 'Animation worker script loaded.' }});
}
