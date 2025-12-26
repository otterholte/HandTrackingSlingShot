// ========================================
// AUDIO MODULE
// Tron-style synthesized background music
// ========================================

const Audio = (function() {
    let audioContext = null;
    let masterGain = null;
    let isPlaying = false;
    let isInitialized = false;
    
    // Active audio nodes
    let bassOsc = null;
    let padOscs = [];
    let arpOsc = null;
    let arpGain = null;
    let arpInterval = null;
    let droneOscs = [];
    
    // Tron-style music parameters
    const CONFIG = {
        MASTER_VOLUME: 0.3,
        BASS_FREQ: 55,           // A1 - deep bass
        PAD_FREQS: [110, 165, 220, 330],  // Am chord frequencies
        ARP_NOTES: [220, 330, 440, 330, 220, 165, 220, 275],  // Arpeggiated pattern
        ARP_SPEED: 180,          // BPM
        DRONE_FREQS: [55, 82.5]  // Low drones
    };
    
    // Initialize audio context (must be called on user interaction)
    function init() {
        if (isInitialized) return true;
        
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain
            masterGain = audioContext.createGain();
            masterGain.gain.value = CONFIG.MASTER_VOLUME;
            masterGain.connect(audioContext.destination);
            
            isInitialized = true;
            console.log('Audio initialized');
            return true;
        } catch (e) {
            console.error('Failed to initialize audio:', e);
            return false;
        }
    }
    
    // Start the music
    function play() {
        if (!isInitialized) {
            if (!init()) return;
        }
        
        if (isPlaying) return;
        
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        isPlaying = true;
        
        // Start all layers
        startDrone();
        startBass();
        startPad();
        startArpeggio();
        
        console.log('Music started');
    }
    
    // Stop the music
    function stop() {
        if (!isPlaying) return;
        
        isPlaying = false;
        
        // Stop arpeggio
        if (arpInterval) {
            clearInterval(arpInterval);
            arpInterval = null;
        }
        
        // Fade out and stop all oscillators
        const fadeTime = 0.5;
        const now = audioContext.currentTime;
        
        // Stop bass
        if (bassOsc) {
            bassOsc.gain.gain.linearRampToValueAtTime(0, now + fadeTime);
            setTimeout(() => {
                if (bassOsc) {
                    bassOsc.osc.stop();
                    bassOsc = null;
                }
            }, fadeTime * 1000);
        }
        
        // Stop pads
        padOscs.forEach(pad => {
            if (pad) {
                pad.gain.gain.linearRampToValueAtTime(0, now + fadeTime);
                setTimeout(() => pad.osc.stop(), fadeTime * 1000);
            }
        });
        padOscs = [];
        
        // Stop drones
        droneOscs.forEach(drone => {
            if (drone) {
                drone.gain.gain.linearRampToValueAtTime(0, now + fadeTime);
                setTimeout(() => drone.osc.stop(), fadeTime * 1000);
            }
        });
        droneOscs = [];
        
        // Stop arpeggio
        if (arpOsc) {
            arpGain.gain.linearRampToValueAtTime(0, now + fadeTime);
            setTimeout(() => {
                if (arpOsc) {
                    arpOsc.stop();
                    arpOsc = null;
                }
            }, fadeTime * 1000);
        }
        
        console.log('Music stopped');
    }
    
    // Toggle music on/off
    function toggle() {
        if (isPlaying) {
            stop();
        } else {
            play();
        }
        return isPlaying;
    }
    
    // Create drone layer (low, atmospheric)
    function startDrone() {
        CONFIG.DRONE_FREQS.forEach((freq, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            
            filter.type = 'lowpass';
            filter.frequency.value = 200;
            filter.Q.value = 2;
            
            gain.gain.value = 0;
            gain.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 2);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            
            osc.start();
            droneOscs.push({ osc, gain, filter });
        });
    }
    
    // Create bass layer (pulsing)
    function startBass() {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.value = CONFIG.BASS_FREQ;
        
        filter.type = 'lowpass';
        filter.frequency.value = 150;
        
        gain.gain.value = 0;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        
        osc.start();
        bassOsc = { osc, gain, filter };
        
        // Pulsing effect
        pulseBass();
    }
    
    // Pulse the bass
    function pulseBass() {
        if (!isPlaying || !bassOsc) return;
        
        const now = audioContext.currentTime;
        const beatDuration = 60 / CONFIG.ARP_SPEED * 2;
        
        bassOsc.gain.gain.setValueAtTime(0.25, now);
        bassOsc.gain.gain.linearRampToValueAtTime(0.1, now + beatDuration * 0.8);
        
        setTimeout(() => pulseBass(), beatDuration * 1000);
    }
    
    // Create pad layer (ambient chords)
    function startPad() {
        CONFIG.PAD_FREQS.forEach((freq, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            // Slight detune for richness
            osc.detune.value = (Math.random() - 0.5) * 10;
            
            filter.type = 'lowpass';
            filter.frequency.value = 800;
            filter.Q.value = 1;
            
            gain.gain.value = 0;
            gain.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 3);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            
            osc.start();
            padOscs.push({ osc, gain, filter });
        });
        
        // Slowly modulate pad filter
        modulatePad();
    }
    
    // Modulate pad filter for movement
    function modulatePad() {
        if (!isPlaying || padOscs.length === 0) return;
        
        padOscs.forEach(pad => {
            if (pad && pad.filter) {
                const now = audioContext.currentTime;
                const freq = 400 + Math.random() * 600;
                pad.filter.frequency.linearRampToValueAtTime(freq, now + 4);
            }
        });
        
        setTimeout(() => modulatePad(), 4000);
    }
    
    // Create arpeggio layer (Tron-style sequenced notes)
    function startArpeggio() {
        arpOsc = audioContext.createOscillator();
        arpGain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        arpOsc.type = 'square';
        arpOsc.frequency.value = CONFIG.ARP_NOTES[0];
        
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        filter.Q.value = 5;
        
        arpGain.gain.value = 0;
        
        arpOsc.connect(filter);
        filter.connect(arpGain);
        arpGain.connect(masterGain);
        
        arpOsc.start();
        
        // Start arpeggio sequence
        let noteIndex = 0;
        const beatDuration = 60 / CONFIG.ARP_SPEED * 1000;
        
        arpInterval = setInterval(() => {
            if (!isPlaying || !arpOsc) return;
            
            const note = CONFIG.ARP_NOTES[noteIndex];
            const now = audioContext.currentTime;
            
            arpOsc.frequency.setValueAtTime(note, now);
            arpGain.gain.setValueAtTime(0.12, now);
            arpGain.gain.linearRampToValueAtTime(0.02, now + 0.1);
            
            noteIndex = (noteIndex + 1) % CONFIG.ARP_NOTES.length;
        }, beatDuration);
    }
    
    // Set volume (0-1)
    function setVolume(vol) {
        if (masterGain) {
            masterGain.gain.value = vol * CONFIG.MASTER_VOLUME;
        }
    }
    
    // Check if playing
    function getIsPlaying() {
        return isPlaying;
    }
    
    // Cleanup
    function destroy() {
        stop();
        if (audioContext) {
            audioContext.close();
        }
        audioContext = null;
        masterGain = null;
        isInitialized = false;
    }
    
    // Public API
    return {
        init,
        play,
        stop,
        toggle,
        setVolume,
        isPlaying: getIsPlaying,
        destroy
    };
})();

