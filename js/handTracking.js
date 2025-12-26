// ========================================
// HAND TRACKING MODULE
// MediaPipe Hands integration for gesture detection
// ========================================

const HandTracking = (function() {
    // Configuration
    const CONFIG = {
        PINCH_START_THRESHOLD: 0.07,  // Fingers must be this close to START pinch
        PINCH_END_THRESHOLD: 0.12,    // Fingers must be this far apart to END pinch (hysteresis)
        RELEASE_CONFIRM_FRAMES: 3,    // Number of consecutive frames to confirm release
        SMOOTHING_FACTOR: 0.3,        // For position smoothing (0-1)
        MIN_DETECTION_CONFIDENCE: 0.7,
        MIN_TRACKING_CONFIDENCE: 0.5
    };
    
    // Release confirmation counter
    let releaseFrameCount = 0;
    
    // State
    let hands = null;
    let videoElement = null;
    let handCanvasElement = null;
    let handCtx = null;
    let isInitialized = false;
    let isHandDetected = false;
    let animationFrameId = null;
    
    // Current hand data
    let currentHandData = {
        landmarks: null,
        isPinching: false,
        pinchPosition: { x: 0, y: 0 },
        palmPosition: { x: 0, y: 0 },
        smoothedPosition: { x: 0, y: 0 },
        pinchStrength: 0
    };
    
    // Callbacks
    let onHandDetected = null;
    let onHandLost = null;
    let onPinchStart = null;
    let onPinchMove = null;
    let onPinchEnd = null;
    let onHandUpdate = null;
    
    // Initialize hand tracking
    async function init(videoEl, handCanvasEl) {
        videoElement = videoEl;
        handCanvasElement = handCanvasEl;
        handCtx = handCanvasElement.getContext('2d');
        
        console.log('Initializing MediaPipe Hands...');
        
        // Create MediaPipe Hands instance
        hands = new Hands({
            locateFile: (file) => {
                console.log('Loading MediaPipe file:', file);
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
            }
        });
        
        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: CONFIG.MIN_DETECTION_CONFIDENCE,
            minTrackingConfidence: CONFIG.MIN_TRACKING_CONFIDENCE
        });
        
        hands.onResults(onResults);
        
        // Wait for video to be ready
        if (videoElement.readyState < 2) {
            await new Promise((resolve) => {
                videoElement.addEventListener('loadeddata', resolve, { once: true });
            });
        }
        
        console.log('Video ready, starting hand detection loop...');
        
        // Start the detection loop
        isInitialized = true;
        detectLoop();
        
        console.log('Hand tracking initialized');
        return true;
    }
    
    // Detection loop - send frames to MediaPipe
    async function detectLoop() {
        if (!isInitialized || !hands || !videoElement) return;
        
        try {
            if (videoElement.readyState >= 2) {
                await hands.send({ image: videoElement });
            }
        } catch (err) {
            console.warn('Hand detection error:', err);
        }
        
        // Continue loop
        animationFrameId = requestAnimationFrame(detectLoop);
    }
    
    // Process hand tracking results
    function onResults(results) {
        // Clear hand canvas
        handCtx.clearRect(0, 0, handCanvasElement.width, handCanvasElement.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            // Hand detected
            if (!isHandDetected) {
                isHandDetected = true;
                if (onHandDetected) onHandDetected();
            }
            
            // Store landmarks
            currentHandData.landmarks = landmarks;
            
            // Draw hand landmarks on debug canvas
            drawHandLandmarks(landmarks);
            
            // Process gestures
            processGestures(landmarks);
            
            // Fire update callback
            if (onHandUpdate) onHandUpdate(currentHandData);
            
        } else {
            // No hand detected
            if (isHandDetected) {
                isHandDetected = false;
                
                // If was pinching, trigger pinch end
                if (currentHandData.isPinching) {
                    currentHandData.isPinching = false;
                    if (onPinchEnd) onPinchEnd(currentHandData);
                }
                
                if (onHandLost) onHandLost();
            }
            
            currentHandData.landmarks = null;
        }
    }
    
    // Process gestures from landmarks
    function processGestures(landmarks) {
        // Get key landmarks
        // 4 = thumb tip, 8 = index tip
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const palmBase = landmarks[0];  // Wrist
        const middleMcp = landmarks[9]; // Middle finger base
        
        // Calculate pinch distance (normalized)
        const pinchDistance = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) +
            Math.pow(thumbTip.y - indexTip.y, 2) +
            Math.pow(thumbTip.z - indexTip.z, 2)
        );
        
        // Calculate pinch strength (1 = full pinch, 0 = no pinch)
        currentHandData.pinchStrength = Math.max(0, Math.min(1, 
            1 - (pinchDistance / (CONFIG.PINCH_END_THRESHOLD * 2))
        ));
        
        const wasPinching = currentHandData.isPinching;
        
        // Use hysteresis: different thresholds for start vs end
        // To START pinching: fingers must be very close (tight threshold)
        // To STOP pinching: fingers must be farther apart (loose threshold)
        let isPinching;
        if (wasPinching) {
            // Currently pinching - use loose threshold to END
            isPinching = pinchDistance < CONFIG.PINCH_END_THRESHOLD;
        } else {
            // Not pinching - use tight threshold to START
            isPinching = pinchDistance < CONFIG.PINCH_START_THRESHOLD;
        }
        
        // Calculate pinch position (midpoint between thumb and index)
        const rawPinchX = (thumbTip.x + indexTip.x) / 2;
        const rawPinchY = (thumbTip.y + indexTip.y) / 2;
        
        // Convert to canvas coordinates (0-1 to pixel)
        // Note: x is inverted because video is mirrored
        const canvasWidth = window.innerWidth;
        const canvasHeight = window.innerHeight;
        
        const pinchX = (1 - rawPinchX) * canvasWidth;
        const pinchY = rawPinchY * canvasHeight;
        
        // Smooth the position
        currentHandData.smoothedPosition.x = lerp(
            currentHandData.smoothedPosition.x,
            pinchX,
            CONFIG.SMOOTHING_FACTOR
        );
        currentHandData.smoothedPosition.y = lerp(
            currentHandData.smoothedPosition.y,
            pinchY,
            CONFIG.SMOOTHING_FACTOR
        );
        
        currentHandData.pinchPosition = {
            x: currentHandData.smoothedPosition.x,
            y: currentHandData.smoothedPosition.y
        };
        
        // Calculate palm position
        const palmX = (1 - ((palmBase.x + middleMcp.x) / 2)) * canvasWidth;
        const palmY = ((palmBase.y + middleMcp.y) / 2) * canvasHeight;
        currentHandData.palmPosition = { x: palmX, y: palmY };
        
        // Handle pinch state changes with release confirmation
        if (isPinching && !wasPinching) {
            // Pinch started - immediate
            releaseFrameCount = 0;
            currentHandData.isPinching = true;
            if (onPinchStart) onPinchStart(currentHandData);
        } else if (isPinching && wasPinching) {
            // Pinch continuing
            releaseFrameCount = 0;  // Reset release counter
            if (onPinchMove) onPinchMove(currentHandData);
        } else if (!isPinching && wasPinching) {
            // Potential release - require confirmation over multiple frames
            releaseFrameCount++;
            
            if (releaseFrameCount >= CONFIG.RELEASE_CONFIRM_FRAMES) {
                // Confirmed release
                currentHandData.isPinching = false;
                releaseFrameCount = 0;
                if (onPinchEnd) onPinchEnd(currentHandData);
            } else {
                // Not confirmed yet - still treat as pinching
                isPinching = true;
                if (onPinchMove) onPinchMove(currentHandData);
            }
        }
        
        currentHandData.isPinching = isPinching;
    }
    
    // Draw hand landmarks for debug visualization
    function drawHandLandmarks(landmarks) {
        const width = handCanvasElement.width;
        const height = handCanvasElement.height;
        
        // Connection pairs for drawing skeleton
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],     // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8],     // Index
            [0, 9], [9, 10], [10, 11], [11, 12], // Middle
            [0, 13], [13, 14], [14, 15], [15, 16], // Ring
            [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
            [5, 9], [9, 13], [13, 17]           // Palm
        ];
        
        // Draw connections
        handCtx.strokeStyle = '#00f5ff';
        handCtx.lineWidth = 2;
        handCtx.shadowBlur = 10;
        handCtx.shadowColor = '#00f5ff';
        
        for (const [i, j] of connections) {
            const start = landmarks[i];
            const end = landmarks[j];
            
            handCtx.beginPath();
            handCtx.moveTo(start.x * width, start.y * height);
            handCtx.lineTo(end.x * width, end.y * height);
            handCtx.stroke();
        }
        
        // Draw landmarks
        for (let i = 0; i < landmarks.length; i++) {
            const landmark = landmarks[i];
            const x = landmark.x * width;
            const y = landmark.y * height;
            
            // Highlight thumb tip (4) and index tip (8)
            if (i === 4 || i === 8) {
                handCtx.fillStyle = '#ff00ff';
                handCtx.shadowColor = '#ff00ff';
                handCtx.beginPath();
                handCtx.arc(x, y, 6, 0, Math.PI * 2);
                handCtx.fill();
            } else {
                handCtx.fillStyle = '#00f5ff';
                handCtx.shadowColor = '#00f5ff';
                handCtx.beginPath();
                handCtx.arc(x, y, 3, 0, Math.PI * 2);
                handCtx.fill();
            }
        }
        
        // Draw pinch indicator
        if (currentHandData.isPinching) {
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const midX = ((thumbTip.x + indexTip.x) / 2) * width;
            const midY = ((thumbTip.y + indexTip.y) / 2) * height;
            
            handCtx.fillStyle = '#ffff00';
            handCtx.shadowColor = '#ffff00';
            handCtx.shadowBlur = 20;
            handCtx.beginPath();
            handCtx.arc(midX, midY, 10, 0, Math.PI * 2);
            handCtx.fill();
        }
        
        handCtx.shadowBlur = 0;
    }
    
    // Linear interpolation helper
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    // Set callback functions
    function setCallbacks(callbacks) {
        if (callbacks.onHandDetected) onHandDetected = callbacks.onHandDetected;
        if (callbacks.onHandLost) onHandLost = callbacks.onHandLost;
        if (callbacks.onPinchStart) onPinchStart = callbacks.onPinchStart;
        if (callbacks.onPinchMove) onPinchMove = callbacks.onPinchMove;
        if (callbacks.onPinchEnd) onPinchEnd = callbacks.onPinchEnd;
        if (callbacks.onHandUpdate) onHandUpdate = callbacks.onHandUpdate;
    }
    
    // Get current hand data
    function getHandData() {
        return { ...currentHandData };
    }
    
    // Check if hand is detected
    function isTracking() {
        return isHandDetected;
    }
    
    // Check if initialized
    function isReady() {
        return isInitialized;
    }
    
    // Cleanup
    function destroy() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        isInitialized = false;
        isHandDetected = false;
    }
    
    // Public API
    return {
        init,
        setCallbacks,
        getHandData,
        isTracking,
        isReady,
        destroy,
        CONFIG
    };
})();
