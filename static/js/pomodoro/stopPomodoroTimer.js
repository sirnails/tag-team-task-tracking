import { sendTimerUpdate } from '../websocket/websocket.js';
import { stopPomodoroTimerUpdates } from './pomodoroTimerUpdates.js';
import { updatePomodoroTimer } from './updatePomodoroTimer.js';
import { updatePomodoroProgress } from './updatePomodoroProgress.js';
import { createPomodoroConfetti } from './pomodoroConfetti.js';

// Function to stop the timer, extracted from toggleTimer for external use
export function stopPomodoroTimer(isRunning, setIsRunning, totalTime, setEndTime) {
    if (!isRunning) return; // Don't do anything if timer is already stopped
    
    const pomodoroToggle = document.getElementById('pomodoroToggle');
    setIsRunning(false);
    pomodoroToggle.innerHTML = '<i class="fas fa-play"></i> Start';
    
    // Tell server to stop the timer
    sendTimerUpdate({
        isRunning: false,
        elapsedTime: 0,
        endTime: null
    });
    
    // Reset client-side state
    setEndTime(null);
    stopPomodoroTimerUpdates();
    
    updatePomodoroTimer(totalTime, totalTime);
    updatePomodoroProgress(0, totalTime, totalTime);
    createPomodoroConfetti(); // Show confetti when stopping the timer
}
