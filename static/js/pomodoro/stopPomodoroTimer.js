import { sendTimerUpdate } from '../websocket/websocket.js';
import { stopPomodoroTimerUpdates } from './pomodoroTimerUpdates.js';
import { updatePomodoroTimer } from './updatePomodoroTimer.js';
import { updatePomodoroProgress } from './updatePomodoroProgress.js';
import { createPomodoroConfetti } from './pomodoroConfetti.js';

// Function to stop the timer, extracted from toggleTimer for external use
export function stopPomodoroTimer(isRunning, setIsRunning, totalTime, setEndTime) {
    if (!isRunning) {
        console.log('Timer already stopped');
        return; // Don't do anything if timer is already stopped
    }
    
    console.log('Stopping Pomodoro timer');
    
    const pomodoroToggle = document.getElementById('pomodoroToggle');
    setIsRunning(false);
    pomodoroToggle.innerHTML = '<i class="fas fa-play"></i> Start';
    
    // Tell server to stop the timer with force sync to ensure all clients update
    sendTimerUpdate({
        isRunning: false,
        elapsedTime: 0,
        endTime: null
    }, true);
    
    // Reset client-side state
    setEndTime(null);
    stopPomodoroTimerUpdates();
    
    updatePomodoroTimer(totalTime, totalTime);
    updatePomodoroProgress(0, totalTime, totalTime);
    
    // Visual feedback for stopping
    const timerDisplay = document.getElementById('timer');
    timerDisplay.classList.add('timer-stopped');
    setTimeout(() => timerDisplay.classList.remove('timer-stopped'), 1000);
    
    createPomodoroConfetti(); // Show confetti when stopping the timer
}
