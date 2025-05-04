import { updatePomodoroTimer } from './updatePomodoroTimer.js';
import { updatePomodoroProgress } from './updatePomodoroProgress.js';
import { handlePomodoroCompletion } from './handlePomodoroCompletion.js';
import { sendTimerUpdate } from '../websocket/websocket.js';

let timerInterval = null;
const UPDATE_FREQUENCY = 250; // Update 4 times per second for smoother display

// Create a client-side interval to update the display
export function startPomodoroTimerUpdates(isRunning, endTime, totalTime, DEFAULT_TOTAL_TIME, setIsRunning, setEndTime) {
    stopPomodoroTimerUpdates(); // Clear any existing interval
    const pomodoroToggle = document.getElementById('pomodoroToggle');
    
    console.log(`Starting timer updates with endTime: ${new Date(endTime * 1000).toISOString()}`);
    
    // Initial update immediately
    updateTimerDisplay();
    
    timerInterval = setInterval(updateTimerDisplay, UPDATE_FREQUENCY);
    
    function updateTimerDisplay() {
        if (isRunning && endTime) {
            const now = Date.now() / 1000;
            const timeLeft = Math.max(0, Math.round(endTime - now));
            const elapsedTime = Math.min(totalTime, totalTime - timeLeft);
            
            updatePomodoroTimer(timeLeft, totalTime);
            updatePomodoroProgress(elapsedTime, totalTime, DEFAULT_TOTAL_TIME);
            
            // For debugging, periodically log time remaining
            if (timeLeft % 5 === 0) {
                console.log(`Timer update: ${timeLeft}s remaining`);
            }
            
            // If timer completes during this client-side update
            if (timeLeft === 0) {
                console.log('Timer completed');
                handlePomodoroCompletion();
                setIsRunning(false);
                setEndTime(null);
                stopPomodoroTimerUpdates();
                pomodoroToggle.innerHTML = '<i class="fas fa-play"></i> Start';
                
                // Notify server that timer has completed
                sendTimerUpdate({
                    isRunning: false,
                    elapsedTime: totalTime,
                    endTime: null
                }, true);
            }
        }
    }
}

export function stopPomodoroTimerUpdates() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        console.log('Timer updates stopped');
    }
}
