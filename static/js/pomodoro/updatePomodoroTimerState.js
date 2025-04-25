import { safeNumberConversion } from './safeNumberConversion.js';
import { sendTimerUpdate } from '../websocket/websocket.js';
import { startPomodoroTimerUpdates, stopPomodoroTimerUpdates } from './pomodoroTimerUpdates.js';
import { updatePomodoroTimer } from './updatePomodoroTimer.js';
import { updatePomodoroProgress } from './updatePomodoroProgress.js';
import { handlePomodoroCompletion } from './handlePomodoroCompletion.js';
import { updatePomodoroButtonState } from './pomodoroButtonState.js';

export function updatePomodoroTimerState(timerState, DEFAULT_TOTAL_TIME, isRunning, setIsRunning, totalTime, setTotalTime, endTime, setEndTime) {
    const pomodoroToggle = document.getElementById('pomodoroToggle');
    
    console.log('Received timer state:', timerState);
    if (!timerState) {
        console.error('Invalid timer state received');
        return;
    }
    
    // Dispatch event for other components to react to timer state changes
    document.dispatchEvent(new CustomEvent('pomodoroStateChanged', { 
        detail: { timerState, isRunning: !!timerState.isRunning } 
    }));
    
    // Update total time if provided and valid
    if (timerState.totalTime) {
        const newTotalTime = safeNumberConversion(timerState.totalTime, DEFAULT_TOTAL_TIME);
        setTotalTime(newTotalTime);
    }
    
    // Update running state
    const wasRunning = isRunning;
    const newIsRunning = !!timerState.isRunning;
    setIsRunning(newIsRunning);
    
    // Update button to match state
    pomodoroToggle.innerHTML = newIsRunning ? 
        '<i class="fas fa-stop"></i> Stop' : 
        '<i class="fas fa-play"></i> Start';
    
    // Add visual indicator for sync status
    const timerDisplay = document.getElementById('timer');
    timerDisplay.classList.toggle('synced', true);
    setTimeout(() => timerDisplay.classList.toggle('synced', false), 1000);
    
    if (newIsRunning) {
        if (timerState.endTime) {
            // Store server end time (ensure it's a number)
            const serverEndTime = safeNumberConversion(timerState.endTime, null);
            
            if (serverEndTime) {
                console.log(`Syncing to server endTime: ${new Date(serverEndTime * 1000).toISOString()}`);
                setEndTime(serverEndTime);
                
                // Calculate current time left based on end time
                const now = Date.now() / 1000;
                const timeLeft = Math.max(0, Math.round(serverEndTime - now));
                const elapsedTime = Math.min(totalTime, totalTime - timeLeft);
                
                // Update display
                updatePomodoroTimer(timeLeft, totalTime);
                updatePomodoroProgress(elapsedTime, totalTime, DEFAULT_TOTAL_TIME);
                
                // Start client-side timer updates if not already running
                if (!wasRunning) {
                    startPomodoroTimerUpdates(newIsRunning, serverEndTime, totalTime, DEFAULT_TOTAL_TIME, setIsRunning, setEndTime);
                }
            } else {
                console.error('Invalid endTime from server:', timerState.endTime);
                // If server sent an invalid end time, create a new one and broadcast it
                const newEndTime = (Date.now() / 1000) + totalTime;
                setEndTime(newEndTime);
                sendTimerUpdate({
                    isRunning: true,
                    totalTime: totalTime,
                    endTime: newEndTime
                }, true); // Force sync to all clients
                startPomodoroTimerUpdates(newIsRunning, newEndTime, totalTime, DEFAULT_TOTAL_TIME, setIsRunning, setEndTime);
            }
        } else {
            // No end time but timer is running - create one and broadcast it
            console.warn('No endTime but timer running, creating one');
            const newEndTime = (Date.now() / 1000) + totalTime;
            setEndTime(newEndTime);
            sendTimerUpdate({
                isRunning: true,
                totalTime: totalTime,
                endTime: newEndTime
            }, true); // Force sync to all clients
            startPomodoroTimerUpdates(newIsRunning, newEndTime, totalTime, DEFAULT_TOTAL_TIME, setIsRunning, setEndTime);
        }
    } else {
        // Timer is stopped
        setEndTime(null);
        stopPomodoroTimerUpdates();
        
        // Reset display to full time
        updatePomodoroTimer(totalTime, totalTime);
        updatePomodoroProgress(0, totalTime, DEFAULT_TOTAL_TIME);
    }
    
    // Handle completed timer
    if (timerState.elapsedTime >= totalTime && !newIsRunning) {
        handlePomodoroCompletion();
    }
    
    // Update start button state after receiving timer state
    updatePomodoroButtonState();
}
