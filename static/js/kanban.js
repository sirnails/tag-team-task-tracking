import { sendUpdate } from './websocket.js';

let taskIdCounter = 0;
const todoTasks = document.getElementById('todoTasks');
const inProgressTasks = document.getElementById('inProgressTasks');
const doneTasks = document.getElementById('doneTasks');
const taskInput = document.getElementById('taskInput');
const loadTasksBtn = document.getElementById('loadTasks');
const clearStorageBtn = document.getElementById('clearStorage');
const currentTaskDisplay = document.getElementById('currentTaskDisplay');

let currentEditingTask = null;
let taskEditModal, taskDetailInput, closeModalBtn, saveTaskDetailsBtn;

document.addEventListener('DOMContentLoaded', () => {
    taskEditModal = document.getElementById('taskEditModal');
    taskDetailInput = document.getElementById('taskDetailInput');
    closeModalBtn = document.querySelector('.close-modal');
    saveTaskDetailsBtn = document.getElementById('saveTaskDetails');

    // Event listeners for modal
    closeModalBtn.addEventListener('click', closeEditModal);
    saveTaskDetailsBtn.addEventListener('click', saveTaskDetails);

    window.addEventListener('click', (e) => {
        if (e.target === taskEditModal) {
            closeEditModal();
        }
    });

    // Initialize drag and drop
    setupDragAndDrop();
});

function initializeBoard(state) {
    resetColumn(todoTasks, 'Add tasks to get started');
    resetColumn(inProgressTasks, 'Drag a task here');
    resetColumn(doneTasks, 'Completed tasks');
    
    loadTasksToColumn(todoTasks, state.todo || []);
    loadTasksToColumn(inProgressTasks, state.inProgress || []);
    loadTasksToColumn(doneTasks, state.done || []);
    
    taskIdCounter = state.taskIdCounter || 0;
    
    if (state.inProgress && state.inProgress.length > 0) {
        currentTaskDisplay.innerHTML = `<i class="fas fa-clock"></i> ${state.inProgress[0].text}`;
    }
}

function updateBoard(state) {
    loadTasksToColumn(todoTasks, state.todo);
    loadTasksToColumn(inProgressTasks, state.inProgress);
    loadTasksToColumn(doneTasks, state.done);
    taskIdCounter = state.taskIdCounter || 0;
    
    if (state.currentTask) {
        currentTaskDisplay.innerHTML = `<i class="fas fa-clock"></i> ${state.currentTask.text}`;
    } else {
        currentTaskDisplay.innerHTML = '<i class="fas fa-clock"></i> No task selected';
    }
}

function loadTasksToColumn(columnElement, tasks) {
    const existingTasks = Array.from(columnElement.children).filter(el => !el.classList.contains('empty-state'));
    existingTasks.forEach(task => task.remove());
    
    if (tasks.length === 0 && columnElement.querySelector('.empty-state') === null) {
        resetColumn(columnElement, getDefaultEmptyText(columnElement.id));
        return;
    }
    
    if (tasks.length > 0 && columnElement.querySelector('.empty-state')) {
        columnElement.querySelector('.empty-state').remove();
    }
    
    tasks.forEach(task => {
        const taskElement = createTaskElement(task.text, task.details);
        taskElement.id = task.id;
        columnElement.appendChild(taskElement);
    });
}

function getDefaultEmptyText(columnId) {
    switch(columnId) {
        case 'todoTasks': return 'Add tasks to get started';
        case 'inProgressTasks': return 'Drag a task here';
        case 'doneTasks': return 'Completed tasks';
        default: return 'Empty';
    }
}

function resetColumn(column, emptyText) {
    column.innerHTML = '';
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';
    emptyDiv.textContent = emptyText;
    column.appendChild(emptyDiv);
}

function makeDraggable(taskElement) {
    taskElement.draggable = true;
    
    taskElement.addEventListener('dragstart', function(e) {
        if (!this.textContent || !this.textContent.trim()) {
            e.preventDefault();
            return false;
        }
        
        e.dataTransfer.setData('text/plain', this.id);
        this.classList.add('dragging');
        
        const ghost = this.cloneNode(true);
        ghost.classList.add('task-ghost');
        ghost.style.position = 'fixed';
        ghost.style.width = `${this.offsetWidth}px`;
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '1000';
        ghost.style.top = '-9999px';
        document.body.appendChild(ghost);
        
        e.dataTransfer.setDragImage(ghost, 0, 0);
        
        setTimeout(() => document.body.removeChild(ghost), 0);
        return true;
    });
    
    taskElement.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        document.querySelectorAll('.task-placeholder').forEach(placeholder => placeholder.remove());
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function setupDragAndDrop() {
    const columns = document.querySelectorAll('.column');
    columns.forEach(column => {
        const tasksContainer = column.querySelector('.tasks');
        let lastHoveredElement = null;
        let placeholder = null;

        column.addEventListener('dragover', function(e) {
            e.preventDefault();
            const draggingElement = document.querySelector('.dragging');
            if (!draggingElement) return;

            document.querySelectorAll('.task-placeholder').forEach(placeholder => {
                if (placeholder.parentElement !== tasksContainer) {
                    placeholder.remove();
                }
            });

            column.classList.add('drag-over');
            
            const emptyState = column.querySelector('.empty-state');
            if (emptyState) emptyState.remove();

            if (!placeholder) {
                placeholder = document.createElement('div');
                placeholder.className = 'task-placeholder';
                tasksContainer.appendChild(placeholder);
            }

            const afterElement = getDragAfterElement(tasksContainer, e.clientY);
            if (afterElement) {
                if (!afterElement.nextElementSibling || afterElement.nextElementSibling !== placeholder) {
                    tasksContainer.insertBefore(placeholder, afterElement);
                }
            } else {
                if (placeholder.parentElement === tasksContainer && 
                    placeholder.nextElementSibling !== null) {
                    tasksContainer.appendChild(placeholder);
                } else if (placeholder.parentElement !== tasksContainer) {
                    tasksContainer.appendChild(placeholder);
                }
            }
        });

        column.addEventListener('dragleave', function(e) {
            if (!e.currentTarget.contains(e.relatedTarget)) {
                column.classList.remove('drag-over');
                
                if (placeholder && !tasksContainer.contains(e.relatedTarget)) {
                    placeholder.remove();
                    placeholder = null;
                }
            }
        });

        column.addEventListener('drop', handleDrop);
        
        column.addEventListener('dragend', function() {
            column.classList.remove('drag-over');
            if (placeholder) {
                placeholder.remove();
                placeholder = null;
            }
            if (lastHoveredElement) {
                lastHoveredElement.classList.remove('drag-over');
                lastHoveredElement = null;
            }
            document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        });
    });
}

function handleDrop(e) {
    e.preventDefault();
    const column = e.currentTarget;
    const tasksContainer = column.querySelector('.tasks');
    column.classList.remove('drag-over');

    document.querySelectorAll('.task-placeholder').forEach(placeholder => {
        placeholder.remove();
    });

    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    
    const taskElement = document.getElementById(taskId);
    if (!taskElement?.textContent?.trim()) return;

    // Check if dropping in inProgress column and it already has a task
    if (column.id === 'inProgressColumn' && 
        tasksContainer.children.length > 0 && 
        !tasksContainer.children[0].classList.contains('empty-state')) {
        alert('Only one task can be in progress at a time!');
        return;
    }

    const afterElement = getDragAfterElement(tasksContainer, e.clientY);
    if (afterElement) {
        tasksContainer.insertBefore(taskElement, afterElement);
    } else {
        tasksContainer.appendChild(taskElement);
    }
    
    if (column.id === 'inProgressTasks') {
        currentTaskDisplay.innerHTML = `<i class="fas fa-clock"></i> ${taskElement.textContent}`;
    } else if (taskElement.parentElement.id !== 'inProgressTasks' && 
               document.getElementById('inProgressTasks').children.length === 0) {
        currentTaskDisplay.innerHTML = '<i class="fas fa-clock"></i> No task selected';
    }
    
    sendUpdate();
}

function getTaskData(container) {
    const tasks = Array.from(container.children).filter(el => !el.classList.contains('empty-state'));
    return tasks.map(task => {
        const content = task.querySelector('.task-content');
        const title = content.querySelector('.task-title');
        const details = content.querySelector('.task-details');
        return {
            id: task.id,
            text: title.textContent,
            details: details ? details.textContent : ''
        };
    });
}

// Event listeners
loadTasksBtn.addEventListener('click', function() {
    const tasks = taskInput.value.split('\n').filter(task => task.trim() !== '');
    
    if (tasks.length === 0) {
        alert('Please enter at least one task!');
        return;
    }
    
    if (todoTasks.querySelector('.empty-state') && tasks.length > 0) {
        todoTasks.querySelector('.empty-state').remove();
    }
    
    tasks.forEach((task) => {
        const taskElement = createTaskElement(task);
        todoTasks.appendChild(taskElement);
    });
    
    taskInput.value = '';
    sendUpdate();
});

clearStorageBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        resetColumn(todoTasks, 'Add tasks to get started');
        resetColumn(inProgressTasks, 'Drag a task here');
        resetColumn(doneTasks, 'Completed tasks');
        
        currentTaskDisplay.innerHTML = '<i class="fas fa-clock"></i> No task selected';
        taskIdCounter = 0;
        
        sendUpdate();
    }
});

function createTaskElement(taskText, details = '') {
    const taskElement = document.createElement('div');
    taskElement.className = 'task';
    taskElement.id = 'task-' + taskIdCounter++;

    // Task content
    const taskContent = document.createElement('div');
    taskContent.className = 'task-content';
    
    // Main task text
    const taskTitle = document.createElement('div');
    taskTitle.className = 'task-title';
    taskTitle.textContent = taskText;
    taskContent.appendChild(taskTitle);
    
    // Task details (if any)
    if (details) {
        const taskDetails = document.createElement('div');
        taskDetails.className = 'task-details';
        taskDetails.textContent = details;
        taskContent.appendChild(taskDetails);
    }

    taskElement.appendChild(taskContent);

    // Add click handler for editing
    taskElement.addEventListener('click', (e) => {
        // Only open edit modal if we're not dragging
        if (!taskElement.classList.contains('dragging')) {
            openEditModal(taskElement);
        }
    });

    makeDraggable(taskElement);
    return taskElement;
}

function openEditModal(taskElement) {
    console.log('Opening modal for task:', taskElement);
    currentEditingTask = taskElement;
    const taskContent = taskElement.querySelector('.task-content');
    const taskDetails = taskContent.querySelector('.task-details');
    taskDetailInput.value = taskDetails ? taskDetails.textContent : '';
    
    const modal = document.getElementById('taskEditModal');
    console.log('Modal element:', modal);
    if (modal) {
        modal.style.display = 'block';
    } else {
        console.error('Modal element not found!');
    }
}

function closeEditModal() {
    taskEditModal.style.display = 'none';
    currentEditingTask = null;
}

function saveTaskDetails() {
    if (!currentEditingTask) return;
    
    const taskContent = currentEditingTask.querySelector('.task-content');
    let taskDetails = taskContent.querySelector('.task-details');
    
    if (taskDetailInput.value.trim()) {
        if (!taskDetails) {
            taskDetails = document.createElement('div');
            taskDetails.className = 'task-details';
            taskContent.appendChild(taskDetails);
        }
        taskDetails.textContent = taskDetailInput.value.trim();
    } else if (taskDetails) {
        taskContent.removeChild(taskDetails);
    }
    
    closeEditModal();
    sendUpdate();
}

// Export functions for use in other modules
export { 
    initializeBoard, 
    updateBoard, 
    getTaskData,
    taskIdCounter
};