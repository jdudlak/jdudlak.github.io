document.addEventListener("DOMContentLoaded", function(event) {

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const waveformSelect = document.getElementById("waveform");
    const globalGain = audioCtx.createGain();
    globalGain.gain.setValueAtTime(0.8, audioCtx.currentTime);
    globalGain.connect(audioCtx.destination);


    const keyboardFrequencyMap = {
        '90': 261.625565300598634,  //Z - C4
        '83': 277.182630976872096, //S - C#4
        '88': 293.664767917407560,  //X - D4
        '68': 311.126983722080910, //D - D#4
        '67': 329.627556912869929,  //C - E4
        '86': 349.228231433003884,  //V - F4
        '71': 369.994422711634398, //G - F#4
        '66': 391.995435981749294,  //B - G4
        '72': 415.304697579945138, //H - G#4
        '78': 440.000000000000000,  //N - A4
        '74': 466.163761518089916, //J - A#4
        '77': 493.883301256124111,  //M - B4
        '81': 523.251130601197269,  //Q - C5
        '50': 554.365261953744192, //2 - C#5
        '87': 587.329535834815120,  //W - D5
        '51': 622.253967444161821, //3 - D#5
        '69': 659.255113825739859,  //E - E5
        '82': 698.456462866007768,  //R - F5
        '53': 739.988845423268797, //5 - F#5
        '84': 783.990871963498588,  //T - G5
        '54': 830.609395159890277, //6 - G#5
        '89': 880.000000000000000,  //Y - A5
        '55': 932.327523036179832, //7 - A#5
        '85': 987.766602512248223,  //U - B5
    }

    // map note to color
    const noteColorMap = {
        '90': '#FF6B6B', 
        '83': '#FF8E53',  
        '88': '#FFA500', 
        '68': '#FFD93D', 
        '67': '#FFEB3B',
        '86': '#C6FF00', 
        '71': '#4CAF50',  
        '66': '#00BCD4', 
        '72': '#2196F3', 
        '78': '#3F51B5', 
        '74': '#9C27B0', 
        '77': '#E91E63',  
        '81': '#FF1744',  
        '50': '#FF6E40',  
        '87': '#FF9100',  
        '51': '#FFEA00',  
        '69': '#AEEA00',  
        '82': '#64DD17',  
        '53': '#00E676',  
        '84': '#1DE9B6',  
        '54': '#00B0FF',  
        '89': '#2979FF',  
        '55': '#D500F9',  
        '85': '#F50057',  
    };

    const ATTACK_TIME = 0.02;
    const DECAY_TIME = 0.1;
    const SUSTAIN_LEVEL = 0.6;
    const RELEASE_TIME = 0.25;

    window.addEventListener('keydown', keyDown, false);
    window.addEventListener('keyup', keyUp, false);

    function highlightKey(key, active) {
        const keyDiv = document.querySelector(`.key[data-key='${key}']`);
        if(keyDiv) {
            if(active) keyDiv.classList.add("active");
            else keyDiv.classList.remove("active");
        }
    }

    function updateBackgroundColor() {
        const activeKeys = Object.keys(activeNotes);
        
        if (activeKeys.length === 0) {
            document.body.style.backgroundColor = '#2a2a2a';
        } else if (activeKeys.length === 1) {
            document.body.style.backgroundColor = noteColorMap[activeKeys[0]];
        } else {
            // blend colors if multiple notes
            const colors = activeKeys.map(key => noteColorMap[key]);
            const blendedColor = blendColors(colors);
            document.body.style.backgroundColor = blendedColor;
        }
    }

    function blendColors(colors) {
        let r = 0, g = 0, b = 0;
        
        colors.forEach(color => {
            const rgb = hexToRgb(color);
            r += rgb.r;
            g += rgb.g;
            b += rgb.b;
        });
        
        r = Math.round(r / colors.length);
        g = Math.round(g / colors.length);
        b = Math.round(b / colors.length);
        
        return `rgb(${r}, ${g}, ${b})`;
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function rebalanceGains() {
        const numNotes = Object.keys(activeNotes).length;
        if (numNotes === 0) return;

        const perNoteGain = 1 / numNotes;

        Object.values(activeNotes).forEach(({ gainNode }) => {
            gainNode.gain.setTargetAtTime(
            perNoteGain * SUSTAIN_LEVEL,
            audioCtx.currentTime,
            0.01
            );
        });
    }

    const activeNotes = {};
    function keyDown(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && !activeNotes[key]) {
            highlightKey(key, true);
            playNote(key);
            updateBackgroundColor();
        }
    }

    function keyUp(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && activeNotes[key]) {
            highlightKey(key, false);
            const { osc, gainNode } = activeNotes[key];
            gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
            gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + RELEASE_TIME);
            osc.stop(audioCtx.currentTime + RELEASE_TIME);
            delete activeNotes[key];
            rebalanceGains();
            updateBackgroundColor();
        }
    }

    function playNote(key) {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.frequency.setValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime)
        const waveform = waveformSelect.value; 
        osc.type = waveform;

        gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime); // never start at 0
        gainNode.gain.exponentialRampToValueAtTime(1.0,  audioCtx.currentTime + ATTACK_TIME); // Attack
        gainNode.gain.exponentialRampToValueAtTime(
            SUSTAIN_LEVEL,
             audioCtx.currentTime + ATTACK_TIME + DECAY_TIME
        ); 

        osc.connect(gainNode).connect(globalGain);
        osc.start();
        activeNotes[key] = { osc, gainNode, waveform };
        rebalanceGains();
    }

})