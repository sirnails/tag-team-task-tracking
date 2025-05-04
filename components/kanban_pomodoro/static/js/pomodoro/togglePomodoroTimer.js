import { sendTimerUpdate } from '../websocket/websocket.js';
import { startPomodoroTimerUpdates } from './pomodoroTimerUpdates.js';
import { stopPomodoroTimer } from './stopPomodoroTimer.js';

export function togglePomodoroTimer(isRunning, setIsRunning, totalTime, setEndTime) {
    const pomodoroToggle = document.getElementById('pomodoroToggle');
    
    // Check if there's a task in progress before allowing to start
    const inProgressTasks = document.getElementById('inProgressTasks');
    const hasTask = inProgressTasks && 
                   Array.from(inProgressTasks.children)
                   .some(child => !child.classList.contains('empty-state'));
    
    // If trying to start with no task, don't proceed
    if (!isRunning && !hasTask) {
        console.log('Cannot start timer: No task in progress');
        return;
    }
    
    // If we're already running, call stopTimer instead of toggling
    if (isRunning) {
        stopPomodoroTimer(isRunning, setIsRunning, totalTime, setEndTime);
        return;
    }
    
    console.log('Starting Pomodoro timer');
    
    // Otherwise, we're starting the timer
    setIsRunning(true);
    
    // Start the timer
    pomodoroToggle.innerHTML = '<i class="fas fa-stop"></i> Stop';
    
    // Set client-side end time for display updates
    const newEndTime = (Date.now() / 1000) + totalTime;
    setEndTime(newEndTime);
    
    // Send update to server with force sync flag to ensure all clients update
    sendTimerUpdate({
        isRunning: true,
        totalTime: totalTime,
        elapsedTime: 0,
        endTime: newEndTime
    }, true);
    
    // Start client-side timer updates
    startPomodoroTimerUpdates(true, newEndTime, totalTime, totalTime, setIsRunning, setEndTime);
    
    // Visual feedback
    const timerDisplay = document.getElementById('timer');
    timerDisplay.classList.add('timer-started');
    setTimeout(() => timerDisplay.classList.remove('timer-started'), 1000);
}
