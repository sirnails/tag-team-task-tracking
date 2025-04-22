import { sendTimerUpdate } from '../websocket/websocket.js';

const timerDisplay = document.getElementById('timer');
const pomodoroToggle = document.getElementById('pomodoroToggle');
const progressBar = document.getElementById('progressBar');
const currentTaskDisplay = document.getElementById('currentTaskDisplay');

// Constants and state variables
const DEFAULT_TOTAL_TIME = 25 * 60; // 25 minutes in seconds
let totalTime = DEFAULT_TOTAL_TIME;  
let isRunning = false;
let timerInterval = null;
let endTime = null;

// Add function to update start button state based on task presence
function updateStartButtonState() {
    const inProgressTasks = document.getElementById('inProgressTasks');
    // Check if there are any non-empty-state elements in the in-progress column
    const hasTask = inProgressTasks && 
                   Array.from(inProgressTasks.children)
                   .some(child => !child.classList.contains('empty-state'));
    
    // Disable the start button if no task is in progress
    pomodoroToggle.disabled = !hasTask;
    pomodoroToggle.classList.toggle('disabled', !hasTask);
}

// Safe number conversion helper
function safeNumber(value, defaultValue) {
    const num = Number(value);
    return (!isNaN(num) && isFinite(num)) ? num : defaultValue;
}

function updateTimerDisplay(timeLeft) {
    // Ensure timeLeft is a valid number
    timeLeft = safeNumber(timeLeft, totalTime);
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = Math.floor(timeLeft % 60);
    
    // Ensure minutes and seconds are valid numbers before formatting
    const minStr = (!isNaN(minutes) && isFinite(minutes)) ? 
        minutes.toString().padStart(2, '0') : '25';
    const secStr = (!isNaN(seconds) && isFinite(seconds)) ? 
        seconds.toString().padStart(2, '0') : '00';
    
    timerDisplay.textContent = `${minStr}:${secStr}`;
}

function updateProgressBar(elapsedTime) {
    // Ensure elapsedTime is a valid number
    elapsedTime = safeNumber(elapsedTime, 0);
    const total = safeNumber(totalTime, DEFAULT_TOTAL_TIME);
    
    const progressPercentage = (elapsedTime / total) * 100;
    progressBar.style.width = `${Math.min(Math.max(progressPercentage, 0), 100)}%`;
}

// Create a client-side interval to update the display
function startClientTimerUpdates() {
    stopClientTimerUpdates(); // Clear any existing interval
    
    timerInterval = setInterval(() => {
        if (isRunning && endTime) {
            const now = Date.now() / 1000;
            const timeLeft = Math.max(0, Math.round(endTime - now));
            const elapsedTime = Math.min(totalTime, totalTime - timeLeft);
            
            updateTimerDisplay(timeLeft);
            updateProgressBar(elapsedTime);
            
            // If timer completes during this client-side update
            if (timeLeft === 0) {
                handlePomodoroComplete();
                isRunning = false;
                endTime = null;
                stopClientTimerUpdates();
                pomodoroToggle.innerHTML = '<i class="fas fa-play"></i> Start';
            }
        }
    }, 250); // Update 4 times per second for smoother display
}

function stopClientTimerUpdates() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function createConfetti() {
    const colors = ['#6c5ce7', '#00b894', '#fd79a8', '#fdcb6e', '#0984e3'];
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = `${Math.random() * 10 + 5}px`;
        confetti.style.height = `${Math.random() * 10 + 5}px`;
        confetti.style.animationDuration = `${Math.random() * 2 + 2}s`;
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 3000);
    }
}

function handlePomodoroComplete() {
    const currentPomodoroTask = document.getElementById('currentPomodoroTask');
    // Celebration effects
    createConfetti();
    
    // Notification
    if (Notification.permission === 'granted') {
        new Notification('Pomodoro Completed!', {
            body: 'Great job! Take a short break.',
            icon: 'https://cdn-icons-png.flaticon.com/512/2829/2829034.png'
        });
    }
    
    // Move current task to Done if it exists
    if (currentPomodoroTask.firstChild && !currentPomodoroTask.firstChild.classList.contains('empty-state')) {
        const completedTask = currentPomodoroTask.firstChild;
        currentPomodoroTask.removeChild(completedTask);
        
        // Add checkmark animation
        completedTask.style.position = 'relative';
        completedTask.style.overflow = 'hidden';
        const checkmark = document.createElement('div');
        checkmark.innerHTML = '<i class="fas fa-check" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--secondary);"></i>';
        completedTask.appendChild(checkmark);
        
        document.getElementById('doneTasks').appendChild(completedTask);
        
        // Add empty state back if no tasks left
        if (currentPomodoroTask.children.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-state';
            emptyDiv.textContent = 'Drag a task here';
            currentPomodoroTask.appendChild(emptyDiv);
        }
        
        currentTaskDisplay.innerHTML = '<i class="fas fa-clock"></i> No task selected';
    }
}

function toggleTimer() {
    // Check if there's a task in progress before allowing to start
    const inProgressTasks = document.getElementById('inProgressTasks');
    const hasTask = inProgressTasks && 
                   Array.from(inProgressTasks.children)
                   .some(child => !child.classList.contains('empty-state'));
    
    // If trying to start with no task, don't proceed
    if (!isRunning && !hasTask) {
        return;
    }
    
    // If we're already running, call stopTimer instead of toggling
    if (isRunning) {
        stopTimer();
        return;
    }
    
    // Otherwise, we're starting the timer
    isRunning = true;
    
    // Start the timer
    pomodoroToggle.innerHTML = '<i class="fas fa-stop"></i> Stop';
    
    // Set client-side end time for display updates
    endTime = (Date.now() / 1000) + totalTime;
    
    // Send update to server
    sendTimerUpdate({
        isRunning: true,
        totalTime: totalTime,
        elapsedTime: 0,
        endTime: endTime
    });
    
    // Start client-side timer updates
    startClientTimerUpdates();
}

// Function to stop the timer, extracted from toggleTimer for external use
function stopTimer() {
    if (!isRunning) return; // Don't do anything if timer is already stopped

    isRunning = false;
    pomodoroToggle.innerHTML = '<i class="fas fa-play"></i> Start';
    
    // Tell server to stop the timer
    sendTimerUpdate({
        isRunning: false,
        elapsedTime: 0,
        endTime: null
    });
    
    // Reset client-side state
    endTime = null;
    stopClientTimerUpdates();
    
    updateTimerDisplay(totalTime);
    updateProgressBar(0);
    createConfetti(); // Show confetti when stopping the timer
    
    // Instead of reloading the page, which might be causing issues,
    // we'll just trust the client-side state changes we made above
    // The next time the server sends an update, it will reflect the stopped state
}

function updateTimerState(timerState) {
    console.log('Received timer state:', timerState);
    if (!timerState) {
        return;
    }
    
    // Update total time if provided and valid
    if (timerState.totalTime) {
        totalTime = safeNumber(timerState.totalTime, DEFAULT_TOTAL_TIME);
    }
    
    // Update running state
    const wasRunning = isRunning;
    isRunning = !!timerState.isRunning;
    
    // Update button to match state
    pomodoroToggle.innerHTML = isRunning ? 
        '<i class="fas fa-stop"></i> Stop' : 
        '<i class="fas fa-play"></i> Start';
    
    // Handle end time when timer is running
    if (isRunning) {
        if (timerState.endTime) {
            // Store server end time (ensure it's a number)
            const serverEndTime = safeNumber(timerState.endTime, null);
            
            if (serverEndTime) {
                endTime = serverEndTime;
                
                // Calculate current time left based on end time
                const now = Date.now() / 1000;
                const timeLeft = Math.max(0, Math.round(endTime - now));
                const elapsedTime = Math.min(totalTime, totalTime - timeLeft);
                
                // Update display
                updateTimerDisplay(timeLeft);
                updateProgressBar(elapsedTime);
                
                // Start client-side timer updates if not already running
                if (!wasRunning) {
                    startClientTimerUpdates();
                }
            } else {
                // If server sent an invalid end time, create a new one
                console.warn('Invalid endTime from server, creating new one');
                endTime = (Date.now() / 1000) + totalTime;
                sendTimerUpdate({
                    isRunning: true,
                    totalTime: totalTime,
                    endTime: endTime
                });
                startClientTimerUpdates();
            }
        } else {
            // No end time but timer is running - create one
            console.warn('No endTime but timer running, creating one');
            endTime = (Date.now() / 1000) + totalTime;
            sendTimerUpdate({
                isRunning: true,
                totalTime: totalTime,
                endTime: endTime
            });
            startClientTimerUpdates();
        }
    } else {
        // Timer is stopped
        endTime = null;
        stopClientTimerUpdates();
        
        // Reset display to full time
        updateTimerDisplay(totalTime);
        updateProgressBar(0);
    }
    
    // Handle completed timer
    if (timerState.elapsedTime >= totalTime && !isRunning) {
        handlePomodoroComplete();
    }
    
    // Update start button state after receiving timer state
    updateStartButtonState();
}

// Reset timer state when switching rooms
function resetTimerState() {
    isRunning = false;
    endTime = null;
    stopClientTimerUpdates();
    updateTimerDisplay(totalTime);
    updateProgressBar(0);
    pomodoroToggle.innerHTML = '<i class="fas fa-play"></i> Start';
    updateStartButtonState();
}

// Event listener
pomodoroToggle.addEventListener('click', toggleTimer);

// Initialize timer display
updateTimerDisplay(totalTime);
updateProgressBar(0);

// Request notification permission
if (Notification.permission !== 'granted') {
    Notification.requestPermission();
}

// Initialize start button state
document.addEventListener('DOMContentLoaded', updateStartButtonState);

// Export functions for use in other modules
export { updateTimerState, resetTimerState, stopTimer, updateStartButtonState };