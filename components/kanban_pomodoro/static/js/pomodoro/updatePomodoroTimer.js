import { safeNumberConversion } from './safeNumberConversion.js';

export function updatePomodoroTimer(timeLeft, totalTime) {
    const timerDisplay = document.getElementById('timer');
    // Ensure timeLeft is a valid number
    timeLeft = safeNumberConversion(timeLeft, totalTime);
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = Math.floor(timeLeft % 60);
    
    // Ensure minutes and seconds are valid numbers before formatting
    const minStr = (!isNaN(minutes) && isFinite(minutes)) ? 
        minutes.toString().padStart(2, '0') : '25';
    const secStr = (!isNaN(seconds) && isFinite(seconds)) ? 
        seconds.toString().padStart(2, '0') : '00';
    
    timerDisplay.textContent = `${minStr}:${secStr}`;
}
