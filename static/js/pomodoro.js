import { sendTimerUpdate } from './websocket.js';

const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startPomodoro');
const stopBtn = document.getElementById('stopPomodoro');
const resetBtn = document.getElementById('resetPomodoro');
const progressBar = document.getElementById('progressBar');
const currentTaskDisplay = document.getElementById('currentTaskDisplay');

const totalTime = 25 * 60;

function updateTimerDisplay(timeLeft) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateProgressBar(elapsedTime) {
    const progressPercentage = (elapsedTime / totalTime) * 100;
    progressBar.style.width = `${Math.min(progressPercentage, 100)}%`;
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

function startTimer() {
    console.log('Start timer clicked');
    sendTimerUpdate({
        timeLeft: totalTime,
        isRunning: true,
        elapsedTime: 0,
        lastUpdate: Date.now() / 1000
    });
}

function stopTimer() {
    console.log('Stop timer clicked');
    sendTimerUpdate({
        isRunning: false
    });
}

function resetTimer() {
    console.log('Reset timer clicked');
    sendTimerUpdate({
        timeLeft: totalTime,
        isRunning: false,
        elapsedTime: 0,
        lastUpdate: Date.now() / 1000
    });
}

function updateTimerState(timerState) {
    console.log('Received timer state:', timerState);
    if (!timerState) return;
    
    updateTimerDisplay(timerState.timeLeft);
    updateProgressBar(timerState.elapsedTime);
    
    if (timerState.timeLeft <= 0 && !timerState.isRunning) {
        handlePomodoroComplete();
    }
}

// Event listeners
startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);
resetBtn.addEventListener('click', resetTimer);

// Initialize timer display
updateTimerDisplay(totalTime);
updateProgressBar(0);

// Request notification permission
if (Notification.permission !== 'granted') {
    Notification.requestPermission();
}

// Export functions for use in other modules
export { updateTimerState };