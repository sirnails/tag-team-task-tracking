import { createPomodoroConfetti } from './pomodoroConfetti.js';

export function handlePomodoroCompletion() {
    const currentPomodoroTask = document.getElementById('currentPomodoroTask');
    const currentTaskDisplay = document.getElementById('currentTaskDisplay');
    
    // Celebration effects
    createPomodoroConfetti();
    
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
