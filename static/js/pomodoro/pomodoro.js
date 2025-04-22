import { updatePomodoroButtonState } from './pomodoroButtonState.js';
import { safeNumberConversion } from './safeNumberConversion.js';
import { updatePomodoroTimer } from './updatePomodoroTimer.js';
import { updatePomodoroProgress } from './updatePomodoroProgress.js';
import { startPomodoroTimerUpdates, stopPomodoroTimerUpdates } from './pomodoroTimerUpdates.js';
import { createPomodoroConfetti } from './pomodoroConfetti.js';
import { handlePomodoroCompletion } from './handlePomodoroCompletion.js';
import { togglePomodoroTimer } from './togglePomodoroTimer.js';
import { stopPomodoroTimer } from './stopPomodoroTimer.js';
import { updatePomodoroTimerState } from './updatePomodoroTimerState.js';
import { resetPomodoroTimerState } from './resetPomodoroTimerState.js';
import { sendTimerUpdate } from '../websocket/websocket.js';

// DOM Elements
const timerDisplay = document.getElementById('timer');
const pomodoroToggle = document.getElementById('pomodoroToggle');
const progressBar = document.getElementById('progressBar');
const currentTaskDisplay = document.getElementById('currentTaskDisplay');

// Constants and state variables
const DEFAULT_TOTAL_TIME = 25 * 60; // 25 minutes in seconds
let totalTime = DEFAULT_TOTAL_TIME;  
let isRunning = false;
let endTime = null;

// State setters
const setIsRunning = (value) => isRunning = value;
const setTotalTime = (value) => totalTime = value;
const setEndTime = (value) => endTime = value;

// Event listener
pomodoroToggle.addEventListener('click', () => togglePomodoroTimer(isRunning, setIsRunning, totalTime, setEndTime));

// Initialize timer display
updatePomodoroTimer(totalTime, totalTime);
updatePomodoroProgress(0, totalTime, DEFAULT_TOTAL_TIME);

// Request notification permission
if (Notification.permission !== 'granted') {
    Notification.requestPermission();
}

// Initialize start button state
document.addEventListener('DOMContentLoaded', updatePomodoroButtonState);

// Wrapper functions that use the module state
const updateTimerState = (timerState) => updatePomodoroTimerState(
    timerState, DEFAULT_TOTAL_TIME, isRunning, setIsRunning, totalTime, setTotalTime, endTime, setEndTime
);

const resetTimerState = () => resetPomodoroTimerState(
    setIsRunning, totalTime, setEndTime, DEFAULT_TOTAL_TIME
);

const stopTimer = () => stopPomodoroTimer(
    isRunning, setIsRunning, totalTime, setEndTime
);

// Export functions for use in other modules
export { updateTimerState, resetTimerState, stopTimer, updatePomodoroButtonState as updateStartButtonState };