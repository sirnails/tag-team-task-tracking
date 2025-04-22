import { updatePomodoroTimer } from './updatePomodoroTimer.js';
import { updatePomodoroProgress } from './updatePomodoroProgress.js';
import { handlePomodoroCompletion } from './handlePomodoroCompletion.js';

let timerInterval = null;

// Create a client-side interval to update the display
export function startPomodoroTimerUpdates(isRunning, endTime, totalTime, DEFAULT_TOTAL_TIME, setIsRunning, setEndTime) {
    stopPomodoroTimerUpdates(); // Clear any existing interval
    const pomodoroToggle = document.getElementById('pomodoroToggle');
    
    timerInterval = setInterval(() => {
        if (isRunning && endTime) {
            const now = Date.now() / 1000;
            const timeLeft = Math.max(0, Math.round(endTime - now));
            const elapsedTime = Math.min(totalTime, totalTime - timeLeft);
            
            updatePomodoroTimer(timeLeft, totalTime);
            updatePomodoroProgress(elapsedTime, totalTime, DEFAULT_TOTAL_TIME);
            
            // If timer completes during this client-side update
            if (timeLeft === 0) {
                handlePomodoroCompletion();
                setIsRunning(false);
                setEndTime(null);
                stopPomodoroTimerUpdates();
                pomodoroToggle.innerHTML = '<i class="fas fa-play"></i> Start';
            }
        }
    }, 250); // Update 4 times per second for smoother display
}

export function stopPomodoroTimerUpdates() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}
