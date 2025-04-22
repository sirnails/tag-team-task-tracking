// Function to update start button state based on task presence
export function updatePomodoroButtonState() {
    const inProgressTasks = document.getElementById('inProgressTasks');
    // Check if there are any non-empty-state elements in the in-progress column
    const hasTask = inProgressTasks && 
                   Array.from(inProgressTasks.children)
                   .some(child => !child.classList.contains('empty-state'));
    
    // Disable the start button if no task is in progress
    const pomodoroToggle = document.getElementById('pomodoroToggle');
    pomodoroToggle.disabled = !hasTask;
    pomodoroToggle.classList.toggle('disabled', !hasTask);
}
