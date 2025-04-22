import { safeNumberConversion } from './safeNumberConversion.js';

export function updatePomodoroProgress(elapsedTime, totalTime, DEFAULT_TOTAL_TIME) {
    const progressBar = document.getElementById('progressBar');
    // Ensure elapsedTime is a valid number
    elapsedTime = safeNumberConversion(elapsedTime, 0);
    const total = safeNumberConversion(totalTime, DEFAULT_TOTAL_TIME);
    
    const progressPercentage = (elapsedTime / total) * 100;
    progressBar.style.width = `${Math.min(Math.max(progressPercentage, 0), 100)}%`;
}
