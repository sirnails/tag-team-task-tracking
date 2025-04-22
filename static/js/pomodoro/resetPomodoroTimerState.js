import { stopPomodoroTimerUpdates } from './pomodoroTimerUpdates.js';
import { updatePomodoroTimer } from './updatePomodoroTimer.js';
import { updatePomodoroProgress } from './updatePomodoroProgress.js';
import { updatePomodoroButtonState } from './pomodoroButtonState.js';

// Reset timer state when switching rooms
export function resetPomodoroTimerState(setIsRunning, totalTime, setEndTime, DEFAULT_TOTAL_TIME) {
    const pomodoroToggle = document.getElementById('pomodoroToggle');
    
    setIsRunning(false);
    setEndTime(null);
    stopPomodoroTimerUpdates();
    updatePomodoroTimer(totalTime, totalTime);
    updatePomodoroProgress(0, totalTime, DEFAULT_TOTAL_TIME);
    pomodoroToggle.innerHTML = '<i class="fas fa-play"></i> Start';
    updatePomodoroButtonState();
}
